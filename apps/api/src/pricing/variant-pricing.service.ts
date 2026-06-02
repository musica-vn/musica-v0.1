import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  DURATION_MULTIPLIERS,
  SCOPE_MULTIPLIERS,
  SUBJECT_MULTIPLIERS,
  resolveModifierKeyFromSelection,
  type VariantPricingModifierKey,
} from './variant-pricing.enums';
import type {
  PublicVariantPricingCalculateRequestDto,
  VariantPricingBreakdownLineDto,
} from './variant-pricing.dto';

type DbDigitalRightConfigRow = {
  id: string;
  base_price_multiplier: number | string;
};

type DbPhysicalRightConfigRow = {
  id: string;
  base_price_multiplier: number | string;
};

type DbExpressionConfigRow = {
  id: string;
  price_multiplier: number | string;
};

type DbModificationConfigRow = {
  id: string;
  price_multiplier: number | string;
};

type DbPriceModifierRow = {
  modifier_key: string;
  multiplier: number | string;
};

const BASE_PRICE_VND = 2_530_000;
const DIGITAL_TOTAL_RATE = 0.1;

const toNumber = (value: number | string): number => Number(value);

const roundVnd = (value: number) => Number(value.toFixed(0));

@Injectable()
export class VariantPricingService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async calculate(payload: PublicVariantPricingCalculateRequestDto): Promise<{
    totalPrice: number;
    currency: 'VND';
    breakdown: VariantPricingBreakdownLineDto[];
  }> {
    const platformType = payload.platformType;
    const configId =
      platformType === 'DIGITAL'
        ? payload.digitalRightConfigId
        : payload.physicalRightConfigId;

    if (!configId) {
      throw new HttpException(
        {
          message: 'MISSING_PLATFORM_CONFIG_ID',
          details: { platformType },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const selectionKeys = resolveModifierKeyFromSelection({
      subject: payload.subject,
      duration: payload.duration,
      scope: payload.scope,
    });

    const configPromise =
      platformType === 'DIGITAL'
        ? this.supabaseService.client
            .from('digital_right_configs')
            .select('id,base_price_multiplier')
            .eq('id', configId)
            .maybeSingle<DbDigitalRightConfigRow>()
        : this.supabaseService.client
            .from('physical_right_configs')
            .select('id,base_price_multiplier')
            .eq('id', configId)
            .maybeSingle<DbPhysicalRightConfigRow>()

    const modifiersPromise =
      platformType === 'DIGITAL'
        ? this.supabaseService.client
            .from('digital_right_config_price_modifiers')
            .select('modifier_key,multiplier')
            .eq('digital_right_config_id', configId)
            .returns<DbPriceModifierRow[]>()
        : this.supabaseService.client
            .from('physical_right_config_price_modifiers')
            .select('modifier_key,multiplier')
            .eq('physical_right_config_id', configId)
            .returns<DbPriceModifierRow[]>();

    const expressionPromise = payload.expressionConfigId
      ? this.supabaseService.client
          .from('expression_configs')
          .select('id,price_multiplier')
          .eq('id', payload.expressionConfigId)
          .maybeSingle<DbExpressionConfigRow>()
      : Promise.resolve({ data: null, error: null } as const);

    const modificationPromise = payload.modificationConfigId
      ? this.supabaseService.client
          .from('modification_configs')
          .select('id,price_multiplier')
          .eq('id', payload.modificationConfigId)
          .maybeSingle<DbModificationConfigRow>()
      : Promise.resolve({ data: null, error: null } as const);

    const [{ data: config, error: configError }, modifiersResult, expressionResult, modificationResult] =
      await Promise.all([configPromise, modifiersPromise, expressionPromise, modificationPromise]);

    if (configError) {
      throw new HttpException(configError.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!config) {
      throw new HttpException('PLATFORM_CONFIG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (expressionResult.error) {
      throw new HttpException(expressionResult.error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (payload.expressionConfigId && !expressionResult.data) {
      throw new HttpException('EXPRESSION_CONFIG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (modificationResult.error) {
      throw new HttpException(modificationResult.error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (payload.modificationConfigId && !modificationResult.data) {
      throw new HttpException('MODIFICATION_CONFIG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const modifiersError = 'error' in modifiersResult ? modifiersResult.error : null;
    const modifiersData = 'data' in modifiersResult ? modifiersResult.data : null;

    if (modifiersError) {
      throw new HttpException(modifiersError.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const modifierMap = new Map<VariantPricingModifierKey, number>(
      (modifiersData ?? [])
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => [
          item.modifier_key as VariantPricingModifierKey,
          toNumber(item.multiplier),
        ]),
    );

    const isSubjectEnabled =
      modifierMap.has('SUBJECT_INDIVIDUAL') || modifierMap.has('SUBJECT_ORGANIZATION');
    const isDurationEnabled =
      modifierMap.has('DURATION_ONE_YEAR') || modifierMap.has('DURATION_PERPETUAL');
    const isScopeEnabled =
      modifierMap.has('SCOPE_SINGLE_CHANNEL') || modifierMap.has('SCOPE_MULTI_CHANNEL');
    const isExpressionEnabled = modifierMap.has('EXPRESSION');
    const isModificationEnabled = modifierMap.has('MODIFICATION');

    const breakdown: VariantPricingBreakdownLineDto[] = [];
    let currentTotal = BASE_PRICE_VND;

    breakdown.push({
      key: 'BASE_PRICE',
      label: 'Giá cơ bản bản quyền',
      selected: 'VND',
      multiplier: 1,
      lineTotal: roundVnd(currentTotal),
    });

    const platformMultiplier = toNumber((config as any).base_price_multiplier);
    currentTotal *= platformMultiplier;
    breakdown.push({
      key: 'PLATFORM_BASE_MULTIPLIER',
      label: platformType === 'DIGITAL' ? 'Nền tảng số' : 'Nền tảng vật lý',
      selected: configId,
      multiplier: platformMultiplier,
      lineTotal: roundVnd(currentTotal),
    });

    const subjectMultiplier = isSubjectEnabled ? SUBJECT_MULTIPLIERS[payload.subject] : 1;
    currentTotal *= subjectMultiplier;
    breakdown.push({
      key: `SUBJECT_${payload.subject}`,
      label: 'Đối tượng',
      selected: payload.subject,
      multiplier: subjectMultiplier,
      lineTotal: roundVnd(currentTotal),
    });

    const durationMultiplier = isDurationEnabled ? DURATION_MULTIPLIERS[payload.duration] : 1;
    currentTotal *= durationMultiplier;
    breakdown.push({
      key: `DURATION_${payload.duration}`,
      label: 'Thời hạn',
      selected: payload.duration,
      multiplier: durationMultiplier,
      lineTotal: roundVnd(currentTotal),
    });

    const scopeMultiplier = isScopeEnabled ? SCOPE_MULTIPLIERS[payload.scope] : 1;
    currentTotal *= scopeMultiplier;
    breakdown.push({
      key: `SCOPE_${payload.scope}`,
      label: 'Phạm vi',
      selected: payload.scope,
      multiplier: scopeMultiplier,
      lineTotal: roundVnd(currentTotal),
    });

    selectionKeys.forEach((key) => {
      const multiplier = modifierMap.get(key);
      if (!multiplier) return;
      currentTotal *= multiplier;
      breakdown.push({
        key: `PLATFORM_MODIFIER_${key}`,
        label: 'Yếu tố phụ thuộc (gói nền tảng)',
        selected: key,
        multiplier,
        lineTotal: roundVnd(currentTotal),
      });
    });

    if (isExpressionEnabled && expressionResult.data) {
      const multiplier = toNumber(expressionResult.data.price_multiplier);
      currentTotal *= multiplier;
      breakdown.push({
        key: `EXPRESSION_${expressionResult.data.id}`,
        label: 'Hình thức biểu hiện',
        selected: expressionResult.data.id,
        multiplier,
        lineTotal: roundVnd(currentTotal),
      });
    }

    if (isModificationEnabled && modificationResult.data) {
      const multiplier = toNumber(modificationResult.data.price_multiplier);
      currentTotal *= multiplier;
      breakdown.push({
        key: `MODIFICATION_${modificationResult.data.id}`,
        label: 'Mức độ biến đổi',
        selected: modificationResult.data.id,
        multiplier,
        lineTotal: roundVnd(currentTotal),
      });
    }

    if (platformType === 'DIGITAL') {
      currentTotal *= DIGITAL_TOTAL_RATE;
      breakdown.push({
        key: 'DIGITAL_TOTAL_RATE',
        label: 'Điều chỉnh nền tảng số (10%)',
        selected: '0.1',
        multiplier: DIGITAL_TOTAL_RATE,
        lineTotal: roundVnd(currentTotal),
      });
    }

    return {
      totalPrice: roundVnd(currentTotal),
      currency: 'VND',
      breakdown,
    };
  }
}
