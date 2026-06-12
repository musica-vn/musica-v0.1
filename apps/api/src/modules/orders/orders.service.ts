import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PaginationMeta } from '@musica/contracts';
import { buildPaginationMeta } from '../../common/base/pagination-meta';
import { throwSupabaseError } from '../../common/database/supabase-errors';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import { SupabaseService } from '../../database/supabase.service';
import { VariantPricingService } from '../pricing/variant-pricing.service';
import { ProductsService } from '../products/products.service';
import {
  buildOrderPaidSuccessEvent,
  mapOrderRowToDetail,
  mapOrderRowToListItem,
  type OrderDetailRow,
  type OrderListRow,
} from './orders.mapper';
import type {
  CreateCheckoutOrderRequestDto,
  CreateCheckoutOrderResponseDto,
  MarkOrderPaidRequestDto,
  OrderDetailDto,
  OrderListItemDto,
  OrdersListQueryDto,
} from './orders.dto';

type DbOrderStatusRow = {
  id: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  total_amount: number | string;
};

type DbRoleRow = {
  id: number;
  name: string;
};

type DbDefaultBuyerRow = {
  id: string;
  email: string;
  full_name: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly productsService: ProductsService,
    private readonly variantPricingService: VariantPricingService,
  ) {}

  async listOrders(
    query: OrdersListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: OrderListItemDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    let requestBuilder = this.supabaseService.client
      .from('orders')
      .select(
        'id,order_number,status,currency,total_amount,paid_at,created_at,buyer:users!orders_buyer_id_fkey(id,email,full_name)',
        { count: 'exact' },
      );

    if (query.buyerId) requestBuilder = requestBuilder.eq('buyer_id', query.buyerId);
    if (query.status) requestBuilder = requestBuilder.eq('status', query.status);
    if (query.fromDate) requestBuilder = requestBuilder.gte('created_at', query.fromDate);
    if (query.toDate) requestBuilder = requestBuilder.lte('created_at', query.toDate);

    const { data, error, count } = await requestBuilder
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throwSupabaseError('ORDERS_LIST_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    return {
      data: { items: ((data ?? []) as OrderListRow[]).map(mapOrderRowToListItem) },
      meta: buildPaginationMeta(query.page, query.pageSize, typeof count === 'number' ? count : 0),
    };
  }

  async getOrderById(orderId: string): Promise<OrderDetailDto> {
    const { data, error } = await this.supabaseService.client
      .from('orders')
      .select(
        'id,order_number,status,currency,subtotal_amount,discount_amount,tax_amount,total_amount,paid_at,created_at,buyer:users!orders_buyer_id_fkey(id,email,full_name),items:order_items(product_id,product_title_snapshot,unit_price,quantity,line_total_amount),payments:order_payments(provider,transaction_id,status,amount,paid_at,created_at)',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      throwSupabaseError('ORDER_DETAIL_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }

    if (!data) {
      throw new ApiHttpException({ code: 'ORDER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return mapOrderRowToDetail(data as OrderDetailRow);
  }

  async createCheckoutOrder(
    payload: CreateCheckoutOrderRequestDto,
  ): Promise<CreateCheckoutOrderResponseDto> {
    const product = await this.productsService.getMarketplaceProductById(
      payload.productId,
    );
    const defaultBuyer = await this.resolveDefaultBuyer();
    const total = await this.resolveCheckoutTotal(product, payload);
    const orderNumber = this.generateOrderNumber();

    const { data: orderRow, error: orderError } = await this.supabaseService.client
      .from('orders')
      .insert({
        order_number: orderNumber,
        buyer_id: defaultBuyer.id,
        status: 'PENDING_PAYMENT',
        currency: total.currency,
        subtotal_amount: total.totalPrice,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: total.totalPrice,
      })
      .select('id,status,currency,total_amount')
      .maybeSingle();

    if (orderError) {
      throwSupabaseError('CHECKOUT_ORDER_CREATE_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, orderError);
    }

    if (!orderRow) {
      throw new ApiHttpException({ code: 'CHECKOUT_ORDER_CREATE_FAILED' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { error: itemError } = await this.supabaseService.client.from('order_items').insert({
      order_id: orderRow.id,
      product_id: product.id,
      product_title_snapshot: product.title,
      unit_price: total.totalPrice,
      quantity: 1,
      line_total_amount: total.totalPrice,
    });

    if (itemError) {
      throwSupabaseError('CHECKOUT_ORDER_ITEM_CREATE_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, itemError);
    }

    return {
      orderId: orderRow.id,
      status: orderRow.status,
      currency: orderRow.currency,
      totalAmount: Number(orderRow.total_amount),
    };
  }

  async markOrderPaid(
    orderId: string,
    payload: MarkOrderPaidRequestDto,
  ): Promise<OrderDetailDto> {
    const existing = await this.loadOrderStatusRow(orderId);
    if (existing.status === 'CANCELLED') {
      throw new ApiHttpException(
        { code: 'ORDER_INVALID_STATUS_TRANSITION', details: { from: existing.status, to: 'PAID' } },
        HttpStatus.CONFLICT,
      );
    }

    if (existing.status === 'PAID') {
      return this.getOrderById(orderId);
    }

    const paidAt = payload.paidAt ?? new Date().toISOString();

    const { error: updateError } = await this.supabaseService.client
      .from('orders')
      .update({ status: 'PAID', paid_at: paidAt })
      .eq('id', orderId);

    if (updateError) {
      throwSupabaseError('ORDER_MARK_PAID_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, updateError);
    }

    const { error: paymentError } = await this.supabaseService.client.from('order_payments').insert({
      order_id: orderId,
      provider: payload.provider,
      transaction_id: payload.transactionId ?? null,
      status: 'SUCCEEDED',
      amount: Number(existing.total_amount),
      paid_at: paidAt,
      raw_payload: payload.rawPayload ?? null,
    });

    if (paymentError) {
      throwSupabaseError('ORDER_PAYMENT_INSERT_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, paymentError);
    }

    return this.completePaidTransition(orderId, {
      ...payload,
      paidAt,
    }, existing);
  }

  async completeExternalPayment(
    orderId: string,
    payload: MarkOrderPaidRequestDto,
  ): Promise<OrderDetailDto> {
    return this.completePaidTransition(orderId, payload);
  }

  private async completePaidTransition(
    orderId: string,
    payload: MarkOrderPaidRequestDto,
    existing?: DbOrderStatusRow,
  ): Promise<OrderDetailDto> {
    const current = existing ?? (await this.loadOrderStatusRow(orderId));
    if (current.status === 'CANCELLED') {
      throw new ApiHttpException(
        { code: 'ORDER_INVALID_STATUS_TRANSITION', details: { from: current.status, to: 'PAID' } },
        HttpStatus.CONFLICT,
      );
    }

    if (current.status === 'PAID') {
      return this.getOrderById(orderId);
    }

    const paidAt = payload.paidAt ?? new Date().toISOString();
    const { error: updateError } = await this.supabaseService.client
      .from('orders')
      .update({ status: 'PAID', paid_at: paidAt })
      .eq('id', orderId);

    if (updateError) {
      throwSupabaseError('ORDER_MARK_PAID_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, updateError);
    }

    const detail = await this.getOrderById(orderId);
    this.eventEmitter.emit('order.paid.success', buildOrderPaidSuccessEvent(detail, paidAt));
    return detail;
  }

  private async loadOrderStatusRow(orderId: string): Promise<DbOrderStatusRow> {
    const { data: statusRow, error: statusError } = await this.supabaseService.client
      .from('orders')
      .select('id,status,total_amount')
      .eq('id', orderId)
      .maybeSingle();

    if (statusError) {
      throwSupabaseError(
        'ORDER_LOAD_FOR_PAYMENT_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        statusError,
      );
    }

    if (!statusRow) {
      throw new ApiHttpException({ code: 'ORDER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return statusRow as DbOrderStatusRow;
  }

  private async resolveDefaultBuyer(): Promise<DbDefaultBuyerRow> {
    const { data: adminRole, error: roleError } = await this.supabaseService.client
      .from('roles')
      .select('id,name')
      .eq('name', 'Admin')
      .maybeSingle<DbRoleRow>();

    if (roleError) {
      throwSupabaseError(
        'CHECKOUT_DEFAULT_BUYER_ROLE_LOOKUP_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        roleError,
      );
    }

    if (!adminRole) {
      throw new ApiHttpException(
        { code: 'CHECKOUT_DEFAULT_ADMIN_ROLE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const { data: buyers, error: buyerError } = await this.supabaseService.client
      .from('users')
      .select('id,email,full_name,user_roles!inner(role_id)')
      .in('user_roles.role_id', [adminRole.id])
      .neq('status', 'DELETED')
      .order('created_at', { ascending: true })
      .limit(1);

    if (buyerError) {
      throwSupabaseError(
        'CHECKOUT_DEFAULT_BUYER_LOOKUP_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        buyerError,
      );
    }

    const buyer = (buyers ?? [])[0] as DbDefaultBuyerRow | undefined;
    if (!buyer) {
      throw new ApiHttpException(
        { code: 'CHECKOUT_DEFAULT_BUYER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    return buyer;
  }

  private async resolveCheckoutTotal(
    product: Awaited<ReturnType<ProductsService['getMarketplaceProductById']>>,
    payload: CreateCheckoutOrderRequestDto,
  ): Promise<{ totalPrice: number; currency: 'VND' }> {
    const configId =
      payload.platformType === 'DIGITAL'
        ? product.digitalRightConfigId
        : product.physicalRightConfigId;

    if (!configId) {
      throw new ApiHttpException(
        {
          code: 'CHECKOUT_PLATFORM_CONFIG_NOT_AVAILABLE',
          details: { productId: product.id, platformType: payload.platformType },
        },
        HttpStatus.CONFLICT,
      );
    }

    return this.variantPricingService.calculate({
      platformType: payload.platformType,
      digitalRightConfigId:
        payload.platformType === 'DIGITAL' ? configId : undefined,
      physicalRightConfigId:
        payload.platformType === 'PHYSICAL' ? configId : undefined,
      subject: payload.subject,
      duration: payload.duration,
      scope: payload.scope,
      expressionConfigId: payload.expr,
      modificationConfigId: payload.mod,
    });
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const ymd = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('');
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `ORD-${ymd}-${suffix}`;
  }
}
