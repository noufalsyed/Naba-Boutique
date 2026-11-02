'use client';

import { useState } from 'react';
import { useStore } from '@/components/store/store-provider';
import { WhatsAppIcon } from '@/components/store/icons';
import { waLink } from '@/lib/whatsapp';

export function ContactForm() {
  const { config } = useStore();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('Product enquiry');
  const [message, setMessage] = useState('');
  const text = `Hi ${config.businessName}, this is ${name || '…'}.\nTopic: ${topic}\n${message}`;
  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(waLink(config.whatsappNumber, text), '_blank', 'noopener');
      }}
    >
      <div>
        <label htmlFor="c-name" className="label">Your Name</label>
        <input id="c-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="c-topic" className="label">Topic</label>
        <select id="c-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="input">
          {['Product enquiry', 'Order status', 'Custom stitching', 'Returns & exchange', 'Other'].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="c-msg" className="label">Message</label>
        <textarea id="c-msg" required rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} className="input" />
      </div>
      <button className="btn-whatsapp w-full py-4">
        <WhatsAppIcon size={18} /> Send on WhatsApp
      </button>
    </form>
  );
}
