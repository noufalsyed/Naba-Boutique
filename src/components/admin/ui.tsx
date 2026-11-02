'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Download, Loader2, Printer, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';

// ───────────── Toasts ─────────────

type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ToastCtx = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function AdminToasts({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++seq.current;
    setList((l) => [...l.slice(-3), { id, message, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(92vw,380px)] flex-col gap-2">
        {list.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex animate-fade-up items-start gap-2.5 border bg-white p-3 text-[14px] shadow-lg ${t.tone === 'error' ? 'border-danger/40' : 'border-line'}`}>
            {t.tone === 'error' ? <X size={17} className="mt-0.5 shrink-0 text-danger" /> : <Check size={17} className="mt-0.5 shrink-0 text-success" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Runs an API call with toast feedback and refreshes server data on success. */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = useCallback(
    async <T,>(url: string, body?: unknown, opts: { method?: string; success?: string; refresh?: boolean } = {}): Promise<T | undefined> => {
      setBusy(true);
      setErrors({});
      try {
        const r = await api<T>(url, body, opts.method ? { method: opts.method } : {});
        if (opts.success) toast(opts.success);
        if (opts.refresh !== false) router.refresh();
        return r;
      } catch (e) {
        if (e instanceof ApiError && e.details && typeof e.details === 'object') setErrors(e.details as Record<string, string>);
        toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );
  return { run, busy, errors, setErrors };
}

// ───────────── Layout pieces ─────────────

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-[12px] text-muted hover:text-wine">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-serif text-[32px] leading-tight text-charcoal">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', title, actions }: { children: React.ReactNode; className?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={`border border-line bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: 'bg-success/10 text-success',
  red: 'bg-danger/10 text-danger',
  amber: 'bg-warn/10 text-warn',
  blue: 'bg-[#3c5f93]/10 text-[#3c5f93]',
  grey: 'bg-charcoal/5 text-muted',
  wine: 'bg-wine/10 text-wine',
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = 'grey' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 animate-fade-in bg-charcoal/40" onClick={onClose} />
      <div className={`relative max-h-[92vh] w-full overflow-y-auto bg-white shadow-2xl sm:animate-fade-up ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-slide-up`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-3.5">
          <h2 className="font-serif text-[24px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, error, children, hint, className = '' }: { label: string; error?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}

export function SubmitButton({ busy, children, className = 'btn-primary', ...rest }: { busy?: boolean; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="submit" disabled={busy || rest.disabled} className={className} {...rest}>
      {busy && <Loader2 size={15} className="animate-spin" />} {children}
    </button>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-serif text-[24px] text-charcoal">{title}</p>
      {hint && <p className="mt-1 text-[14px] text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-outline px-4 py-2.5">
      <Printer size={15} /> {label}
    </button>
  );
}

/** Downloads table rows as CSV (opens in Excel). */
export function CsvButton({ filename, rows }: { filename: string; rows: (string | number | null | undefined)[][] }) {
  const download = () => {
    const esc = (v: string | number | null | undefined) => {
      const s = v == null ? '' : String(v);
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={download} className="btn-outline px-4 py-2.5">
      <Download size={15} /> Excel / CSV
    </button>
  );
}
