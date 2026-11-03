'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Card, Field, Modal, SubmitButton, useAction, useToast } from '@/components/admin/ui';
import { api } from '@/lib/api-client';
import { shrinkImage } from '@/lib/shrink-image';

interface Cat {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  count?: number;
}

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [edit, setEdit] = useState<Cat | null>(null);
  const { run, busy, errors } = useAction();
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const ok = await run(edit.id ? `/api/admin/categories/${edit.id}` : '/api/admin/categories', { ...edit, slug: edit.slug || undefined, imageUrl: edit.imageUrl || undefined }, { method: edit.id ? 'PUT' : 'POST', success: 'Category saved' });
    if (ok) setEdit(null);
  };
  const upload = async (f: File | undefined) => {
    if (!f || !edit) return;
    const fd = new FormData();
    fd.append('file', await shrinkImage(f));
    fd.append('folder', 'categories');
    try {
      const { urls } = await api<{ urls: string[] }>('/api/admin/uploads', fd);
      setEdit({ ...edit, imageUrl: urls[0] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setEdit({ name: '', slug: '', description: '', imageUrl: '', sortOrder: categories.length, isActive: true })} className="btn-primary px-4 py-2.5">
          <Plus size={15} /> Add Category
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <Card key={c.id}>
            <div className="relative aspect-[4/3] bg-sand">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="300px" className="object-cover" />}</div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-[22px] leading-tight">{c.name}</p>
                  <p className="text-[12px] text-muted">/shop/{c.slug} · {c.count} products</p>
                </div>
                {!c.isActive && <Badge>Hidden</Badge>}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setEdit(c)} className="btn-outline px-3 py-1.5"><Pencil size={13} /> Edit</button>
                <button
                  type="button"
                  onClick={() => confirm(`Delete ${c.name}?`) && run(`/api/admin/categories/${c.id}`, undefined, { method: 'DELETE', success: 'Category deleted' })}
                  className="px-2 text-muted hover:text-danger"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit Category' : 'Add Category'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Name" error={errors.name}><input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input" /></Field>
            <Field label="URL slug" hint="Leave blank to generate"><input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} className="input" /></Field>
            <Field label="Description"><textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="input" /></Field>
            <Field label="Image">
              <div className="flex items-center gap-3">
                <div className="relative h-20 w-24 bg-sand">{edit.imageUrl && <Image src={edit.imageUrl} alt="" fill sizes="96px" className="object-cover" />}</div>
                <label className="btn-outline cursor-pointer px-3 py-2"><ImagePlus size={14} /> Upload<input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sort order"><input type="number" min="0" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} className="input" /></Field>
              <label className="mt-6 flex items-center gap-2 text-[14px]"><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} className="accent-wine" /> Visible in store</label>
            </div>
            <SubmitButton busy={busy} className="btn-primary w-full">Save</SubmitButton>
          </form>
        </Modal>
      )}
    </>
  );
}
