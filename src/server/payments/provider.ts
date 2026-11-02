// Payment gateway abstraction. Pick the gateway with PAYMENT_GATEWAY; add a
// new gateway by implementing PaymentProvider and registering it in index.ts.
// The browser never decides whether an order is paid — verifyPayment() asks
// the gateway (signature + API lookup) on the server.

export interface CreatedPayment {
  providerOrderId: string;
}

/** What the browser needs to open the gateway's checkout. No secrets. */
export type CheckoutConfig =
  | { type: 'razorpay'; key: string; providerOrderId: string; amountPaise: number; currency: 'INR' }
  | { type: 'redirect'; url: string };

export interface ClientPaymentResult {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export type VerifyResult =
  | { ok: true; providerPaymentId: string; method: string | null; amountPaise: number }
  | { ok: false; reason: string };

export interface WebhookEvent {
  kind: 'paid' | 'failed';
  providerOrderId: string;
  providerPaymentId: string;
  method: string | null;
  amountPaise: number;
  reason?: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(input: { amountPaise: number; receipt: string; orderId: string }): Promise<CreatedPayment>;
  checkoutConfig(input: { providerOrderId: string; amountPaise: number; orderNumber: string; orderKey: string }): CheckoutConfig;
  verifyPayment(input: ClientPaymentResult & { expectedAmountPaise: number }): Promise<VerifyResult>;
  /** Returns null when the signature is invalid or the event is irrelevant. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
