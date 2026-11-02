'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Badge, Card, useToast } from '@/components/admin/ui';
import { api } from '@/lib/api-client';
import { formatINR } from '@/lib/format';

interface Row {
  row: number;
  sku: string;
  productName: string;
  category: string;
  size: string;
  color: string;
  sellingPrice: number | null;
  mrp: number | null;
  stock: number | null;
  errors: string[];
  existing: boolean;
  currentStock?: number;
  newStock?: number;
}
interface Preview {
  mode: 'NEW' | 'UPDATE';
  stockAction: 'ADD' | 'REPLACE';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newProducts: number;
  existingProducts: number;
  duplicateSkus: number;
  rows: Row[];
}

export function StockUpload() {
  const [mode, setMode] = useState<'NEW' | 'UPDATE'>('NEW');
  const [stockAction, setStockAction] = useState<'ADD' | 'REPLACE'>('ADD');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<'' | 'preview' | 'confirm'>('');
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);
  const [showValid, setShowValid] = useState(false);
  const toast = useToast();

  const form = () => {
    const fd = new FormData();
    fd.append('file', file!);
    fd.append('mode', mode);
    fd.append('stockAction', stockAction);
    return fd;
  };
  const reset = () => {
    setPreview(null);
    setDone(null);
  };

  const doPreview = async () => {
    if (!file) return;
    setBusy('preview');
    setDone(null);
    try {
      setPreview(await api<Preview>('/api/admin/stock-upload/preview', form()));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read the file', 'error');
    } finally {
      setBusy('');
    }
  };

  const doConfirm = async () => {
    if (!file || !preview) return;
    if (stockAction === 'REPLACE' && mode === 'UPDATE' && !confirm(`Replace current stock for ${preview.validRows} SKU(s) with the numbers in the file? This overwrites existing stock counts.`)) return;
    setBusy('confirm');
    try {
      const r = await api<{ imported: number; skipped: number }>('/api/admin/stock-upload/confirm', form());
      setDone(r);
      setPreview(null);
      setFile(null);
      toast(`Imported ${r.imported} row(s)`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setBusy('');
    }
  };

  const errorReport = () => {
    if (!preview) return;
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [['Row', 'SKU', 'Product Name', 'Category', 'Size', 'Color', 'Errors'], ...preview.rows.filter((r) => r.errors.length).map((r) => [r.row, r.sku, r.productName, r.category, r.size, r.color, r.errors.join('; ')])];
    const url = URL.createObjectURL(new Blob(['﻿' + lines.map((l) => l.map(esc).join(',')).join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-upload-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = preview ? preview.rows.filter((r) => showValid || r.errors.length) : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="1. Download the template">
          <div className="p-4 text-[14px]">
            <p className="text-muted">Columns: SKU, Product Name, Category, Subcategory, Size, Color, Purchase Price, Selling Price, MRP, Opening Stock, Low Stock Level, Supplier, Description, Status.</p>
            <a href="/api/admin/stock-upload/template" className="btn-outline mt-4 px-4 py-2.5"><Download size={15} /> Download Excel Template</a>
          </div>
        </Card>
        <Card title="2. Choose what the file does" className="lg:col-span-2">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {([
              ['NEW', 'Mode 1 – New Product Import', 'Creates products and their opening stock. Rows whose SKU already exists are rejected.'],
              ['UPDATE', 'Mode 2 – Stock Update', 'Updates existing SKUs. The stock column is added to current stock. Prices are updated if filled in.'],
            ] as const).map(([k, t, s]) => (
              <label key={k} className={`cursor-pointer border p-4 ${mode === k ? 'border-charcoal bg-sand/40' : 'border-line'}`}>
                <span className="flex items-center gap-2 font-medium"><input type="radio" checked={mode === k} onChange={() => { setMode(k); reset(); }} className="accent-wine" /> {t}</span>
                <span className="mt-1 block text-[13px] text-muted">{s}</span>
              </label>
            ))}
            {mode === 'UPDATE' && (
              <div className="sm:col-span-2">
                <span className="label">Stock column means</span>
                <div className="flex flex-wrap gap-4 text-[14px]">
                  <label className="flex items-center gap-2"><input type="radio" checked={stockAction === 'ADD'} onChange={() => { setStockAction('ADD'); reset(); }} className="accent-wine" /> Add to current stock (20 + 30 = 50)</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={stockAction === 'REPLACE'} onChange={() => { setStockAction('REPLACE'); reset(); }} className="accent-wine" /> Replace current stock</label>
                </div>
                {stockAction === 'REPLACE' && (
                  <p className="mt-2 flex items-start gap-2 border border-warn/40 bg-warn/5 p-3 text-[13px] text-warn">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" /> Replace overwrites the current stock count with the number in the file. Use only after a full physical stock count. The difference is still recorded in Stock Movements.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="3. Upload & preview">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <label className="btn-outline cursor-pointer px-4 py-2.5">
            <FileSpreadsheet size={15} /> {file ? file.name : 'Choose .xlsx file'}
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); reset(); e.target.value = ''; }} />
          </label>
          <button type="button" disabled={!file || !!busy} onClick={doPreview} className="btn-dark px-5 py-2.5">
            {busy === 'preview' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Upload Excel File
          </button>
          <p className="text-[12.5px] text-muted">Up to 5,000 rows. The database is not changed until you confirm.</p>
        </div>
      </Card>

      {done && (
        <div className="flex items-center gap-3 border border-success/30 bg-success/5 p-4 text-[14px]">
          <CheckCircle2 size={20} className="text-success" />
          <span>Imported <strong>{done.imported}</strong> row(s){done.skipped ? `, skipped ${done.skipped} row(s) with errors` : ''}. </span>
          <Link href="/admin/stock/movements?type=" className="text-wine underline">View stock movements</Link>
        </div>
      )}

      {preview && (
        <Card title="Import Preview">
          <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Total Rows', preview.totalRows, ''],
              ['Valid', preview.validRows, 'text-success'],
              ['Errors', preview.invalidRows, preview.invalidRows ? 'text-danger' : ''],
              ['New Products', preview.newProducts, ''],
              ['Existing SKUs', preview.existingProducts, ''],
              ['Duplicate SKUs', preview.duplicateSkus, preview.duplicateSkus ? 'text-danger' : ''],
            ].map(([k, v, c]) => (
              <div key={String(k)} className="bg-white px-4 py-3">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">{k}</dt>
                <dd className={`font-serif text-[28px] leading-tight ${c}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3 border-t border-line p-4">
            <button type="button" disabled={!preview.validRows || !!busy} onClick={doConfirm} className="btn-primary px-6 py-3">
              {busy === 'confirm' && <Loader2 size={15} className="animate-spin" />} Confirm Import ({preview.validRows} rows)
            </button>
            {preview.invalidRows > 0 && <button type="button" onClick={errorReport} className="btn-outline px-4 py-2.5"><Download size={15} /> Download Error Report</button>}
            <label className="ml-auto flex items-center gap-2 text-[13px]"><input type="checkbox" checked={showValid} onChange={(e) => setShowValid(e.target.checked)} className="accent-wine" /> Show valid rows too</label>
          </div>
          {preview.invalidRows > 0 && <p className="px-4 pb-3 text-[13px] text-muted">Rows with errors are skipped. Fix them in Excel and upload again, or confirm to import only the valid rows.</p>}
          <div className="max-h-[480px] overflow-auto border-t border-line">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-sand text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                <tr>{['Row', 'SKU', 'Product', 'Category', 'Size', 'Colour', 'Price', preview.mode === 'UPDATE' ? 'Stock now → new' : 'Opening stock', 'Result'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={`border-b border-line/60 ${r.errors.length ? 'bg-danger/5' : ''}`}>
                    <td className="px-3 py-2 text-muted">{r.row}</td>
                    <td className="px-3 py-2 font-mono">{r.sku || '—'}</td>
                    <td className="px-3 py-2">{r.productName || '—'}</td>
                    <td className="px-3 py-2">{r.category || '—'}</td>
                    <td className="px-3 py-2">{r.size}</td>
                    <td className="px-3 py-2">{r.color || '—'}</td>
                    <td className="px-3 py-2">{r.sellingPrice != null ? formatINR(r.sellingPrice) : '—'}</td>
                    <td className="px-3 py-2">{preview.mode === 'UPDATE' ? (r.currentStock != null ? `${r.currentStock} → ${r.newStock ?? '?'}` : '—') : (r.stock ?? 0)}</td>
                    <td className="px-3 py-2">{r.errors.length ? <span className="text-danger">{r.errors.join('; ')}</span> : <Badge tone="green">{r.existing ? 'Update' : 'New'}</Badge>}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted">No errors — every row is valid.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
