import type { Metadata } from 'next';
import { Ruler, Scissors, Shirt, Truck } from 'lucide-react';
import { StitchingForm } from '@/components/store/stitching-form';

export const metadata: Metadata = {
  title: 'Customized Stitching – Made to Measure Chudidhars & Dresses',
  description:
    'Custom stitching for ladies chudidhars, anarkalis and dresses in Kerala. Share your measurements, neck and sleeve design and reference photos — we stitch it to fit you.',
  alternates: { canonical: '/customized-stitching' },
};

const STEPS = [
  { Icon: Shirt, t: 'Choose your material', s: 'Pick a dress material from our store or use your own fabric.' },
  { Icon: Ruler, t: 'Share measurements', s: 'Fill in what you know — we will confirm the rest on WhatsApp.' },
  { Icon: Scissors, t: 'We design & stitch', s: 'Neck, sleeve and style exactly as you like, finished with care.' },
  { Icon: Truck, t: 'Delivered to you', s: 'Ready in 7–10 days and shipped across India.' },
];

export default function StitchingPage() {
  return (
    <>
      <section className="bg-sand">
        <div className="container-x py-12 text-center md:py-20">
          <p className="eyebrow">Customized Stitching</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-[42px] leading-[1.05] md:text-[64px]">
            Designed for You. <span className="italic text-wine">Stitched for You.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] text-ink/80">
            Choose your favourite material and let us create a look tailored to your style and measurements.
          </p>
        </div>
      </section>
      <section className="container-x py-12 md:py-16">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, t, s }, i) => (
            <li key={t} className="border-t border-charcoal pt-5">
              <span className="font-serif text-[15px] text-wine italic">Step {i + 1}</span>
              <Icon size={24} strokeWidth={1.3} className="mt-3 text-charcoal" />
              <h2 className="mt-3 text-[22px]">{t}</h2>
              <p className="mt-1 text-[14px] text-muted">{s}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="container-x max-w-4xl pb-6">
        <h2 className="text-[34px] md:text-[42px]">Request Custom Stitching</h2>
        <p className="mt-1 text-muted">Measurements in inches. Leave blank anything you are unsure of.</p>
        <div className="mt-8">
          <StitchingForm />
        </div>
      </section>
    </>
  );
}
