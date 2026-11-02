import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-3 text-[56px] leading-none">404</h1>
      <p className="mt-3 max-w-sm text-muted">This page may have moved, or the product is no longer available.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">Home</Link>
        <Link href="/shop" className="btn-outline">Shop</Link>
      </div>
    </div>
  );
}
