import 'server-only';
import { BRAND } from '@/lib/constants';

const num = (v: string | undefined, d: number) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

/** Online payment is offered only once the gateway is set up (Razorpay keys present). */
function onlinePaymentsReady(e: NodeJS.ProcessEnv) {
  const gateway = (e.PAYMENT_GATEWAY || 'mock').toLowerCase();
  if (gateway === 'mock') return e.NODE_ENV !== 'production' || e.ALLOW_MOCK_PAYMENTS === 'true';
  return Boolean(e.PAYMENT_GATEWAY_KEY && e.PAYMENT_GATEWAY_SECRET);
}

/** Store settings from environment variables (see .env.example). */
export function storeConfig() {
  const e = process.env;
  return {
    appUrl: (e.APP_URL || 'http://localhost:3600').replace(/\/$/, ''),
    whatsappNumber: (e.WHATSAPP_NUMBER || '919876543210').replace(/\D/g, ''),
    businessName: e.WHATSAPP_BUSINESS_NAME || BRAND,
    phone: e.STORE_PHONE || '',
    email: e.STORE_EMAIL || '',
    address: e.STORE_ADDRESS || 'Kerala, India',
    instagramUrl: e.INSTAGRAM_URL || 'https://www.instagram.com/feathers_the_2ndskin_/',
    facebookUrl: e.FACEBOOK_URL || '',
    shipping: { flat: num(e.SHIPPING_FLAT, 79), freeAbove: num(e.FREE_SHIPPING_ABOVE, 1499) },
    estimatedDelivery: e.ESTIMATED_DELIVERY || '3–7 working days across India',
    paymentHoldMinutes: num(e.PAYMENT_HOLD_MINUTES, 30),
    whatsappHoldHours: num(e.WHATSAPP_HOLD_HOURS, 24),
    onlinePayments: onlinePaymentsReady(e),
  };
}

export type StoreConfig = ReturnType<typeof storeConfig>;

/** The subset safe to send to the browser. */
export function publicConfig() {
  const c = storeConfig();
  return {
    appUrl: c.appUrl,
    whatsappNumber: c.whatsappNumber,
    businessName: c.businessName,
    phone: c.phone,
    email: c.email,
    address: c.address,
    instagramUrl: c.instagramUrl,
    facebookUrl: c.facebookUrl,
    shipping: c.shipping,
    estimatedDelivery: c.estimatedDelivery,
    onlinePayments: c.onlinePayments,
  };
}
export type PublicConfig = ReturnType<typeof publicConfig>;
