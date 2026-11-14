'use strict';
/*
 * WishCraft server
 *   GET  /                      builder app (home, occasions, templates, form)
 *   GET  /create/:occ[/:tpl]    same app, deep-linked
 *   GET  /api/config            sign-in setup + current launch offer (public)
 *   GET  /api/me                signed-in account, email verification and free-website status
 *   POST /api/sites             publish a site (signed in + verified; uses the free entitlement)
 *   POST /api/assist            AI writing helper (signed in + verified)
 *   GET  /admin                 offer settings page (ADMIN_EMAILS only)
 *   GET/PUT /api/admin/offer    read / change the launch offer
 *   GET  /api/admin/overview|sites|users   owner dashboard data
 *   POST /api/admin/sites/:slug/status      take a page down / restore it
 *   GET  /c/:slug               the shared celebration page (public, anyone with the link)
 *   GET  /m/:slug/:file         uploaded media for that page
 */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const C = require('./shared/celebrations');
const AI = require('./ai');
const Auth = require('./auth');

// Loopback by default. Put a reverse proxy (nginx/Caddy/ALB) with HTTPS in front for your domain.
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, ''); // e.g. https://yourdomain.com
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const SITES_DIR = path.join(DATA_DIR, 'sites');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const TMP_DIR = path.join(DATA_DIR, 'tmp');
for (const d of [SITES_DIR, MEDIA_DIR, TMP_DIR]) fs.mkdirSync(d, { recursive: true });
const DB = require('./db').open(DATA_DIR);
// Dev mode gets a default owner account so /admin works out of the box.
const ADMIN_LIST = (process.env.ADMIN_EMAILS || (Auth.MODE === 'dev' ? 'admin@wishcraft.local' : '')).split(',').map(e => e.trim()).filter(Boolean);
const ADMIN_EMAILS = new Set(ADMIN_LIST.map(e => DB.canonicalEmail(e)).filter(Boolean));
// Payments: 'dev' = simulated checkout on this machine only. Real gateway not connected yet, so paid checkout is off otherwise.
const PAYMENTS = Auth.MODE === 'dev' ? 'dev' : 'none';

// Dev sign-in must never be reachable from other machines.
if (Auth.MODE === 'dev' && !['127.0.0.1', '::1', 'localhost'].includes(HOST)) {
  console.error('DEV_AUTH=1 is only allowed with HOST=127.0.0.1. Refusing to start.');
  process.exit(1);
}

const MAX_FILE_MB = 150, MAX_TOTAL_MB = 400, MAX_FILES = 80;
const SLUG_RE = /^[a-z0-9-]{6,80}$/;
const FILE_RE = /^[a-f0-9]{24}\.(jpg|png|gif|webp|mp4|mov|webm|mp3|wav|ogg|m4a)$/;

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'SAMEORIGIN' });
  next();
});

/* ------------------------------ accounts ------------------------------
 * requireIdentity (auth.js) proves who is calling. requireAccount links that identity to our
 * database row and grants the launch entitlement when eligible. requireVerified blocks
 * anything that needs a verified email.
 */
function requireAccount(req, res, next) {
  try {
    const r = DB.syncUser(req.identity);
    if (r.error) return res.status(409).json({ error: r.error });
    req.account = r; next();
  } catch (e) { console.error('account sync failed', e); res.status(500).json({ error: 'Could not load your account.' }); }
}
function requireVerified(req, res, next) {
  if (!req.account.user.email_verified) return res.status(403).json({ error: 'Please verify your email address first.', code: 'verify' });
  next();
}
function requireAdmin(req, res, next) {
  if (!ADMIN_EMAILS.has(req.account.user.email_canonical)) return res.status(403).json({ error: 'Admins only.' });
  next();
}
const signedIn = [Auth.requireIdentity, requireAccount];
const isAdmin = acc => ADMIN_EMAILS.has(acc.user.email_canonical);

