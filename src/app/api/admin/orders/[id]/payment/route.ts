import { adminApi } from '@/server/http';
import { recordManualPayment } from '@/server/orders';
import { manualPaymentInput } from '@/lib/validators';

/** Records a payment collected outside the gateway (WhatsApp orders: UPI, cash…). */
export const POST = adminApi<{ id: string }>('ANY', async ({ body, params, admin }) => {
  const input = await body(manualPaymentInput);
  const o = await recordManualPayment(params.id, input.method, input.reference, admin.name);
  return { status: o.status };
});
