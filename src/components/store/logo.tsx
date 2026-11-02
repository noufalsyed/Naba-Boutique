import Link from 'next/link';
import { FeatherMark } from '@/components/store/icons';

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" aria-label="NABA Boutique, home" className="group inline-flex items-center gap-2.5">
      <FeatherMark size={compact ? 24 : 30} className={`${light ? 'text-ivory' : 'text-wine'} transition-transform duration-500 group-hover:-rotate-12`} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif ${compact ? 'text-[22px]' : 'text-[26px]'} font-medium tracking-[0.22em] ${light ? 'text-ivory' : 'text-charcoal'}`}>NABA</span>
        <span className={`mt-0.5 text-[8.5px] font-medium uppercase tracking-[0.42em] ${light ? 'text-ivory/70' : 'text-muted'}`}>Boutique</span>
      </span>
    </Link>
  );
}
