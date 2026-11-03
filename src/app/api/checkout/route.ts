import { publicApi } from '@/server/http';
import { tooMany } from '@/server/errors';
import { rateLimit } from '@/server/rate-limit';
import { createCustomerOrder } from '@/server/orders';
import { storeConfig } from '@/server/config';
import { n } from '@/server/db';
import { checkoutSchema } from '@/lib/validators';
import { cartOrderMessage, waLink } from '@/lib/whatsapp';

export const POST = publicApi(async ({ body, ip }) => {
  if (!(await rateLimit(`checkout:${ip}`, 12, 10 * 60_000)).ok) throw tooMany('Too many orders from this connection. Please wait a few minutes or order on WhatsApp.');
  const input = await body(checkoutSchema);
  const order = await createCustomerOrder(input);
  const cfg = storeConfig();
  const result: Record<string, unknown> = { number: order.number, key: order.accessKey, method: input.method, total: n(order.total) };
  if (input.method === 'WHATSAPP') {
    const text = cartOrderMessage(cfg.businessName, {
      orderNumber: order.number,
      customerName: order.customerName,
      phone: order.phone,
      lines: order.items.map((i) => ({ name: i.productName, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, price: n(i.price) })),
      subtotal: n(order.subtotal),
      shipping: n(order.shipping),
      total: n(order.total),
      address: [order.address, order.city, order.state, order.pincode].filter(Boolean).join(', '),
    });
    result.whatsappUrl = waLink(cfg.whatsappNumber, text);
  }
  return result;
});
