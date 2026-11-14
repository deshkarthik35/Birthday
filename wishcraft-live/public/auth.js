/*
 * WishCraft sign-in (browser). One small API over two providers:
 *   firebase  real accounts: email + password, verification email sent by Firebase
 *   dev       local testing only (the server allows it on this machine only)
 * window.Auth: init(), signUp(), logIn(), logOut(), sendVerification(), checkVerified(),
 *              token(), user, mode, onChange(fn)
 */
(() => {
  const FB_VER = '13.3.0';
  const listeners = new Set();
  const Auth = { mode: 'none', user: null, offer: null };
  let fb = null;            // { auth, mod } when using Firebase
  let devToken = null;
  const emit = () => listeners.forEach(fn => { try { fn(Auth.user); } catch (e) { console.error(e); } });
  Auth.onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

  const friendly = e => {
    const c = (e && e.code) || '';
    return {
      'auth/email-already-in-use': 'That email already has an account. Log in instead.',
      'auth/invalid-email': 'That email address doesn’t look right.',
      'auth/weak-password': 'Please use a password of at least 8 characters.',
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/wrong-password': 'Wrong email or password.',
      'auth/user-not-found': 'Wrong email or password.',
      'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
      'auth/network-request-failed': 'Network problem. Check your connection and try again.'
    }[c] || (e && e.message) || 'Something went wrong. Please try again.';
  };
  const devPost = async (path, body) => {
    const r = await fetch('/api/dev-auth/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(devToken ? { Authorization: 'Bearer ' + devToken } : {}) }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Sign-in failed.');
    return j;
  };
  const setUser = (email, verified) => { Auth.user = email ? { email, verified } : null; emit(); };

  Auth.init = async () => {
    const r = await fetch('/api/config', { cache: 'no-store' });
    const cfg = await r.json();
    Auth.mode = cfg.auth.mode; Auth.offer = cfg.offer; Auth.pricing = cfg.pricing; Auth.payments = cfg.payments;
    if (Auth.mode === 'firebase') {
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      const [{ initializeApp }, mod] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js')]);
      const app = initializeApp(cfg.auth.firebase);
      fb = { auth: mod.getAuth(app), mod };
      await new Promise(res => {
        let first = true;
        mod.onAuthStateChanged(fb.auth, u => { setUser(u && u.email, !!(u && u.emailVerified)); if (first) { first = false; res(); } });
      });
    } else if (Auth.mode === 'dev') {
      devToken = localStorage.getItem('wc-dev-token');
      if (devToken) { await refreshDev().catch(() => { devToken = null; localStorage.removeItem('wc-dev-token'); setUser(null); }); }
    }
    return Auth;
  };
  async function refreshDev() {
    const r = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + devToken }, cache: 'no-store' });
    if (!r.ok) throw new Error('session');
    const me = await r.json(); setUser(me.email, me.verified); return me;
  }

  Auth.signUp = async (email, password) => {
    if (Auth.mode === 'firebase') {
      try {
        const cred = await fb.mod.createUserWithEmailAndPassword(fb.auth, email, password);
        await fb.mod.sendEmailVerification(cred.user, { url: location.origin + '/' });
        setUser(cred.user.email, cred.user.emailVerified);
      } catch (e) { throw new Error(friendly(e)); }
    } else if (Auth.mode === 'dev') {
      devToken = (await devPost('signup', { email, password })).token;
      localStorage.setItem('wc-dev-token', devToken); await refreshDev();
    } else throw new Error('Sign-in is not set up yet.');
  };
  Auth.logIn = async (email, password) => {
    if (Auth.mode === 'firebase') {
      try { const cred = await fb.mod.signInWithEmailAndPassword(fb.auth, email, password); setUser(cred.user.email, cred.user.emailVerified); }
      catch (e) { throw new Error(friendly(e)); }
    } else if (Auth.mode === 'dev') {
      devToken = (await devPost('login', { email, password })).token;
      localStorage.setItem('wc-dev-token', devToken); await refreshDev();
    } else throw new Error('Sign-in is not set up yet.');
  };
  Auth.logOut = async () => {
    if (Auth.mode === 'firebase') await fb.mod.signOut(fb.auth);
    else if (Auth.mode === 'dev' && devToken) { await devPost('logout').catch(() => {}); devToken = null; localStorage.removeItem('wc-dev-token'); setUser(null); }
  };
  Auth.sendVerification = async () => {
    if (Auth.mode === 'firebase') { try { await fb.mod.sendEmailVerification(fb.auth.currentUser, { url: location.origin + '/' }); } catch (e) { throw new Error(friendly(e)); } }
  };
  // Dev only: one-click sign-in as the owner or as a brand-new verified test customer.
  Auth.quickDev = async role => {
    if (Auth.mode !== 'dev') throw new Error('Quick sign-in is only for dev mode.');
    const r = await devPost('quick', { role });
    devToken = r.token; localStorage.setItem('wc-dev-token', devToken); await refreshDev();
    return r.email;
  };
  // Dev only: stands in for clicking the link in the verification email.
  Auth.devVerify = async () => { if (Auth.mode === 'dev') { await devPost('verify'); await refreshDev(); } };
  // After they click the link in their inbox: reload the account and get a fresh token with email_verified = true.
  Auth.checkVerified = async () => {
    if (Auth.mode === 'firebase' && fb.auth.currentUser) {
      await fb.mod.reload(fb.auth.currentUser);
      await fb.auth.currentUser.getIdToken(true);
      setUser(fb.auth.currentUser.email, fb.auth.currentUser.emailVerified);
    } else if (Auth.mode === 'dev' && devToken) await refreshDev();
    return !!(Auth.user && Auth.user.verified);
  };
  Auth.token = async () => {
    if (Auth.mode === 'firebase') return fb.auth.currentUser ? fb.auth.currentUser.getIdToken() : null;
    return devToken;
  };
  // fetch() with the sign-in token attached.
  Auth.fetch = async (url, opts = {}) => {
    const t = await Auth.token();
    return fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...(t ? { Authorization: 'Bearer ' + t } : {}) } });
  };
  window.Auth = Auth;
})();