// Why a customer can't publish for free right now (shown in the builder).
function freeStatus(acc) {
  const e = DB.entitlementView(acc.entitlement);
  if (e && e.status === 'available') return { canPublishFree: true, reason: null };
  const reason = e && e.status === 'used' ? 'used' : e && e.status === 'expired' ? 'expired' : acc.offerNote || 'none';
  const msg = {
    'verify-email': 'Verify your email address to unlock your free birthday website.',
    used: 'You’ve already used your free birthday website.',
    expired: 'Your free website offer has expired.',
    'existing-account': 'The free launch website is for new accounts only.',
    'offer-ended': 'The free launch offer has ended.',
    none: 'No free website on this account.'
  }[reason];
  return { canPublishFree: false, reason, message: msg };
}
// What the next publish costs this account: a gifted/paid credit, the free launch website, or a price to pay.
function nextPublish(acc) {
  if (DB.creditsFor(acc.user.id) > 0) return { type: 'credit', amountInr: 0, regularInr: DB.quote().regularInr };
  const free = freeStatus(acc);
  if (free.canPublishFree) return { type: 'free', amountInr: 0, regularInr: acc.entitlement.value_inr };
  const q = DB.quote();
  return { type: 'pay', amountInr: q.priceInr, regularInr: q.regularInr, sale: q.sale, paymentsAvailable: PAYMENTS !== 'none' };
}

// Blocks cross-site form posts: a custom header forces a CORS preflight we never approve.
function sameOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (req.headers['x-wishcraft'] !== '1') return res.status(400).json({ error: 'Bad request' });
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch { /* "null" or malformed origin */ }
    if (host !== req.headers.host) return res.status(403).json({ error: 'Cross-origin request blocked' });
  }
  next();
}

/* ------------------------------ file type sniffing ------------------------------ */
// Detects the real type from magic bytes. Anything else (SVG, HTML, HEIC, executables) is rejected.
async function sniff(file) {
  const fh = await fsp.open(file, 'r');
  const b = Buffer.alloc(16);
  try { await fh.read(b, 0, 16, 0); } finally { await fh.close(); }
  const s = (o, l) => b.toString('latin1', o, o + l);
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', ext: 'jpg' };
  if (b.readUInt32BE(0) === 0x89504e47) return { kind: 'image', ext: 'png' };
  if (s(0, 4) === 'GIF8') return { kind: 'image', ext: 'gif' };
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WEBP') return { kind: 'image', ext: 'webp' };
  if (s(0, 4) === 'RIFF' && s(8, 4) === 'WAVE') return { kind: 'audio', ext: 'wav' };
  if (s(0, 4) === 'OggS') return { kind: 'audio', ext: 'ogg' };
  if (s(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { kind: 'audio', ext: 'mp3' };
  if (b.readUInt32BE(0) === 0x1a45dfa3) return { kind: 'av', ext: 'webm' }; // browser voice recordings and webm video
  if (s(4, 4) === 'ftyp') {
    const brand = s(8, 4);
    if (/^heic|^heix|^mif1|^msf1|^avif/.test(brand)) return null;
    if (brand.startsWith('M4A')) return { kind: 'audio', ext: 'm4a' };
    return { kind: 'av', ext: brand === 'qt  ' ? 'mov' : 'mp4' };   // mp4 can hold audio-only (Safari recordings)
  }
  return null;
}
const kindFits = (kind, fieldType) =>
  fieldType === 'photo' ? kind === 'image' : fieldType === 'video' ? kind === 'av' : kind === 'audio' || kind === 'av';

/* ------------------------------ helpers ------------------------------ */
function makeSlug(name, occId) {
  const base = String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const rand = crypto.randomBytes(8).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10).padEnd(10, '0');
  return [base, occId, rand].filter(Boolean).join('-');
}
const baseUrl = req => PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
const cleanup = files => Promise.all((files || []).map(f => fsp.unlink(f.path).catch(() => {})));

/* ------------------------------ publish ------------------------------ */
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES, fields: 5, fieldSize: 1024 * 1024, parts: MAX_FILES + 5 }
});

