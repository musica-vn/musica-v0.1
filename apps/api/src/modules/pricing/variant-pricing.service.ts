import { HttpStatus, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import { throwSupabaseError } from '../../common/database/supabase-errors';
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
  constructor(private readonly supabaseService: SupabaseService) { }

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
      throw new ApiHttpException(
        { code: 'MISSING_PLATFORM_CONFIG_ID', details: { platformType } },
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
      throwSupabaseError(
        'VARIANT_PRICING_PLATFORM_CONFIG_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        configError,
      );
    }
    if (!config) {
      throw new ApiHttpException(
        { code: 'PLATFORM_CONFIG_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (expressionResult.error) {
      throwSupabaseError(
        'VARIANT_PRICING_EXPRESSION_CONFIG_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        expressionResult.error,
      );
    }
    if (payload.expressionConfigId && !expressionResult.data) {
      throw new ApiHttpException(
        { code: 'EXPRESSION_CONFIG_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (modificationResult.error) {
      throwSupabaseError(
        'VARIANT_PRICING_MODIFICATION_CONFIG_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        modificationResult.error,
      );
    }
    if (payload.modificationConfigId && !modificationResult.data) {
      throw new ApiHttpException(
        { code: 'MODIFICATION_CONFIG_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const modifiersError = 'error' in modifiersResult ? modifiersResult.error : null;
    const modifiersData = 'data' in modifiersResult ? modifiersResult.data : null;

    if (modifiersError) {
      throwSupabaseError(
        'VARIANT_PRICING_MODIFIERS_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        modifiersError,
      );
    }

    const modifierMap = new Map<VariantPricingModifierKey, number>(
      (modifiersData ?? [])
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => [
          item.modifier_key as VariantPricingModifierKey,
          toNumber(item.multiplier),
        ]),
    );

    const isExpressionEnabled = true;
    const isModificationEnabled = true;

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

    if (payload.subject) {
      const dbMultiplier = modifierMap.get(`SUBJECT_${payload.subject}` as VariantPricingModifierKey);
      const subjectMultiplier = dbMultiplier ?? SUBJECT_MULTIPLIERS[payload.subject];
      currentTotal *= subjectMultiplier;
      addBreakdownLine(`SUBJECT_${payload.subject}`, 'Đối tượng');
    }

    if (payload.duration) {
      const dbMultiplier = modifierMap.get(`DURATION_${payload.duration}` as VariantPricingModifierKey);
      const durationMultiplier = dbMultiplier ?? DURATION_MULTIPLIERS[payload.duration];
      currentTotal *= durationMultiplier;
      addBreakdownLine(`DURATION_${payload.duration}`, 'Thời hạn');
    }

    if (payload.scope) {
      const dbMultiplier = modifierMap.get(`SCOPE_${payload.scope}` as VariantPricingModifierKey);
      const scopeMultiplier = dbMultiplier ?? SCOPE_MULTIPLIERS[payload.scope];
      currentTotal *= scopeMultiplier;
      addBreakdownLine(`SCOPE_${payload.scope}`, 'Phạm vi');
    }

    selectionKeys.forEach((key) => {
      if (key.startsWith('SUBJECT_') || key.startsWith('DURATION_') || key.startsWith('SCOPE_')) {
        return;
      }
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
