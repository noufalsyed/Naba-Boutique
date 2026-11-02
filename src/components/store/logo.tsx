import Link from 'next/link';
import { FeatherMark } from '@/components/store/icons';

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" aria-label="Feathers – The 2nd Skin, home" className="group inline-flex items-center gap-2.5">
      <FeatherMark size={compact ? 24 : 30} className={`${light ? 'text-ivory' : 'text-wine'} transition-transform duration-500 group-hover:-rotate-12`} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif ${compact ? 'text-[22px]' : 'text-[26px]'} font-medium tracking-[0.14em] ${light ? 'text-ivory' : 'text-charcoal'}`}>FEATHERS</span>
        <span className={`mt-0.5 text-[8.5px] font-medium uppercase tracking-[0.42em] ${light ? 'text-ivory/70' : 'text-muted'}`}>The 2nd Skin</span>
      </span>
    </Link>
  );
}
