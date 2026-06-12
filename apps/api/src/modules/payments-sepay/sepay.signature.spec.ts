import { buildSepaySignature, buildSepaySignedString } from './sepay.signature';

describe('sepay.signature', () => {
  it('builds signed string in SePay field order without sorting', () => {
    const signed = buildSepaySignedString({
      order_amount: '100000',
      merchant: 'SP-TEST-XXXX',
      currency: 'VND',
      operation: 'PURCHASE',
      order_description: 'Thanh toan don hang ORD-1',
      order_invoice_number: 'INV-1',
      success_url: 'https://example.com/success',
      error_url: 'https://example.com/error',
      cancel_url: 'https://example.com/cancel',
      payment_method: 'BANK_TRANSFER',
    });

    expect(signed).toBe(
      'order_amount=100000,merchant=SP-TEST-XXXX,currency=VND,operation=PURCHASE,order_description=Thanh toan don hang ORD-1,order_invoice_number=INV-1,payment_method=BANK_TRANSFER,success_url=https://example.com/success,error_url=https://example.com/error,cancel_url=https://example.com/cancel',
    );
  });

  it('builds HMAC SHA256 base64 signature for checkout fields', () => {
    const signature = buildSepaySignature(
      {
        order_amount: '100000',
        merchant: 'SP-TEST-XXXX',
        currency: 'VND',
        operation: 'PURCHASE',
        order_description: 'Thanh toan don hang ORD-1',
        order_invoice_number: 'INV-1',
        payment_method: 'BANK_TRANSFER',
        success_url: 'https://example.com/success',
        error_url: 'https://example.com/error',
        cancel_url: 'https://example.com/cancel',
      },
      'secret-key',
    );

    expect(signature).toBe('Y7C+HEg+jQmMz6ZnP5jVYOECSF1eakgTOeBeIsJWEB0=');
  });
});
