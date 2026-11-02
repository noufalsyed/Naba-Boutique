// Formatting helpers. The store runs on India Standard Time (UTC+05:30, no DST).

export const TIMEZONE = 'Asia/Kolkata';

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN');

/** ₹1,299 (whole rupees) or ₹1,299.50. */
export const formatINR = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isInteger(n) ? inr0.format(n) : inr2.format(n);
};
export const formatNumber = (v: number | string | null | undefined) => num.format(Number(v ?? 0));

/** Rounds to paise. */
export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE, ...opts }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  return formatDate(d, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

/** yyyy-mm-dd of a moment in IST. */
export function istDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** The IST calendar year of a moment. */
export const istYear = (d: Date = new Date()) => Number(istDateString(d).slice(0, 4));

/** UTC instants covering IST days `from`..`to` inclusive (yyyy-mm-dd). */
export function istRange(from?: string | null, to?: string | null) {
  const today = istDateString();
  const f = from || today;
  // An open-ended range runs up to today (or is a single day when it starts in the future).
  const t = to || (f < today ? today : f);
  const start = new Date(`${f}T00:00:00+05:30`);
  const end = new Date(new Date(`${t}T00:00:00+05:30`).getTime() + 86_400_000);
  return { start, end, from: f, to: t };
}

export const pluralize = (count: number, one: string, many = `${one}s`) => `${formatNumber(count)} ${count === 1 ? one : many}`;