app.post('/api/sites', sameOrigin, ...signedIn, requireVerified, (req, res) => {
  upload.any()(req, res, async err => {
    const files = req.files || [];
    let spent = null;
    try {
      const next = nextPublish(req.account);
      if (next.type === 'pay') return res.status(402).json({ error: `Publishing costs ₹${next.amountInr}. Please complete payment first.`, code: 'payment_required', next });
      if (err) return res.status(413).json({ error: err.code === 'LIMIT_FILE_SIZE' ? `Each file must be under ${MAX_FILE_MB} MB.` : 'Upload rejected: ' + err.message });
      if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_MB * 1024 * 1024) return res.status(413).json({ error: `Total upload must be under ${MAX_TOTAL_MB} MB.` });

      let payload;
      try { payload = JSON.parse(req.body.data || '{}'); } catch { return res.status(400).json({ error: 'Invalid data' }); }
      const occ = C.occasion(payload.occasion), tpl = C.template(payload.template);
      if (!C.isActive(occ) || !tpl || !C.templatesFor(occ).includes(tpl)) return res.status(400).json({ error: 'Unknown occasion or template' });

      const slug = makeSlug(payload.data && payload.data.to, occ.id);
      const byField = new Map();
      for (const f of files) {
        if (!/^f\d{1,3}$/.test(f.fieldname)) return res.status(400).json({ error: 'Unexpected file field' });
        const t = await sniff(f.path);
        if (!t) return res.status(415).json({ error: `"${f.originalname}" is not a supported photo, video or audio file. Use JPG, PNG, WEBP, GIF, MP4, MOV, WEBM, MP3, M4A or WAV.` });
        byField.set(f.fieldname, { ...t, file: f, name: crypto.randomBytes(12).toString('hex') + '.' + t.ext });
      }

      // Client sends media as {"$file":"f3"}; only files of the right type are accepted for each field.
      const used = new Set();
      const resolveMedia = (v, fieldType) => {
        const m = v && typeof v === 'object' && typeof v.$file === 'string' ? byField.get(v.$file) : null;
        if (!m || !kindFits(m.kind, fieldType)) return null;
        used.add(m); return `/m/${slug}/${m.name}`;
      };
      const fields = C.allFields(occ, tpl);
      const data = C.sanitize(fields, payload.data || {}, resolveMedia);
      const isMedia = v => typeof v === 'string' && v.startsWith(`/m/${slug}/`);
      const missing = fields.filter(f => f.required && !C.fieldOk(f, data, isMedia)).map(f => f.label);
      if (missing.length) return res.status(422).json({ error: 'Still needed: ' + missing.join(', '), missing });

      // Spend a paid/gifted credit, or the free launch entitlement (atomic: each can only be used once).
      if (next.type === 'credit') {
        const orderId = DB.spendCredit(req.account.user.id, slug, tpl.id);
        if (!orderId) return res.status(402).json({ error: 'That website credit was already used. Please try again.', code: 'payment_required', next: nextPublish(DB.syncUser(req.identity)) });
        spent = { orderId, slug };
      } else {
        const entId = DB.spendEntitlement(req.account.user.id, slug, tpl.id);
        if (!entId) return res.status(402).json({ error: 'Your free website was already used.', code: 'payment_required', next: nextPublish(DB.syncUser(req.identity)) });
        spent = { entId, slug };
      }

      const dir = path.join(MEDIA_DIR, slug);
      await fsp.mkdir(dir, { recursive: true });
      for (const m of used) await fsp.rename(m.file.path, path.join(dir, m.name));
      const site = { slug, occasion: occ.id, template: tpl.id, data, createdAt: new Date().toISOString() };
      await fsp.writeFile(path.join(SITES_DIR, slug + '.json'), JSON.stringify(site, null, 2), { flag: 'wx' });

      spent = null;
      res.status(201).json({ slug, url: `${baseUrl(req)}/c/${slug}` });
    } catch (e) {
      console.error('publish failed', e);
      if (spent) { try { spent.orderId ? DB.refundCredit(spent.orderId, spent.slug) : DB.refundEntitlement(spent.entId, spent.slug); } catch (r) { console.error('refund failed', r); } }
      res.status(500).json({ error: 'Something went wrong while publishing. Please try again.' });
    } finally {
      cleanup(files.filter(f => fs.existsSync(f.path)));
    }
  });
});

