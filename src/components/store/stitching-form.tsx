'use client';

import { useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { WhatsAppIcon } from '@/components/store/icons';
import { api, ApiError } from '@/lib/api-client';
import { waLink } from '@/lib/whatsapp';

const MEASURES = [
  ['bust', 'Bust'],
  ['waist', 'Waist'],
  ['hip', 'Hip'],
  ['shoulder', 'Shoulder'],
  ['sleeveLength', 'Sleeve Length'],
  ['dressLength', 'Dress Length'],
] as const;

const UPLOADS = [
  ['reference', 'Reference Design'],
  ['material', 'Material Image'],
  ['inspiration', 'Design Inspiration'],
] as const;

function Upload({ name, label, files, setFiles }: { name: string; label: string; files: File[]; setFiles: (f: File[]) => void }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="relative h-20 w-16 overflow-hidden bg-sand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove image" onClick={() => setFiles(files.filter((_, k) => k !== i))} className="absolute top-0.5 right-0.5 rounded-full bg-white/90 p-0.5">
              <X size={12} />
            </button>
          </div>
        ))}
        {files.length < 3 && (
          <label className="flex h-20 w-16 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-beige bg-white text-[10px] text-muted hover:border-charcoal">
            <ImagePlus size={18} strokeWidth={1.4} /> Add
            <input
              type="file"
              name={name}
              accept="image/*"
              className="sr-only"
              multiple
              onChange={(e) => {
                const picked = [...(e.target.files ?? [])].filter((f) => f.size <= 6 * 1024 * 1024);
                setFiles([...files, ...picked].slice(0, 3));
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function F({ name, label, required, type = 'text', error, ...rest }: { name: string; label: string; required?: boolean; type?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} required={required} className={`input ${error ? 'border-danger' : ''}`} {...rest} />
      {error && <p className="mt-1 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

export function StitchingForm() {
  const { config, toast } = useStore();
  const [files, setFiles] = useState<Record<string, File[]>>({ reference: [], material: [], inspiration: [] });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ number: string; name: string } | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const k of Object.keys(files)) {
      fd.delete(k);
      files[k].forEach((f) => fd.append(k, f));
    }
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ number: string }>('/api/stitching', fd);
      setDone({ number: r.number, name: String(fd.get('name')) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Record<string, string>);
      toast({ message: err instanceof Error ? err.message : 'Could not send your request', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="animate-fade-up border border-line bg-white p-8 text-center md:p-12">
        <CheckCircle2 size={48} strokeWidth={1.2} className="mx-auto text-success" />
        <h3 className="mt-4 text-[34px]">Request Received</h3>
        <p className="mt-2 text-muted">
          Thank you, {done.name}. Your request number is <span className="font-medium text-charcoal">{done.number}</span>. Our team will contact you on WhatsApp to confirm details and pricing.
        </p>
        <a href={waLink(config.whatsappNumber, `Hi ${config.businessName}, I just sent stitching request ${done.number}.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-7 px-8 py-4">
          <WhatsAppIcon size={18} /> Chat on WhatsApp
        </a>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-10">
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-4 text-2xl">Your Details</legend>
        <F name="name" error={errors.name} label="Name" required maxLength={100} autoComplete="name" />
        <F name="phone" error={errors.phone} label="Phone Number" required type="tel" inputMode="numeric" autoComplete="tel-national" />
        <F name="whatsapp" error={errors.whatsapp} label="WhatsApp Number" type="tel" inputMode="numeric" placeholder="If different" />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-2xl">Material & Size</legend>
        <F name="material" error={errors.material} label="Product / Material" maxLength={200} placeholder="E.g. Chanderi Silk Dress Material, Peach — or my own fabric" />
        <div>
          <label htmlFor="size" className="label">Size</label>
          <select id="size" name="size" className="input" defaultValue="">
            <option value="">Use my measurements</option>
            {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-4 text-2xl">Measurements <span className="font-sans text-[13px] text-muted">(inches)</span></legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MEASURES.map(([k, l]) => (
            <F key={k} name={k} error={errors[k]} label={l} inputMode="decimal" maxLength={20} />
          ))}
        </div>
        <div className="mt-4">
          <label htmlFor="otherMeasurements" className="label">Other Measurements</label>
          <textarea id="otherMeasurements" name="otherMeasurements" rows={2} maxLength={500} className="input" placeholder="Armhole, neck depth, bottom length…" />
        </div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-4 text-2xl">Design</legend>
        <div>
          <label htmlFor="stitchingStyle" className="label">Stitching Style</label>
          <select id="stitchingStyle" name="stitchingStyle" className="input" defaultValue="">
            <option value="">Choose…</option>
            {['Chudidhar', 'Straight Kurta', 'Anarkali', 'A-Line Kurti', 'Sharara Set', 'Palazzo Set', 'Gown', 'Other'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="neckDesign" className="label">Neck Design</label>
          <select id="neckDesign" name="neckDesign" className="input" defaultValue="">
            <option value="">Choose…</option>
            {['Round', 'V-Neck', 'Boat', 'Collar', 'Sweetheart', 'Square', 'Keyhole', 'As in reference'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sleeveDesign" className="label">Sleeve Design</label>
          <select id="sleeveDesign" name="sleeveDesign" className="input" defaultValue="">
            <option value="">Choose…</option>
            {['Sleeveless', 'Short', 'Elbow', 'Three-quarter', 'Full', 'Puff', 'Bell', 'As in reference'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="instructions" className="label">Special Instructions</label>
          <textarea id="instructions" name="instructions" rows={3} maxLength={1500} className="input" placeholder="Lining, piping, pockets, occasion, delivery date…" />
        </div>
      </fieldset>
      <fieldset className="grid gap-6 sm:grid-cols-3">
        <legend className="mb-4 text-2xl">Images <span className="font-sans text-[13px] text-muted">(up to 3 each, 6 MB max)</span></legend>
        {UPLOADS.map(([k, l]) => (
          <Upload key={k} name={k} label={l} files={files[k]} setFiles={(f) => setFiles((all) => ({ ...all, [k]: f }))} />
        ))}
      </fieldset>
      <button type="submit" disabled={busy} className="btn-primary w-full py-4 sm:w-auto sm:px-12">
        {busy && <Loader2 size={16} className="animate-spin" />} Submit Stitching Request
      </button>
    </form>
  );
}
