import type { Db } from '@/server/db';
import { istYear } from '@/lib/format';

/** Atomically increments a named counter; safe under concurrent transactions. */
export async function nextSequence(db: Db, key: string): Promise<number> {
  const rows = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO sequences (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = sequences.value + 1
    RETURNING value`;
  return Number(rows[0].value);
}

export type DocKind = 'ORDER' | 'PURCHASE' | 'PURCHASE_RETURN' | 'SALES_RETURN' | 'STITCHING';
const PREFIX: Record<DocKind, string> = {
  ORDER: 'NB',
  PURCHASE: 'PUR',
  PURCHASE_RETURN: 'PRT',
  SALES_RETURN: 'RET',
  STITCHING: 'STI',
};

/** e.g. NB-2026-00001 — numbering restarts each calendar year. */
export async function nextDocNumber(db: Db, kind: DocKind, date: Date = new Date()) {
  const year = istYear(date);
  const seq = await nextSequence(db, `${kind}:${year}`);
  return `${PREFIX[kind]}-${year}-${String(seq).padStart(5, '0')}`;
}

/** Next free SKU like NB-0042 for products created without one. */
export async function nextSku(db: Db) {
  for (;;) {
    const sku = `NB-${String(await nextSequence(db, 'SKU')).padStart(4, '0')}`;
    const taken = await db.productVariant.findUnique({ where: { sku }, select: { id: true } });
    if (!taken) return sku;
  }
}
