import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import { throwSupabaseError } from '../../common/database/supabase-errors';
import { SupabaseService } from '../../database/supabase.service';
import { OrdersService } from '../orders/orders.service';
import {
  type SepayCheckoutRequestDto,
  type SepayCheckoutResponseDto,
  type SepayIpnAcknowledgementDto,
  type SepayIpnRequestDto,
} from './sepay.dto';
import { buildSepaySignature, type SepaySignedFields } from './sepay.signature';

type DbOrderCheckoutRow = {
  id: string;
  order_number: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  currency: string;
  total_amount: number | string;
};

type DbSepayPaymentAttemptRow = {
  id: string;
  order_id: string;
  invoice_number: string | null;
  status: string;
};

type DbOrderPaymentValidationRow = {
  id: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
  currency: string;
  total_amount: number | string;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const normalizeVndAmount = (value: number | string): string =>
  String(Math.round(Number(value)));

const buildInvoiceNumber = (orderNumber: string): string =>
  `INV-${orderNumber}-${Date.now()}`;

@Injectable()
export class SepayService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  async createCheckoutSession(
    payload: SepayCheckoutRequestDto,
  ): Promise<SepayCheckoutResponseDto> {
    const order = await this.loadCheckoutOrder(payload.orderId);
    const invoiceNumber = buildInvoiceNumber(order.order_number);
    const actionUrl = this.getCheckoutActionUrl();
    const fields = this.buildCheckoutFields(
      order,
      invoiceNumber,
      payload.orderId,
      payload.paymentMethod,
    );

    const { error } = await this.supabaseService.client.from('order_payments').insert({
      order_id: order.id,
      provider: 'SEPAY',
      transaction_id: null,
      status: 'PENDING',
      amount: Number(order.total_amount),
      paid_at: null,
      raw_payload: { stage: 'checkout_created', action_url: actionUrl },
      invoice_number: invoiceNumber,
      provider_order_id: null,
      provider_transaction_id: null,
    });

    if (error) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    return {
      actionUrl,
      method: 'POST',
      fields,
    };
  }

  async buildCheckoutRedirectHtml(
    payload: SepayCheckoutRequestDto,
  ): Promise<string> {
    const session = await this.createCheckoutSession(payload);
    const inputs = Object.entries(session.fields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
      )
      .join('\n');

    return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting to SePay</title>
  </head>
  <body>
    <p>Dang chuyen sang SePay...</p>
    <form action="${escapeHtml(session.actionUrl)}" method="POST">
      ${inputs}
      <noscript><button type="submit">Tiep tuc thanh toan</button></noscript>
    </form>
    <script>document.forms[0].submit();</script>
  </body>
</html>`;
  }

  async handleIpn(
    secretKeyHeader: string | undefined,
    payload: SepayIpnRequestDto,
  ): Promise<SepayIpnAcknowledgementDto> {
    const expectedSecret = this.configService.get<string>('SEPAY_IPN_SECRET_KEY');
    if (!expectedSecret || secretKeyHeader !== expectedSecret) {
      throw new ApiHttpException(
        { code: 'SEPAY_IPN_UNAUTHORIZED' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.notification_type !== 'ORDER_PAID') {
      return { acknowledged: true };
    }

    const { data: paymentAttempt, error: paymentLoadError } =
      await this.supabaseService.client
        .from('order_payments')
        .select('id,order_id,invoice_number,status')
        .eq('invoice_number', payload.order.order_invoice_number)
        .maybeSingle();

    if (paymentLoadError) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        paymentLoadError,
      );
    }

    const attempt = paymentAttempt
      ? (paymentAttempt as DbSepayPaymentAttemptRow)
      : await this.reconcilePaymentAttemptFromInvoice(
          payload.order.order_invoice_number,
        );

    const { data: orderRow, error: orderLoadError } =
      await this.supabaseService.client
        .from('orders')
        .select('id,status,currency,total_amount')
        .eq('id', attempt.order_id)
        .maybeSingle();

    if (orderLoadError) {
      throwSupabaseError(
        'SEPAY_ORDER_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        orderLoadError,
      );
    }

    if (!orderRow) {
      throw new ApiHttpException(
        { code: 'SEPAY_ORDER_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    const order = orderRow as DbOrderPaymentValidationRow;
    const expectedAmount = normalizeVndAmount(order.total_amount);
    const payloadAmount = normalizeVndAmount(payload.order.order_amount);

    if (order.currency !== payload.order.order_currency || expectedAmount !== payloadAmount) {
      throw new ApiHttpException(
        {
          code: 'SEPAY_IPN_AMOUNT_MISMATCH',
          details: {
            expectedCurrency: order.currency,
            actualCurrency: payload.order.order_currency,
            expectedAmount,
            actualAmount: payloadAmount,
          },
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const paidAt = new Date(payload.timestamp * 1000).toISOString();

    const { error: updateError } = await this.supabaseService.client
      .from('order_payments')
      .update({
        status: 'SUCCEEDED',
        transaction_id: payload.transaction.transaction_id,
        provider_order_id: payload.order.order_id,
        provider_transaction_id: payload.transaction.transaction_id,
        paid_at: paidAt,
        raw_payload: payload,
      })
      .eq('id', attempt.id);

    if (updateError) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_UPDATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        updateError,
      );
    }

    await this.ordersService.completeExternalPayment(attempt.order_id, {
      provider: 'SEPAY',
      transactionId: payload.transaction.transaction_id,
      paidAt,
      rawPayload: payload as unknown as Record<string, unknown>,
    });

    return { acknowledged: true };
  }

  private async loadCheckoutOrder(orderId: string): Promise<DbOrderCheckoutRow> {
    const { data, error } = await this.supabaseService.client
      .from('orders')
      .select('id,order_number,status,currency,total_amount')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      throwSupabaseError(
        'SEPAY_CHECKOUT_ORDER_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    if (!data) {
      throw new ApiHttpException({ code: 'ORDER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const order = data as DbOrderCheckoutRow;
    if (order.status === 'PAID') {
      throw new ApiHttpException(
        { code: 'ORDER_ALREADY_PAID' },
        HttpStatus.CONFLICT,
      );
    }

    if (order.status === 'CANCELLED') {
      throw new ApiHttpException(
        { code: 'ORDER_INVALID_STATUS_TRANSITION', details: { from: 'CANCELLED', to: 'CHECKOUT' } },
        HttpStatus.CONFLICT,
      );
    }

    return order;
  }

  private async reconcilePaymentAttemptFromInvoice(
    invoiceNumber: string,
  ): Promise<DbSepayPaymentAttemptRow> {
    const orderNumber = this.parseOrderNumberFromInvoice(invoiceNumber);
    if (!orderNumber) {
      throw new ApiHttpException(
        { code: 'SEPAY_PAYMENT_ATTEMPT_NOT_FOUND', details: { invoiceNumber } },
        HttpStatus.NOT_FOUND,
      );
    }

    const { data: orderRow, error: orderLoadError } =
      await this.supabaseService.client
        .from('orders')
        .select('id,status,currency,total_amount')
        .eq('order_number', orderNumber)
        .maybeSingle();

    if (orderLoadError) {
      throwSupabaseError(
        'SEPAY_ORDER_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        orderLoadError,
      );
    }

    if (!orderRow) {
      throw new ApiHttpException(
        { code: 'SEPAY_ORDER_NOT_FOUND', details: { orderNumber, invoiceNumber } },
        HttpStatus.NOT_FOUND,
      );
    }

    const { data: createdAttempt, error: insertError } =
      await this.supabaseService.client
        .from('order_payments')
        .insert({
          order_id: orderRow.id,
          provider: 'SEPAY',
          transaction_id: null,
          status: 'PENDING',
          amount: Number(orderRow.total_amount),
          paid_at: null,
          raw_payload: { stage: 'ipn_reconciled' },
          invoice_number: invoiceNumber,
          provider_order_id: null,
          provider_transaction_id: null,
        })
        .select('id,order_id,invoice_number,status')
        .maybeSingle();

    if (insertError) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        insertError,
      );
    }

    if (!createdAttempt) {
      throw new ApiHttpException(
        { code: 'SEPAY_PAYMENT_ATTEMPT_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return createdAttempt as DbSepayPaymentAttemptRow;
  }

  private parseOrderNumberFromInvoice(invoiceNumber: string): string | null {
    const match = /^INV-(.+)-\d{10,13}$/.exec(invoiceNumber);
    return match?.[1] ?? null;
  }

  private buildCheckoutFields(
    order: DbOrderCheckoutRow,
    invoiceNumber: string,
    orderId: string,
    paymentMethod?: string,
  ): SepayCheckoutResponseDto['fields'] {
    const merchantId = this.getRequiredConfig('SEPAY_MERCHANT_ID');
    const secretKey = this.getRequiredConfig('SEPAY_SECRET_KEY');
    const signedFields = {
      order_amount: normalizeVndAmount(order.total_amount),
      merchant: merchantId,
      currency: order.currency,
      operation: 'PURCHASE',
      order_description: `Thanh toan don hang ${order.order_number}`,
      order_invoice_number: invoiceNumber,
      success_url: this.buildGatewayCallbackUrl(
        this.getRequiredConfig('SEPAY_SUCCESS_URL'),
        orderId,
      ),
      error_url: this.buildGatewayCallbackUrl(
        this.getRequiredConfig('SEPAY_ERROR_URL'),
        orderId,
      ),
      cancel_url: this.buildGatewayCallbackUrl(
        this.getRequiredConfig('SEPAY_CANCEL_URL'),
        orderId,
      ),
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
    } satisfies SepaySignedFields;

    return {
      order_amount: signedFields.order_amount,
      merchant: signedFields.merchant,
      currency: signedFields.currency,
      operation: signedFields.operation,
      order_description: signedFields.order_description,
      order_invoice_number: signedFields.order_invoice_number,
      ...(signedFields.payment_method
        ? { payment_method: signedFields.payment_method }
        : {}),
      success_url: signedFields.success_url,
      error_url: signedFields.error_url,
      cancel_url: signedFields.cancel_url,
      signature: buildSepaySignature(signedFields, secretKey),
    };
  }

  private getCheckoutActionUrl(): string {
    const environment =
      this.configService.get<string>('SEPAY_ENVIRONMENT')?.toLowerCase() ??
      'sandbox';

    if (environment === 'production') {
      return 'https://pay.sepay.vn/v1/checkout/init';
    }

    return 'https://pay-sandbox.sepay.vn/v1/checkout/init';
  }

  buildClientResultRedirectUrl(
    status: 'success' | 'error' | 'cancel',
    orderId?: string,
  ): string {
    const clientAppUrl =
      this.configService.get<string>('SEPAY_CLIENT_APP_URL')?.trim() ||
      'http://localhost:5174';
    const url = new URL(`/${status}`, clientAppUrl.endsWith('/') ? clientAppUrl : `${clientAppUrl}/`);
    if (orderId) {
      url.searchParams.set('orderId', orderId);
    }

    return url.toString();
  }

  private buildGatewayCallbackUrl(baseUrl: string, orderId: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('orderId', orderId);
    return url.toString();
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new ApiHttpException(
        { code: 'SERVER_MISCONFIGURED', details: { missingKey: key } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return value;
  }
}
