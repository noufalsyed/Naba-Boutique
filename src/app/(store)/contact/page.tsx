import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Breadcrumbs } from '@/components/store/seo';
import { ContactForm } from '@/components/store/contact-form';
import { InstagramIcon, WhatsAppIcon } from '@/components/store/icons';
import { publicConfig } from '@/server/config';
import { waLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Feathers – The 2nd Skin on WhatsApp, phone, email or Instagram for orders, sizes and custom stitching.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const c = publicConfig();
  const rows = [
    { Icon: WhatsAppIcon, label: 'WhatsApp', value: 'Chat with us', href: waLink(c.whatsappNumber, `Hi ${c.businessName}`) },
    c.phone && { Icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    c.email && { Icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    { Icon: InstagramIcon, label: 'Instagram', value: '@feathers_the_2ndskin_', href: c.instagramUrl },
    { Icon: MapPin, label: 'Location', value: c.address },
    { Icon: Clock, label: 'Hours', value: 'Mon – Sat, 10 am – 7 pm' },
  ].filter(Boolean) as { Icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <div className="container-x py-10 md:py-14">
      <Breadcrumbs appUrl={c.appUrl} crumbs={[{ name: 'Home', href: '/' }, { name: 'Contact Us', href: '/contact' }]} />
      <p className="eyebrow mt-8">We would love to hear from you</p>
      <h1 className="mt-2 text-[40px] md:text-[54px]">Contact Us</h1>
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <ul className="space-y-5">
          {rows.map(({ Icon, label, value, href }) => (
            <li key={label} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-wine">
                <Icon size={18} />
              </span>
              <span>
                <span className="label mb-0">{label}</span>
                {href ? (
                  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-[16px] hover:text-wine">
                    {value}
                  </a>
                ) : (
                  <span className="text-[16px]">{value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="bg-sand p-6 md:p-8">
          <h2 className="text-[28px]">Send a message</h2>
          <p className="mt-1 text-[14px] text-muted">Your message opens in WhatsApp so we can reply right away.</p>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
