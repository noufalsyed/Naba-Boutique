import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, discountPercent, shippingFor, stockStatus } from '@/lib/pricing';
import { cartOrderMessage, productEnquiryMessage, productOrderMessage, waLink } from '@/lib/whatsapp';
import { checkoutSchema, phone, stitchingFields, adjustmentInput, productInput } from '@/lib/validators';
import { istRange, formatINR } from '@/lib/format';
import { slugify, productPath } from '@/lib/slug';
import { purchaseTotals, lineTotal } from '@/server/purchases';

const rules = { flat: 79, freeAbove: 1499 };

test('discount percent rounds and ignores MRP below price', () => {
  assert.equal(discountPercent(1299, 1599), 19);
  assert.equal(discountPercent(1000, 1000), 0);
  assert.equal(discountPercent(1000, 900), 0);
  assert.equal(discountPercent(500, 0), 0);
});

test('shipping is flat below the threshold and free at or above it', () => {
  assert.equal(shippingFor(0, rules), 0);
  assert.equal(shippingFor(1498, rules), 79);
  assert.equal(shippingFor(1499, rules), 0);
});

test('order totals: MRP savings, shipping, GST inclusive', () => {
  const t = computeTotals([{ price: 1299, mrp: 1599, quantity: 1 }, { price: 449, mrp: 549, quantity: 2 }], rules);
  assert.equal(t.mrpTotal, 2697);
  assert.equal(t.subtotal, 2197);
  assert.equal(t.discount, 500);
  assert.equal(t.shipping, 0);
  assert.equal(t.tax, 0);
  assert.equal(t.total, 2197);
  assert.equal(t.itemCount, 3);
  const small = computeTotals([{ price: 699, mrp: 899, quantity: 1 }], rules);
  assert.equal(small.total, 699 + 79);
});

test('bill discount never exceeds subtotal and can lift shipping', () => {
  const t = computeTotals([{ price: 1500, mrp: 1500, quantity: 1 }], rules, 100);
  assert.equal(t.total, 1400 + 79);
  const capped = computeTotals([{ price: 100, mrp: 100, quantity: 1 }], { flat: 0, freeAbove: 0 }, 500);
  assert.equal(capped.total, 0);
});

test('stock status thresholds', () => {
  assert.equal(stockStatus(0, 3), 'OUT_OF_STOCK');
  assert.equal(stockStatus(-1, 3), 'OUT_OF_STOCK');
  assert.equal(stockStatus(3, 3), 'LOW_STOCK');
  assert.equal(stockStatus(4, 3), 'IN_STOCK');
});

test('purchase totals: line discount, bill discount and charges', () => {
  assert.equal(lineTotal({ quantity: 20, purchasePrice: 450 }), 9000);
  assert.equal(lineTotal({ quantity: 10, purchasePrice: 650, discount: 100 }), 6400);
  const t = purchaseTotals([{ quantity: 20, purchasePrice: 450 }, { quantity: 10, purchasePrice: 650 }], 500, 200);
  assert.deepEqual(t, { subtotal: 15500, discount: 500, additionalCharges: 200, grandTotal: 15200 });
});

test('WhatsApp product message matches the brief', () => {
  const m = productEnquiryMessage('Feathers – The 2nd Skin', { name: 'Premium Cotton Chudidhar', sku: 'FTS-001', price: 1299 });
  assert.equal(m, 'Hi Feathers – The 2nd Skin, I am interested in Premium Cotton Chudidhar, SKU FTS-001, Price ₹1,299. Please confirm availability.');
  const o = productOrderMessage('Feathers', { name: 'Kurti', sku: 'FTS-9', size: 'M', color: 'Navy', quantity: 2, price: 999 });
  for (const part of ['Product: Kurti', 'SKU: FTS-9', 'Size: M', 'Color: Navy', 'Quantity: 2', 'Price: ₹999 each (₹1,998 total)', 'Please confirm availability and delivery details.']) {
    assert.ok(o.includes(part), part);
  }
});

