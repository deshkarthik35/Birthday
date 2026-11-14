'use strict';
/*
 * WishCraft database (SQLite, built into Node). Holds accounts, the launch offer,
 * free-website entitlements and who owns each published site.
 *
 * Launch offer rules (enforced here, not in the browser):
 *  - One entitlement per account per offer (UNIQUE(user_id, offer_id)).
 *  - One account per email address. Emails are compared in canonical form
 *    ("A.b+promo@gmail.com" == "ab@gmail.com"), so the same inbox can't sign up twice.
 *  - Only accounts first registered on or after the offer start are eligible.
 *  - The entitlement is granted when the email is verified, and only while the offer is running.
 *  - Once granted it is kept after the offer ends (unless the admin sets a use-by period).
 *  - Using it to publish is a single conditional UPDATE, so it can only be spent once.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const OFFER_ID = 'launch-free-birthday';

function open(dir) {
  const db = new DatabaseSync(path.join(dir, 'wishcraft.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      auth_uid TEXT NOT NULL UNIQUE,            -- id from the sign-in provider
      email TEXT NOT NULL,
      email_canonical TEXT NOT NULL UNIQUE,     -- one account per inbox
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,              -- first time we saw this account (ms)
      verified_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      headline TEXT NOT NULL,
      price_inr INTEGER NOT NULL,               -- regular price shown as "₹199 → ₹0"
      active INTEGER NOT NULL DEFAULT 1,        -- admin on/off switch
      starts_at INTEGER NOT NULL,               -- accounts registered before this are "existing"
      ends_at INTEGER,                          -- NULL = no end date set (no countdown shown)
      use_within_days INTEGER,                  -- NULL = entitlement never expires once granted
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entitlements (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      offer_id TEXT NOT NULL REFERENCES offers(id),
      value_inr INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('available','used')),
      granted_at INTEGER NOT NULL,
      expires_at INTEGER,
      used_at INTEGER,
      site_slug TEXT,
      template_id TEXT,
      UNIQUE (user_id, offer_id)
    );
    CREATE TABLE IF NOT EXISTS sites (
      slug TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      entitlement_id INTEGER REFERENCES entitlements(id),
      template_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  // Migration: sites can be taken down by the owner (soft, reversible).
  if (!db.prepare('PRAGMA table_info(sites)').all().some(c => c.name === 'disabled_at')) db.exec('ALTER TABLE sites ADD COLUMN disabled_at INTEGER');
  // Pricing, orders (paid or gifted website credits), page views and an owner activity log.
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      regular_inr INTEGER NOT NULL,             -- normal price of one website
      sale_active INTEGER NOT NULL DEFAULT 0,   -- discount on/off
      sale_inr INTEGER,                         -- discounted price, e.g. 10
      sale_label TEXT,                          -- e.g. "Launch sale"
      sale_starts_at INTEGER,                   -- NULL = starts immediately
      sale_ends_at INTEGER,                     -- NULL = no end date (no countdown shown)
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK (kind IN ('regular','sale','gift')),
      amount_inr INTEGER NOT NULL,              -- what the customer pays (0 for gifts)
      regular_inr INTEGER NOT NULL,             -- list price at the time
      status TEXT NOT NULL CHECK (status IN ('created','paid','used','revoked')),
      provider TEXT NOT NULL,                   -- 'dev' (simulated), 'gift', later 'razorpay'
      note TEXT,
      created_at INTEGER NOT NULL, paid_at INTEGER, used_at INTEGER, site_slug TEXT
    );
    CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id, status);
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT
    );
  `);
  const cols = db.prepare('PRAGMA table_info(sites)').all().map(c => c.name);
  if (!cols.includes('views')) db.exec('ALTER TABLE sites ADD COLUMN views INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('last_viewed_at')) db.exec('ALTER TABLE sites ADD COLUMN last_viewed_at INTEGER');
  if (!cols.includes('order_id')) db.exec('ALTER TABLE sites ADD COLUMN order_id TEXT');
  // Seed the launch offer and pricing once. The offer starts now, with no end date until the admin sets one.
  const now = Date.now();
  db.prepare('INSERT OR IGNORE INTO pricing (id, regular_inr, sale_active, updated_at) VALUES (1, 199, 0, ?)').run(now);
  db.prepare(`INSERT OR IGNORE INTO offers (id, headline, price_inr, active, starts_at, ends_at, use_within_days, updated_at)
              VALUES (?, ?, 199, 1, ?, NULL, NULL, ?)`)
    .run(OFFER_ID, 'LAUNCH SPECIAL — CLAIM YOUR FREE BIRTHDAY WEBSITE!', now, now);
  return wrap(db);
}

// "A.B+promo@GoogleMail.com" -> "ab@gmail.com". Plus-tags are removed for every domain.
function canonicalEmail(email) {
  let [local, domain] = String(email || '').trim().toLowerCase().split('@');
  if (!local || !domain) return '';
  local = local.split('+')[0];
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

function wrap(db) {
  const q = {
    offer: db.prepare('SELECT * FROM offers WHERE id = ?'),
    userByUid: db.prepare('SELECT * FROM users WHERE auth_uid = ?'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email_canonical = ?'),
    insertUser: db.prepare('INSERT INTO users (auth_uid, email, email_canonical, email_verified, created_at, verified_at) VALUES (?, ?, ?, ?, ?, ?)'),
    markVerified: db.prepare('UPDATE users SET email_verified = 1, verified_at = COALESCE(verified_at, ?), email = ? WHERE id = ?'),
    ent: db.prepare('SELECT * FROM entitlements WHERE user_id = ? AND offer_id = ?'),
    grant: db.prepare(`INSERT OR IGNORE INTO entitlements (user_id, offer_id, value_inr, status, granted_at, expires_at)
                       VALUES (?, ?, ?, 'available', ?, ?)`),
    spend: db.prepare(`UPDATE entitlements SET status = 'used', used_at = ?, site_slug = ?, template_id = ?
                       WHERE id = ? AND status = 'available' AND (expires_at IS NULL OR expires_at > ?)`),
    unspend: db.prepare(`UPDATE entitlements SET status = 'available', used_at = NULL, site_slug = NULL, template_id = NULL
                         WHERE id = ? AND site_slug = ?`),
    insertSite: db.prepare('INSERT INTO sites (slug, user_id, entitlement_id, template_id, created_at) VALUES (?, ?, ?, ?, ?)'),
    deleteSite: db.prepare('DELETE FROM sites WHERE slug = ?'),
    updateOffer: db.prepare('UPDATE offers SET headline = ?, price_inr = ?, active = ?, starts_at = ?, ends_at = ?, use_within_days = ?, updated_at = ? WHERE id = ?'),
    stats: db.prepare(`SELECT COUNT(*) AS granted, SUM(status = 'used') AS used FROM entitlements WHERE offer_id = ?`)
  };
  const tx = fn => { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

  const getOffer = () => q.offer.get(OFFER_ID);
  const offerRunning = (o, now = Date.now()) => !!(o && o.active && now >= o.starts_at && (o.ends_at == null || now < o.ends_at));

  function publicOffer() {
    const o = getOffer(), running = offerRunning(o);
    return { id: o.id, running, headline: o.headline, priceInr: o.price_inr, offerPriceInr: 0,
      endsAt: running && o.ends_at ? new Date(o.ends_at).toISOString() : null };
  }

  function entitlementView(e) {
    if (!e) return null;
    const expired = e.status === 'available' && e.expires_at != null && Date.now() >= e.expires_at;
    return { status: expired ? 'expired' : e.status, valueInr: e.value_inr, grantedAt: new Date(e.granted_at).toISOString(),
      expiresAt: e.expires_at ? new Date(e.expires_at).toISOString() : null, siteSlug: e.site_slug || null };
  }

  /*
   * Called on every signed-in request with the identity proven by the sign-in provider.
   * Creates the account on first sight and grants the launch entitlement when eligible.
   * Returns { user, entitlement, offerNote } or { error }.
   */
  function syncUser({ uid, email, verified }) {
    const canonical = canonicalEmail(email);
    if (!uid || !canonical) return { error: 'Your account has no email address.' };
    return tx(() => {
      const now = Date.now();
      let user = q.userByUid.get(uid);
      if (!user) {
        const sameInbox = q.userByEmail.get(canonical);
        // Dev test accounts only: re-link an older dev identity for the same email instead of refusing.
        if (sameInbox && uid.startsWith('dev:') && sameInbox.auth_uid.startsWith('dev:')) {
          db.prepare('UPDATE users SET auth_uid = ? WHERE id = ?').run(uid, sameInbox.id);
          if (verified && !sameInbox.email_verified) q.markVerified.run(now, email, sameInbox.id);
          user = q.userByUid.get(uid);
        } else if (sameInbox) return { error: 'An account already exists for this email address. Please log in with it instead.' };
        else {
          q.insertUser.run(uid, email, canonical, verified ? 1 : 0, now, verified ? now : null);
          user = q.userByUid.get(uid);
        }
      } else if (verified && !user.email_verified) {
        q.markVerified.run(now, email, user.id);
        user = q.userByUid.get(uid);
      }
      let ent = q.ent.get(user.id, OFFER_ID), offerNote = null;
      if (!ent) {
        const o = getOffer();
        if (!user.email_verified) offerNote = 'verify-email';
        else if (user.created_at < o.starts_at) offerNote = 'existing-account';
        else if (!offerRunning(o, now)) offerNote = 'offer-ended';
        else {
          const expires = o.use_within_days ? now + o.use_within_days * 864e5 : null;
          q.grant.run(user.id, OFFER_ID, o.price_inr, now, expires);
          ent = q.ent.get(user.id, OFFER_ID);
        }
      }
      return { user, entitlement: ent, offerNote };
    });
  }

  // Reserves the free entitlement for a site. Returns the entitlement id, or null if none is usable.
  function spendEntitlement(userId, slug, templateId) {
    return tx(() => {
      const now = Date.now(), ent = q.ent.get(userId, OFFER_ID);
      if (!ent) return null;
      const r = q.spend.run(now, slug, templateId, ent.id, now);
      if (r.changes !== 1) return null;
      q.insertSite.run(slug, userId, ent.id, templateId, now);
      return ent.id;
    });
  }
  // Undo a reservation if writing the site files failed.
  function refundEntitlement(entId, slug) {
    tx(() => { q.deleteSite.run(slug); q.unspend.run(entId, slug); });
  }

  function adminOffer() {
    const o = getOffer(), s = q.stats.get(OFFER_ID);
    const iso = v => (v == null ? null : new Date(v).toISOString());
    return { headline: o.headline, priceInr: o.price_inr, active: !!o.active, startsAt: iso(o.starts_at), endsAt: iso(o.ends_at),
      useWithinDays: o.use_within_days, running: offerRunning(o), updatedAt: iso(o.updated_at),
      granted: s.granted || 0, used: s.used || 0 };
  }
  function updateOffer(v) {
    const o = getOffer();
    q.updateOffer.run(v.headline ?? o.headline, v.priceInr ?? o.price_inr, v.active == null ? o.active : (v.active ? 1 : 0),
      v.startsAt ?? o.starts_at, v.endsAt === undefined ? o.ends_at : v.endsAt,
      v.useWithinDays === undefined ? o.use_within_days : v.useWithinDays, Date.now(), OFFER_ID);
    return adminOffer();
  }

  /* ---------- owner dashboard ---------- */
  const listSiteRows = db.prepare(`
    SELECT s.slug, s.template_id, s.created_at, s.disabled_at, s.entitlement_id, s.order_id, s.views, s.last_viewed_at, u.email AS owner_email,
           (SELECT kind || ':' || amount_inr FROM orders o WHERE o.id = s.order_id) AS order_info
    FROM sites s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC`);
  const listUserRows = db.prepare(`
    SELECT u.id, u.email, u.email_verified, u.created_at, u.verified_at,
           e.status AS ent_status, e.value_inr, e.granted_at, e.expires_at, e.used_at, e.site_slug,
           (SELECT COUNT(*) FROM sites s WHERE s.user_id = u.id) AS site_count,
           (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid') AS credits,
           (SELECT COALESCE(SUM(amount_inr), 0) FROM orders o WHERE o.user_id = u.id AND o.status IN ('paid','used') AND o.kind != 'gift') AS spent_inr
    FROM users u LEFT JOIN entitlements e ON e.user_id = u.id AND e.offer_id = ? ORDER BY u.created_at DESC`);
  const siteRow = db.prepare('SELECT slug, disabled_at FROM sites WHERE slug = ?');
  const setDisabled = db.prepare('UPDATE sites SET disabled_at = ? WHERE slug = ?');
  const insertLegacy = db.prepare('INSERT OR IGNORE INTO sites (slug, user_id, entitlement_id, template_id, created_at) VALUES (?, NULL, NULL, ?, ?)');
  const counts = db.prepare(`SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM users WHERE email_verified = 1) AS verified`);

  const listSites = () => listSiteRows.all();
  const listUsers = () => listUserRows.all(OFFER_ID);
  const isDisabled = slug => { const r = siteRow.get(slug); return !!(r && r.disabled_at); };
  // Take down / restore. Sites published before accounts existed get a row on first use.
  function setSiteDisabled(slug, disabled, templateId, createdAt) {
    insertLegacy.run(slug, templateId || 'unknown', createdAt || Date.now());
    return setDisabled.run(disabled ? Date.now() : null, slug).changes === 1;
  }
  const userCounts = () => counts.get();

  /* ---------- pricing ---------- */
  const qp = {
    row: db.prepare('SELECT * FROM pricing WHERE id = 1'),
    set: db.prepare(`UPDATE pricing SET regular_inr = ?, sale_active = ?, sale_inr = ?, sale_label = ?, sale_starts_at = ?, sale_ends_at = ?, updated_at = ? WHERE id = 1`),
    syncOffer: db.prepare('UPDATE offers SET price_inr = ? WHERE id = ?')
  };
  const saleRunning = (p, now = Date.now()) => !!(p.sale_active && p.sale_inr != null && p.sale_inr < p.regular_inr &&
    (p.sale_starts_at == null || now >= p.sale_starts_at) && (p.sale_ends_at == null || now < p.sale_ends_at));
  // What one website costs right now (before any free entitlement or gift).
  function quote() {
    const p = qp.row.get(), sale = saleRunning(p);
    return { regularInr: p.regular_inr, priceInr: sale ? p.sale_inr : p.regular_inr, kind: sale ? 'sale' : 'regular',
      sale: sale ? { label: p.sale_label || 'Sale', priceInr: p.sale_inr, percentOff: Math.round((1 - p.sale_inr / p.regular_inr) * 100),
        endsAt: p.sale_ends_at ? new Date(p.sale_ends_at).toISOString() : null } : null };
  }
  function adminPricing() {
    const p = qp.row.get(), iso = v => (v == null ? null : new Date(v).toISOString());
    return { regularInr: p.regular_inr, saleActive: !!p.sale_active, saleInr: p.sale_inr, saleLabel: p.sale_label || '',
      saleStartsAt: iso(p.sale_starts_at), saleEndsAt: iso(p.sale_ends_at), saleRunning: saleRunning(p), updatedAt: iso(p.updated_at) };
  }
  function updatePricing(v) {
    const p = qp.row.get(), pick = (k, col) => (v[k] === undefined ? p[col] : v[k]);
    const regular = pick('regularInr', 'regular_inr');
    qp.set.run(regular, v.saleActive == null ? p.sale_active : (v.saleActive ? 1 : 0), pick('saleInr', 'sale_inr'), pick('saleLabel', 'sale_label'),
      pick('saleStartsAt', 'sale_starts_at'), pick('saleEndsAt', 'sale_ends_at'), Date.now());
    qp.syncOffer.run(regular, OFFER_ID);     // the free launch website is worth the regular price
    return adminPricing();
  }

  /* ---------- orders: paid or gifted website credits ---------- */
  const qo = {
    insert: db.prepare(`INSERT INTO orders (id, user_id, kind, amount_inr, regular_inr, status, provider, note, created_at, paid_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    get: db.prepare('SELECT * FROM orders WHERE id = ?'),
    pay: db.prepare(`UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ? AND user_id = ? AND status = 'created'`),
    credit: db.prepare(`SELECT * FROM orders WHERE user_id = ? AND status = 'paid' ORDER BY (kind = 'gift') DESC, created_at LIMIT 1`),
    use: db.prepare(`UPDATE orders SET status = 'used', used_at = ?, site_slug = ? WHERE id = ? AND status = 'paid'`),
    unuse: db.prepare(`UPDATE orders SET status = 'paid', used_at = NULL, site_slug = NULL WHERE id = ? AND site_slug = ?`),
    revoke: db.prepare(`UPDATE orders SET status = 'revoked' WHERE id = ? AND kind = 'gift' AND status = 'paid'`),
    credits: db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'paid'`),
    list: db.prepare(`SELECT o.*, u.email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.status != 'created' ORDER BY o.created_at DESC LIMIT 2000`),
    totals: db.prepare(`SELECT COALESCE(SUM(CASE WHEN status IN ('paid','used') AND kind != 'gift' THEN amount_inr END), 0) AS revenue,
                               COALESCE(SUM(CASE WHEN status IN ('paid','used') AND kind != 'gift' THEN 1 END), 0) AS paid_orders,
                               COALESCE(SUM(CASE WHEN status IN ('paid','used') AND kind = 'sale' THEN regular_inr - amount_inr END), 0) AS discount_given,
                               COALESCE(SUM(CASE WHEN status IN ('paid','used') AND kind = 'gift' THEN 1 END), 0) AS gifts
                        FROM orders`),
    insertSite: db.prepare('INSERT INTO sites (slug, user_id, entitlement_id, order_id, template_id, created_at) VALUES (?, ?, NULL, ?, ?, ?)'),
    userByEmail: db.prepare('SELECT * FROM users WHERE email_canonical = ?')
  };
  const newOrderId = () => 'ord_' + require('crypto').randomBytes(9).toString('base64url');
  // Price is always computed here on the server, never taken from the browser.
  function createOrder(userId, provider) {
    const qt = quote(), id = newOrderId();
    qo.insert.run(id, userId, qt.kind, qt.priceInr, qt.regularInr, 'created', provider, null, Date.now(), null);
    return qo.get.get(id);
  }
  const markPaid = (orderId, userId) => qo.pay.run(Date.now(), orderId, userId).changes === 1;
  const creditsFor = userId => qo.credits.get(userId).n;
  // Uses one paid/gifted credit for a site (atomic). Returns the order id or null.
  function spendCredit(userId, slug, templateId) {
    return tx(() => {
      const o = qo.credit.get(userId);
      if (!o || qo.use.run(Date.now(), slug, o.id).changes !== 1) return null;
      qo.insertSite.run(slug, userId, o.id, templateId, Date.now());
      return o.id;
    });
  }
  function refundCredit(orderId, slug) { tx(() => { db.prepare('DELETE FROM sites WHERE slug = ?').run(slug); qo.unuse.run(orderId, slug); }); }
  function giftWebsite(email, note) {
    const u = qo.userByEmail.get(canonicalEmail(email));
    if (!u) return null;
    const id = newOrderId(), now = Date.now();
    qo.insert.run(id, u.id, 'gift', 0, quote().regularInr, 'paid', 'gift', note || null, now, now);
    return qo.get.get(id);
  }
  const revokeGift = id => qo.revoke.run(id).changes === 1;
  const listOrders = () => qo.list.all();
  const orderTotals = () => qo.totals.get();

  /* ---------- page views + activity log ---------- */
  const qv = {
    view: db.prepare('UPDATE sites SET views = views + 1, last_viewed_at = ? WHERE slug = ?'),
    ensure: db.prepare('INSERT OR IGNORE INTO sites (slug, user_id, entitlement_id, template_id, created_at) VALUES (?, NULL, NULL, ?, ?)'),
    log: db.prepare('INSERT INTO audit (at, actor, action, detail) VALUES (?, ?, ?, ?)'),
    logs: db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 500'),
    views: db.prepare('SELECT COALESCE(SUM(views), 0) AS v FROM sites')
  };
  function countView(slug, templateId, createdAt) {
    if (qv.view.run(Date.now(), slug).changes === 0) { qv.ensure.run(slug, templateId || 'unknown', createdAt || Date.now()); qv.view.run(Date.now(), slug); }
  }
  const log = (actor, action, detail) => qv.log.run(Date.now(), actor, action, detail == null ? null : String(detail).slice(0, 500));
  const listLog = () => qv.logs.all();
  const totalViews = () => qv.views.get().v;

  return { db, OFFER_ID, quote, adminPricing, updatePricing, createOrder, markPaid, creditsFor, spendCredit, refundCredit,
    giftWebsite, revokeGift, listOrders, orderTotals, countView, log, listLog, totalViews,
    canonicalEmail, listSites, listUsers, isDisabled, setSiteDisabled, userCounts, getOffer, offerRunning, publicOffer, entitlementView, syncUser, spendEntitlement, refundEntitlement, adminOffer, updateOffer };
}

module.exports = { open, canonicalEmail };
