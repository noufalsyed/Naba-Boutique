import 'server-only';

/** Sends through Resend when RESEND_API_KEY is set; otherwise logs the email. */
export async function sendMail(m: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[mail] (no RESEND_API_KEY) To: ${m.to}\nSubject: ${m.subject}\n${m.text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Feathers <no-reply@example.com>', to: [m.to], subject: m.subject, text: m.text }),
  });
  if (!res.ok) console.error('[mail] send failed', res.status, await res.text().catch(() => ''));
}
