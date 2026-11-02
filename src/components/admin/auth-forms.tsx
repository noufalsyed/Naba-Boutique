'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FeatherMark } from '@/components/store/icons';
import { api } from '@/lib/api-client';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm border border-line bg-white p-8 shadow-[0_30px_60px_-40px_rgba(42,38,36,.6)]">
        <div className="mb-6 flex items-center gap-2.5">
          <FeatherMark size={26} className="text-wine" />
          <div className="leading-none">
            <p className="font-serif text-[22px] tracking-[0.12em]">NABA</p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted">Back Office</p>
          </div>
        </div>
        <h1 className="mb-5 font-serif text-[28px]">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Frame title="Sign in">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/api/admin/auth/login', { email, password });
            const next = params.get('next');
            router.replace(next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed');
            setBusy(false);
          }
        }}
      >
        <label className="block">
          <span className="label">Email</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>
        {error && <p className="text-[13px] text-danger" role="alert">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3.5">
          {busy && <Loader2 size={15} className="animate-spin" />} Sign in
        </button>
        <Link href="/admin/forgot-password" className="block text-center text-[13px] text-muted hover:text-wine">
          Forgot password?
        </Link>
      </form>
    </Frame>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  return (
    <Frame title="Reset password">
      {sent ? (
        <p className="text-[14px] text-muted">If an account exists for {email}, a reset link has been sent. It is valid for one hour.</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api('/api/admin/auth/forgot', { email });
              setSent(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed');
            }
          }}
        >
          <label className="block">
            <span className="label">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </label>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <button className="btn-primary w-full py-3.5">Send reset link</button>
        </form>
      )}
      <Link href="/admin/login" className="mt-4 block text-center text-[13px] text-muted hover:text-wine">
        Back to sign in
      </Link>
    </Frame>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  return (
    <Frame title="Choose a new password">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) return setError('Passwords do not match');
          try {
            await api('/api/admin/auth/reset', { token: params.get('token') ?? '', password });
            router.replace('/admin/login');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed');
          }
        }}
      >
        <label className="block">
          <span className="label">New password</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Confirm password</span>
          <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
        </label>
        <p className="text-[12px] text-muted">At least 8 characters, with letters and numbers.</p>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <button className="btn-primary w-full py-3.5">Save password</button>
      </form>
    </Frame>
  );
}
