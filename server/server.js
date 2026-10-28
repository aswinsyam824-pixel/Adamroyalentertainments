// Adam Royal Entertainments – website + contact form mail server
// Serves the site from ../public and sends contact-form messages over SMTP.
// SMTP settings are read from server/.env (never commit that file).

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASSWORD,
  MAIL_FROM,
  MAIL_TO,
  PORT = '3000',
} = process.env;

console.log('[env] loaded from', path.join(__dirname, '.env'));
for (const [key, val] of Object.entries({ SMTP_HOST, SMTP_USER, SMTP_PASSWORD, MAIL_TO })) {
  if (!val) console.warn(`[warn] ${key} is empty in server/.env – emails will fail until it is set.`);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // 465 = SSL, 587 = STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
});

transporter.verify()
  .then(() => console.log('[ok] SMTP connection verified'))
  .catch((e) => console.warn('[warn] SMTP verify failed:', e.message));

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); },
}));

// Very small in-memory rate limit: 5 messages per IP per 10 minutes
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

app.post('/api/contact', async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // honeypot: bots fill this hidden field

    const name = clean(b.name, 120);
    const email = clean(b.email, 160);
    const service = clean(b.service, 120);
    const message = String(b.message || '').trim().slice(0, 5000);

    if (!name || !message || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Please provide your name, a valid email and a message.' });
    }
    if (rateLimited(req.ip)) {
      return res.status(429).json({ ok: false, error: 'Too many messages. Please try again later.' });
    }

    await transporter.sendMail({
      from: MAIL_FROM || SMTP_USER,
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `New enquiry: ${service || 'General'} – ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nService: ${service || '-'}\n\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;color:#0B1830">
          <h2 style="color:#DE0261;margin:0 0 12px">New website enquiry</h2>
          <p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Service:</b> ${esc(service || '-')}</p>
          <p style="white-space:pre-wrap;border-left:3px solid #FF6FA3;padding-left:12px">${esc(message)}</p>
        </div>`,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[error] sendMail failed:', e.code || '', e.response || e.message);
    // Show the real reason in the browser console while testing (hidden when NODE_ENV=production)
    const detail = process.env.NODE_ENV === 'production' ? undefined : (e.response || e.message);
    res.status(500).json({ ok: false, error: 'Message could not be sent.', detail });
  }
});

app.listen(Number(PORT), () => console.log(`Adam Royal site running on http://localhost:${PORT}`));