/* ------------------------------ AI writing helper ------------------------------ */
// Simple per-IP limit so nobody can burn through your AI credits.
const hits = new Map();
function rateLimit(req, res, next) {
  const key = req.socket.remoteAddress, now = Date.now();
  const h = hits.get(key) || { n: 0, t: now };
  if (now - h.t > 60000) { h.n = 0; h.t = now; }
  h.n++; hits.set(key, h);
  if (h.n > 30) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  next();
}
app.post('/api/assist', sameOrigin, ...signedIn, requireVerified, rateLimit, express.json({ limit: '20kb' }), async (req, res) => {
  const b = req.body || {};
  const occ = C.occasion(b.occasion);
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  if (!occ || !AI.KINDS[b.kind] || !AI.TONES[b.tone]) return res.status(400).json({ error: 'Bad request' });
  try {
    res.json(await AI.assist({
      occasion: occ, kind: b.kind, tone: b.tone,
      label: str(b.label, 80) || 'Message', text: str(b.text, 3000),
      to: str(b.to, 120), from: str(b.from, 120), context: str(b.context, 300)
    }));
  } catch (e) {
    console.error('assist failed', e);
    res.status(500).json({ error: 'Could not get suggestions right now.' });
  }
});

/* ------------------------------ accounts, offer, admin ------------------------------ */
Auth.devRoutes(app, express, { dataDir: DATA_DIR, ownerEmail: ADMIN_LIST[0] || 'admin@wishcraft.local' });
app.get('/api/config', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ auth: Auth.clientConfig(req), offer: DB.publicOffer(), pricing: DB.quote(), payments: Auth.isLocal(req) ? PAYMENTS : (PAYMENTS === 'dev' ? 'none' : PAYMENTS) }); });
app.get('/api/me', ...signedIn, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const u = req.account.user;
  res.json({ email: u.email, verified: !!u.email_verified, isAdmin: isAdmin(req.account),
    entitlement: DB.entitlementView(req.account.entitlement), ...freeStatus(req.account), offer: DB.publicOffer(),
    credits: DB.creditsFor(u.id), next: nextPublish(req.account), pricing: DB.quote(), payments: PAYMENTS });
});

