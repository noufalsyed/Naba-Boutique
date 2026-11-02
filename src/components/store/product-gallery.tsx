'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const list = images.length ? images : [{ url: '', alt: name }];
  const current = list[active];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const onScroll = () => {
    const el = rail.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="md:flex md:gap-4">
      {/* Thumbnails (desktop) */}
      <div className="hidden w-20 shrink-0 flex-col gap-3 md:flex">
        {list.map((img, i) => (
          <button key={img.url + i} type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} className={`relative aspect-[4/5] overflow-hidden bg-sand transition-opacity ${i === active ? 'ring-1 ring-charcoal' : 'opacity-60 hover:opacity-100'}`}>
            {img.url && <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />}
          </button>
        ))}
      </div>

      {/* Main image with hover zoom (desktop) */}
      <div
        className="relative hidden aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden bg-sand md:block"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
      >
        {current.url && (
          <Image
            src={current.url}
            alt={current.alt ?? name}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover transition-transform duration-200"
            style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        )}
        <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 bg-white/90 px-2.5 py-1.5 text-[11px] tracking-wide text-muted">
          <ZoomIn size={13} /> Hover to zoom
        </span>
      </div>

      {/* Swipe rail (mobile) */}
      <div className="relative -mx-4 md:hidden">
        <div ref={rail} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {list.map((img, i) => (
            <button key={img.url + i} type="button" onClick={() => { setActive(i); setLightbox(true); }} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-sand" aria-label="Open image">
              {img.url && <Image src={img.url} alt={img.alt ?? name} fill priority={i === 0} sizes="100vw" className="object-cover" />}
            </button>
          ))}
        </div>
        {list.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-charcoal' : 'w-1.5 bg-charcoal/30'}`} />
            ))}
          </div>
        )}
      </div>

      {lightbox && current.url && (
        <div className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center bg-charcoal/95" role="dialog" aria-modal="true" aria-label="Image viewer">
          <button type="button" onClick={() => setLightbox(false)} aria-label="Close" className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white">
            <X size={24} />
          </button>
          <div className="no-scrollbar h-full w-full overflow-auto">
            <div className="relative mx-auto h-[165vh] w-[132vh] max-w-none">
              <Image src={current.url} alt={current.alt ?? name} fill sizes="1600px" quality={90} className="object-contain" />
            </div>
          </div>
          {list.length > 1 && (
            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
              {list.map((img, i) => (
                <button key={i} type="button" onClick={() => setActive(i)} className={`relative h-14 w-11 overflow-hidden ${i === active ? 'ring-2 ring-white' : 'opacity-50'}`} aria-label={`Image ${i + 1}`}>
                  <Image src={img.url} alt="" fill sizes="44px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
