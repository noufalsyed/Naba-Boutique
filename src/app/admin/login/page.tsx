import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/admin/auth-forms';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