/* ---------- checkout ---------- */
app.post('/api/orders', sameOrigin, ...signedIn, requireVerified, (req, res) => {
  const next = nextPublish(req.account);
  if (next.type !== 'pay') return res.status(409).json({ error: 'You don’t need to pay for your next website.', next });
  if (PAYMENTS === 'none') return res.status(503).json({ error: 'Online payment isn’t available yet. Please check back soon.' });
  const o = DB.createOrder(req.account.user.id, PAYMENTS);
  res.status(201).json({ orderId: o.id, amountInr: o.amount_inr, regularInr: o.regular_inr, kind: o.kind, provider: o.provider });
});
// Simulated payment: dev mode on this machine only. A real gateway must confirm payment server-to-server instead.
app.post('/api/orders/:id/dev-pay', sameOrigin, ...signedIn, requireVerified, (req, res) => {
  if (PAYMENTS !== 'dev' || !Auth.isLocal(req)) return res.sendStatus(404);
  if (!/^ord_[A-Za-z0-9_-]{8,20}$/.test(req.params.id) || !DB.markPaid(req.params.id, req.account.user.id)) return res.status(404).json({ error: 'Order not found or already paid' });
  res.json({ ok: true, credits: DB.creditsFor(req.account.user.id) });
});
app.get('/api/admin/offer', ...signedIn, requireVerified, requireAdmin, (req, res) => res.json(DB.adminOffer()));
app.put('/api/admin/offer', sameOrigin, ...signedIn, requireVerified, requireAdmin, express.json({ limit: '4kb' }), (req, res) => {
  const b = req.body || {}, v = {};
  const time = (x, name) => {
    if (x === null || x === '') return null;
    const t = Date.parse(x);
    if (typeof x !== 'string' || !Number.isFinite(t)) throw new Error(`${name} must be a date and time`);
    return t;
  };
  try {
    if ('headline' in b) { if (typeof b.headline !== 'string' || !b.headline.trim() || b.headline.length > 120) throw new Error('Headline must be 1 to 120 characters'); v.headline = b.headline.trim(); }
    if ('priceInr' in b) { if (!Number.isInteger(b.priceInr) || b.priceInr < 1 || b.priceInr > 100000) throw new Error('Price must be a whole number of rupees'); v.priceInr = b.priceInr; }
    if ('active' in b) { if (typeof b.active !== 'boolean') throw new Error('active must be true or false'); v.active = b.active; }
    if ('startsAt' in b) { v.startsAt = time(b.startsAt, 'Start'); if (v.startsAt == null) throw new Error('Start is required'); }
    if ('endsAt' in b) v.endsAt = time(b.endsAt, 'End');
    if ('useWithinDays' in b) { if (b.useWithinDays !== null && (!Number.isInteger(b.useWithinDays) || b.useWithinDays < 1 || b.useWithinDays > 3650)) throw new Error('Use-within days must be 1 to 3650, or empty'); v.useWithinDays = b.useWithinDays; }
    const cur = DB.getOffer(), start = v.startsAt ?? cur.starts_at, end = v.endsAt === undefined ? cur.ends_at : v.endsAt;
    if (end != null && end <= start) throw new Error('The end must be after the start');
  } catch (e) { return res.status(400).json({ error: e.message }); }
  const out = DB.updateOffer(v);
  DB.log(req.account.user.email, 'offer.update', JSON.stringify(b));
  res.json(out);
});
app.get('/api/admin/pricing', ...signedIn, requireVerified, requireAdmin, (req, res) => res.json(DB.adminPricing()));
app.put('/api/admin/pricing', sameOrigin, ...signedIn, requireVerified, requireAdmin, express.json({ limit: '4kb' }), (req, res) => {
  const b = req.body || {}, v = {};
  const rupees = (x, name) => { if (!Number.isInteger(x) || x < 1 || x > 100000) throw new Error(`${name} must be a whole number of rupees (1 to 100000)`); return x; };
  const time = (x, name) => { if (x === null || x === '') return null; const t = Date.parse(x); if (typeof x !== 'string' || !Number.isFinite(t)) throw new Error(`${name} must be a date and time`); return t; };
  try {
    if ('regularInr' in b) v.regularInr = rupees(b.regularInr, 'Regular price');
    if ('saleActive' in b) { if (typeof b.saleActive !== 'boolean') throw new Error('saleActive must be true or false'); v.saleActive = b.saleActive; }
    if ('saleInr' in b) v.saleInr = b.saleInr === null ? null : rupees(b.saleInr, 'Sale price');
    if ('saleLabel' in b) { if (b.saleLabel !== null && (typeof b.saleLabel !== 'string' || b.saleLabel.length > 60)) throw new Error('Sale label must be up to 60 characters'); v.saleLabel = b.saleLabel ? b.saleLabel.trim() : null; }
    if ('saleStartsAt' in b) v.saleStartsAt = time(b.saleStartsAt, 'Sale start');
    if ('saleEndsAt' in b) v.saleEndsAt = time(b.saleEndsAt, 'Sale end');
    const cur = DB.adminPricing(), reg = v.regularInr ?? cur.regularInr, sale = v.saleInr === undefined ? cur.saleInr : v.saleInr;
    const on = v.saleActive ?? cur.saleActive;
    if (on && (sale == null || sale >= reg)) throw new Error('The sale price must be lower than the regular price');
    const st = v.saleStartsAt === undefined ? (cur.saleStartsAt && Date.parse(cur.saleStartsAt)) : v.saleStartsAt;
    const en = v.saleEndsAt === undefined ? (cur.saleEndsAt && Date.parse(cur.saleEndsAt)) : v.saleEndsAt;
    if (st && en && en <= st) throw new Error('The sale end must be after its start');
  } catch (e) { return res.status(400).json({ error: e.message }); }
  const out = DB.updatePricing(v);
  DB.log(req.account.user.email, 'pricing.update', JSON.stringify(b));
  res.json(out);
});
app.get('/api/admin/orders', ...signedIn, requireVerified, requireAdmin, (req, res) => {
  const iso = t => (t == null ? null : new Date(t).toISOString());
  res.json({ totals: DB.orderTotals(), orders: DB.listOrders().map(o => ({ id: o.id, email: o.email, kind: o.kind, amountInr: o.amount_inr, regularInr: o.regular_inr,
    status: o.status, provider: o.provider, note: o.note, createdAt: iso(o.created_at), paidAt: iso(o.paid_at), usedAt: iso(o.used_at), siteSlug: o.site_slug })) });
});
app.post('/api/admin/gifts', sameOrigin, ...signedIn, requireVerified, requireAdmin, express.json({ limit: '2kb' }), (req, res) => {
  const { email, note } = req.body || {};
  if (typeof email !== 'string' || !email.includes('@') || email.length > 200) return res.status(400).json({ error: 'Enter the customer’s email' });
  if (note != null && (typeof note !== 'string' || note.length > 200)) return res.status(400).json({ error: 'Note must be up to 200 characters' });
  const o = DB.giftWebsite(email, note);
  if (!o) return res.status(404).json({ error: 'No customer with that email. They need to sign up first.' });
  DB.log(req.account.user.email, 'gift.grant', `${email} ${o.id}${note ? ' · ' + note : ''}`);
  res.status(201).json({ orderId: o.id });
});
app.post('/api/admin/gifts/:id/revoke', sameOrigin, ...signedIn, requireVerified, requireAdmin, (req, res) => {
  if (!/^ord_[A-Za-z0-9_-]{8,20}$/.test(req.params.id) || !DB.revokeGift(req.params.id)) return res.status(404).json({ error: 'Gift not found, or it was already used' });
  DB.log(req.account.user.email, 'gift.revoke', req.params.id);
  res.json({ ok: true });
});
// CSV downloads for Excel. Cells starting with = + - @ are prefixed with ' so they can't run as formulas.
const csvCell = v => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const csv = (head, rows) => '\ufeff' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
app.get('/api/admin/export/:what', ...signedIn, requireVerified, requireAdmin, async (req, res) => {
  const iso = t => (t == null ? '' : new Date(t).toISOString());
  let body;
  if (req.params.what === 'customers.csv') {
    body = csv(['email', 'verified', 'signed_up', 'free_website', 'credits', 'pages', 'spent_inr'],
      DB.listUsers().map(u => [u.email, u.email_verified ? 'yes' : 'no', iso(u.created_at), u.ent_status || '', u.credits, u.site_count, u.spent_inr]));
  } else if (req.params.what === 'orders.csv') {
    body = csv(['order', 'email', 'kind', 'amount_inr', 'regular_inr', 'status', 'provider', 'created', 'paid', 'used', 'page', 'note'],
      DB.listOrders().map(o => [o.id, o.email, o.kind, o.amount_inr, o.regular_inr, o.status, o.provider, iso(o.created_at), iso(o.paid_at), iso(o.used_at), o.site_slug, o.note]));
  } else if (req.params.what === 'pages.csv') {
    const rows = new Map(DB.listSites().map(r => [r.slug, r])), out = [];
    for (const f of (await fsp.readdir(SITES_DIR)).filter(f => f.endsWith('.json'))) {
      let s; try { s = JSON.parse(await fsp.readFile(path.join(SITES_DIR, f), 'utf8')); } catch { continue; }
      const r = rows.get(s.slug) || {}, d = s.data || {};
      out.push([`${baseUrl(req)}/c/${s.slug}`, d.to, d.from, r.owner_email || '', s.template, d.theme || '', s.createdAt, d.date ? `${d.date} ${d.time || '00:00'}` : '',
        r.disabled_at ? 'taken down' : 'live', r.views || 0, r.entitlement_id != null ? 'free' : r.order_info || '']);
    }
    body = csv(['link', 'for', 'from', 'creator', 'design', 'theme', 'published', 'opens', 'status', 'views', 'price'], out);
  } else return res.sendStatus(404);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="wishcraft-${req.params.what}"`, 'Cache-Control': 'no-store' });
  res.send(body);
});
app.get('/api/admin/log', ...signedIn, requireVerified, requireAdmin, (req, res) =>
  res.json({ entries: DB.listLog().map(e => ({ at: new Date(e.at).toISOString(), actor: e.actor, action: e.action, detail: e.detail })) }));
/* ---------- owner dashboard ---------- */
const DAY = 864e5;
const daysLeft = t => (t == null ? null : Math.max(0, Math.ceil((t - Date.now()) / DAY)));
async function dirBytes(dir) {
  try { const names = await fsp.readdir(dir); let n = 0; for (const f of names) n += (await fsp.stat(path.join(dir, f))).size; return n; } catch { return 0; }
}
const admin = [...signedIn, requireVerified, requireAdmin];
app.get('/api/admin/overview', ...admin, async (req, res) => {
  const o = DB.getOffer(), rows = DB.listSites(), files = (await fsp.readdir(SITES_DIR)).filter(f => f.endsWith('.json'));
  const down = rows.filter(r => r.disabled_at).length, uc = DB.userCounts(), off = DB.adminOffer();
  res.json({
    sites: { total: files.length, live: files.length - down, takenDown: down },
    customers: { total: uc.users, verified: uc.verified },
    free: { granted: off.granted, used: off.used, unused: off.granted - off.used },
    offer: { running: off.running, endsAt: off.endsAt, daysLeft: off.running ? daysLeft(o.ends_at) : null, priceInr: o.price_inr,
      revenueGivenInr: off.used * o.price_inr },
    revenue: DB.orderTotals(), views: DB.totalViews(), pricing: DB.quote(), payments: PAYMENTS,
    siteExpiry: null   // published pages never expire (no lifetime is configured)
  });
});
app.get('/api/admin/sites', ...admin, async (req, res) => {
  const rows = new Map(DB.listSites().map(r => [r.slug, r]));
  const files = (await fsp.readdir(SITES_DIR)).filter(f => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    let site; try { site = JSON.parse(await fsp.readFile(path.join(SITES_DIR, f), 'utf8')); } catch { continue; }
    const r = rows.get(site.slug) || {}, d = site.data || {}, tpl = C.template(site.template);
    out.push({
      slug: site.slug, url: `${baseUrl(req)}/c/${site.slug}`, to: d.to || '', from: d.from || '',
      template: tpl ? tpl.name : site.template, theme: d.theme || '', owner: r.owner_email || null,
      createdAt: site.createdAt, free: r.entitlement_id != null,
      paid: r.order_info ? { kind: r.order_info.split(':')[0], amountInr: Number(r.order_info.split(':')[1]) } : null,
      views: r.views || 0, lastViewedAt: r.last_viewed_at ? new Date(r.last_viewed_at).toISOString() : null,
      reveal: d.date ? { date: d.date, time: d.time || '00:00' } : null,   // recipient's own local time
      mediaBytes: await dirBytes(path.join(MEDIA_DIR, site.slug)),
      status: r.disabled_at ? 'taken-down' : 'live', takenDownAt: r.disabled_at ? new Date(r.disabled_at).toISOString() : null,
      expiresAt: null
    });
  }
  out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ sites: out });
});
app.get('/api/admin/users', ...admin, (req, res) => {
  const iso = t => (t == null ? null : new Date(t).toISOString());
  res.json({ users: DB.listUsers().map(u => {
    const expired = u.ent_status === 'available' && u.expires_at != null && Date.now() >= u.expires_at;
    return { email: u.email, verified: !!u.email_verified, signedUpAt: iso(u.created_at), verifiedAt: iso(u.verified_at), sites: u.site_count,
      credits: u.credits, spentInr: u.spent_inr,
      free: u.ent_status ? { status: expired ? 'expired' : u.ent_status, valueInr: u.value_inr, grantedAt: iso(u.granted_at), usedAt: iso(u.used_at),
        siteSlug: u.site_slug, expiresAt: iso(u.expires_at), daysLeft: u.ent_status === 'available' && !expired ? daysLeft(u.expires_at) : null } : null };
  }) });
});
app.post('/api/admin/sites/:slug/status', sameOrigin, ...admin, express.json({ limit: '1kb' }), async (req, res) => {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug) || typeof (req.body || {}).takenDown !== 'boolean') return res.status(400).json({ error: 'Bad request' });
  let site; try { site = JSON.parse(await fsp.readFile(path.join(SITES_DIR, slug + '.json'), 'utf8')); } catch { return res.status(404).json({ error: 'No such page' }); }
  DB.setSiteDisabled(slug, req.body.takenDown, site.template, Date.parse(site.createdAt) || Date.now());
  DB.log(req.account.user.email, req.body.takenDown ? 'site.takedown' : 'site.restore', slug);
  res.json({ slug, status: req.body.takenDown ? 'taken-down' : 'live' });
});
// Dev only, this Mac only: open /dev-login to be signed in as the owner (or ?as=customer) in one step.
app.get('/dev-login', (req, res) => {
  if (Auth.MODE !== 'dev' || !Auth.isLocal(req)) return notFound(res);
  const as = req.query.as === 'customer' ? 'customer' : 'owner', to = as === 'owner' ? '/admin' : '/';
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;color:#22163a"><p id="m">🔑 Signing you in as ${as}…</p>
<script src="/assets/auth.js"></script><script>
Auth.init().then(() => Auth.quickDev('${as}')).then(() => location.replace('${to}'))
  .catch(e => { document.getElementById('m').textContent = 'Could not sign in: ' + e.message; });
</script>`);
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

/* ------------------------------ shared pages ------------------------------ */
app.get('/c/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) return notFound(res);
  if (DB.isDisabled(slug)) return res.status(410).type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page unavailable</title>
<body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;text-align:center;color:#22163a"><div><div style="font-size:4rem">🎈</div><h1>This page is no longer available</h1><p><a href="/">Create your own celebration page</a></p></div>`);
  let site;
  try { site = JSON.parse(await fsp.readFile(path.join(SITES_DIR, slug + '.json'), 'utf8')); } catch { return notFound(res); }
  const occ = C.occasion(site.occasion), tpl = C.template(site.template);
  if (!occ || !tpl) return notFound(res);
  try { DB.countView(slug, site.template, Date.parse(site.createdAt)); } catch (e) { console.error('view count failed', e); }
  const nonce = crypto.randomBytes(16).toString('base64');
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'", `script-src 'nonce-${nonce}'`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com", "img-src 'self'", "media-src 'self'", "connect-src 'none'",
      "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"
    ].join('; '),
    'X-Robots-Tag': 'noindex',
    'Cache-Control': 'no-cache'
  });
  res.type('html').send(C.render(tpl, occ, site.data, v => v, { nonce, homeUrl: '/' }));
});

