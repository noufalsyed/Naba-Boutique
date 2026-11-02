import 'server-only';
import { prisma, n } from '@/server/db';
import { badRequest, conflict, notFound } from '@/server/errors';
import { ensureReservation, markOrderPaid, markPaymentFailed } from '@/server/orders';
import type { ClientPaymentResult, PaymentProvider } from '@/server/payments/provider';
import { razorpay } from '@/server/payments/razorpay';
import { mock } from '@/server/payments/mock';

const PROVIDERS: Record<string, PaymentProvider> = { razorpay, mock };

export function activeProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_GATEWAY || 'mock').toLowerCase();
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown PAYMENT_GATEWAY "${name}"`);
  return p;
}

const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Opens a gateway payment for an order (first attempt or a retry). */
export async function startPayment(orderNumber: string, accessKey: string) {
  const order = await prisma.order.findUnique({ where: { number: orderNumber } });
  if (!order || order.accessKey !== accessKey) throw notFound('Order');
  if (order.channel !== 'ONLINE') throw badRequest('This order is not an online payment order');
  if (order.paymentStatus === 'PAID') throw conflict('This order is already paid');
  await ensureReservation(order.id);
  const provider = activeProvider();
  const amountPaise = toPaise(n(order.total));
  const created = await provider.createPayment({ amountPaise, receipt: order.number, orderId: order.id });
  await prisma.payment.create({ data: { orderId: order.id, provider: provider.name, providerOrderId: created.providerOrderId, amount: n(order.total) } });
  return {
    orderNumber: order.number,
    amount: n(order.total),
    customer: { name: order.customerName, phone: order.phone, email: order.email },
    checkout: provider.checkoutConfig({ providerOrderId: created.providerOrderId, amountPaise, orderNumber: order.number, orderKey: order.accessKey }),
  };
}

/** Browser callback after the gateway's checkout closes. */
export async function verifyClientPayment(input: ClientPaymentResult) {
  const pay = await prisma.payment.findUnique({ where: { providerOrderId: input.providerOrderId }, include: { order: true } });
  if (!pay) throw notFound('Payment');
  const provider = PROVIDERS[pay.provider];
  if (!provider) throw badRequest('Unknown payment provider');
  if (pay.status === 'SUCCESS') return { ok: true as const, order: pay.order };
  const result = await provider.verifyPayment({ ...input, expectedAmountPaise: toPaise(n(pay.amount)) });
  if (!result.ok) {
    await markPaymentFailed(pay.id, result.reason);
    return { ok: false as const, reason: result.reason, order: pay.order };
  }
  const order = await markOrderPaid(pay.orderId, { paymentRowId: pay.id, providerPaymentId: result.providerPaymentId, method: result.method });
  return { ok: true as const, order };
}

export async function recordClientFailure(providerOrderId: string, reason: string) {
  const pay = await prisma.payment.findUnique({ where: { providerOrderId } });
  if (pay && pay.status === 'CREATED') await markPaymentFailed(pay.id, reason);
}

/** Server-to-server notification from the gateway (backs up the browser callback). */
export async function handleWebhook(rawBody: string, headers: Headers) {
  const provider = activeProvider();
  const event = await provider.parseWebhook(rawBody, headers);
  if (!event) return { handled: false };
  const pay = await prisma.payment.findUnique({ where: { providerOrderId: event.providerOrderId } });
  if (!pay) return { handled: false };
  if (event.kind === 'paid') {
    if (event.amountPaise !== toPaise(n(pay.amount))) {
      await prisma.order.update({ where: { id: pay.orderId }, data: { needsAttention: `Gateway reported ₹${event.amountPaise / 100}, expected ₹${n(pay.amount)}` } });
      return { handled: false };
    }
    await markOrderPaid(pay.orderId, { paymentRowId: pay.id, providerPaymentId: event.providerPaymentId, method: event.method });
  } else {
    await markPaymentFailed(pay.id, event.reason ?? 'Payment failed');
  }
  return { handled: true };
}
