import { createHmac } from 'crypto';

export const SEPAY_SIGNED_FIELDS = [
  'order_amount',
  'merchant',
  'currency',
  'operation',
  'order_description',
  'order_invoice_number',
  'customer_id',
  'payment_method',
  'success_url',
  'error_url',
  'cancel_url',
] as const;

export type SepaySignedFieldKey = (typeof SEPAY_SIGNED_FIELDS)[number];

export type SepaySignedFields = Partial<Record<SepaySignedFieldKey, string>>;

export const buildSepaySignedString = (fields: SepaySignedFields): string =>
  SEPAY_SIGNED_FIELDS.filter((field) => typeof fields[field] === 'string')
    .map((field) => `${field}=${fields[field]}`)
    .join(',');

export const buildSepaySignature = (
  fields: SepaySignedFields,
  secretKey: string,
): string =>
  createHmac('sha256', secretKey)
    .update(buildSepaySignedString(fields))
    .digest('base64');
