/*
 * "Birthday Story": the original step-by-step birthday site, as a WishCraft template.
 * Flow: countdown → cover → cheeky yes/no question → fake scan → quiz → memory tiles →
 *       little gift → photo deck → cake → letter → finale. Empty sections are skipped.
 *
 * The page itself lives in templates/story.html with a CONFIG slot that this module fills.
 * Node reads the file directly; the browser builder loads it once with Story.load().
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory();
  if (isNode) {
    api.setHtml(require('fs').readFileSync(require('path').join(__dirname, '..', 'templates', 'story.html'), 'utf8'));
    module.exports = api;
  } else root.Story = api;
})(typeof self !== 'undefined' ? self : this, function () {

  // Looks used for the theme cards and the countdown preview in the builder.
  const THEMES = [
    { id:'elegant', name:'Elegant Gold', dark:true, tagline:'Champagne gold on midnight plum, with soft glowing lights.', icons:['✨','🥂','🌙'],
      bg:'radial-gradient(circle at 20% 15%,rgba(150,55,105,.55),transparent 45%),radial-gradient(circle at 85% 85%,rgba(212,175,106,.3),transparent 45%),linear-gradient(160deg,#170b19,#1d1020 50%,#0c0913)',
      text:'#f6efe6', accent:'#d4af6a', fh:"'Great Vibes',cursive" },
    { id:'party', name:'Party', dark:true, tagline:'Purple-pink party with balloons and confetti.', icons:['🎈','🎀','💜'],
      bg:'linear-gradient(-45deg,#2a1650,#4b1d6b,#a0306b,#3a1c71,#d76d77)', text:'#fff7fb', accent:'#ffd166', fh:"'Pacifico',cursive" },
    { id:'lantern', name:'Night Lanterns', dark:true, tagline:'Glowing sky lanterns over a starry night.', icons:['🏮','✨','🌟'],
      bg:'radial-gradient(ellipse at bottom,#1f3160 0%,#0b1026 55%,#04050d 100%)', text:'#fff3c4', accent:'#f4c95d', fh:"'Playfair Display',serif" },
    { id:'pastel', name:'Pastel Dream', dark:false, tagline:'Soft pastels, clouds, flowers and butterflies.', icons:['🌸','🦋','☁️'],
      bg:'linear-gradient(-45deg,#ffd6e0,#e8d5ff,#ffe5cc,#d5f0ff)', text:'#5b3a5e', accent:'#b5179e', fh:"'Caveat',cursive" },
    { id:'retro', name:'Retro Mixtape', dark:true, tagline:'Vintage cassette vibes with track labels.', icons:['📼','🎵','📻'],
      bg:'linear-gradient(160deg,#3b1f2b,#2b1b17 50%,#14281d)', text:'#fdf0d5', accent:'#f2a541', fh:"'Righteous',sans-serif" },
    { id:'festive', name:'Festive Marigold', dark:true, tagline:'Diyas, marigold garlands and rangoli dots.', icons:['🪔','🌼','🌺'],
      bg:'radial-gradient(circle at 50% 0%,#a4133c 0%,#6a0b2a 45%,#3d0518 100%)', text:'#fff3e0', accent:'#ffbf00', fh:"'Playfair Display',serif" },
    { id:'scrapbook', name:'Scrapbook', dark:false, tagline:'Notebook paper, tape and doodles.', icons:['📎','✏️','💌'],
      bg:'linear-gradient(rgba(110,150,200,.22) 1px,transparent 1px) 0 0/100% 32px,#f6eedf', text:'#3b2f2f', accent:'#b23a48', fh:"'Caveat',cursive" }
  ];
  const BACKGROUNDS = [
    { v:'plum', label:'Midnight Plum', bg:'linear-gradient(160deg,#170b19,#3a1530 60%,#0c0913)', accent:'#d4af6a' },
    { v:'emerald', label:'Royal Emerald', bg:'linear-gradient(160deg,#06140f,#0f3a2c 60%,#050c0a)', accent:'#d4af6a' },
    { v:'rose', label:'Rose Gold Dusk', bg:'linear-gradient(160deg,#1a0d12,#4a2230 60%,#0f080c)', accent:'#f0bea0' },
    { v:'sapphire', label:'Sapphire Night', bg:'linear-gradient(160deg,#070d1f,#16285a 60%,#050812)', accent:'#d4af6a' },
    { v:'wine', label:'Velvet Wine', bg:'linear-gradient(160deg,#1a0608,#4a1018 60%,#0e0405)', accent:'#e6963c' },
    { v:'aurora', label:'Aurora', bg:'linear-gradient(160deg,#061218,#13464a 50%,#2c1a4a)', accent:'#8ce0c8' },
    { v:'mocha', label:'Mocha', bg:'linear-gradient(160deg,#150f0b,#3a2a1c 60%,#0b0806)', accent:'#e6be78' }
  ];
  const DEFAULT_QUESTION = 'Admit it… I’m your favourite person in the whole world? 😌💛';
  const NO_LINES = [
    'Hehe, nice try 😏', 'Even the button knows the truth 💛', 'The NO button refuses to lie 🙈',
    "Error 404: 'Someone better than {from}' not found 🚫", 'Catch it if you can, {nick} 😂',
    'Okay fine… it’s getting tired too 🥵', 'Just click yes already 🙄'
  ];

  const template = {
    id:'story', name:'Birthday Story', icon:'💌', countdown:true, themes:THEMES,
    tagline:'A step-by-step surprise: a cheeky question, a quiz, memory tiles, a photo deck, a cake and a letter.',
    fields:[
      { key:'theme', label:'Theme', type:'choice', swatches:true, default:'elegant',
        options: THEMES.map(t => ({ v:t.id, label:t.name, bg:t.bg, accent:t.accent })) },
      { key:'background', label:'Background colour', type:'choice', swatches:true, default:'plum', options:BACKGROUNDS,
        hint:'Used by the Elegant Gold theme' },
      { key:'nick', label:'What you call them', type:'text', max:60, placeholder:'e.g. Bestie', hint:'Used in “Hey ___ 👋” and in the jokes' },
      { key:'question', label:'Opening yes/no question', type:'text', max:160, ai:'title', placeholder:DEFAULT_QUESTION,
        hint:'They answer before the surprise starts. The NO button runs away 😄 Leave empty for the default.' },
      { key:'questions', label:'Birthday quiz', type:'items', min:0, max:5, itemLabel:'Question',
        hint:'Funny questions about the two of you',
        sub:[ { key:'q', label:'Question', type:'text', required:true, max:160, placeholder:'Who says sorry first after a fight?' },
              { key:'a1', label:'Answer 1', type:'text', required:true, max:80 },
              { key:'a2', label:'Answer 2', type:'text', required:true, max:80 },
              { key:'a3', label:'Answer 3', type:'text', max:80 },
              { key:'a4', label:'Answer 4', type:'text', max:80 },
              { key:'reply', label:'Your reply after they answer', type:'text', max:300, ai:'line', placeholder:'Correct! 1000 fights, zero sorries 😂' } ] },
      { key:'memories', label:'Memory lane', type:'items', min:0, max:8, itemLabel:'Memory', itemPlural:'memories',
        hint:'Tiles that flip over when tapped. Pick an emoji, a short title and a few lines.',
        sub:[ { key:'icon', label:'Emoji', type:'text', max:8, placeholder:'🚗' },
              { key:'title', label:'Title', type:'text', required:true, max:60, placeholder:'Long drives' },
              { key:'text', label:'The memory', type:'textarea', required:true, max:400, ai:'caption' } ] },
      { key:'moments', label:'Photos', type:'items', min:0, max:20, itemLabel:'Photo', itemPlural:'photos',
        hint:'A deck of prints they swipe through. The sticker is a fun little label on each photo.',
        sub:[ { key:'photo', label:'Photo', type:'photo', required:true },
              { key:'caption', label:'Caption', type:'text', max:120, ai:'line', placeholder:'Cafe days ☕💛' },
              { key:'sticker', label:'Sticker', type:'text', max:40, placeholder:'Coffee + gossip = 💯' } ] },
      { key:'candles', label:'Candles on the cake', type:'number', min:1, max:10, placeholder:'5' },
      { key:'letter', label:'Your letter', type:'textarea', max:4000, ai:'message', hint:'Types itself out after they blow the candles' },
      { key:'giftPhoto', label:'A little gift (photo)', type:'photo', hint:'Optional page before the photos, e.g. a donation in their name or a gift voucher' },
      { key:'giftTitle', label:'Gift title', type:'text', max:80, placeholder:'A little gift, in your name' },
      { key:'giftText', label:'Gift note', type:'textarea', max:600, ai:'caption' },
      { key:'extraWish', label:'Extra wish line', type:'text', max:120, placeholder:'Wishing you the happiest birthday ever 🎂', hint:'Optional. A short extra wish shown on the last page.' },
      { key:'finalLine', label:'Last line', type:'text', max:200, ai:'line', placeholder:'Keep smiling. Your smile is my favourite thing in this world 😊💖' }
    ]
  };

  let HTML = null, loading = null;
  const setHtml = h => { HTML = h; };
  const ready = () => !!HTML;
  // Browser only: fetch the page template once.
  function load(url) {
    if (HTML) return Promise.resolve();
    return loading ||= fetch(url).then(r => { if (!r.ok) throw new Error('template ' + r.status); return r.text(); }).then(setHtml);
  }

  const str = v => (v == null ? '' : String(v)).trim();

  // Builder data -> the CONFIG object the page expects.
  function toConfig(d, src, opts) {
    const S = v => (v ? src(v) : null);
    const name = str(d.to) || 'You', nick = str(d.nick) || name;
    return {
      theme: THEMES.some(t => t.id === d.theme) ? d.theme : 'elegant',
      background: BACKGROUNDS.some(b => b.v === d.background) ? d.background : 'plum',
      name, nick, from: str(d.from) || 'Someone special',
      countdown: d.date ? { date: d.date, time: d.time || '00:00', timeZone: '' } : { date: '' },
      countdownTitle: `Your day is almost here, ${name}`,
      music: { file: '', startAt: 0, volume: 0.7 },          // built-in Happy Birthday tune (public domain)
      candles: Math.min(10, Math.max(1, Number(d.candles) || 5)),
      question: str(d.question) || DEFAULT_QUESTION,
      noLines: NO_LINES,
      photos: (d.moments || []).filter(m => S(m.photo)).map(m => ({ file: S(m.photo), caption: str(m.caption), sticker: str(m.sticker) })),
      quiz: (d.questions || []).filter(q => str(q.q) && str(q.a1) && str(q.a2)).map(q => ({
        q: str(q.q), options: [q.a1, q.a2, q.a3, q.a4].map(str).filter(Boolean), reply: str(q.reply) || 'Good answer 😄💛' })),
      memories: (d.memories || []).filter(m => str(m.title) && str(m.text)).map(m => ({ icon: str(m.icon) || '💛', title: str(m.title), text: str(m.text) })),
      letter: str(d.letter),
      gift: { title: str(d.giftTitle) || 'A little gift, in your name', photo: S(d.giftPhoto) || '', alt: str(d.giftTitle) || 'A little gift', text: str(d.giftText) },
      extraWish: str(d.extraWish),
      finalLine: str(d.finalLine) || 'Keep smiling. Your smile is my favourite thing in this world 😊💖',
      builderPreview: !!(opts && opts.preview)
    };
  }

  function render(tpl, occ, d, src, opts, H) {
    if (!HTML) return '<!doctype html><meta charset="utf-8"><body style="background:#120a14;color:#f3dfa2;font-family:sans-serif;display:grid;place-items:center;min-height:90vh">Loading…</body>';
    // JSON inside <script>: escape "<" and line separators so user text can never close the tag.
    const json = JSON.stringify(toConfig(d, src, opts))
      .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    let out = HTML.replace('/*__WISHCRAFT_CONFIG__*/{}', () => json);
    out = out.replace(/<title>[^<]*<\/title>/, () => `<title>Happy Birthday, ${H.esc(str(d.to) || 'You')}</title>`);
    if (opts && opts.nonce) out = out.replace(/<script>/g, () => `<script nonce="${H.esc(opts.nonce)}">`);
    return out;
  }

  return { THEMES, BACKGROUNDS, template, render, toConfig, setHtml, ready, load };
});