app.get('/m/:slug/:file', (req, res) => {
  const { slug, file } = req.params;
  if (!SLUG_RE.test(slug) || !FILE_RE.test(file) || DB.isDisabled(slug)) return res.sendStatus(404);
  res.sendFile(path.join(MEDIA_DIR, slug, file), {
    dotfiles: 'deny', maxAge: '365d', immutable: true,
    headers: { 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'; sandbox" }
  }, e => { if (e && !res.headersSent) res.sendStatus(404); });
});

/* ------------------------------ builder app ------------------------------ */
app.use('/templates', express.static(path.join(__dirname, 'templates'), { index: false }));
app.use('/shared', express.static(path.join(__dirname, 'shared'), { index: false }));
app.use('/assets', express.static(path.join(__dirname, 'public'), { index: false }));
const sendApp = (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'));
app.get(['/', '/create/:occ', '/create/:occ/:tpl'], sendApp);

function notFound(res) {
  res.status(404).type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title>
<body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;text-align:center;color:#22163a">
<div><div style="font-size:4rem">🎈</div><h1>This celebration isn't here</h1><p>The link may be mistyped or the page was removed.</p><p><a href="/">Create your own celebration page</a></p></div>`);
}
app.use((req, res) => notFound(res));

app.listen(PORT, HOST, () => console.log(`WishCraft running at http://${HOST}:${PORT} (sign-in: ${Auth.MODE}${ADMIN_EMAILS.size ? `, ${ADMIN_EMAILS.size} admin(s)` : ''})`));
