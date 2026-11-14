'use strict';
/*
 * Who is calling? Every signed-in request carries "Authorization: Bearer <token>".
 *
 * Provider is chosen by environment variables, and fails closed:
 *   FIREBASE_PROJECT_ID (+ FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN for the browser)
 *       Production. The token is a Firebase ID token. We verify its signature against
 *       Google's published keys, plus issuer, audience, expiry and subject, before trusting
 *       anything in it. Email verification comes from Firebase's own email_verified claim.
 *   DEV_AUTH=1
 *       Local testing only. Pretend sign-in with a simulated "verify email" step.
 *       Only accepted from this machine (loopback, no proxy headers), and the server
 *       refuses to start with it on a non-loopback HOST.
 *   neither
 *       Sign-in is unavailable: every signed-in endpoint answers 503.
 */
const crypto = require('crypto');

const FB = {
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || ''
};
const DEV = process.env.DEV_AUTH === '1';
const MODE = FB.projectId ? 'firebase' : DEV ? 'dev' : 'none';

function isLocal(req) {
  const ip = req.socket.remoteAddress;
  const loopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  return loopback && !req.headers['x-forwarded-for'] && !req.headers['forwarded'] && !req.headers['x-real-ip'];
}

/* ------------------------------ Firebase ------------------------------ */
let verifyFirebase = null;
if (MODE === 'firebase') {
  let jwks = null;
  verifyFirebase = async token => {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    jwks ||= createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${FB.projectId}`,
      audience: FB.projectId,
      algorithms: ['RS256']
    });
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new Error('bad subject');
    if (typeof payload.auth_time !== 'number' || payload.auth_time * 1000 > Date.now() + 60e3) throw new Error('bad auth_time');
    return { uid: 'firebase:' + payload.sub, email: String(payload.email || ''), verified: payload.email_verified === true };
  };
}

/* ------------------------------ Dev (local only) ------------------------------ */
const devAccounts = new Map();  // email -> { uid, verified, passHash, salt }
const devSessions = new Map();  // token -> email
// Dev accounts and sessions are saved to data/dev-accounts.json so they survive restarts (dev mode only).
function devRoutes(app, express, { dataDir, ownerEmail }) {
  if (MODE !== 'dev') return;
  const file = require('path').join(dataDir, 'dev-accounts.json');
  try {
    const saved = JSON.parse(require('fs').readFileSync(file, 'utf8'));
    for (const [k, v] of Object.entries(saved.accounts || {})) devAccounts.set(k, v);
    for (const [k, v] of Object.entries(saved.sessions || {})) devSessions.set(k, v);
  } catch { /* first run */ }
  const save = () => require('fs').writeFileSync(file, JSON.stringify({ accounts: Object.fromEntries(devAccounts), sessions: Object.fromEntries(devSessions) }, null, 1), { mode: 0o600 });
  const guard = (req, res, next) => (isLocal(req) ? next() : res.sendStatus(404));
  const body = express.json({ limit: '4kb' });
  const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
  const valid = (email, pw) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email) && typeof pw === 'string' && pw.length >= 8 && pw.length <= 200;
  const session = email => { const t = crypto.randomBytes(32).toString('base64url'); devSessions.set(t, email); save(); return t; };
  const create = (email, pw, verified) => {
    const salt = crypto.randomBytes(16).toString('hex');
    devAccounts.set(email, { uid: 'dev:' + email, verified, salt, passHash: hash(pw, salt) }); save();   // same email -> same dev identity
  };

  // One click: sign in as the owner (first ADMIN_EMAILS address) or as a brand-new verified customer.
  app.get('/api/dev-auth/info', guard, (req, res) => res.json({ ownerEmail }));
  app.post('/api/dev-auth/quick', guard, body, (req, res) => {
    let email;
    if (req.body.role === 'owner') {
      email = ownerEmail;
      if (!devAccounts.has(email)) create(email, crypto.randomBytes(12).toString('hex'), true);
      devAccounts.get(email).verified = true;
    } else if (req.body.role === 'customer') {
      let n = 1; while (devAccounts.has(`customer${n}@test.local`)) n++;
      email = `customer${n}@test.local`;
      create(email, crypto.randomBytes(12).toString('hex'), req.body.verified !== false);
    } else return res.status(400).json({ error: 'Unknown role' });
    res.json({ token: session(email), email });
  });

  app.post('/api/dev-auth/signup', guard, body, (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase(), pw = req.body.password;
    if (!valid(email, pw)) return res.status(400).json({ error: 'Enter a valid email and a password of at least 8 characters.' });
    if (devAccounts.has(email)) return res.status(409).json({ error: 'That email already has an account. Log in instead.' });
    create(email, pw, false);
    res.json({ token: session(email) });
  });
  app.post('/api/dev-auth/login', guard, body, (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase(), a = devAccounts.get(email);
    const ok = a && crypto.timingSafeEqual(Buffer.from(a.passHash, 'hex'), Buffer.from(hash(req.body.password || '', a.salt), 'hex'));
    if (!ok) return res.status(401).json({ error: 'Wrong email or password.' });
    res.json({ token: session(email) });
  });
  // Simulates clicking the link in the verification email.
  app.post('/api/dev-auth/verify', guard, (req, res) => {
    const email = devSessions.get(bearer(req)), a = email && devAccounts.get(email);
    if (!a) return res.sendStatus(401);
    a.verified = true; save(); res.json({ ok: true });
  });
  app.post('/api/dev-auth/logout', guard, (req, res) => { devSessions.delete(bearer(req)); save(); res.json({ ok: true }); });
}
function verifyDev(token, req) {
  if (!isLocal(req)) throw new Error('dev auth is local only');
  const email = devSessions.get(token), a = email && devAccounts.get(email);
  if (!a) throw new Error('unknown session');
  return { uid: a.uid, email, verified: a.verified };
}

/* ------------------------------ middleware ------------------------------ */
const bearer = req => { const m = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(req.headers.authorization || ''); return m ? m[1] : ''; };

// Sets req.identity = { uid, email, verified } or rejects.
async function requireIdentity(req, res, next) {
  if (MODE === 'none') return res.status(503).json({ error: 'Sign-in is not set up on this server yet.' });
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Please sign in first.', code: 'signin' });
  try {
    req.identity = MODE === 'firebase' ? await verifyFirebase(token) : verifyDev(token, req);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.', code: 'signin' });
  }
}

// What the browser needs to start the right sign-in flow. Public values only.
// Dev mode is only revealed to this machine: anyone else is told sign-in isn't available.
const clientConfig = req => MODE === 'firebase'
  ? { mode: 'firebase', firebase: { apiKey: FB.apiKey, authDomain: FB.authDomain, projectId: FB.projectId } }
  : { mode: MODE === 'dev' && !isLocal(req) ? 'none' : MODE };

module.exports = { MODE, requireIdentity, devRoutes, clientConfig, isLocal };
