const payload = {
  timestamp: 1781316127,
  notification_type: 'ORDER_PAID',
  order: {
    id: 'cc1c9f41-66cb-11f1-b21a-a6006ab65aca',
    order_id: 'PAY30686A2CB9FB6183A',
    order_status: 'CAPTURED',
    order_currency: 'VND',
    order_amount: '39531.00',
    order_invoice_number: 'INV-ORD-20260613-V992JL-1781316091161'
  },
  transaction: {
    id: 'e1804729-66cb-11f1-b21a-a6006ab65aca',
    payment_method: 'BANK_TRANSFER',
    transaction_id: 'FT26164093166357',
    transaction_type: 'PAYMENT',
    transaction_date: '2026-06-13 09:02:00',
    transaction_status: 'APPROVED',
    transaction_amount: '39531',
    transaction_currency: 'VND'
  }
};

fetch('http://localhost:3000/payments/sepay/ipn', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-secret-key': 'spsk_live_65RQvBT9w1NZoB6UqB2JtZpQvH6HwPDr'
  },
  body: JSON.stringify(payload)
})
  .then(r => Promise.all([r.status, r.text()]))
  .then(([status, text]) => console.log('STATUS:', status, 'BODY:', text))
  .catch(console.error);
