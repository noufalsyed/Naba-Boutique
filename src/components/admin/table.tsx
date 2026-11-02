// Server-friendly table primitives (no client JS).
export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-[13.5px]">{children}</table>
    </div>
  );
}

export function Th({ children, right = false, className = '' }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return <th className={`border-b border-line bg-sand/60 px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] whitespace-nowrap text-muted ${right ? 'text-right' : ''} ${className}`}>{children}</th>;
}

export function Td({ children, right = false, className = '', colSpan }: { children?: React.ReactNode; right?: boolean; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border-b border-line/70 px-3 py-2.5 align-middle ${right ? 'text-right tabular-nums' : ''} ${className}`}>
      {children}
    </td>
  );
}

export function StatCard({ label, value, hint, href, tone = 'default' }: { label: string; value: React.ReactNode; hint?: string; href?: string; tone?: 'default' | 'warn' | 'wine' }) {
  const inner = (
    <div className={`h-full border bg-white p-4 transition-colors ${href ? 'hover:border-charcoal' : ''} ${tone === 'warn' ? 'border-warn/40' : tone === 'wine' ? 'border-wine/30' : 'border-line'}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-1.5 font-serif text-[30px] leading-none ${tone === 'warn' ? 'text-warn' : tone === 'wine' ? 'text-wine' : 'text-charcoal'}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}

/** GET form with from/to dates for reports and lists. */
export function DateRangeForm({ from, to, extra }: { from: string; to: string; extra?: React.ReactNode }) {
  return (
    <form method="get" className="no-print mb-5 flex flex-wrap items-end gap-2">
      <label>
        <span className="label">From</span>
        <input type="date" name="from" defaultValue={from} className="input py-2" />
      </label>
      <label>
        <span className="label">To</span>
        <input type="date" name="to" defaultValue={to} className="input py-2" />
      </label>
      {extra}
      <button className="btn-dark px-5 py-2.5">Apply</button>
    </form>
  );
}
