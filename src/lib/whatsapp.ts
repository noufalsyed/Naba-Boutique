// WhatsApp click-to-chat message builders (wa.me deep links). These work on
// phones and WhatsApp Web without any API account. The WhatsApp Business API
// can be added later behind the same message builders.
import { formatINR } from '@/lib/format';

export function waLink(number: string, text?: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function productEnquiryMessage(business: string, p: { name: string; sku: string; price: number }) {
  return `Hi ${business}, I am interested in ${p.name}, SKU ${p.sku}, Price ${formatINR(p.price)}. Please confirm availability.`;
}

export interface WaLine {
  name: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export function productOrderMessage(business: string, l: WaLine, url?: string) {
  return [
    `Hello ${business},`,
    'I would like to order:',
    `Product: ${l.name}`,
    `SKU: ${l.sku}`,
    `Size: ${l.size}`,
    l.color ? `Color: ${l.color}` : null,
    `Quantity: ${l.quantity}`,
    `Price: ${formatINR(l.price)}${l.quantity > 1 ? ` each (${formatINR(l.price * l.quantity)} total)` : ''}`,
    url ? `Link: ${url}` : null,
    'Please confirm availability and delivery details.',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface WaOrder {
  orderNumber?: string;
  customerName?: string;
  phone?: string;
  lines: WaLine[];
  subtotal: number;
  shipping: number;
  total: number;
  address?: string;
}

export function cartOrderMessage(business: string, o: WaOrder) {
  const out: string[] = [`Hello ${business},`, o.orderNumber ? `I would like to place order ${o.orderNumber}.` : 'I would like to order:'];
  if (o.customerName) out.push(`Name: ${o.customerName}`);
  if (o.phone) out.push(`Phone: ${o.phone}`);
  out.push('');
  o.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} (SKU ${l.sku})`);
    out.push(`   Size: ${l.size}${l.color ? ` | Color: ${l.color}` : ''} | Qty: ${l.quantity} | ${formatINR(l.price * l.quantity)}`);
  });
  out.push('');
  out.push(`Subtotal: ${formatINR(o.subtotal)}`);
  out.push(`Shipping: ${o.shipping ? formatINR(o.shipping) : 'Free'}`);
  out.push(`Total: ${formatINR(o.total)}`);
  if (o.address) {
    out.push('');
    out.push(`Delivery address: ${o.address}`);
  }
  out.push('');
  out.push('Please confirm availability and payment details.');
  return out.join('\n');
}
