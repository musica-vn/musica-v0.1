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
  target_platform: 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK';
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

type DbPlatformDefaultPricingTemplateRow = {
  id: string;
  platform_key: 'YOUTUBE';
};

type DbPlatformModifierRow = {
  modifier_key: VariantPricingModifierKey;
  multiplier: number | string;
};

type DbProductPlatformPricingOverrideRow = {
  id: string;
  mode: 'SYSTEM' | 'CUSTOM';
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
          .select('id,target_platform')
          .eq('id', configId)
          .maybeSingle<DbDigitalRightConfigRow>()
        : this.supabaseService.client
          .from('physical_right_configs')
          .select('id,base_price_multiplier')
          .eq('id', configId)
          .maybeSingle<DbPhysicalRightConfigRow>()

    const modifiersPromise =
      platformType === 'DIGITAL'
        ? Promise.resolve({ data: [] as DbPriceModifierRow[], error: null } as const)
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

    const [
      { data: config, error: configError },
      modifiersResult,
      expressionResult,
      modificationResult,
    ] = await Promise.all([
      configPromise,
      modifiersPromise,
      expressionPromise,
      modificationPromise,
    ]);

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

    let activeDigitalModifierMap = modifierMap;
    let activeDigitalMode: 'SYSTEM' | 'CUSTOM' = 'SYSTEM';

    if (platformType === 'DIGITAL' && 'target_platform' in config) {
      const { data: template, error: templateError } = await this.supabaseService.client
        .from('platform_default_pricing_templates')
        .select('id,platform_key')
        .eq('platform_key', config.target_platform)
        .maybeSingle<DbPlatformDefaultPricingTemplateRow>();

      if (templateError) {
        throwSupabaseError(
          'VARIANT_PRICING_DEFAULT_TEMPLATE_LOAD_FAILED',
          HttpStatus.INTERNAL_SERVER_ERROR,
          templateError,
        );
      }

      if (!template) {
        throw new ApiHttpException(
          { code: 'DIGITAL_PLATFORM_DEFAULT_TEMPLATE_NOT_FOUND' },
          HttpStatus.NOT_FOUND,
        );
      }

      const { data: templateModifiers, error: templateModifiersError } = await this.supabaseService.client
        .from('platform_default_pricing_template_modifiers')
        .select('modifier_key,multiplier')
        .eq('template_id', template.id)
        .returns<DbPlatformModifierRow[]>();

      if (templateModifiersError) {
        throwSupabaseError(
          'VARIANT_PRICING_DEFAULT_TEMPLATE_MODIFIERS_LOAD_FAILED',
          HttpStatus.INTERNAL_SERVER_ERROR,
          templateModifiersError,
        );
      }

      activeDigitalModifierMap = new Map<VariantPricingModifierKey, number>(
        (templateModifiers ?? []).map((item) => [
          item.modifier_key,
          toNumber(item.multiplier),
        ]),
      );

      if (payload.productId) {
        const { data: override, error: overrideError } = await this.supabaseService.client
          .from('product_platform_pricing_overrides')
          .select('id,mode')
          .eq('product_id', payload.productId)
          .eq('platform_key', config.target_platform)
          .maybeSingle<DbProductPlatformPricingOverrideRow>();

        if (overrideError) {
          throwSupabaseError(
            'VARIANT_PRICING_PRODUCT_PLATFORM_OVERRIDE_LOAD_FAILED',
            HttpStatus.INTERNAL_SERVER_ERROR,
            overrideError,
          );
        }

        if (override?.mode === 'CUSTOM') {
          const { data: overrideModifiers, error: overrideModifiersError } = await this.supabaseService.client
            .from('product_platform_pricing_override_modifiers')
            .select('modifier_key,multiplier')
            .eq('override_id', override.id)
            .returns<DbPlatformModifierRow[]>();

          if (overrideModifiersError) {
            throwSupabaseError(
              'VARIANT_PRICING_PRODUCT_PLATFORM_OVERRIDE_LOAD_FAILED',
              HttpStatus.INTERNAL_SERVER_ERROR,
              overrideModifiersError,
            );
          }

          activeDigitalModifierMap = new Map<VariantPricingModifierKey, number>(
            (overrideModifiers ?? []).map((item) => [
              item.modifier_key,
              toNumber(item.multiplier),
            ]),
          );
          activeDigitalMode = 'CUSTOM';
        }
      }

      addBreakdownLine(
        activeDigitalMode === 'CUSTOM' ? 'PRODUCT_CUSTOM_TEMPLATE' : 'SYSTEM_TEMPLATE',
        activeDigitalMode === 'CUSTOM' ? 'Mau gia rieng cua bai hat' : 'Mau gia mac dinh cua he thong',
      );
    } else {
      currentTotal *= toNumber((config as DbPhysicalRightConfigRow).base_price_multiplier);
      addBreakdownLine('PLATFORM_BASE_MULTIPLIER', 'Nền tảng vật lý');
    }

    if (payload.subject) {
      const dbMultiplier =
        platformType === 'DIGITAL'
          ? activeDigitalModifierMap.get(`SUBJECT_${payload.subject}` as VariantPricingModifierKey)
          : modifierMap.get(`SUBJECT_${payload.subject}` as VariantPricingModifierKey);
      const subjectMultiplier = dbMultiplier ?? SUBJECT_MULTIPLIERS[payload.subject];
      currentTotal *= subjectMultiplier;
      addBreakdownLine(`SUBJECT_${payload.subject}`, 'Đối tượng');
    }

    if (payload.duration) {
      const dbMultiplier =
        platformType === 'DIGITAL'
          ? activeDigitalModifierMap.get(`DURATION_${payload.duration}` as VariantPricingModifierKey)
          : modifierMap.get(`DURATION_${payload.duration}` as VariantPricingModifierKey);
      const durationMultiplier = dbMultiplier ?? DURATION_MULTIPLIERS[payload.duration];
      currentTotal *= durationMultiplier;
      addBreakdownLine(`DURATION_${payload.duration}`, 'Thời hạn');
    }

    if (payload.scope) {
      const dbMultiplier =
        platformType === 'DIGITAL'
          ? activeDigitalModifierMap.get(`SCOPE_${payload.scope}` as VariantPricingModifierKey)
          : modifierMap.get(`SCOPE_${payload.scope}` as VariantPricingModifierKey);
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
      if (platformType === 'DIGITAL') {
        currentTotal *= activeDigitalModifierMap.get('EXPRESSION') ?? 1;
        addBreakdownLine('EXPRESSION_TEMPLATE', 'He so hinh thuc bieu hien');
      }
      const multiplier = toNumber(expressionResult.data.price_multiplier);
      currentTotal *= multiplier;
      addBreakdownLine(`EXPRESSION_${expressionResult.data.id}`, 'Hình thức biểu hiện');
    }

    if (isModificationEnabled && modificationResult.data) {
      if (platformType === 'DIGITAL') {
        currentTotal *= activeDigitalModifierMap.get('MODIFICATION') ?? 1;
        addBreakdownLine('MODIFICATION_TEMPLATE', 'He so muc do bien doi');
      }
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
