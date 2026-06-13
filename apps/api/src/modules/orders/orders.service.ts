import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PaginationMeta } from '@musica/contracts';
import { buildPaginationMeta } from '../../common/base/pagination-meta';
import { throwSupabaseError } from '../../common/database/supabase-errors';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import { SupabaseService } from '../../database/supabase.service';
import {
  buildOrderPaidSuccessEvent,
  mapOrderRowToDetail,
  mapOrderRowToListItem,
  type OrderDetailRow,
  type OrderListRow,
} from './orders.mapper';
import type {
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

@Injectable()
export class OrdersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
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

  async markOrderPaid(
    orderId: string,
    payload: MarkOrderPaidRequestDto,
  ): Promise<OrderDetailDto> {
    const { data: statusRow, error: statusError } = await this.supabaseService.client
      .from('orders')
      .select('id,status,total_amount')
      .eq('id', orderId)
      .maybeSingle();

    if (statusError) {
      throwSupabaseError('ORDER_LOAD_FOR_PAYMENT_FAILED', HttpStatus.INTERNAL_SERVER_ERROR, statusError);
    }

    if (!statusRow) {
      throw new ApiHttpException({ code: 'ORDER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const existing = statusRow as DbOrderStatusRow;
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

    const detail = await this.getOrderById(orderId);
    this.eventEmitter.emit('order.paid.success', buildOrderPaidSuccessEvent(detail, paidAt));
    return detail;
  }
}
