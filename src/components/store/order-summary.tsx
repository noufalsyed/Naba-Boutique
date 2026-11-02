'use client';

import { formatINR } from '@/lib/format';
import type { Totals } from '@/lib/pricing';

export function OrderSummary({ totals, freeAbove, children }: { totals: Totals; freeAbove: number; children?: React.ReactNode }) {
  const toFree = freeAbove > 0 && totals.shipping > 0 ? freeAbove - totals.subtotal : 0;
  return (
    <div className="bg-sand p-5 md:p-7">
      <h2 className="text-2xl">Order Summary</h2>
      <dl className="mt-5 space-y-2.5 text-[14px]">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal (MRP, {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'})</dt>
          <dd>{formatINR(totals.mrpTotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>Discount</dt>
            <dd>− {formatINR(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd>{totals.shipping ? formatINR(totals.shipping) : <span className="text-success">Free</span>}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Tax</dt>
          <dd className="text-muted">Included (GST)</dd>
        </div>
        <div className="flex justify-between border-t border-beige/60 pt-3 text-[17px] font-medium">
          <dt>Grand Total</dt>
          <dd>{formatINR(totals.total)}</dd>
        </div>
      </dl>
      {toFree > 0 && <p className="mt-3 bg-ivory px-3 py-2 text-[12.5px] text-muted">Add {formatINR(toFree)} more for free shipping</p>}
      {totals.discount > 0 && <p className="mt-3 text-[12.5px] text-success">You save {formatINR(totals.discount)} on this order</p>}
      {children}
    </div>
  );
}
