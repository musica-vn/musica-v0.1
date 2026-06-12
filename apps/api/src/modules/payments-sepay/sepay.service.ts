import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import { throwSupabaseError } from '../../common/database/supabase-errors';
import { isUniqueViolation } from '../../common/database/postgres-errors';
import { SupabaseService } from '../../database/supabase.service';
import { OrdersService } from '../orders/orders.service';
import {
  type SepayCheckoutRequestDto,
  type SepayCheckoutResponseDto,
  type SepayBankhubWebhookRequestDto,
  type SepayIpnAcknowledgementDto,
  type SepayIpnRequestDto,
  type SepayWebhookAcknowledgementDto,
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

    const invoiceNumber = payload.order.order_invoice_number;
    const { data: paymentAttempts, error: paymentLoadError } =
      await this.supabaseService.client
        .from('order_payments')
        .select('id,order_id,invoice_number,status')
        .eq('invoice_number', invoiceNumber)
        .returns<DbSepayPaymentAttemptRow[]>();

    if (paymentLoadError) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        paymentLoadError,
      );
    }

    if ((paymentAttempts ?? []).length > 1) {
      throw new ApiHttpException(
        {
          code: 'SEPAY_PAYMENT_ATTEMPT_DUPLICATED',
          details: { invoiceNumber, count: (paymentAttempts ?? []).length },
        },
        HttpStatus.CONFLICT,
      );
    }

    const attempt =
      (paymentAttempts ?? [])[0] ??
      (await this.reconcilePaymentAttemptFromInvoice(invoiceNumber));

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
      .eq('invoice_number', invoiceNumber);

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

  async handleWebhook(
    authorizationHeader: string | undefined,
    payload: SepayBankhubWebhookRequestDto,
  ): Promise<SepayWebhookAcknowledgementDto> {
    const expected = this.configService.get<string>('SEPAY_WEBHOOK_API_KEY');
    if (!expected) {
      throw new ApiHttpException(
        { code: 'SERVER_MISCONFIGURED', details: { missingKey: 'SEPAY_WEBHOOK_API_KEY' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const expectedHeader = `Apikey ${expected}`;
    if (!authorizationHeader || authorizationHeader.trim() !== expectedHeader) {
      throw new ApiHttpException({ code: 'SEPAY_WEBHOOK_UNAUTHORIZED' }, HttpStatus.UNAUTHORIZED);
    }

    if (payload.transferType !== 'in') {
      return { acknowledged: true, matched: false };
    }

    const fromDate = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error: candidatesError } =
      await this.supabaseService.client
        .from('order_payments')
        .select('id,order_id,invoice_number,status,amount,created_at')
        .eq('provider', 'SEPAY')
        .eq('status', 'PENDING')
        .eq('amount', payload.transferAmount)
        .gte('created_at', fromDate)
        .order('created_at', { ascending: false })
        .range(0, 1)
        .returns<Array<DbSepayPaymentAttemptRow & { amount: number | string; created_at: string }>>();

    if (candidatesError) {
      throwSupabaseError(
        'SEPAY_WEBHOOK_CANDIDATES_LOOKUP_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        candidatesError,
      );
    }

    if ((candidates ?? []).length !== 1) {
      return { acknowledged: true, matched: false };
    }

    const attempt = candidates[0];
    const paidAt = this.parseVietnamTransactionDate(payload.transactionDate) ?? new Date().toISOString();
    const transactionId =
      (typeof payload.referenceCode === 'string' && payload.referenceCode.trim().length > 0
        ? payload.referenceCode.trim()
        : String(payload.id));

    const { error: updateError } = await this.supabaseService.client
      .from('order_payments')
      .update({
        status: 'SUCCEEDED',
        transaction_id: transactionId,
        provider_order_id: payload.code ?? null,
        provider_transaction_id: transactionId,
        paid_at: paidAt,
        raw_payload: payload,
      })
      .eq('id', attempt.id);

    if (updateError) {
      throwSupabaseError(
        'SEPAY_WEBHOOK_PAYMENT_ATTEMPT_UPDATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        updateError,
      );
    }

    await this.ordersService.completeExternalPayment(attempt.order_id, {
      provider: 'SEPAY',
      transactionId,
      paidAt,
      rawPayload: payload as unknown as Record<string, unknown>,
    });

    return { acknowledged: true, matched: true };
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

    const { error: insertError } = await this.supabaseService.client
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
      });

    if (insertError && !isUniqueViolation(insertError)) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        insertError,
      );
    }

    const { data: attempts, error: reloadError } = await this.supabaseService.client
      .from('order_payments')
      .select('id,order_id,invoice_number,status')
      .eq('invoice_number', invoiceNumber)
      .returns<DbSepayPaymentAttemptRow[]>();

    if (reloadError) {
      throwSupabaseError(
        'SEPAY_PAYMENT_ATTEMPT_LOAD_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        reloadError,
      );
    }

    const attempt = (attempts ?? [])[0];
    if (!attempt) {
      throw new ApiHttpException(
        { code: 'SEPAY_PAYMENT_ATTEMPT_NOT_FOUND', details: { invoiceNumber } },
        HttpStatus.NOT_FOUND,
      );
    }

    return attempt;
  }

  private parseOrderNumberFromInvoice(invoiceNumber: string): string | null {
    const match = /^INV-(.+)-\d{10,13}$/.exec(invoiceNumber);
    return match?.[1] ?? null;
  }

  private parseVietnamTransactionDate(value: string): string | null {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return null;
    const isoLike = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
    const withOffset =
      isoLike.includes('Z') || isoLike.includes('+')
        ? isoLike
        : `${isoLike}+07:00`;
    const date = new Date(withOffset);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
