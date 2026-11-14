/* WishCraft builder (browser). Depends on /shared/celebrations.js (window.Celebrations). */
(() => {
  const C = window.Celebrations;

  /* ------------------------------ helpers ------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  function h(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) e[k] = v;
      else if (k === 'class') e.className = v;
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    e.append(...kids.flat().filter(k => k != null && k !== false));
    return e;
  }
  const urlCache = new Map();
  const url = b => { if (!(b instanceof Blob)) return null; if (!urlCache.has(b)) urlCache.set(b, URL.createObjectURL(b)); return urlCache.get(b); };
  const isMedia = v => v instanceof Blob;
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3600); }

  const state = { occ: null, tpl: null, data: {} };
  const fields = () => C.allFields(state.occ, state.tpl);

  /* ------------------------------ routing ------------------------------
   * /                      home (occasions)
   * /create/:occ           designs for that occasion
   * /create/:occ/:tpl      content form; preview + share are history states on the same URL
   */
  function nav(path, view) { history.pushState({ view: view || null }, '', path); route(); }
  function route() {
    const [p0, occId, tplId] = location.pathname.split('/').filter(Boolean);
    if (p0 !== 'create' || !occId) return showHome();
    const occ = C.occasion(occId);
    if (!C.isActive(occ)) { history.replaceState({}, '', '/create/' + C.ACTIVE[0]); return route(); }
    if (state.occ !== occ) { state.occ = occ; state.data = { from: state.data.from }; state.tpl = null; }
    if (!tplId) return showTemplates();
    const tpl = C.template(tplId);
    if (!tpl || !C.templatesFor(occ).includes(tpl)) { history.replaceState({}, '', '/create/' + occ.id); return showTemplates(); }
    if (state.tpl !== tpl) selectTemplate(tpl);
    const view = history.state && history.state.view;
    if (view === 'preview') return showPreview();
    if (view === 'done' && state.published) return showDone();
    showForm();
  }
  window.addEventListener('popstate', route);

  function show(id, step) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id));
    $('#steps').hidden = !step;
    document.querySelectorAll('.steps li').forEach(li => {
      const s = +li.dataset.s; li.classList.toggle('on', s === step); li.classList.toggle('done', s < step);
    });
    window.scrollTo({ top: 0 });
  }

  // Logo always returns to the home page.
  $('#logo').addEventListener('click', e => { e.preventDefault(); nav('/'); });
  $('#another').addEventListener('click', e => { e.preventDefault(); state.published = null; state.occ = null; nav('/'); });

  /* ------------------------------ home ------------------------------ */
  // Each tile uses the occasion's own palette; hovering releases its little floating emoji.
  // Home lists the birthday themes directly (Birthday is the only occasion for now).
  function renderHome() {
    const occ = C.occasion(C.ACTIVE[0]); let i = 0;
    $('#occs').replaceChildren(...C.templatesFor(occ).flatMap(tpl => [
      h('div', { class: 'occ-group' }, h('b', {}, `${tpl.icon} ${tpl.name}`), h('span', {}, tpl.tagline)),
      ...tpl.themes.map(th =>
        h('a', { class: 'occ', href: `/create/${occ.id}/${tpl.id}`, style: `--i:${i++};--oc-bg:${th.bg};--oc-text:${th.text}`,
            onclick: e => { e.preventDefault(); state.pendingTheme = th.id; if (state.tpl === tpl) state.data.theme = th.id; nav(`/create/${occ.id}/${tpl.id}`); } },
          h('span', { class: 'em', 'aria-hidden': 'true' }, tpl.icon),
          th.icons.map(e => h('span', { class: 'fl', 'aria-hidden': 'true' }, e)),
          h('b', {}, th.name)))
    ]));
  }
  // Home showcase: a demo countdown that ticks down from 4d 0h 45m 3s.
  (function showcase() {
    const end = Date.now() + ((4 * 24 * 60 + 45) * 60 + 3) * 1000, bs = [...document.querySelectorAll('#showCd b')];
    setInterval(() => {
      const ms = Math.max(0, end - Date.now());
      [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1000) % 60].forEach((v, i) => {
        const t = String(v).padStart(2, '0');
        if (bs[i].textContent !== t) { bs[i].textContent = t; bs[i].classList.remove('tick'); void bs[i].offsetWidth; bs[i].classList.add('tick'); }
      });
    }, 250);
    document.getElementById('showCta').addEventListener('click', e => { e.preventDefault(); nav('/create/birthday/surprise'); });
  })();
  function showHome() { show('v-home', 0); document.title = 'WishCraft · Birthday surprise pages'; }
  $('.hero .btn').addEventListener('click', e => { e.preventDefault(); $('#occasions').scrollIntoView({ behavior: 'smooth' }); });

  /* ------------------------------ templates ------------------------------ */
  function needChips(t) {
    return t.fields.map(f => {
      const opt = !f.required;
      const txt = {
        photos: () => `📷 ${f.min ? f.min + '–' : 'up to '}${f.max} photos`,
        photo: () => '🖼️ ' + f.label.replace(/\s*\(.*\)/, ''), video: () => '🎬 Video', audio: () => '🎤 Voice note',
        textarea: () => '✍️ ' + f.label.replace(/\s*\(.*\)/, ''),
        items: () => f.min ? `🗂️ ${f.min}+ ${f.itemPlural || f.itemLabel.toLowerCase() + 's'}` : `🗂️ ${f.label}`
      }[f.type]?.();
      return txt ? h('span', { class: 'chip' + (opt ? ' opt' : '') }, txt + (opt ? ' (optional)' : '')) : null;
    });
  }
  function crumb() {
    const P = C.palette(state.occ, { dark: false });
    ['#tplCrumb', '#formCrumb'].forEach(s => { $(s).style.background = P.bg; $(s).style.color = P.text; });
    return [h('span', { 'aria-hidden': 'true' }, state.occ.emoji), state.occ.name,
      h('a', { href: '/', style: 'font-weight:400;font-size:.82rem;margin-left:6px;color:inherit', onclick: e => { e.preventDefault(); nav('/'); } }, 'change')];
  }
  // A small animated sketch of each layout, painted in this occasion's palette.
  function mockLayout(t, occ) {
    const ln = w => h('div', { class: 'ln', style: `width:${w}px` });
    switch (t.id) {
      case 'party': return [h('div', { class: 'orbm' }, occ.emoji), h('div', { class: 'ttl' }, occ.headline), ln(120), ln(80)];
      case 'memories': return [h('div', { class: 'row' }, [-8, 3, 9].map(r => h('div', { class: 'pol', style: `transform:rotate(${r}deg)` }, h('i')))), h('div', { class: 'ttl' }, occ.headline)];
      case 'cinema': return [h('div', { class: 'ttl', style: 'letter-spacing:.3em;font-size:.8rem' }, 'NOW SHOWING'), h('div', { class: 'scr' }, '▶'), ln(90)];
      case 'voice': return [h('div', { class: 'orbm' }, occ.emoji),
        h('div', { class: 'wav' }, Array.from({ length: 16 }, (_, i) => h('i', { style: `animation-delay:${(i * 37 % 9) / 10}s` })))];
      case 'elegant': return [h('div', { class: 'cov' }), h('div', { class: 'script' }, occ.headline), ln(100)];
      case 'story': return [h('div', { class: 'script', style: 'font-size:2rem' }, 'For you'), h('div', { class: 'row', style: 'font-size:1.15rem;gap:9px' }, ['😌', '🧠', '💭', '📸', '🎂', '💌'].map(e => h('span', {}, e))), ln(90)];
      case 'surprise': return [h('div', { class: 'orbm' }, '🎁'), h('div', { class: 'ttl' }, 'Happy Birthday'), h('div', { class: 'row', style: 'font-size:1.15rem;gap:9px' }, ['🎂', '📜', '🎈', '🥠', '📼', '📺'].map(e => h('span', {}, e)))];
    }
  }
  // Occasions with a single themed template (Birthday) show theme cards instead of layouts.
  function showThemes(t) {
    const occ = state.occ, path = `/create/${occ.id}/${t.id}`;
    $('#tplHead').textContent = 'Choose a theme';
    $('#tplLead').textContent = 'Every theme has the same sections: scratch card, cake, letter, photos, games, voice note and video. Fill in only what you want. Empty sections are left out.';
    const pick = id => { state.pendingTheme = id; if (state.tpl === t) state.data.theme = id; };
    $('#tpls').replaceChildren(...t.themes.map(th => {
      const mock = h('div', { class: 'mock', style: `--m-bg:${th.bg};--m-text:${th.text};--m-accent:${th.accent};font-family:${th.fh}`, 'aria-hidden': 'true' },
        Array.from({ length: 6 }, (_, i) => h('span', { class: 'fp', style: `left:${8 + i * 16}%;animation-delay:${-i * 1.1}s` }, th.icons[i % th.icons.length])),
        h('div', { class: 'lay' }, h('div', { class: 'orbm' }, '🎂'), h('div', { class: 'ttl', style: `font-family:${th.fh};font-weight:400;font-size:1.3rem` }, 'Happy Birthday'),
          h('div', { class: 'row', style: 'font-size:1.2rem;gap:10px' }, ['🎁', '📜', '🎈', '🥠', '📼', '📺'].map(e => h('span', {}, e)))),
        h('span', { class: 'badge' }, th.dark ? '🌙 Night look' : '☀️ Bright look'));
      return h('article', { class: 'tpl' }, mock,
        h('div', { class: 'tpl-body' },
          h('h3', {}, th.name), h('p', {}, th.tagline),
          h('div', { class: 'needs' }, ['🎁 Scratch card', '🎂 Cake', '📜 Letter', '📸 Photos', '🎈 Reasons', '🥠 Wishes', '🧠 Quiz', '📼 Voice', '📺 Video', '🎶 Tune']
            .map(x => h('span', { class: 'chip opt' }, x))),
          h('div', { class: 'tpl-actions' },
            h('button', { class: 'btn', onclick: () => { pick(th.id); nav(path); } }, 'Use this theme'),
            h('button', { class: 'btn ghost', onclick: async () => { pick(th.id); nav(path); await fillDemo(); openPreview(); } }, 'See sample'))));
    }));
    show('v-tpl', 2);
    document.title = `${occ.name} themes · WishCraft`;
  }
  function showTemplates() {
    const occ = state.occ;
    $('#tplCrumb').replaceChildren(...crumb());
    const list = C.templatesFor(occ);
    if (list.length === 1 && list[0].themes) return showThemes(list[0]);
    $('#tplHead').textContent = 'Choose a design';
    $('#tplLead').textContent = 'Each design asks for different things. Photos, videos, voice notes and messages are all supported.';
    $('#tpls').replaceChildren(...list.map(t => {
      const P = t.themes ? { bg: t.themes[0].bg, text: t.themes[0].text, accent: t.themes[0].accent, dark: t.themes[0].dark } : C.palette(occ, t);
      const mock = h('div', { class: 'mock', style: `--m-bg:${P.bg};--m-text:${P.text};--m-accent:${P.accent}`, 'aria-hidden': 'true' },
        Array.from({ length: 6 }, (_, i) => h('span', { class: 'fp', style: `left:${8 + i * 16}%;animation-delay:${-i * 1.1}s` }, occ.orbit[i % occ.orbit.length])),
        h('div', { class: 'lay' }, mockLayout(t, occ)),
        h('span', { class: 'badge' }, t.themes ? `${t.icon} ${t.themes.length} themes` : `${t.icon} ${P.dark ? 'Night look' : 'Bright look'}`));
      const path = `/create/${occ.id}/${t.id}`;
      return h('article', { class: 'tpl' }, mock,
        h('div', { class: 'tpl-body' },
          h('h3', {}, t.name), h('p', {}, t.tagline),
          h('div', { class: 'flabel', style: 'font-size:.85rem;margin-top:6px' }, "What you'll add"),
          h('div', { class: 'needs' }, needChips(t)),
          h('div', { class: 'tpl-actions' },
            h('button', { class: 'btn', onclick: () => nav(path) }, 'Use this design'),
            h('button', { class: 'btn ghost', onclick: async () => { nav(path); await fillDemo(); openPreview(); } }, 'See sample'))));
    }));
    show('v-tpl', 2);
    document.title = `${occ.name} designs · WishCraft`;
  }

  /* ------------------------------ form ------------------------------ */
  function selectTemplate(t) {
    const d = state.data;
    state.tpl = t; state.data = { to: d.to, from: d.from, date: d.date };
    for (const f of t.fields) if (f.type === 'choice') state.data[f.key] = f.default || f.options[0].v;
    const themeField = t.fields.find(f => f.key === 'theme');
    if (themeField && state.pendingTheme && themeField.options.some(o => o.v === state.pendingTheme)) state.data.theme = state.pendingTheme;
    state.pendingTheme = null;
  }
  function showForm() {
    $('#formCrumb').replaceChildren(...crumb());
    $('#formTitle').textContent = `${state.tpl.icon} ${state.tpl.name}`;
    $('#formLead').textContent = state.tpl.tagline;
    renderForm(); show('v-form', 3);
    document.title = `${state.occ.name} · ${state.tpl.name} · WishCraft`;
  }
  function renderForm() {
    const cd = state.tpl.countdown;
    $('#commonFields').replaceChildren(...C.commonFields(state.occ, state.tpl).flatMap(f => {
      if (cd && f.key === 'time') return [];
      if (cd && f.key === 'date') return [h('div', { class: 'group-title' }, '⏰ When should it open?'), countdownBuilder()];
      return [fieldEl(f, state.data)];
    }));
    $('#tplFields').replaceChildren(...state.tpl.fields.map(f => fieldEl(f, state.data)));
    refresh();
  }
  function fieldEl(f, obj) {
    const labelText = h('div', { class: 'flabel' }, f.label, f.required ? h('span', { class: 'req' }, ' *') : h('span', { class: 'opt' }, ' (optional)'));
    const wrap = h('div', { class: 'field' });
    let label = labelText;
    let input;
    switch (f.type) {
      case 'text': case 'date': case 'time':
        input = h('input', { type: f.type, value: obj[f.key] || '', placeholder: f.placeholder || '', maxlength: f.type === 'text' ? (f.max || 200) : null,
          'aria-label': f.label, oninput: e => { obj[f.key] = e.target.value; refresh(); } });
        break;
      case 'textarea':
        input = h('textarea', { rows: 4, placeholder: f.placeholder || '', maxlength: f.max || 5000, 'aria-label': f.label,
          oninput: e => { obj[f.key] = e.target.value; refresh(); } });
        input.value = obj[f.key] || '';
        break;
      case 'photos': input = photosEl(f, obj); break;
      case 'photo': case 'video': input = singleMediaEl(f, obj); break;
      case 'audio': input = audioEl(f, obj); break;
      case 'items': input = itemsEl(f, obj); break;
      case 'number':
        input = h('input', { type: 'number', min: f.min, max: f.max, inputmode: 'numeric', value: obj[f.key] ?? '', placeholder: f.placeholder || '',
          style: 'max-width:180px', 'aria-label': f.label, oninput: e => { obj[f.key] = e.target.value; refresh(); } });
        break;
      case 'choice': input = choiceEl(f, obj); break;
    }
    if (f.ai) label = h('div', { class: 'flabel-row' }, labelText, aiButton(f, obj, input, wrap));
    wrap.append(...[label, f.hint ? h('div', { class: 'hint' }, f.hint) : null, input].filter(Boolean));
    return wrap;
  }

  /* ------------------------------ AI writing helper ------------------------------ */
  const TONES = [['heartfelt', '💛 Heartfelt'], ['funny', '😄 Funny'], ['short', '✂️ Short & sweet'], ['poetic', '🌙 Poetic'], ['formal', '🎩 Formal']];
  function aiButton(f, obj, input, wrap) {
    let panel = null, tone = 'heartfelt';
    const btn = h('button', { class: 'ai-btn', type: 'button', 'aria-expanded': 'false', onclick: () => {
      if (panel) { panel.remove(); panel = null; btn.setAttribute('aria-expanded', 'false'); return; }
      btn.setAttribute('aria-expanded', 'true'); panel = build(); wrap.append(panel); panel.querySelector('.btn').focus();
    } }, h('span', { class: 'spark', 'aria-hidden': 'true' }, '✨'), 'AI help');

    function build() {
      const hasText = () => !!String(obj[f.key] || '').trim();
      const label = () => (hasText() ? '✨ Rephrase' : '✨ Write it for me');
      const sugs = h('div', { class: 'sugs', 'aria-live': 'polite' }), note = h('div', { class: 'ai-note' });
      const go = h('button', { class: 'btn small', type: 'button', onclick: run }, label());
      const tones = h('div', { class: 'tones', role: 'group', 'aria-label': 'Tone' }, TONES.map(([id, lab]) =>
        h('button', { class: 'tone', type: 'button', 'aria-pressed': String(id === tone), onclick: e => {
          tone = id; tones.querySelectorAll('.tone').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); run();
        } }, lab)));
      async function run() {
        go.disabled = true; go.textContent = label();
        sugs.replaceChildren(...[0, 1, 2].map(() => h('div', { class: 'skel' }))); note.textContent = '';
        try {
          if (!Auth.user) { openAuth('up', 'Create a free account to use the AI writing helper.'); throw new Error('Sign in to use the AI writing helper.'); }
          const r = await Auth.fetch('/api/assist', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WishCraft': '1' },
            body: JSON.stringify({ occasion: state.occ.id, kind: f.ai, tone, label: f.label, text: obj[f.key] || '',
              to: state.data.to || '', from: state.data.from || '', context: f.key === 'caption' ? (obj.title || '') : '' })
          });
          const j = await r.json().catch(() => ({}));
          if (r.status === 401) openAuth('in');
          if (!r.ok) throw new Error(j.error || 'Could not get suggestions right now.');
          sugs.replaceChildren(...j.suggestions.map((s, i) => h('div', { class: 'sug', style: `--i:${i}` }, h('p', {}, s),
            h('button', { class: 'btn small', type: 'button', onclick: () => {
              input.value = s; obj[f.key] = s; refresh();
              input.classList.remove('flash'); void input.offsetWidth; input.classList.add('flash');
              go.textContent = label(); toast('Applied. You can still edit it.');
            } }, 'Use this'))));
          note.textContent = j.notice || (j.source === 'ai' ? 'Written by AI. Give it a quick read before publishing.' : 'Quick suggestions (offline mode). Add an AI key on the server for smarter rewrites.');
        } catch (err) { sugs.replaceChildren(); note.textContent = err.message; }
        finally { go.disabled = false; }
      }
      return h('div', { class: 'ai' }, h('div', { class: 'ai-head' }, h('span', {}, h('b', {}, 'Writing helper'), ' · pick a tone'), go), tones, sugs, note);
    }
    return btn;
  }
  // HEIC (iPhone default) doesn't display in most browsers, so ask for JPG/PNG instead.
  function usable(files, kind) {
    const ok = files.filter(f => f.type.startsWith(kind) && !/hei[cf]/i.test(f.type + f.name));
    if (ok.length < files.length) toast(kind === 'image' ? 'Some photos were skipped. Please use JPG, PNG or WEBP (HEIC is not supported).' : 'Some files were skipped (unsupported type).');
    return ok;
  }
  function dropZone(accept, multiple, onFiles, text) {
    const kind = accept.split('/')[0];
    const inp = h('input', { type: 'file', accept, multiple, hidden: true, onchange: e => { const fs = usable([...e.target.files], kind); if (fs.length) onFiles(fs); e.target.value = ''; } });
    const z = h('label', { class: 'drop', tabindex: 0 }, inp, h('span', {}, text));
    z.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
    z.ondragover = e => { e.preventDefault(); z.classList.add('over'); };
    z.ondragleave = () => z.classList.remove('over');
    z.ondrop = e => {
      e.preventDefault(); z.classList.remove('over');
      const fs = usable([...e.dataTransfer.files], kind);
      if (fs.length) onFiles(multiple ? fs : fs.slice(0, 1));
    };
    return z;
  }
  function photosEl(f, obj) {
    obj[f.key] ||= [];
    const wrap = h('div');
    const draw = () => {
      const arr = obj[f.key];
      wrap.replaceChildren(
        h('div', { class: 'thumbs' },
          arr.map((b, i) => h('div', { class: 'thumb' }, h('img', { src: url(b), alt: `Photo ${i + 1}` }),
            h('button', { class: 'x', type: 'button', 'aria-label': 'Remove photo', onclick: () => { arr.splice(i, 1); draw(); refresh(); } }, '×'))),
          arr.length < f.max ? dropZone('image/*', true, fs => { arr.push(...fs.slice(0, f.max - arr.length)); draw(); refresh(); }, '+ Add photos') : null),
        h('div', { class: 'count' }, `${arr.length} / ${f.max} photos` + (f.min ? ` · minimum ${f.min}` : '')));
    };
    draw(); return wrap;
  }
  function singleMediaEl(f, obj) {
    const wrap = h('div'); const kind = f.type === 'photo' ? 'image' : 'video';
    const draw = () => {
      const b = obj[f.key];
      wrap.replaceChildren(b
        ? h('div', { class: 'single' },
            kind === 'image' ? h('img', { src: url(b), alt: f.label }) : h('video', { src: url(b), controls: true }),
            h('button', { class: 'link', type: 'button', onclick: () => { obj[f.key] = null; draw(); refresh(); } }, 'Remove'))
        : dropZone(kind + '/*', false, fs => { obj[f.key] = fs[0]; draw(); refresh(); },
            kind === 'image' ? '+ Choose a photo' : '+ Choose a video (MP4 / MOV / WEBM)'));
    };
    draw(); return wrap;
  }
  function audioEl(f, obj) {
    const box = h('div', { class: 'audio-box' });
    let rec, stream, timer;
    const draw = () => {
      const b = obj[f.key];
      if (b) {
        box.replaceChildren(h('audio', { controls: true, src: url(b) }),
          h('button', { class: 'btn ghost small', type: 'button', onclick: start }, '🎤 Re-record'),
          h('button', { class: 'link', type: 'button', onclick: () => { obj[f.key] = null; draw(); refresh(); } }, 'Remove'));
      } else {
        const up = h('input', { type: 'file', accept: 'audio/*', hidden: true, onchange: e => { const fl = e.target.files[0]; if (fl) { obj[f.key] = fl; draw(); refresh(); } } });
        box.replaceChildren(
          h('button', { class: 'btn small', type: 'button', onclick: start }, '🎤 Record voice note'),
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => up.click() }, '⬆ Upload audio'), up);
      }
    };
    async function start() {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { toast('Microphone not available here. Try "Upload audio" instead.'); return; }
      const chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); clearInterval(timer);
        obj[f.key] = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); draw(); refresh();
      };
      rec.start();
      const t0 = Date.now(); const time = h('span', {}, '0:00');
      timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
      box.replaceChildren(h('span', { class: 'rec-dot' }), h('b', {}, 'Recording '), time,
        h('button', { class: 'btn small', type: 'button', onclick: () => rec.stop() }, '■ Stop'));
    }
    draw(); return box;
  }
  function itemsEl(f, obj) {
    obj[f.key] ||= []; const arr = obj[f.key];
    while (arr.length < f.min) arr.push({});
    const wrap = h('div');
    const draw = () => {
      const items = arr.map((it, i) => h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('b', {}, `${f.itemLabel} ${i + 1}`),
          h('button', { class: 'link', type: 'button', onclick: () => { arr.splice(i, 1); draw(); refresh(); } }, 'Remove')),
        f.sub.map(s => fieldEl(s, it))));
      const add = arr.length < f.max ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => { arr.push({}); draw(); refresh(); } }, `+ Add ${f.itemLabel.toLowerCase()}`) : null;
      // Photo lists: allow selecting many photos at once (one item per photo).
      const first = f.sub[0];
      const bulk = first.type === 'photo' && arr.length < f.max
        ? dropZone('image/*', true, fs => {
            const empty = arr.filter(it => !it[first.key]);
            for (const file of fs) { const slot = empty.shift(); if (slot) slot[first.key] = file; else if (arr.length < f.max) arr.push({ [first.key]: file }); }
            draw(); refresh();
          }, `+ Add ${f.itemPlural || f.itemLabel.toLowerCase() + 's'} (you can pick several at once)`)
        : null;
      wrap.replaceChildren(...[bulk, ...items, bulk ? null : add].filter(Boolean));
    };
    draw(); return wrap;
  }
  function choiceEl(f, obj) {
    const box = h('div', { class: f.swatches ? 'swatches' : 'seg2', role: 'radiogroup', 'aria-label': f.label });
    const draw = () => box.replaceChildren(...f.options.map(o =>
      h('button', { type: 'button', role: 'radio', class: 'sw', 'aria-checked': String(obj[f.key] === o.v),
          style: f.swatches ? `--sw-bg:${o.bg};--sw-ac:${o.accent}` : null,
          onclick: () => { obj[f.key] = o.v; draw(); refresh(); } },
        f.swatches ? h('i', { 'aria-hidden': 'true' }) : null, o.label)));
    draw(); return box;
  }

  /* ------------------------------ checklist ------------------------------ */
  function statusText(f, obj) {
    const v = obj[f.key];
    if (state.tpl.countdown && f.key === 'date' && obj === state.data) {
      const at = revealAt(obj);
      return at && at > Date.now() ? `⏳ Opens ${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${Surprise.friendlyTime(obj.time)}` : 'Opens right away';
    }
    if (f.type === 'photos') return `${(v || []).length} added` + (f.min ? `, need ${f.min}+` : '');
    if (f.type === 'items') { const n = C.validItems(f, obj, isMedia); return f.min ? `${n} complete, need ${f.min}+` : (n ? `${n} added` : 'Optional'); }
    return C.fieldOk(f, obj, isMedia) ? 'Added' : (f.required ? 'Needed' : 'Optional');
  }
  const missing = () => fields().filter(f => f.required && !C.fieldOk(f, state.data, isMedia)).map(f => f.label);
  /* ------------------------------ countdown builder ------------------------------
   * One widget for date + time. Times are picked from friendly presets or a slider that
   * reads "7:30 in the evening", so nobody has to think about AM/PM. Stored as 24h "HH:MM".
   */
  const TIME_PRESETS = [
    { t: '00:00', ic: '🌙', name: 'Midnight', sub: 'As the day begins' },
    { t: '08:00', ic: '🌅', name: 'Morning', sub: '8:00 · wake-up surprise' },
    { t: '12:00', ic: '☀️', name: 'Noon', sub: '12:00 · lunch break' },
    { t: '16:00', ic: '🍰', name: 'Afternoon', sub: '4:00 · cake time' },
    { t: '19:00', ic: '🌆', name: 'Evening', sub: '7:00 · dinner time' }
  ];
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = dt => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  const addDays = n => { const dt = new Date(); dt.setDate(dt.getDate() + n); return ymd(dt); };
  const revealAt = d => {
    if (!d.date) return null;
    const [y, m, dd] = d.date.split('-').map(Number), [hh, mm] = (d.time || '00:00').split(':').map(Number);
    return new Date(y, m - 1, dd, hh || 0, mm || 0);
  };
  const longDate = dt => dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeIcon = H => H < 5 || H >= 21 ? '🌙' : H < 8 ? '🌅' : H < 17 ? '☀️' : '🌆';
  let liveUpdate = null;
  function countdownInfo() { if (liveUpdate) liveUpdate(); }

  function countdownBuilder() {
    const d = state.data, box = h('div', { class: 'cdb' });
    let custom = !!d.time && !TIME_PRESETS.some(p => p.t === d.time);
    const mode = (on, ic, title, sub, onPick) => h('button', { type: 'button', role: 'radio', class: 'cdb-mode', 'aria-checked': String(on), onclick: onPick },
      h('span', { class: 'cdb-mode-ic', 'aria-hidden': 'true' }, ic), h('b', {}, title), h('small', {}, sub));
    const changed = () => { refresh(); };

    function draw() {
      const on = !!d.date;
      const modes = h('div', { class: 'cdb-modes', role: 'radiogroup', 'aria-label': 'When should it open?' },
        mode(!on, '🎁', 'Open right away', 'The surprise starts the moment they tap the link', () => { d.date = ''; d.time = ''; draw(); changed(); }),
        mode(on, '⏳', 'Lock with a countdown', 'Send it early. A live timer ticks until the big moment', () => { if (!d.date) d.date = addDays(1); d.time ||= '00:00'; draw(); changed(); }));
      box.replaceChildren(modes, ...(on ? setup() : []));
      changed();
    }

    function setup() {
      /* Day */
      const dayLine = h('div', { class: 'cdb-dayline' });
      const dateIn = h('input', { type: 'date', class: 'cdb-date', min: ymd(new Date()), value: d.date, 'aria-label': 'Reveal day',
        oninput: e => { d.date = e.target.value; syncChips(); changed(); } });
      const quick = [['Tomorrow', 1], ['In 3 days', 3], ['In a week', 7]];
      const chips = h('div', { class: 'cdb-chips' }, quick.map(([l, n]) => h('button', { type: 'button', class: 'cdb-chip', 'data-v': addDays(n),
        onclick: () => { d.date = addDays(n); dateIn.value = d.date; syncChips(); changed(); } }, l)));
      function syncChips() { chips.querySelectorAll('.cdb-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === d.date))); }
      syncChips();

      /* Time */
      const tiles = h('div', { class: 'cdb-times', role: 'radiogroup', 'aria-label': 'Reveal time' },
        TIME_PRESETS.map(p => h('button', { type: 'button', role: 'radio', class: 'cdb-time', 'aria-checked': String(!custom && d.time === p.t),
          onclick: () => { custom = false; d.time = p.t; draw(); } },
          h('span', { class: 'ic', 'aria-hidden': 'true' }, p.ic), h('b', {}, p.name), h('small', {}, p.sub))),
        h('button', { type: 'button', role: 'radio', class: 'cdb-time', 'aria-checked': String(custom),
          onclick: () => { custom = true; draw(); } },
          h('span', { class: 'ic', 'aria-hidden': 'true' }, '🎯'), h('b', {}, 'Exact time'), h('small', {}, 'Pick to the minute')));

      let picker = null;
      if (custom) {
        const [H0, M0] = (d.time || '00:00').split(':').map(Number);
        let H = H0, M = M0;
        const big = h('div', { class: 'cdb-clock', 'aria-live': 'polite' });
        const slider = h('input', { type: 'range', min: 0, max: 23, step: 1, value: H, class: 'cdb-slider', 'aria-label': 'Hour of the day' });
        const mins = h('div', { class: 'cdb-chips' });
        const set = () => {
          d.time = `${pad2(H)}:${pad2(M)}`;
          const words = Surprise.friendlyTime(d.time);
          big.replaceChildren(h('span', { class: 'ic', 'aria-hidden': 'true' }, timeIcon(H)), h('b', {}, words.charAt(0).toUpperCase() + words.slice(1)));
          slider.value = H;
          slider.setAttribute('aria-valuetext', words);
          mins.replaceChildren(...[0, 15, 30, 45].map(m => h('button', { type: 'button', class: 'cdb-chip', 'aria-pressed': String(m === M),
            onclick: () => { M = m; set(); } }, ':' + pad2(m))));
          changed();
        };
        slider.oninput = e => { H = Number(e.target.value); set(); };
        const step = n => h('button', { type: 'button', class: 'cdb-step', 'aria-label': n < 0 ? 'One hour earlier' : 'One hour later',
          onclick: () => { H = (H + n + 24) % 24; set(); } }, n < 0 ? '−' : '+');
        picker = h('div', { class: 'cdb-picker' }, big,
          h('div', { class: 'cdb-slide-row' }, step(-1), h('div', { class: 'cdb-track' }, slider,
            h('div', { class: 'cdb-marks', 'aria-hidden': 'true' }, ['🌙', '🌅', '☀️', '🌆', '🌙'].map(e => h('span', {}, e)))), step(1)),
          h('div', { class: 'cdb-sub' }, 'Minutes'), mins);
        set();
      }

      /* Live preview card in the chosen theme */
      const units = ['days', 'hrs', 'mins', 'secs'].map(u => [h('b', {}, '00'), u]);
      const live = h('div', { class: 'cdb-live', 'aria-live': 'off' },
        h('div', { class: 'cdb-live-top' }, h('span', { class: 'cdb-gift', 'aria-hidden': 'true' }, '🎁'),
          h('span', { class: 'cdb-live-tag' }, 'What they’ll see')),
        h('div', { class: 'cdb-live-title' }),
        h('div', { class: 'cdb-units' }, units.map(([b, u]) => h('div', { class: 'cdb-unit' }, b, h('small', {}, u)))),
        h('div', { class: 'cdb-live-when' }));
      const warn = h('div', { class: 'cdb-warn', role: 'status' });

      liveUpdate = () => {
        if (!live.isConnected) return;
        const list = state.tpl.themes || C.THEMES, th = list.find(t => t.id === d.theme) || list[0];
        live.style.cssText = `--l-bg:${th.bg};--l-text:${th.text};--l-ac:${th.accent};--l-fh:${th.fh}`;
        live.querySelector('.cdb-live-title').textContent = `Something special is waiting for ${d.to || 'them'}`;
        const at = revealAt(d);
        let ms = at ? at - Date.now() : 0;
        warn.textContent = ms <= 0 ? '⚠️ That moment has already passed, so it would open right away. Pick a later day or time.'
          : ms > 400 * 864e5 ? '⚠️ Pick a date within the next 400 days.' : '';
        warn.hidden = !warn.textContent;
        ms = Math.max(0, ms);
        [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1000) % 60]
          .forEach((v, i) => { const b = units[i][0], t = pad2(v); if (b.textContent !== t) { b.textContent = t; b.classList.remove('tick'); void b.offsetWidth; b.classList.add('tick'); } });
        if (at) {
          const days = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()) - new Date(new Date().toDateString())) / 864e5);
          const rel = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
          dayLine.textContent = `📅 ${longDate(at)} · ${rel}`;
          live.querySelector('.cdb-live-when').textContent = `Opens ${longDate(at)} at ${Surprise.friendlyTime(d.time || '00:00')}`;
        }
      };

      return [
        h('div', { class: 'cdb-step-title' }, h('span', {}, '1'), 'Which day?'), h('div', { class: 'cdb-day' }, dateIn, chips), dayLine,
        h('div', { class: 'cdb-step-title' }, h('span', {}, '2'), 'What time?'), tiles, picker,
        warn, live,
        h('p', { class: 'cdb-note' }, '🌍 It follows their own time zone, so it opens at the right moment wherever they are.')
      ].filter(Boolean);
    }
    draw();
    return box;
  }
  setInterval(countdownInfo, 1000);
  function refresh() {
    countdownInfo();
    const all = fields(), req = all.filter(f => f.required), done = req.filter(f => C.fieldOk(f, state.data, isMedia));
    $('#progressBar').style.width = (done.length / req.length * 100) + '%';
    $('#progressTxt').textContent = `${done.length} of ${req.length} required items done`;
    $('#checklist').replaceChildren(...all.filter(f => f.type !== 'choice' && !(state.tpl.countdown && f.key === 'time')).map(f => {
      const ok = C.fieldOk(f, state.data, isMedia);
      return h('li', { class: ok ? 'done' : (f.required ? 'need' : '') }, h('span', { class: 'ic', 'aria-hidden': 'true' }, '✓'),
        h('div', {}, state.tpl.countdown && f.key === 'date' ? 'Countdown' : f.label, h('small', {}, statusText(f, state.data))));
    }));
  }
  $('#toPreview').onclick = openPreview;
  $('#fillDemo').onclick = fillDemo;
  $('#changeTpl').onclick = () => nav('/create/' + state.occ.id);

  /* ------------------------------ sample content ------------------------------ */
  function demoPhoto(i, label) {
    return new Promise(res => {
      const c = Object.assign(document.createElement('canvas'), { width: 800, height: 800 }); const g = c.getContext('2d');
      const pals = [['#ff9a9e','#fad0c4'],['#a18cd1','#fbc2eb'],['#84fab0','#8fd3f4'],['#fccb90','#d57eeb'],['#f6d365','#fda085'],['#89f7fe','#66a6ff'],['#ffecd2','#fcb69f'],['#c2e9fb','#a1c4fd']];
      const p = pals[i % pals.length]; const gr = g.createLinearGradient(0, 0, 800, 800);
      gr.addColorStop(0, p[0]); gr.addColorStop(1, p[1]); g.fillStyle = gr; g.fillRect(0, 0, 800, 800);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '260px serif';
      g.fillText([state.occ.emoji,'🏖️','🍕','🎢','🚗','🎤','🌄','🥳','🎬','☕'][i % 10], 400, 350);
      g.font = '600 46px Poppins, sans-serif'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(label || `Sample photo ${i + 1}`, 400, 640);
      c.toBlob(res, 'image/jpeg', .85);
    });
  }
  // A short synthesised tune (WAV) so voice-note players have something to play in the sample.
  function demoMelody() {
    const sr = 22050, beat = .42, N = { G4:392, A4:440, B4:493.88, C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99 };
    const song = [['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',2],['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',2],
      ['G4',.75],['G4',.25],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2],['F5',.75],['F5',.25],['E5',1],['C5',1],['D5',1],['C5',2]];
    const len = Math.ceil(song.reduce((s, n) => s + n[1], 0) * beat * sr); const pcm = new Int16Array(len); let t0 = 0;
    for (const [n, b] of song) {
      const f = N[n], dur = b * beat, start = Math.floor(t0 * sr), cnt = Math.floor(dur * sr);
      for (let i = 0; i < cnt && start + i < len; i++) {
        const t = i / sr, env = Math.min(1, t * 40) * Math.exp(-3 * t / dur);
        const v = (Math.sin(2 * Math.PI * f * t) + .3 * Math.sin(4 * Math.PI * f * t) + .15 * Math.sin(6 * Math.PI * f * t)) * env * .35;
        pcm[start + i] = Math.max(-1, Math.min(1, v)) * 32767;
      }
      t0 += dur;
    }
    const buf = new ArrayBuffer(44 + len * 2), dv = new DataView(buf);
    const w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, len * 2, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: 'audio/wav' });
  }
  // Records a 3-second animated clip from a canvas so video players have something to show in the sample.
  let demoVideoCache = null;
  function demoVideo() {
    if (demoVideoCache) return demoVideoCache;
    demoVideoCache = new Promise(res => {
      try {
        const c = Object.assign(document.createElement('canvas'), { width: 640, height: 360 }), g = c.getContext('2d');
        const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
        if (!type || !c.captureStream) return res(null);
        const rec = new MediaRecorder(c.captureStream(30), { mimeType: type }), chunks = [];
        rec.ondataavailable = e => e.data.size && chunks.push(e.data);
        rec.onstop = () => res(new Blob(chunks, { type: type.split(';')[0] }));
        const t0 = performance.now(); let raf;
        const draw = t => {
          const s = (t - t0) / 1000, gr = g.createLinearGradient(0, 0, 640, 360);
          gr.addColorStop(0, `hsl(${(s * 60) % 360},80%,65%)`); gr.addColorStop(1, `hsl(${(s * 60 + 120) % 360},80%,60%)`);
          g.fillStyle = gr; g.fillRect(0, 0, 640, 360);
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '110px serif';
          g.fillText('🎂', 320, 150 + Math.sin(s * 5) * 18);
          g.font = '600 44px Poppins, sans-serif'; g.fillStyle = '#fff'; g.fillText('Sample video', 320, 280);
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw); rec.start(250);
        setTimeout(() => { cancelAnimationFrame(raf); rec.stop(); }, 3000);
      } catch { res(null); }
    });
    return demoVideoCache;
  }
  const DEMO = {
    intro: 'Every picture tells our story', tagline: '', age: '25', nick: 'Bestie', candles: '5',
    giftTitle: 'A little gift, in your name', giftText: 'I made a small donation in your name, so your birthday brings a smile to someone else too 💛',
    finalLine: 'Keep smiling. Your smile is my favourite thing in this world 😊💖',
    letter: "I don't say it enough, so here it is: you make life lighter.\nNo matter how busy things get, you'll always be one of my favourite people.\nHere's to many more memories together.",
    items: {
      moments: [{ title: 'Our first road trip', caption: 'Wrong turns, loud music and the best chai on the highway.' }, { title: 'Beach day', caption: 'Sunburnt, sandy and completely happy.' },
        { title: 'Movie marathon', caption: 'Three films, two pizzas, zero regrets.' }, { title: 'That surprise party', caption: 'You cried. We pretended not to notice.' }],
      reasons: [{ text: 'You laugh at my worst jokes' }, { text: 'You always know what to say' }, { text: 'You turn every plan into an adventure' },
        { text: 'Your hugs fix bad days' }, { text: 'You remember the little things' }],
      wishes: [{ name: 'Priya', text: 'So happy for you! Have the most wonderful day.' }, { name: 'Arjun', text: 'Cheers to you. Party soon?' }, { name: 'Mom', text: 'So proud of you, today and always.' }],
      questions: [
        { q: 'After every fight, who says sorry first?', a1: 'Me, obviously 🙄', a2: 'You, obviously 😌', a3: 'Nobody, we just start talking again 😂', reply: 'Correct answer: nobody! 1000 fights, zero sorries 😂💛' },
        { q: "What's our go-to plan when we're bored?", a1: 'Food 🍕', a2: 'Long drive 🚗', a3: 'Movie marathon 🎬', a4: 'All of the above 😂', reply: 'Food first, everything else later 😂🍕' }],
      memories: [
        { icon: '🚗', title: 'Long drives', text: 'Windows down, music loud, and talks that never ended.' },
        { icon: '🎬', title: 'Movie nights', text: 'A good movie, too many snacks, and laughing at the wrong scenes 🍿' },
        { icon: '☕', title: 'Coffee & gossip', text: 'Hours that felt like minutes over one cup of coffee.' },
        { icon: '🤗', title: 'The hugs', text: 'However heavy the day was, one hug and everything felt okay again.' }],
      quiz: [{ question: 'Where was our first trip together?', answer: 'Goa', wrong1: 'Manali', wrong2: 'Ooty' },
        { question: 'What is the go-to midnight snack?', answer: 'Maggi', wrong1: 'Salad', wrong2: 'Plain toast' },
        { question: 'Who is always late?', answer: 'Both of us, equally', wrong1: 'Never us', wrong2: 'Only on weekends' }]
    }
  };
  async function fillDemo() {
    const d = state.data, t = state.tpl;
    d.to ||= (state.occ.toPh || 'e.g. Ananya').replace(/^e\.g\.\s*/, ''); d.from ||= 'Rahul';
    d.date ||= new Date().toISOString().slice(0, 10);
    const melody = demoMelody(); let pi = 0;
    for (const f of t.fields) {
      if (f.type === 'text' && !d[f.key]) d[f.key] = DEMO[f.key] || '';
      if (f.type === 'number' && !d[f.key]) d[f.key] = DEMO[f.key] || '';
      if (f.type === 'textarea' && !d[f.key]) d[f.key] = DEMO[f.key] || state.occ.demo;
      if (f.type === 'photos' && !(d[f.key] || []).length) d[f.key] = await Promise.all(Array.from({ length: Math.min(f.max, 6) }, () => demoPhoto(pi++)));
      if (f.type === 'photo' && !d[f.key]) d[f.key] = await demoPhoto(pi++, 'Cover photo');
      if (f.type === 'audio' && !d[f.key]) d[f.key] = melody;
      if (f.type === 'video' && !d[f.key]) d[f.key] = await demoVideo();
      if (f.type === 'items' && !C.validItems(f, d, isMedia)) {
        const src = (DEMO.items[f.key] || []).slice(0, f.max);
        d[f.key] = await Promise.all(src.map(async (o, i) => {
          const it = {};
          for (const s of f.sub) {
            if (s.type === 'photo') it[s.key] = await demoPhoto(pi + i, o.title || o.caption);
            else if (s.type === 'audio') it[s.key] = i === 0 ? melody : null;
            else if (o[s.key] != null) it[s.key] = o[s.key];
          }
          return it;
        }));
        pi += src.length;
      }
    }
    renderForm();
    toast('Sample content added. Swap in your own photos, voice and video.');
  }

  /* ------------------------------ preview ------------------------------ */
  function openPreview() { nav(location.pathname, 'preview'); }
  async function showPreview() {
    if (state.tpl.id === 'story' && !Story.ready()) { try { await Story.load('/templates/story.html'); } catch { toast('Could not load the design. Check your connection.'); } }
    const miss = missing(), w = $('#pvWarn');
    w.hidden = !miss.length;
    w.textContent = miss.length ? `Placeholders shown for: ${miss.join(', ')}. Add them before publishing.` : '';
    $('#frame').srcdoc = C.render(state.tpl, state.occ, state.data, url, { preview: true });
    renderPriceLine();
    show('v-preview', 4);
  }
  $('#backEdit').onclick = () => history.back();
  $('#device').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    $('#device').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('#frameWrap').classList.toggle('phone', b.dataset.d === 'phone');
  };

  /* ------------------------------ publish ------------------------------ */
  // Replaces each Blob with {"$file":"fN"} and attaches the file to the form under that name.
  function toFormData() {
    const fd = new FormData(), seen = new Map(); let n = 0;
    const walk = v => {
      if (v instanceof Blob) {
        if (!seen.has(v)) {
          const name = 'f' + n++;
          seen.set(v, name);
          fd.append(name, v, v.name || `${name}.${(v.type.split('/')[1] || 'bin').split(';')[0]}`);
        }
        return { $file: seen.get(v) };
      }
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      return v;
    };
    const data = walk(state.data);
    fd.append('data', JSON.stringify({ occasion: state.occ.id, template: state.tpl.id, data }));
    return fd;
  }
  async function publish() {
    const miss = missing();
    if (miss.length) { toast('Still needed: ' + miss.join(', ')); return; }
    if (!Auth.user) { openAuth('up', 'Create a free account to publish. Your first website is free.'); return; }
    if (!Auth.user.verified) { toast('Please verify your email first. Check your inbox.'); $('#verifyBar').scrollIntoView({ behavior: 'smooth' }); return; }
    if (me && me.next && me.next.type === 'pay') { openCheckout(); return; }
    doPublish();
  }
  async function doPublish() {
    const btn = $('#publish'), bar = $('#upbar'), fill = bar.firstElementChild;
    const token = await Auth.token();
    btn.disabled = true; btn.textContent = 'Publishing…'; bar.hidden = false; fill.style.width = '0';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/sites');
    xhr.setRequestHeader('X-WishCraft', '1');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.upload.onprogress = e => { if (e.lengthComputable) fill.style.width = (e.loaded / e.total * 100) + '%'; };
    xhr.onloadend = () => {
      btn.disabled = false; bar.hidden = true; renderPriceLine();
      let res = {}; try { res = JSON.parse(xhr.responseText); } catch { }
      if (xhr.status === 201 && res.url) { state.published = res.url; refreshMe(); nav(location.pathname, 'done'); }
      else {
        if (xhr.status === 401) openAuth('in');
        if (xhr.status === 402) { refreshMe().then(() => { if (me && me.next && me.next.type === 'pay') openCheckout(); }); return; }
        toast(res.error || 'Could not publish. Check your connection and try again.');
      }
    };
    xhr.send(toFormData());
  }
  $('#publish').onclick = publish;

  /* ------------------------------ share ------------------------------ */
  function showDone() {
    const link = state.published, occ = state.occ;
    const msg = `${occ.emoji} ${occ.headline}! I made something for you: ${link}`;
    $('#shareUrl').value = link;
    $('#openUrl').href = link;
    $('#waUrl').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
    $('#mailUrl').href = `mailto:?subject=${encodeURIComponent(occ.headline + ' ' + occ.emoji)}&body=${encodeURIComponent(msg)}`;
    $('#nativeShare').hidden = !navigator.share;
    show('v-done', 5);
  }
  $('#copyUrl').onclick = async () => {
    const inp = $('#shareUrl');
    try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand('copy'); }
    toast('Link copied');
  };
  $('#nativeShare').onclick = () => navigator.share({ title: state.occ.headline, url: state.published }).catch(() => {});

  /* ------------------------------ accounts & launch offer ------------------------------ */
  let me = null;                       // /api/me for the signed-in account
  const fmtINR = n => '₹' + Number(n).toLocaleString('en-IN');
  async function refreshMe() {
    if (!Auth.user) { me = null; renderAccount(); return; }
    try {
      const r = await Auth.fetch('/api/me', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409) { toast(j.error); await Auth.logOut(); return; }
      me = r.ok ? j : null;
      if (me && me.offer) Auth.offer = me.offer;
      if (me && me.pricing) Auth.pricing = me.pricing;
    } catch { me = null; }
    renderAccount();
  }
  function renderAccount() {
    const u = Auth.user;
    $('#signInBtn').hidden = !!u || Auth.mode === 'none';
    $('#acctOn').hidden = !u;
    $('#verifyBar').hidden = !(u && !u.verified);
    $('#devBadge').hidden = Auth.mode !== 'dev';
    if (u) {
      $('#acctEmail').textContent = u.email;
      $('#verifyEmail').textContent = u.email;
      $('#devVerify').hidden = Auth.mode !== 'dev';
      $('#verifyResend').hidden = Auth.mode !== 'firebase';
      const n = me && me.next;
      $('#freePill').hidden = !(n && n.amountInr === 0);
      $('#freePill').textContent = n && n.type === 'credit' ? `🎁 ${me.credits} website credit${me.credits > 1 ? 's' : ''}` : '🎁 1 free website';
      $('#adminLink').hidden = $('#adminBtn').hidden = !(me && me.isAdmin);
      $('#acctStatus').textContent = !u.verified ? 'Verify your email to unlock your free website.'
        : n && n.type === 'free' ? `🎁 You have 1 free birthday website (worth ${fmtINR(n.regularInr)}).`
        : n && n.type === 'credit' ? `🎁 You have ${me.credits} website credit${me.credits > 1 ? 's' : ''} ready to use.`
        : n ? `Your next website: ${fmtINR(n.amountInr)}${n.sale ? ` (${n.sale.label}, was ${fmtINR(n.regularInr)})` : ''}.` : '';
    } else $('#adminBtn').hidden = true;
    renderPromo(); renderPriceLine();
  }
  // Price shown next to the Publish button, computed from what the server says the next publish costs.
  function renderPriceLine() {
    const el = $('#priceLine'), btn = $('#publish'); if (!el) return;
    const n = me && me.next, q = Auth.pricing;
    el.replaceChildren();
    const add = (was, now, note) => { if (was) el.append('Your price: ', h('s', {}, fmtINR(was)), ' '); else el.append('Your price: '); el.append(h('b', {}, fmtINR(now)), note ? ' · ' + note : ''); };
    if (n && n.type === 'free') { add(n.regularInr, 0, 'launch gift 🎁'); btn.textContent = '🚀 Publish free & get link'; }
    else if (n && n.type === 'credit') { add(n.regularInr, 0, 'website credit 🎁'); btn.textContent = '🚀 Publish & get link'; }
    else if (n) { add(n.sale ? n.regularInr : 0, n.amountInr, n.sale ? n.sale.label : ''); btn.textContent = `🚀 Pay ${fmtINR(n.amountInr)} & publish`; }
    else {
      btn.textContent = '🚀 Publish & get link';
      if (Auth.offer && Auth.offer.running) { el.append('New accounts publish their first website free: ', h('s', {}, fmtINR(q ? q.regularInr : Auth.offer.priceInr)), ' ', h('b', {}, '₹0')); }
      else if (q) add(q.sale ? q.regularInr : 0, q.priceInr, q.sale ? q.sale.label : '');
    }
  }

  // Home deals: the free launch gift and/or the discount, each with a countdown only for a real end date.
  const timers = {};
  function countdown(box, endIso, onEnd) {
    clearInterval(timers[box.id]);
    const end = endIso ? Date.parse(endIso) : NaN;
    box.hidden = !Number.isFinite(end);
    if (box.hidden) return;
    const grid = box.querySelector('.cd4');
    const cells = ['days', 'hrs', 'mins', 'secs'].map(l => [h('b', {}, '0'), l]);
    grid.replaceChildren(...cells.map(([b, l]) => h('span', {}, b, h('i', {}, l))));
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) { clearInterval(timers[box.id]); onEnd(); return; }
      [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1000) % 60]
        .forEach((v, i) => { const t = i ? String(v).padStart(2, '0') : String(v); if (cells[i][0].textContent !== t) cells[i][0].textContent = t; });
    };
    tick(); timers[box.id] = setInterval(tick, 500);
  }
  function renderPromo() {
    const o = Auth.offer, q = Auth.pricing;
    const freeOk = !!(o && o.running) && !(me && me.next && me.next.type !== 'free' && me.reason !== 'verify-email');
    const saleOk = !!(q && q.sale) && !(me && me.next && me.next.type !== 'pay');
    $('#dealFree').hidden = !freeOk; $('#dealSale').hidden = !saleOk; $('#promo').hidden = !freeOk && !saleOk;
    if (freeOk) {
      $('#promoHeadline').textContent = o.headline;
      $('#freeWas').textContent = Number(q ? q.regularInr : o.priceInr).toLocaleString('en-IN');
      $('#promoCta').textContent = me && me.next && me.next.type === 'free' ? 'Use my free website' : Auth.user && !Auth.user.verified ? 'Verify my email to claim' : 'Claim my free website';
      countdown($('#freeCd'), o.endsAt, () => { Auth.offer = { ...o, running: false }; renderAccount(); });
    }
    if (saleOk) {
      $('#saleLabel').textContent = q.sale.label; $('#saleOff').textContent = q.sale.percentOff + '%';
      $('#saleWas').textContent = q.regularInr.toLocaleString('en-IN'); $('#saleNow').textContent = q.sale.priceInr.toLocaleString('en-IN');
      countdown($('#saleCd'), q.sale.endsAt, () => { Auth.pricing = { ...q, sale: null, priceInr: q.regularInr }; renderAccount(); });
    }
    if (!freeOk && !saleOk) { $('#promoHeadline').textContent = ''; }
    $('.deals-sub').hidden = !freeOk;
  }
  $('#promoCta').onclick = () => {
    if (me && me.next && me.next.type === 'free') return nav('/create/birthday');
    if (Auth.user && !Auth.user.verified) return $('#verifyBar').scrollIntoView({ behavior: 'smooth' });
    openAuth('up');
  };
  $('#saleCta').onclick = () => nav('/create/birthday');

  /* checkout */
  function openCheckout() {
    const n = me.next, bill = $('#bill');
    $('#payFor').textContent = `${state.tpl.icon} ${state.tpl.name} for ${state.data.to || 'someone special'}`;
    const row = (k, v, cls) => h('div', {}, h('dt', {}, k), h('dd', { class: cls || '' }, v));
    bill.replaceChildren(row('Birthday website', fmtINR(n.regularInr)),
      ...(n.sale ? [row(`${n.sale.label} (${n.sale.percentOff}% off)`, '− ' + fmtINR(n.regularInr - n.amountInr), 'save')] : []),
      row('Total', fmtINR(n.amountInr)));
    $('#payErr').textContent = '';
    $('#payGo').disabled = !n.paymentsAvailable;
    $('#payGo').textContent = n.paymentsAvailable ? `Pay ${fmtINR(n.amountInr)} & publish` : 'Online payment coming soon';
    $('#payFine').textContent = Auth.payments === 'dev' ? '🛠 Dev mode: this is a simulated payment. No money moves.'
      : n.paymentsAvailable ? 'Secure payment.' : 'Online payment isn’t available yet. Please check back soon.';
    $('#payModal').hidden = false; $('#payGo').focus();
  }
  const closeCheckout = () => { $('#payModal').hidden = true; };
  $('#payClose').onclick = closeCheckout;
  $('#payModal').addEventListener('click', e => { if (e.target.id === 'payModal') closeCheckout(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#payModal').hidden) closeCheckout(); });
  $('#payGo').onclick = async () => {
    const go = $('#payGo'); go.disabled = true; $('#payErr').textContent = '';
    try {
      const post = (url, body) => Auth.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WishCraft': '1' }, body: JSON.stringify(body || {}) })
        .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Payment failed'); return j; });
      const order = await post('/api/orders');
      if (Auth.payments === 'dev') await post(`/api/orders/${encodeURIComponent(order.orderId)}/dev-pay`);
      else throw new Error('Online payment isn’t available yet.');
      await refreshMe();
      closeCheckout(); toast(`Payment of ${fmtINR(order.amountInr)} received ✓ Publishing…`);
      doPublish();
    } catch (e) { $('#payErr').textContent = e.message; go.disabled = false; }
  };

  /* sign-in dialog */
  let authMode = 'up', lastFocus = null;
  function setTab(m) {
    authMode = m;
    $('#tabUp').setAttribute('aria-selected', String(m === 'up')); $('#tabIn').setAttribute('aria-selected', String(m === 'in'));
    $('#authGo').textContent = m === 'up' ? 'Create account' : 'Log in';
    $('#authPass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
    $('#authFine').hidden = m !== 'up';
    $('#authErr').textContent = '';
  }
  function openAuth(m = 'up', sub) {
    if (Auth.mode === 'none') { toast('Sign-in isn’t set up on this server yet.'); return; }
    lastFocus = document.activeElement;
    setTab(m);
    const price = fmtINR((Auth.offer && Auth.offer.priceInr) || 199);
    $('#authSub').innerHTML = '';
    $('#authSub').append(sub || (Auth.offer && Auth.offer.running ? 'Create an account and verify your email. Your first website is on us: ' : 'Sign in to publish and share your website.'));
    if (!sub && Auth.offer && Auth.offer.running) $('#authSub').append(h('s', {}, price), ' ', h('b', {}, '₹0'), '.');
    $('#authDev').hidden = Auth.mode !== 'dev';
    $('#quickDev').hidden = Auth.mode !== 'dev';
    $('#authModal').hidden = false; $('#authEmail').focus();
  }
  function closeAuth() { $('#authModal').hidden = true; if (lastFocus) lastFocus.focus(); }
  $('#tabUp').onclick = () => setTab('up'); $('#tabIn').onclick = () => setTab('in');
  $('#authClose').onclick = closeAuth;
  $('#authModal').addEventListener('click', e => { if (e.target.id === 'authModal') closeAuth(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#authModal').hidden) closeAuth(); });
  $('#signInBtn').onclick = () => openAuth('in');
  const quick = role => async () => {
    try { const email = await Auth.quickDev(role); closeAuth(); await refreshMe(); toast(role === 'owner' ? `👑 Signed in as owner (${email})` : `🙂 Signed in as ${email} (verified)`); }
    catch (e) { $('#authErr').textContent = e.message; }
  };
  $('#qOwner').onclick = quick('owner'); $('#qCustomer').onclick = quick('customer');
  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#authEmail').value.trim(), pass = $('#authPass').value, go = $('#authGo');
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#authErr').textContent = 'Please enter a valid email.'; return; }
    if (pass.length < 8) { $('#authErr').textContent = 'Password must be at least 8 characters.'; return; }
    go.disabled = true; $('#authErr').textContent = '';
    try {
      if (authMode === 'up') await Auth.signUp(email, pass); else await Auth.logIn(email, pass);
      $('#authPass').value = '';
      closeAuth();
      await refreshMe();
      toast(authMode === 'up' ? 'Account created. Check your inbox to verify your email 📧' : 'Welcome back 👋');
    } catch (err) { $('#authErr').textContent = err.message; }
    finally { go.disabled = false; }
  });
  $('#acctBtn').onclick = () => { const m = $('#acctMenu'); m.hidden = !m.hidden; $('#acctBtn').setAttribute('aria-expanded', String(!m.hidden)); };
  document.addEventListener('click', e => { if (!e.target.closest('.acct-on')) { $('#acctMenu').hidden = true; $('#acctBtn').setAttribute('aria-expanded', 'false'); } });
  $('#logOutBtn').onclick = async () => { await Auth.logOut(); me = null; renderAccount(); toast('Logged out'); };
  $('#verifyCheck').onclick = async () => {
    const ok = await Auth.checkVerified().catch(() => false);
    await refreshMe();
    toast(ok ? (me && me.canPublishFree ? '🎉 Email verified! Your free birthday website is unlocked.' : 'Email verified.') : 'Not verified yet. Click the link in the email, then try again.');
  };
  $('#verifyResend').onclick = async () => { try { await Auth.sendVerification(); toast('Verification email sent again.'); } catch (e) { toast(e.message); } };
  $('#devVerify').onclick = async () => { await Auth.devVerify(); await refreshMe(); toast(me && me.canPublishFree ? '🎉 Email verified! Your free birthday website is unlocked.' : 'Email verified.'); };

  renderHome();
  route();
  Auth.onChange(() => refreshMe());
  Auth.init().then(refreshMe).catch(e => { console.error(e); renderAccount(); });
})();
