import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
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
    const addBreakdownLine = (key: string, label: string) => {
      breakdown.push({ key, label });
    };
    let currentTotal = BASE_PRICE_VND;

    addBreakdownLine('BASE_PRICE', 'Giá cơ bản bản quyền');

    const platformMultiplier = toNumber((config as any).base_price_multiplier);
    currentTotal *= platformMultiplier;
    addBreakdownLine(
      'PLATFORM_BASE_MULTIPLIER',
      platformType === 'DIGITAL' ? 'Nền tảng số' : 'Nền tảng vật lý',
    );

    if (isSubjectEnabled && payload.subject) {
      const subjectMultiplier = SUBJECT_MULTIPLIERS[payload.subject];
      currentTotal *= subjectMultiplier;
      addBreakdownLine(`SUBJECT_${payload.subject}`, 'Đối tượng');
    }

    if (isDurationEnabled && payload.duration) {
      const durationMultiplier = DURATION_MULTIPLIERS[payload.duration];
      currentTotal *= durationMultiplier;
      addBreakdownLine(`DURATION_${payload.duration}`, 'Thời hạn');
    }

    if (isScopeEnabled && payload.scope) {
      const scopeMultiplier = SCOPE_MULTIPLIERS[payload.scope];
      currentTotal *= scopeMultiplier;
      addBreakdownLine(`SCOPE_${payload.scope}`, 'Phạm vi');
    }

    selectionKeys.forEach((key) => {
      const multiplier = modifierMap.get(key);
      if (!multiplier) return;
      currentTotal *= multiplier;
      addBreakdownLine(`PLATFORM_MODIFIER_${key}`, 'Yếu tố phụ thuộc (gói nền tảng)');
    });

    if (isExpressionEnabled && expressionResult.data) {
      const multiplier = toNumber(expressionResult.data.price_multiplier);
      currentTotal *= multiplier;
      addBreakdownLine(`EXPRESSION_${expressionResult.data.id}`, 'Hình thức biểu hiện');
    }

    if (isModificationEnabled && modificationResult.data) {
      const multiplier = toNumber(modificationResult.data.price_multiplier);
      currentTotal *= multiplier;
      addBreakdownLine(`MODIFICATION_${modificationResult.data.id}`, 'Mức độ biến đổi');
    }

    if (platformType === 'DIGITAL') {
      currentTotal *= DIGITAL_TOTAL_RATE;
      addBreakdownLine('DIGITAL_TOTAL_RATE', 'Điều chỉnh nền tảng số (10%)');
    }

    return {
      totalPrice: roundVnd(currentTotal),
      currency: 'VND',
      breakdown,
    };
  }
}
