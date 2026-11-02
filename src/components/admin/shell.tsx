'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight, BarChart3, Boxes, CalendarDays, ClipboardList, CreditCard, ExternalLink, FileSpreadsheet, LayoutDashboard, LogOut, Menu,
  PackageSearch, Receipt, ScanLine, Scissors, Shirt, Tags, TrendingUp, Truck, Undo2, UserCog, UserRound, Users, Wallet, X,
} from 'lucide-react';
import { FeatherMark } from '@/components/store/icons';
import { AdminToasts } from '@/components/admin/ui';
import { api } from '@/lib/api-client';

type Item = { href: string; label: string; Icon: typeof Boxes; adminOnly?: boolean };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: '', items: [{ href: '/admin', label: 'Dashboard', Icon: LayoutDashboard }] },
  {
    title: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', Icon: Shirt },
      { href: '/admin/categories', label: 'Categories', Icon: Tags, adminOnly: true },
      { href: '/admin/stock', label: 'Stock', Icon: Boxes },
      { href: '/admin/stock-upload', label: 'Stock Upload – Excel', Icon: FileSpreadsheet, adminOnly: true },
    ],
  },
  {
    title: 'Buying',
    items: [
      { href: '/admin/purchases', label: 'Purchases', Icon: Receipt, adminOnly: true },
      { href: '/admin/suppliers', label: 'Suppliers', Icon: Truck, adminOnly: true },
    ],
  },
  {
    title: 'Selling',
    items: [
      { href: '/admin/sales', label: 'Sales', Icon: CreditCard },
      { href: '/admin/returns', label: 'Returns', Icon: Undo2 },
      { href: '/admin/customers', label: 'Customers', Icon: Users },
      { href: '/admin/stitching', label: 'Stitching Requests', Icon: Scissors },
    ],
  },
  {
    title: 'Reports',
    items: [
      { href: '/admin/reports/sales', label: 'Sales Report', Icon: TrendingUp },
      { href: '/admin/reports/profit', label: 'Profit Report', Icon: Wallet, adminOnly: true },
      { href: '/admin/reports/stock', label: 'Stock Report', Icon: PackageSearch },
      { href: '/admin/reports/purchases', label: 'Purchase Report', Icon: ClipboardList, adminOnly: true },
      { href: '/admin/reports/payments', label: 'Payment Report', Icon: BarChart3 },
      { href: '/admin/reports/cashiers', label: 'Cashier Report', Icon: UserRound },
      { href: '/admin/reports/daily', label: 'Daily Summary', Icon: CalendarDays },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/staff', label: 'Staff', Icon: UserCog, adminOnly: true },
      { href: '/admin/stock/movements', label: 'Stock Movements', Icon: ArrowLeftRight },
    ],
  },
];

export function AdminShell({ user, children }: { user: { name: string; role: 'ADMIN' | 'CASHIER' }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || (pathname.startsWith(`${href}/`) && !(href === '/admin/stock' && pathname.startsWith('/admin/stock/movements'))));
  const logout = async () => {
    await api('/api/admin/auth/logout', {}).catch(() => {});
    router.replace('/admin/login');
  };

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.adminOnly || user.role === 'ADMIN');
        if (!items.length) return null;
        return (
          <div key={g.title || 'main'} className="mb-4">
            {g.title && <p className="mb-1.5 px-3 text-[10.5px] font-medium uppercase tracking-[0.2em] text-ivory/40">{g.title}</p>}
            <ul className="space-y-0.5">
              {items.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link href={href} className={`flex items-center gap-3 px-3 py-2 text-[14px] transition-colors ${isActive(href) ? 'bg-ivory/10 text-ivory' : 'text-ivory/70 hover:bg-ivory/5 hover:text-ivory'}`}>
                    <Icon size={16} strokeWidth={1.6} /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-ivory/10 px-5 py-4">
      <FeatherMark size={24} className="text-rose" />
      <div className="leading-none">
        <p className="font-serif text-[20px] tracking-[0.12em] text-ivory">FEATHERS</p>
        <p className="text-[9px] uppercase tracking-[0.3em] text-ivory/50">Back Office</p>
      </div>
    </div>
  );

  const foot = (
    <div className="border-t border-ivory/10 p-3 text-[13px]">
      <Link href="/admin/account" className="flex items-center gap-2 px-3 py-2 text-ivory/80 hover:text-ivory">
        <UserRound size={15} /> {user.name} <span className="ml-auto text-[10px] uppercase tracking-wider text-ivory/40">{user.role}</span>
      </Link>
      <a href="/" target="_blank" className="flex items-center gap-2 px-3 py-2 text-ivory/60 hover:text-ivory">
        <ExternalLink size={15} /> View store
      </a>
      <button type="button" onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-ivory/60 hover:text-ivory">
        <LogOut size={15} /> Log out
      </button>
    </div>
  );

  return (
    <AdminToasts>
      <div className="min-h-screen bg-[#f6f2ec] text-charcoal">
        <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col bg-charcoal lg:flex">
          {brand}
          {nav}
          {foot}
        </aside>
        {open && (
          <div className="no-print fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-charcoal [animation:slide-in-left_.25s_ease-out_both]">
              {brand}
              {nav}
              {foot}
            </aside>
          </div>
        )}
        <div className="lg:pl-64">
          <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="font-serif text-[20px] tracking-[0.1em]">FEATHERS</span>
            <Link href="/admin/sales/new" className="btn-primary ml-auto px-3 py-2 text-[11px]">
              <ScanLine size={14} /> New Sale
            </Link>
          </header>
          <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminToasts>
  );
}
