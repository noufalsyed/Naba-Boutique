// End-to-end tests against a running server (default http://localhost:3600, PAYMENT_GATEWAY=mock).
// Exercises the real HTTP API as the browser does and checks the database afterwards.
//   npm run test:e2e            (dev server and dev DB must be running)
import '../../scripts/load-env';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3600';
const prisma = new PrismaClient();
let ipSeq = 0;
const freshIp = () => `10.9.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;

// ───────── HTTP helpers ─────────
class Client {
  cookie = '';
  ip = freshIp();
  async req(path: string, init: { method?: string; body?: unknown; form?: FormData; origin?: string | null; ip?: string } = {}) {
    const headers: Record<string, string> = { 'x-real-ip': init.ip ?? this.ip };
    if (init.origin !== null) headers.origin = init.origin ?? BASE;
    if (this.cookie) headers.cookie = this.cookie;
    if (init.body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(BASE + path, {
      method: init.method ?? (init.body !== undefined || init.form ? 'POST' : 'GET'),
      headers,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      redirect: 'manual',
    });
    const set = res.headers.get('set-cookie');
    if (set?.includes('fts_admin=')) this.cookie = set.split(';')[0];
    const type = res.headers.get('content-type') ?? '';
    const json = type.includes('json') ? ((await res.json()) as { data?: unknown; error?: { message: string } }) : null;
    const text = json ? '' : await res.text();
    return { status: res.status, data: json?.data as any, error: json?.error, text, headers: res.headers };
  }
  async ok(path: string, body?: unknown, method?: string) {
    const r = await this.req(path, { body, method });
    if (r.status >= 300) throw new Error(`${method ?? 'POST'} ${path} → ${r.status} ${r.error?.message ?? r.text.slice(0, 200)}`);
    return r.data;
  }
}

// ───────── test runner ─────────
const results: { name: string; ok: boolean; ms: number; err?: string }[] = [];
async function step(name: string, fn: () => Promise<void>) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✔ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t, err: (e as Error).message });
    console.log(`  ✘ ${name}\n      ${(e as Error).message}`);
  }
}

// ───────── data helpers ─────────
const variant = (id: string) => prisma.productVariant.findUniqueOrThrow({ where: { id } });
async function pickVariant(minAvailable: number, exclude: string[] = []) {
  const vs = await prisma.productVariant.findMany({ where: { isActive: true, product: { status: 'ACTIVE' }, id: { notIn: exclude } }, orderBy: { sku: 'asc' } });
  const v = vs.find((x) => x.stock - x.reserved >= minAvailable);
  if (!v) throw new Error(`No variant with ${minAvailable} available`);
  return v;
}
const customer = (extra: Record<string, unknown> = {}) => ({
  name: 'E2E Tester',
  phone: '9876500001',
  email: 'e2e@example.com',
  address: '1 Test Street',
  city: 'Kochi',
  state: 'Kerala',
  pincode: '682001',
  method: 'ONLINE',
  ...extra,
});
async function payMock(c: Client, number: string, key: string, outcome: 'success' | 'failure') {
  const start = await c.ok('/api/payments/start', { number, key });
  assert.equal(start.checkout.type, 'redirect');
  const po = new URL(start.checkout.url, BASE).searchParams.get('po')!;
  const signed = await c.ok('/api/payments/mock/complete', { providerOrderId: po, outcome });
  return { po, signed, verify: await c.ok('/api/payments/verify', signed) };
}
function adminCreds() {
  const txt = fs.existsSync('TEST-LOGINS.txt') ? fs.readFileSync('TEST-LOGINS.txt', 'utf8') : '';
  const get = (role: string) => {
    const m = txt.match(new RegExp(`^${role}\\s+(\\S+)\\s+(\\S+)`, 'm'));
    return { email: process.env[`E2E_${role}_EMAIL`] ?? m?.[1], password: process.env[`E2E_${role}_PASSWORD`] ?? m?.[2] };
  };
  return { admin: get('ADMIN'), cashier: get('CASHIER') };
}

async function main() {
  console.log(`E2E against ${BASE}\n`);
  const shopper = new Client();
  const admin = new Client();
  const cashier = new Client();
  const creds = adminCreds();

  console.log('Storefront & SEO');
  await step('public pages load (home, shop, category, product, categories, info pages)', async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { status: 'ACTIVE' }, include: { category: true } });
    for (const p of ['/', '/shop', '/shop?flag=new', `/shop/${product.category.slug}`, `/shop/${product.category.slug}/${product.slug}`, '/categories', '/cart', '/checkout', '/account', '/track', '/customized-stitching', '/about', '/contact', '/privacy-policy', '/terms', '/shipping-returns']) {
      const r = await shopper.req(p);
      assert.equal(r.status, 200, `${p} → ${r.status}`);
    }
  });
  await step('product page has canonical URL, Open Graph, Product + Breadcrumb JSON-LD', async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { status: 'ACTIVE' }, include: { category: true } });
    const path = `/shop/${product.category.slug}/${product.slug}`;
    const html = (await shopper.req(path)).text;
    assert.match(html, new RegExp(`<link rel="canonical" href="[^"]*${path}"`));
    assert.match(html, /property="og:title"/);
    assert.match(html, /"@type":"Product"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.match(html, /"@type":"ClothingStore"/);
  });
  await step('wrong category in product URL redirects to the canonical one', async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { status: 'ACTIVE', category: { slug: { not: 'fabrics' } } } });
    const r = await shopper.req(`/shop/fabrics/${product.slug}`);
    assert.ok([307, 308].includes(r.status), `status ${r.status}`);
  });
  await step('sitemap.xml lists products; robots.txt hides admin and checkout', async () => {
    const sm = (await shopper.req('/sitemap.xml')).text;
    assert.match(sm, /\/shop\/chudidhars\//);
    const rb = (await shopper.req('/robots.txt')).text;
    assert.match(rb, /Disallow: \/admin/);
    assert.match(rb, /Disallow: \/checkout/);
    assert.match(rb, /Sitemap: /);
  });
  await step('search and filters narrow the shop listing', async () => {
    const all = (await shopper.req('/shop')).text;
    const q = (await shopper.req('/shop?q=kasavu')).text;
    assert.match(q, /Kerala Kasavu Fabric/);
    assert.doesNotMatch(q, /Premium Cotton Chudidhar<\/a>/);
    const cheap = (await shopper.req('/shop?max=999')).text;
    assert.doesNotMatch(cheap, /Festive Collection Anarkali Set<\/a>/);
    assert.ok(all.length > cheap.length);
  });
  await step('security headers are sent (CSP, HSTS, nosniff, frame options)', async () => {
    const r = await shopper.req('/');
    assert.match(r.headers.get('content-security-policy') ?? '', /default-src 'self'/);
    assert.ok(r.headers.get('strict-transport-security'));
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  console.log('\nCheckout, payment and stock');
  let paidOrderNumber = '';
  await step('online order reserves stock; verified payment commits it (Sale movement)', async () => {
    const v = await pickVariant(3);
    const before = await variant(v.id);
    const order = await shopper.ok('/api/checkout', customer({ lines: [{ variantId: v.id, quantity: 2 }] }));
    assert.match(order.number, /^FTS-\d{4}-\d{5}$/);
    const held = await variant(v.id);
    assert.equal(held.stock, before.stock, 'stock unchanged while unpaid');
    assert.equal(held.reserved, before.reserved + 2, 'reserved +2');
    const { verify } = await payMock(shopper, order.number, order.key, 'success');
    assert.equal(verify.ok, true);
    const after = await variant(v.id);
    assert.equal(after.stock, before.stock - 2);
    assert.equal(after.reserved, before.reserved);
    const o = await prisma.order.findUniqueOrThrow({ where: { number: order.number }, include: { payments: true } });
    assert.equal(o.paymentStatus, 'PAID');
    assert.equal(o.status, 'PAID');
    assert.equal(o.stockState, 'COMMITTED');
    assert.equal(o.payments[0].status, 'SUCCESS');
    assert.ok(o.payments[0].providerPaymentId);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: v.id, reference: order.number } });
    assert.equal(mv.type, 'SALE');
    assert.equal(mv.quantity, -2);
    assert.equal(mv.previousStock, before.stock);
    assert.equal(mv.newStock, before.stock - 2);
    const page = (await shopper.req(`/order/${order.number}?key=${order.key}`)).text;
    assert.match(page, /Order Confirmed!/);
    assert.match(page, /Track Order/);
    paidOrderNumber = order.number;
  });
  await step('payment verification is idempotent (replayed callback changes nothing)', async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { number: paidOrderNumber }, include: { payments: true, items: true } });
    const v0 = await variant(o.items[0].variantId);
    const pay = o.payments[0];
    const signed = await shopper.ok('/api/payments/mock/complete', { providerOrderId: pay.providerOrderId, outcome: 'success' });
    await shopper.ok('/api/payments/verify', signed);
    const v1 = await variant(o.items[0].variantId);
    assert.equal(v1.stock, v0.stock);
  });
  await step('forged payment signature is rejected and the order stays unpaid', async () => {
    const v = await pickVariant(1);
    const order = await shopper.ok('/api/checkout', customer({ lines: [{ variantId: v.id, quantity: 1 }] }));
    const start = await shopper.ok('/api/payments/start', { number: order.number, key: order.key });
    const po = new URL(start.checkout.url, BASE).searchParams.get('po')!;
    const r = await shopper.ok('/api/payments/verify', { providerOrderId: po, providerPaymentId: 'mock_pay_fake', signature: 'deadbeef' });
    assert.equal(r.ok, false);
    const o = await prisma.order.findUniqueOrThrow({ where: { number: order.number } });
    assert.notEqual(o.paymentStatus, 'PAID');
  });
  await step('failed payment shows Payment Failed; retry succeeds', async () => {
    const v = await pickVariant(1);
    const order = await shopper.ok('/api/checkout', customer({ lines: [{ variantId: v.id, quantity: 1 }] }));
    const failed = await payMock(shopper, order.number, order.key, 'failure');
    assert.equal(failed.verify.ok, false);
    let o = await prisma.order.findUniqueOrThrow({ where: { number: order.number } });
    assert.equal(o.paymentStatus, 'FAILED');
    assert.equal(o.stockState, 'RESERVED', 'items stay held for a retry');
    const page = (await shopper.req(`/order/${order.number}?key=${order.key}&payment=failed`)).text;
    assert.match(page, /Payment Failed/);
    assert.match(page, /Try Again/);
    assert.match(page, /Order via WhatsApp/);
    const retry = await payMock(shopper, order.number, order.key, 'success');
    assert.equal(retry.verify.ok, true);
    o = await prisma.order.findUniqueOrThrow({ where: { number: order.number } });
    assert.equal(o.paymentStatus, 'PAID');
  });
  await step('order page requires the access key (no order data leaks)', async () => {
    assert.equal((await shopper.req(`/order/${paidOrderNumber}`)).status, 404);
    assert.equal((await shopper.req(`/order/${paidOrderNumber}?key=wrong`)).status, 404);
    const o = await prisma.order.findUniqueOrThrow({ where: { number: paidOrderNumber } });
    const t = (await shopper.req(`/track?order=${o.number}&phone=${o.phone}`)).text;
    assert.match(t, new RegExp(o.number));
    const bad = (await shopper.req(`/track?order=${o.number}&phone=9000000000`)).text;
    assert.match(bad, /could not find/);
  });
  await step('cannot buy more than available; out-of-stock product is refused', async () => {
    const v = await pickVariant(1);
    const avail = v.stock - v.reserved;
    const r = await shopper.req('/api/checkout', { body: customer({ lines: [{ variantId: v.id, quantity: avail + 1 }] }) });
    assert.equal(r.status, 409);
    const out = await prisma.productVariant.findFirstOrThrow({ where: { stock: 0, product: { status: 'ACTIVE' } } });
    const r2 = await shopper.req('/api/checkout', { body: customer({ lines: [{ variantId: out.id, quantity: 1 }] }) });
    assert.equal(r2.status, 409);
    assert.match(r2.error!.message, /out of stock/i);
  });
  await step('concurrent checkouts cannot oversell the last units', async () => {
    const v = await pickVariant(2);
    const avail = v.stock - v.reserved;
    const attempts = await Promise.all(Array.from({ length: avail + 4 }, () => new Client().req('/api/checkout', { body: customer({ lines: [{ variantId: v.id, quantity: 1 }] }) })));
    const ok = attempts.filter((a) => a.status === 200).length;
    assert.equal(ok, avail, `${ok} orders succeeded for ${avail} units`);
    const after = await variant(v.id);
    assert.equal(after.reserved, after.stock, 'everything is now reserved, nothing more');
    assert.ok(after.reserved <= after.stock);
  });
  await step('server re-prices the cart (browser prices are ignored)', async () => {
    const v = await pickVariant(1);
    const r = await shopper.ok('/api/cart/validate', { lines: [{ variantId: v.id, quantity: 1 }] });
    assert.equal(r.items[0].price, Number(v.price));
  });
  await step('checkout input validation (bad phone / PIN / empty cart)', async () => {
    const v = await pickVariant(1);
    const bad = await shopper.req('/api/checkout', { body: customer({ phone: '123', lines: [{ variantId: v.id, quantity: 1 }] }) });
    assert.equal(bad.status, 400);
    const pin = await shopper.req('/api/checkout', { body: customer({ pincode: 'abc', lines: [{ variantId: v.id, quantity: 1 }] }) });
    assert.equal(pin.status, 400);
    const empty = await shopper.req('/api/checkout', { body: customer({ lines: [] }) });
    assert.equal(empty.status, 400);
  });

  console.log('\nSecurity');
  await step('CSRF: state-changing API calls from another origin are blocked', async () => {
    const r = await shopper.req('/api/checkout', { body: {}, origin: 'https://evil.example' });
    assert.equal(r.status, 403);
    const r2 = await shopper.req('/api/checkout', { body: {}, origin: null });
    assert.equal(r2.status, 403);
  });
  await step('admin pages and APIs require sign-in', async () => {
    const anon = new Client();
    const page = await anon.req('/admin');
    assert.ok([302, 307].includes(page.status));
    assert.match(page.headers.get('location') ?? '', /\/admin\/login/);
    assert.equal((await anon.req('/api/admin/variants/search?q=a')).status, 401);
    assert.equal((await anon.req('/api/admin/stock/adjust', { body: {} })).status, 401);
    const fakeCookie = new Client();
    fakeCookie.cookie = 'fts_admin=eyJhbGciOiJIUzI1NiJ9.eyJzaWQiOiJ4In0.invalid';
    assert.equal((await fakeCookie.req('/api/admin/variants/search?q=a')).status, 401);
  });
  await step('rate limiting: checkout floods get 429', async () => {
    const c = new Client();
    let limited = false;
    for (let i = 0; i < 14 && !limited; i++) limited = (await c.req('/api/checkout', { body: {} })).status === 429;
    assert.ok(limited);
  });
  await step('wrong passwords are refused; admin and cashier can sign in', async () => {
    assert.ok(creds.admin.email && creds.admin.password, 'admin login from TEST-LOGINS.txt or E2E_ADMIN_EMAIL/PASSWORD');
    const bad = await new Client().req('/api/admin/auth/login', { body: { email: creds.admin.email, password: 'wrong-password-1' } });
    assert.equal(bad.status, 401);
    await admin.ok('/api/admin/auth/login', { email: creds.admin.email, password: creds.admin.password });
    assert.match(admin.cookie, /fts_admin=/);
    await cashier.ok('/api/admin/auth/login', { email: creds.cashier.email, password: creds.cashier.password });
    assert.equal((await admin.req('/admin')).status, 200);
  });
  await step('cashier cannot use admin-only APIs (stock adjust, purchases, staff)', async () => {
    assert.equal((await cashier.req('/api/admin/stock/adjust', { body: { variantId: 'x', type: 'ADD', quantity: 1, reason: 'x' } })).status, 403);
    assert.equal((await cashier.req('/api/admin/purchases', { body: {} })).status, 403);
    assert.equal((await cashier.req('/api/admin/staff', { body: {} })).status, 403);
    assert.equal((await cashier.req('/api/admin/variants/search?q=a')).status, 200);
  });
  await step('account locks after 5 wrong passwords', async () => {
    const email = `lock${Date.now()}@feathers.local`;
    await admin.ok('/api/admin/staff', { name: 'Lock Test', email, role: 'CASHIER', password: 'Temp12345', isActive: true });
    const c = new Client();
    for (let i = 0; i < 5; i++) await c.req('/api/admin/auth/login', { body: { email, password: 'nope-1234' } });
    const r = await c.req('/api/admin/auth/login', { body: { email, password: 'Temp12345' } });
    assert.equal(r.status, 401);
    assert.match(r.error!.message, /locked/i);
    await prisma.adminUser.update({ where: { email }, data: { isActive: false } });
  });
  await step('password reset: request creates a one-hour token; invalid tokens are refused', async () => {
    const email = `reset${Date.now()}@feathers.local`;
    await admin.ok('/api/admin/staff', { name: 'Reset Test', email, role: 'CASHIER', password: 'Start12345', isActive: true });
    await shopper.ok('/api/admin/auth/forgot', { email });
    const u = await prisma.adminUser.findUniqueOrThrow({ where: { email } });
    assert.ok(u.resetTokenHash && u.resetTokenExpiry! > new Date());
    const weak = await shopper.req('/api/admin/auth/reset', { body: { token: 'x'.repeat(40), password: 'NewPass123' } });
    assert.equal(weak.status, 400);
    await prisma.adminUser.update({ where: { email }, data: { isActive: false } });
  });

  console.log('\nWhatsApp orders & order management');
  await step('WhatsApp order: reserved → Record Payment (UPI) → Confirmed, stock committed', async () => {
    const v = await pickVariant(2);
    const before = await variant(v.id);
    const order = await shopper.ok('/api/checkout', customer({ method: 'WHATSAPP', lines: [{ variantId: v.id, quantity: 1 }] }));
    const page = (await shopper.req(`/order/${order.number}?key=${order.key}&via=whatsapp`)).text;
    assert.match(page, /Send Order on WhatsApp/);
    assert.match(page, /wa\.me\/\d+\?text=/);
    const o = await prisma.order.findUniqueOrThrow({ where: { number: order.number } });
    assert.equal(o.status, 'PENDING');
    assert.equal((await variant(v.id)).reserved, before.reserved + 1);
    await admin.ok(`/api/admin/orders/${o.id}/payment`, { method: 'UPI', reference: 'UTR123' });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(after.status, 'CONFIRMED');
    assert.equal(after.paymentMethod, 'UPI');
    const va = await variant(v.id);
    assert.equal(va.stock, before.stock - 1);
    assert.equal(va.reserved, before.reserved);
  });
  await step('status flow: Processing → Shipped (tracking) → Delivered', async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { number: paidOrderNumber } });
    await admin.ok(`/api/admin/orders/${o.id}/status`, { status: 'PROCESSING' });
    await admin.ok(`/api/admin/orders/${o.id}/status`, { status: 'SHIPPED', courier: 'DTDC', trackingNumber: 'D123' });
    await admin.ok(`/api/admin/orders/${o.id}/status`, { status: 'DELIVERED' });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { statusHistory: true } });
    assert.equal(after.status, 'DELIVERED');
    assert.equal(after.trackingNumber, 'D123');
    assert.ok(after.statusHistory.length >= 4);
    const bad = await admin.req(`/api/admin/orders/${o.id}/status`, { body: { status: 'PAID' } });
    assert.equal(bad.status, 400);
  });
  await step('online order cannot be confirmed without verified payment', async () => {
    const v = await pickVariant(1);
    const order = await shopper.ok('/api/checkout', customer({ lines: [{ variantId: v.id, quantity: 1 }] }));
    const o = await prisma.order.findUniqueOrThrow({ where: { number: order.number } });
    const r = await admin.req(`/api/admin/orders/${o.id}/status`, { body: { status: 'CONFIRMED' } });
    assert.equal(r.status, 400);
  });
  await step('cancelling releases reserved stock / restores sold stock', async () => {
    const v = await pickVariant(2);
    const before = await variant(v.id);
    const pending = await shopper.ok('/api/checkout', customer({ method: 'WHATSAPP', lines: [{ variantId: v.id, quantity: 1 }] }));
    const po = await prisma.order.findUniqueOrThrow({ where: { number: pending.number } });
    await admin.ok(`/api/admin/orders/${po.id}/status`, { status: 'CANCELLED', note: 'Customer changed mind' });
    let now = await variant(v.id);
    assert.equal(now.reserved, before.reserved);
    assert.equal(now.stock, before.stock);
    const sold = await shopper.ok('/api/checkout', customer({ method: 'WHATSAPP', lines: [{ variantId: v.id, quantity: 1 }] }));
    const so = await prisma.order.findUniqueOrThrow({ where: { number: sold.number } });
    await admin.ok(`/api/admin/orders/${so.id}/payment`, { method: 'CASH' });
    assert.equal((await variant(v.id)).stock, before.stock - 1);
    await admin.ok(`/api/admin/orders/${so.id}/status`, { status: 'CANCELLED', note: 'Refunded in cash' });
    now = await variant(v.id);
    assert.equal(now.stock, before.stock);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: v.id, reference: sold.number, type: 'ORDER_CANCELLED' } });
    assert.equal(mv.quantity, 1);
    const again = await admin.req(`/api/admin/orders/${so.id}/status`, { body: { status: 'CONFIRMED' } });
    assert.equal(again.status, 409, 'cancelled orders are final');
  });

  console.log('\nCounter sales & returns');
  let storeOrderId = '';
  await step('counter sale reduces stock immediately with bill discount', async () => {
    const v = await pickVariant(2);
    const before = await variant(v.id);
    const r = await cashier.ok('/api/admin/sales', { customerName: 'Walk-in', paymentMethod: 'CASH', extraDiscount: 50, lines: [{ variantId: v.id, quantity: 2 }] });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: r.id } });
    assert.equal(o.channel, 'STORE');
    assert.equal(o.status, 'DELIVERED');
    assert.equal(Number(o.total), Number(v.price) * 2 - 50);
    assert.equal(o.cashierName, 'Counter Cashier');
    assert.equal((await variant(v.id)).stock, before.stock - 2);
    storeOrderId = r.id;
  });
  await step('sales return adds stock back (Sales Return movement); cannot over-return', async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { id: storeOrderId }, include: { items: true } });
    const it = o.items[0];
    const before = await variant(it.variantId);
    const r = await cashier.ok('/api/admin/returns', { orderId: o.id, refundMethod: 'CASH', reason: 'Size issue', items: [{ orderItemId: it.id, quantity: 1, restock: true }] });
    assert.match(r.number, /^RET-/);
    const after = await variant(it.variantId);
    assert.equal(after.stock, before.stock + 1);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { reference: r.number } });
    assert.equal(mv.type, 'SALES_RETURN');
    const ret = await prisma.salesReturn.findUniqueOrThrow({ where: { number: r.number } });
    assert.equal(Number(ret.refundAmount), Math.round(Number(it.price) * ((Number(o.subtotal) - 50) / Number(o.subtotal)) * 100) / 100, 'refund shares the bill discount');
    const over = await cashier.req('/api/admin/returns', { body: { orderId: o.id, refundMethod: 'CASH', items: [{ orderItemId: it.id, quantity: 5, restock: true }] } });
    assert.equal(over.status, 400);
  });
  await step('damaged return is recorded without restocking', async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { id: storeOrderId }, include: { items: true } });
    const it = o.items[0];
    const before = await variant(it.variantId);
    await cashier.ok('/api/admin/returns', { orderId: o.id, refundMethod: 'UPI', items: [{ orderItemId: it.id, quantity: 1, restock: false }] });
    assert.equal((await variant(it.variantId)).stock, before.stock);
    assert.equal((await prisma.orderItem.findUniqueOrThrow({ where: { id: it.id } })).returnedQty, 2);
  });

  console.log('\nPurchases, suppliers & stock');
  let supplierId = '';
  let receivedPurchaseId = '';
  await step('supplier can be created', async () => {
    const s = await admin.ok('/api/admin/suppliers', { name: `E2E Supplier ${Date.now()}`, phone: '9000000001', gstin: '32ABCDE1234F1Z5', isActive: true });
    supplierId = s.id;
  });
  await step('draft purchase does not change stock; receiving adds it (Current + Purchased)', async () => {
    const v = await pickVariant(0);
    const cat = await prisma.category.findFirstOrThrow();
    const before = await variant(v.id);
    const newName = `E2E Linen Kurti ${Date.now()}`;
    const draft = await admin.ok('/api/admin/purchases', {
      supplierId,
      invoiceNumber: 'INV-E2E',
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentStatus: 'UNPAID',
      discount: 100,
      additionalCharges: 50,
      receive: false,
      items: [
        { variantId: v.id, productName: 'x', quantity: 20, purchasePrice: 450, sellingPrice: Number(v.price), discount: 0 },
        { productName: newName, categoryId: cat.id, size: 'M', color: 'Blue', quantity: 7, purchasePrice: 300, sellingPrice: 799, mrp: 899, discount: 0 },
      ],
    });
    assert.equal((await variant(v.id)).stock, before.stock, 'draft changes nothing');
    const p = await prisma.purchase.findUniqueOrThrow({ where: { id: draft.id } });
    assert.equal(Number(p.subtotal), 20 * 450 + 7 * 300);
    assert.equal(Number(p.grandTotal), 20 * 450 + 7 * 300 - 100 + 50);
    await admin.ok(`/api/admin/purchases/${draft.id}/receive`, {});
    const after = await variant(v.id);
    assert.equal(after.stock, before.stock + 20);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: v.id, reference: p.number } });
    assert.equal(mv.type, 'PURCHASE');
    assert.equal(mv.previousStock, before.stock);
    assert.equal(mv.newStock, before.stock + 20);
    const created = await prisma.product.findFirstOrThrow({ where: { name: newName }, include: { variants: true } });
    assert.equal(created.variants[0].stock, 7);
    assert.equal(Number(created.variants[0].price), 799);
    assert.ok(Number(created.variants[0].costPrice) > 0);
    const twice = await admin.req(`/api/admin/purchases/${draft.id}/receive`, { body: {} });
    assert.equal(twice.status, 409, 'cannot receive twice');
    receivedPurchaseId = draft.id;
  });
  await step('purchase return reduces stock (Purchase Return movement)', async () => {
    const p = await prisma.purchase.findUniqueOrThrow({ where: { id: receivedPurchaseId }, include: { items: true } });
    const it = p.items[0];
    const before = await variant(it.variantId!);
    await admin.ok(`/api/admin/purchases/${p.id}/return`, { reason: 'Defective', items: [{ purchaseItemId: it.id, quantity: 3 }] });
    assert.equal((await variant(it.variantId!)).stock, before.stock - 3);
    const over = await admin.req(`/api/admin/purchases/${p.id}/return`, { body: { items: [{ purchaseItemId: it.id, quantity: 100 }] } });
    assert.equal(over.status, 400);
  });
  await step('stock adjustment: damaged −2, physical count, cannot go below zero or reserved', async () => {
    const v = await pickVariant(3);
    const before = await variant(v.id);
    const r = await admin.ok('/api/admin/stock/adjust', { variantId: v.id, type: 'DAMAGED', quantity: 2, reason: 'Stain' });
    assert.equal(r.newStock, before.stock - 2);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: v.id, type: 'ADJUSTMENT' }, orderBy: { createdAt: 'desc' } });
    assert.equal(mv.quantity, -2);
    assert.equal(mv.note, 'Stain');
    assert.equal(mv.userName, 'Store Admin');
    const count = await admin.ok('/api/admin/stock/adjust', { variantId: v.id, type: 'PHYSICAL_COUNT', quantity: before.stock + 5, reason: 'Count' });
    assert.equal(count.newStock, before.stock + 5);
    const neg = await admin.req('/api/admin/stock/adjust', { body: { variantId: v.id, type: 'REMOVE', quantity: 100000, reason: 'x' } });
    assert.equal(neg.status, 409);
  });
  await step('stock history adds up: sum of movements equals current stock', async () => {
    const vs = await prisma.productVariant.findMany({ include: { movements: true } });
    const bad = vs.filter((v) => v.movements.reduce((s, m) => s + m.quantity, 0) !== v.stock);
    assert.equal(bad.length, 0, `Mismatched SKUs: ${bad.map((b) => b.sku).join(', ')}`);
    const neg = vs.filter((v) => v.stock < 0 || v.reserved < 0 || v.reserved > v.stock);
    assert.equal(neg.length, 0, `Invalid stock/reserved: ${neg.map((b) => b.sku).join(', ')}`);
  });

  console.log('\nExcel stock upload');
  const stamp = Date.now().toString(36).toUpperCase();
  const xlsx = async (rows: (string | number)[][]) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Stock');
    ws.addRow(['SKU', 'Product Name', 'Category', 'Subcategory', 'Size', 'Color', 'Purchase Price', 'Selling Price', 'MRP', 'Opening Stock', 'Low Stock Level', 'Supplier', 'Description', 'Status']);
    rows.forEach((r) => ws.addRow(r));
    return new Blob([new Uint8Array(await wb.xlsx.writeBuffer())]);
  };
  const upload = (c: Client, path: string, blob: Blob, mode: string, stockAction = 'ADD') => {
    const fd = new FormData();
    fd.append('file', blob, 'stock.xlsx');
    fd.append('mode', mode);
    fd.append('stockAction', stockAction);
    return c.req(path, { form: fd });
  };
  await step('template downloads as .xlsx with the required columns', async () => {
    const res = await fetch(`${BASE}/api/admin/stock-upload/template`, { headers: { cookie: admin.cookie } });
    assert.equal(res.status, 200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(await res.arrayBuffer()) as unknown as ArrayBuffer);
    const head = (wb.worksheets[0].getRow(1).values as string[]).filter(Boolean);
    assert.deepEqual(head.slice(0, 3), ['SKU', 'Product Name', 'Category']);
    assert.ok(head.includes('Opening Stock'));
  });
  await step('preview reports valid/invalid/duplicate rows and writes nothing', async () => {
    const blob = await xlsx([
      [`E2E-${stamp}-1`, `E2E Excel Kurti ${stamp}`, 'Chudidhars', '', 'M', 'Blue', 450, 799, 899, 20, 3, 'Excel Supplier', 'From Excel', 'Active'],
      [`E2E-${stamp}-2`, `E2E Excel Kurti ${stamp}`, 'Chudidhars', '', 'L', 'Blue', 450, 799, 899, 15, 3, 'Excel Supplier', '', 'Active'],
      ['', 'No SKU', 'Chudidhars', '', 'M', '', 1, 2, 3, 1, 1, '', '', ''],
      [`E2E-${stamp}-3`, '', 'Chudidhars', '', 'M', '', 1, 2, 3, 1, 1, '', '', ''],
      [`E2E-${stamp}-4`, 'Bad price', 'Chudidhars', '', 'M', '', 1, 'abc', 3, 1, 1, '', '', ''],
      [`E2E-${stamp}-5`, 'Bad cat', 'Sarees', '', 'M', '', 1, 2, 3, 1, 1, '', '', ''],
      [`E2E-${stamp}-1`, 'Dup', 'Chudidhars', '', 'S', '', 1, 2, 3, 1, 1, '', '', ''],
      [`E2E-${stamp}-6`, 'Bad qty', 'Chudidhars', '', 'M', '', 1, 2, 3, 1.5, 1, '', '', ''],
    ]);
    const before = await prisma.productVariant.count();
    const r = await upload(admin, '/api/admin/stock-upload/preview', blob, 'NEW');
    assert.equal(r.status, 200, r.error?.message);
    const p = r.data;
    assert.equal(p.totalRows, 8);
    assert.equal(p.validRows, 2);
    assert.equal(p.invalidRows, 6);
    assert.equal(p.duplicateSkus, 1);
    assert.equal(p.newProducts, 1);
    const errs = p.rows.flatMap((x: { errors: string[] }) => x.errors).join(' | ');
    for (const e of ['Missing SKU', 'Missing product name', 'Invalid selling price', 'Unknown category', 'Duplicate SKU', 'Invalid quantity']) assert.match(errs, new RegExp(e));
    assert.equal(await prisma.productVariant.count(), before, 'preview wrote nothing');
    const confirm = await upload(admin, '/api/admin/stock-upload/confirm', blob, 'NEW');
    assert.equal(confirm.status, 200, confirm.error?.message);
    assert.equal(confirm.data.imported, 2);
    const v = await prisma.productVariant.findUniqueOrThrow({ where: { sku: `E2E-${stamp}-1` }, include: { product: true, movements: true } });
    assert.equal(v.stock, 20);
    assert.equal(v.movements[0].type, 'OPENING_STOCK');
    const v2 = await prisma.productVariant.findUniqueOrThrow({ where: { sku: `E2E-${stamp}-2` } });
    assert.equal(v2.productId, v.productId, 'same name + category → one product, two sizes');
  });
  await step('stock update mode adds (20 + 30 = 50); replace needs explicit choice', async () => {
    const add = await xlsx([[`E2E-${stamp}-1`, '', '', '', '', '', '', '', '', 30, '', '', '', '']]);
    const p = await upload(admin, '/api/admin/stock-upload/preview', add, 'UPDATE');
    assert.equal(p.data.rows[0].newStock, 50);
    await upload(admin, '/api/admin/stock-upload/confirm', add, 'UPDATE');
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { sku: `E2E-${stamp}-1` } })).stock, 50);
    const rep = await xlsx([[`E2E-${stamp}-1`, '', '', '', '', '', '', 849, '', 12, '', '', '', '']]);
    await upload(admin, '/api/admin/stock-upload/confirm', rep, 'UPDATE', 'REPLACE');
    const v = await prisma.productVariant.findUniqueOrThrow({ where: { sku: `E2E-${stamp}-1` } });
    assert.equal(v.stock, 12);
    assert.equal(Number(v.price), 849);
    const mv = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: v.id }, orderBy: { createdAt: 'desc' } });
    assert.equal(mv.type, 'EXCEL_IMPORT');
    assert.equal(mv.quantity, -38);
    const unknown = await upload(admin, '/api/admin/stock-upload/preview', await xlsx([['NOPE-404', '', '', '', '', '', '', '', '', 5, '', '', '', '']]), 'UPDATE');
    assert.match(unknown.data.rows[0].errors[0], /SKU not found/);
  });
  await step('non-xlsx uploads are refused', async () => {
    const fd = new FormData();
    fd.append('file', new Blob(['a,b,c']), 'stock.csv');
    const r = await admin.req('/api/admin/stock-upload/preview', { form: fd });
    assert.equal(r.status, 400);
  });

  console.log('\nProducts, images & stitching');
  await step('admin creates a product with uploaded image and variants (opening stock recorded)', async () => {
    const img = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#7a2e3f' } }).jpeg().toBuffer();
    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(img)], { type: 'image/jpeg' }), 'photo.jpg');
    const up = await admin.req('/api/admin/uploads', { form: fd });
    assert.equal(up.status, 200, up.error?.message);
    const url = up.data.urls[0];
    assert.match(url, /^\/media\/products\/.+\.webp$/);
    assert.equal((await fetch(BASE + url)).status, 200);
    const cat = await prisma.category.findFirstOrThrow();
    const name = `E2E Product ${stamp}`;
    const r = await admin.ok('/api/admin/products', {
      name, categoryId: cat.id, status: 'ACTIVE', isNewArrival: true, images: [{ url }],
      variants: [{ size: 'M', color: 'Wine', price: 999, mrp: 1299, costPrice: 500, openingStock: 4 }, { size: 'L', color: 'Wine', price: 999, mrp: 1299, costPrice: 500, openingStock: 0 }],
    });
    const p = await prisma.product.findUniqueOrThrow({ where: { id: r.id }, include: { variants: true, images: true, category: true } });
    assert.equal(p.variants.length, 2);
    assert.equal(p.variants.find((v) => v.size === 'M')!.stock, 4);
    assert.match(p.variants[0].sku, /^FTS-/);
    assert.equal((await shopper.req(`/shop/${p.category.slug}/${p.slug}`)).status, 200);
    const fake = new FormData();
    fake.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png');
    assert.equal((await admin.req('/api/admin/uploads', { form: fake })).status, 400, 'non-images are rejected');
  });
  await step('stitching request with images; photos are private to staff', async () => {
    const img = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#c98d95' } }).png().toBuffer();
    const fd = new FormData();
    fd.append('name', 'Fathima E2E');
    fd.append('phone', '9746033344');
    fd.append('bust', '36');
    fd.append('neckDesign', 'Boat');
    fd.append('reference', new Blob([new Uint8Array(img)], { type: 'image/png' }), 'ref.png');
    const r = await shopper.req('/api/stitching', { form: fd });
    assert.equal(r.status, 200, r.error?.message);
    assert.match(r.data.number, /^STI-/);
    const req = await prisma.stitchingRequest.findUniqueOrThrow({ where: { number: r.data.number }, include: { images: true } });
    assert.equal(req.images.length, 1);
    assert.equal((await new Client().req(`/api/admin/stitching/image/${req.images[0].id}`)).status, 401);
    const staff = await fetch(`${BASE}/api/admin/stitching/image/${req.images[0].id}`, { headers: { cookie: admin.cookie } });
    assert.equal(staff.status, 200);
    await admin.ok(`/api/admin/stitching/${req.id}`, { status: 'CONTACTED', adminNotes: 'Quoted ₹650' }, 'PATCH');
    const missing = await shopper.req('/api/stitching', { form: (() => { const f = new FormData(); f.append('name', ''); f.append('phone', '1'); return f; })() });
    assert.equal(missing.status, 400);
  });

  console.log('\nReports');
  await step('all report pages render for admin', async () => {
    for (const p of ['sales', 'profit', 'stock', 'purchases', 'payments', 'cashiers', 'daily']) {
      const r = await admin.req(`/admin/reports/${p}`);
      assert.equal(r.status, 200, `${p} → ${r.status}`);
    }
    const daily = (await admin.req('/admin/reports/daily')).text;
    assert.match(daily, /Cash sales/);
  });
  await step('sales report includes today\'s counter sale; cashier cannot open profit report', async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { id: storeOrderId } });
    const html = (await admin.req('/admin/reports/sales')).text;
    assert.match(html, new RegExp(o.number));
    const r = await cashier.req('/admin/reports/profit');
    assert.ok([200, 307].includes(r.status));
    if (r.status === 200) assert.doesNotMatch(r.text, /Gross profit = selling price/);
  });
  await step('logout revokes the session', async () => {
    const c = new Client();
    await c.ok('/api/admin/auth/login', { email: creds.cashier.email, password: creds.cashier.password });
    const cookie = c.cookie;
    await c.ok('/api/admin/auth/logout', {});
    const reuse = new Client();
    reuse.cookie = cookie;
    assert.equal((await reuse.req('/api/admin/variants/search?q=a')).status, 401);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ` — ${failed.length} failed` : ''}`);
  fs.mkdirSync('tests/e2e', { recursive: true });
  fs.writeFileSync('tests/e2e/last-run.json', JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 2));
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