test('WhatsApp cart message has order number, lines, total and address', () => {
  const m = cartOrderMessage('Feathers', {
    orderNumber: 'FTS-2026-00001',
    customerName: 'Anjali',
    phone: '9895011122',
    lines: [{ name: 'A', sku: 'S1', size: 'L', color: '', quantity: 1, price: 500 }],
    subtotal: 500,
    shipping: 79,
    total: 579,
    address: 'MG Road, Kochi',
  });
  assert.match(m, /FTS-2026-00001/);
  assert.match(m, /1\. A \(SKU S1\)/);
  assert.match(m, /Shipping: ₹79/);
  assert.match(m, /Total: ₹579/);
  assert.match(m, /Delivery address: MG Road, Kochi/);
  const link = waLink('+91 98765-43210', 'hi & bye');
  assert.equal(link, 'https://wa.me/919876543210?text=hi%20%26%20bye');
});

test('phone numbers are normalised and validated', () => {
  assert.equal(phone().parse('+91 98950 11122'), '9895011122');
  assert.equal(phone().parse('09895011122'), '9895011122');
  assert.throws(() => phone().parse('12345'));
  assert.throws(() => phone().parse('5895011122'));
});

test('checkout validation rejects bad PIN codes and strips markup', () => {
  const base = { name: '  <b>Asha</b> ', phone: '9895011122', address: 'House 1', city: 'Kochi', state: 'Kerala', pincode: '682016', method: 'ONLINE', lines: [{ variantId: 'v1', quantity: 1 }] };
  const ok = checkoutSchema.parse(base);
  assert.equal(ok.name, 'bAsha/b');
  assert.throws(() => checkoutSchema.parse({ ...base, pincode: '012345' }));
  assert.throws(() => checkoutSchema.parse({ ...base, lines: [] }));
  assert.throws(() => checkoutSchema.parse({ ...base, lines: [{ variantId: 'v1', quantity: 0 }] }));
  assert.throws(() => checkoutSchema.parse({ ...base, lines: [{ variantId: 'v1', quantity: 1.5 }] }));
});

test('stitching form requires name and phone only', () => {
  const r = stitchingFields.parse({ name: 'Fathima', phone: '9746033344', bust: '36', waist: '' });
  assert.equal(r.bust, '36');
  assert.equal(r.waist, undefined);
  assert.throws(() => stitchingFields.parse({ name: '', phone: '9746033344' }));
});

test('adjustment and product validation', () => {
  assert.equal(adjustmentInput.parse({ variantId: 'v', type: 'CORRECTION', quantity: '-2', reason: 'count' }).quantity, -2);
  assert.throws(() => adjustmentInput.parse({ variantId: 'v', type: 'DAMAGED', quantity: 2, reason: '' }));
  assert.throws(() => productInput.parse({ name: 'X', categoryId: 'c', variants: [] }));
  assert.throws(() => productInput.parse({ name: 'X', categoryId: 'c', images: [{ url: 'javascript:alert(1)' }], variants: [{ size: 'M', price: 1, mrp: 1 }] }));
});

test('IST date ranges', () => {
  const r = istRange('2026-11-01', '2026-11-01');
  assert.equal(r.start.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.equal(r.end.toISOString(), '2026-11-01T18:30:00.000Z');
  const open = istRange('2020-01-01');
  assert.ok(open.end.getTime() > Date.now(), 'open-ended range runs to today');
});

test('formatting and slugs', () => {
  assert.equal(formatINR(1299), '₹1,299');
  assert.equal(formatINR(1299.5), '₹1,299.50');
  assert.equal(slugify('Designer Anarkali Dress Material!'), 'designer-anarkali-dress-material');
  assert.equal(slugify('Salwar & Kurti'), 'salwar-and-kurti');
  assert.equal(productPath('chudidhars', 'cotton'), '/shop/chudidhars/cotton');
});
