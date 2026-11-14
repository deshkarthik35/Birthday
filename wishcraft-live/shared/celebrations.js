/*
 * Shared by the browser builder and the Node server:
 * occasions (with their own palettes + animated backgrounds), templates (layouts),
 * validation, and the HTML renderer for a celebration page.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./surprise') : root.Surprise, isNode ? require('./story') : root.Story);
  if (isNode) module.exports = api;
  else root.Celebrations = api;
})(typeof self !== 'undefined' ? self : this, function (Surprise, Story) {

  /* ----------------------------- occasions -----------------------------
   * mode:  default look for light layouts ('light' | 'dark'; festivals of light/night default to dark)
   * light/dark: palettes. fx: animated background layers drawn on a canvas:
   *   rise | fall | drift  (shape: balloon, heart, petal, snow, bubble, confetti  OR  emoji: [...])
   *   bokeh | twinkle | sparkle | fireworks
   */
  const OCCASIONS = [
    { id:'birthday', name:'Birthday', emoji:'🎂', orbit:['🎈','🎁','🎉'], headline:'Happy Birthday', pre:"it's your day",
      toLabel:"Birthday person's name", toPh:'e.g. Ananya', mode:'light',
      light:{ bg:'linear-gradient(160deg,#ffd1ec 0%,#e4c9ff 50%,#c9e7ff 100%)', text:'#3a2350', accent:'#e2368a' },
      dark:{ bg:'radial-gradient(circle at 20% 0%,#5a237f 0%,#1a0b2e 70%)', accent:'#ff7ac6' },
      fx:[{ type:'rise', shape:'balloon', count:14, colors:['#ff5fa2','#ffd23f','#7c5cff','#3ec1ff','#ff8a3d'] },
          { type:'fall', shape:'confetti', count:28, colors:['#ff5fa2','#ffd23f','#7c5cff','#3ec1ff'] }],
      finale:{ type:'cake', title:'Make a wish, {to}', btn:'Blow the candles 🌬️', done:'Wish sent to the universe 💫' },
      demo:'Another year of you being the brightest person in every room.\nThank you for the laughs, the late-night talks and for always showing up.\nHave the most wonderful day. You deserve all of it.' },
    { id:'anniversary', name:'Anniversary', emoji:'💞', orbit:['💖','🌹','✨'], headline:'Happy Anniversary', pre:'another year of us',
      toLabel:"Who's it for?", toPh:'e.g. Priya & Arjun', mode:'light',
      light:{ bg:'linear-gradient(160deg,#ffe3e8 0%,#ffc2d1 50%,#f7a1bd 100%)', text:'#5a1630', accent:'#c9184a' },
      dark:{ bg:'radial-gradient(circle at 50% 0%,#7a1240 0%,#26040f 70%)', accent:'#ff8fab' },
      fx:[{ type:'rise', shape:'heart', count:22, colors:['#ff4d6d','#ff8fab','#ffffff','#c9184a'] },
          { type:'bokeh', count:12, colors:['#ffffff','#ffb3c6'] }],
      finale:{ type:'burst', icon:'💞', title:'Here’s to forever, {to}', btn:'Send love 💖', done:'Love delivered 💌' },
      demo:'Every year with you feels like the best one yet.\nThank you for the patience, the laughter and the quiet moments.\nHere’s to many more adventures together.' },
    { id:'wedding', name:'Wedding', emoji:'💍', orbit:['🤍','🌸','🥂'], headline:'Happily Ever After', pre:'congratulations on your wedding',
      toLabel:"Couple's names", toPh:'e.g. Meera & Karan', mode:'light',
      light:{ bg:'linear-gradient(160deg,#fffaf2 0%,#f6ead6 55%,#ecd5b8 100%)', text:'#4a3b2a', accent:'#a67c3d' },
      dark:{ bg:'radial-gradient(circle at top,#4a3a2a 0%,#16110c 70%)', accent:'#e6c48a' },
      fx:[{ type:'fall', shape:'petal', count:34, colors:['#ffffff','#ffe4e1','#f8c8dc','#fbd3c4'] },
          { type:'sparkle', count:22, colors:['#e6c48a','#fff3c4'] }],
      finale:{ type:'burst', icon:'💍', title:'Cheers to the newlyweds, {to}', btn:'Shower the couple 🌸', done:'Blessings sent 🤍' },
      demo:'Watching you two find each other has been a joy.\nMay your home always be full of love, laughter and good food.\nWishing you a lifetime of happiness.' },
    { id:'engagement', name:'Engagement', emoji:'💐', orbit:['💍','🥂','✨'], headline:'Congrats on the Engagement', pre:'the countdown begins',
      toLabel:"Couple's names", toPh:'e.g. Sara & Dev', mode:'light',
      light:{ bg:'linear-gradient(160deg,#fff1ea 0%,#ffd9cc 50%,#f5c6d6 100%)', text:'#5b2a35', accent:'#d6456a' },
      dark:{ bg:'radial-gradient(circle at top,#5a1f37 0%,#1e0b14 70%)', accent:'#ffb3c1' },
      fx:[{ type:'fall', shape:'petal', count:28, colors:['#ffb3c1','#ffd6a5','#ffffff'] },
          { type:'bokeh', count:12, colors:['#ffffff','#ffc2d1'] }],
      finale:{ type:'burst', icon:'💐', title:'So happy for you, {to}', btn:'Pop the champagne 🍾', done:'Cheers! 🥂' },
      demo:'The best news we have heard all year.\nYou two are perfect together.\nCan’t wait to celebrate the big day with you.' },
    { id:'graduation', name:'Graduation', emoji:'🎓', orbit:['📜','⭐','🏅'], headline:'Congrats, Graduate', pre:'all that hard work paid off',
      toLabel:"Graduate's name", toPh:'e.g. Rohan', mode:'light',
      light:{ bg:'linear-gradient(160deg,#e8f0ff 0%,#c7d7ff 50%,#ffe9a8 100%)', text:'#14213d', accent:'#1d3faa' },
      dark:{ bg:'radial-gradient(circle at top,#1e2f6b 0%,#0a1230 70%)', accent:'#ffd43b' },
      fx:[{ type:'fall', shape:'confetti', count:46, colors:['#1d3faa','#f5b301','#ffffff','#4dabf7'] },
          { type:'rise', emoji:['🎓'], count:6, size:1.2 }],
      finale:{ type:'burst', icon:'🎓', title:'The world is yours, {to}', btn:'Throw your cap 🎓', done:'Caps in the air! 🎉' },
      demo:'All those late nights and exam stress finally paid off.\nWe are so proud of you.\nThis is only the beginning of something big.' },
    { id:'baby', name:'New Baby', emoji:'👶', orbit:['🍼','🧸','⭐'], headline:'Welcome, Little One', pre:'a new star has arrived',
      toLabel:"Baby's or parents' names", toPh:'e.g. Baby Aarav', mode:'light',
      light:{ bg:'linear-gradient(160deg,#e3f4ff 0%,#fff4d6 50%,#ffe3ef 100%)', text:'#2f4858', accent:'#2b8fd6' },
      dark:{ bg:'radial-gradient(circle at top,#1e3a52 0%,#0d1b2a 70%)', accent:'#8fd3fe' },
      fx:[{ type:'rise', shape:'bubble', count:24, colors:['#74c0fc','#f783ac','#ffd43b'] },
          { type:'sparkle', count:18, colors:['#ffd43b','#ffffff'] }],
      finale:{ type:'burst', icon:'🧸', title:'Welcome to the world, {to}', btn:'Send cuddles 🤗', done:'Cuddles on the way 💕' },
      demo:'The tiniest hands, the biggest love.\nCongratulations on your beautiful new family member.\nWishing you sleep, smiles and endless joy.' },
    { id:'farewell', name:'Farewell', emoji:'👋', orbit:['✈️','🌍','💛'], headline:'Farewell & Good Luck', pre:'not goodbye, just see you later',
      toLabel:"Who's leaving?", toPh:'e.g. Neha', mode:'light',
      light:{ bg:'linear-gradient(180deg,#ffd89b 0%,#ff9a8b 55%,#b197fc 100%)', text:'#3d1f3a', accent:'#d9480f' },
      dark:{ bg:'linear-gradient(180deg,#4a2058 0%,#1a0f2e 100%)', accent:'#ffb37a' },
      fx:[{ type:'drift', emoji:['✈️','🕊️'], count:5, size:1.1 },
          { type:'bokeh', count:16, colors:['#ffffff','#ffd8a8'] }],
      finale:{ type:'burst', icon:'✈️', title:'Go shine, {to}', btn:'Send good vibes ✨', done:'Good luck out there 🍀' },
      demo:'It won’t be the same without you.\nThank you for every laugh, every coffee break and every bit of help.\nWherever you go next, they are lucky to have you.' },
    { id:'retirement', name:'Retirement', emoji:'🏖️', orbit:['🌴','☀️','🍹'], headline:'Happy Retirement', pre:'the best chapter starts now',
      toLabel:"Retiree's name", toPh:'e.g. Mr. Sharma', mode:'light',
      light:{ bg:'linear-gradient(180deg,#a8edea 0%,#d3f9d8 50%,#fed6e3 100%)', text:'#1f3b4d', accent:'#0b7285' },
      dark:{ bg:'linear-gradient(180deg,#0b3d4f 0%,#06202b 100%)', accent:'#63e6be' },
      fx:[{ type:'bokeh', count:18, colors:['#ffffff','#c3fae8'] },
          { type:'fall', emoji:['🌺','🌴','🐚'], count:9 }],
      finale:{ type:'burst', icon:'🌴', title:'Enjoy every day, {to}', btn:'Start the holiday 🌞', done:'Vacation mode: ON 🏝️' },
      demo:'Years of dedication, kindness and wisdom.\nThank you for everything you taught us.\nNow it’s time to relax and do everything you love.' },
    { id:'congrats', name:'Congratulations', emoji:'🏆', orbit:['⭐','🎉','🥇'], headline:'Congratulations', pre:'you did it',
      toLabel:"Who's it for?", toPh:'e.g. Kavya', mode:'light',
      light:{ bg:'linear-gradient(160deg,#fff6d5 0%,#ffe08a 50%,#b5f0d8 100%)', text:'#3b2f00', accent:'#b06a00' },
      dark:{ bg:'radial-gradient(circle at top,#4a3a0a 0%,#141005 70%)', accent:'#ffd43b' },
      fx:[{ type:'fall', shape:'confetti', count:56, colors:['#ffd43b','#12b886','#ff6b6b','#4dabf7','#ffffff'] },
          { type:'sparkle', count:18, colors:['#ffe066'] }],
      finale:{ type:'burst', icon:'🏆', title:'So proud of you, {to}', btn:'Celebrate 🎉', done:'Party time! 🥳' },
      demo:'You worked so hard for this and it shows.\nCongratulations on a well-deserved win.\nCan’t wait to see what you do next.' },
    { id:'valentine', name:"Valentine's Day", emoji:'❤️', orbit:['🌹','💌','💕'], headline:"Happy Valentine's Day", pre:'you have my heart',
      toLabel:"Your Valentine's name", toPh:'e.g. Riya', mode:'light',
      light:{ bg:'linear-gradient(160deg,#ffd6dd 0%,#ff9fb2 55%,#ff5c7a 100%)', text:'#4a0a1c', accent:'#b5103c' },
      dark:{ bg:'radial-gradient(circle at top,#7a0b2a 0%,#2b0410 70%)', accent:'#ff8fa3' },
      fx:[{ type:'rise', shape:'heart', count:30, colors:['#ff4d6d','#c9184a','#ffccd5','#ffffff'] },
          { type:'bokeh', count:10, colors:['#ffffff'] }],
      finale:{ type:'burst', icon:'❤️', title:'Forever yours, {to}', btn:'Send a kiss 💋', done:'Kiss delivered 💕' },
      demo:'You make ordinary days feel special.\nThank you for being you.\nHappy Valentine’s Day, my favourite person.' },
    { id:'diwali', name:'Diwali', emoji:'🪔', orbit:['✨','🎆','🪷'], headline:'Happy Diwali', pre:'festival of lights',
      toLabel:"Who's it for?", toPh:'e.g. The Iyer family', mode:'dark',
      light:{ bg:'linear-gradient(160deg,#fff3d6 0%,#ffd29d 50%,#ffb4a2 100%)', text:'#5a1a00', accent:'#c2410c' },
      dark:{ bg:'radial-gradient(ellipse at 50% 0%,#8a3a00 0%,#3d0b3a 45%,#12051f 100%)', accent:'#ffb703' },
      fx:[{ type:'fireworks', colors:['#ffb703','#fb8500','#ff006e','#ffd60a','#8338ec'] },
          { type:'rise', emoji:['🪔'], count:6 },
          { type:'sparkle', count:30, colors:['#ffd166','#ffffff'] }],
      finale:{ type:'burst', icon:'🪔', title:'Shine bright, {to}', btn:'Light the diya 🪔', done:'May your year glow ✨' },
      demo:'May this Diwali light up your home with joy and prosperity.\nSweets, laughter and family. Everything good.\nShubh Deepavali!' },
    { id:'christmas', name:'Christmas', emoji:'🎄', orbit:['🎁','⭐','❄️'], headline:'Merry Christmas', pre:'season’s greetings',
      toLabel:"Who's it for?", toPh:'e.g. Emma', mode:'dark',
      light:{ bg:'linear-gradient(160deg,#e9f5ec 0%,#d4ecdd 50%,#fbe3e3 100%)', text:'#1b4332', accent:'#c1121f' },
      dark:{ bg:'radial-gradient(ellipse at top,#1f5c42 0%,#0b2a1f 55%,#050f0b 100%)', accent:'#ff6b6b' },
      fx:[{ type:'fall', shape:'snow', count:110, colors:['#ffffff'] },
          { type:'twinkle', count:30, colors:['#ffe066','#ffffff'] }],
      finale:{ type:'burst', icon:'🎁', title:'Merry everything, {to}', btn:'Open your gift 🎁', done:'Ho ho ho! 🎅' },
      demo:'Wishing you a cosy Christmas full of warmth and cheer.\nThank you for making this year brighter.\nHappy holidays!' },
    { id:'eid', name:'Eid', emoji:'🌙', orbit:['⭐','🏮','✨'], headline:'Eid Mubarak', pre:'blessings and joy',
      toLabel:"Who's it for?", toPh:'e.g. Ayaan', mode:'dark',
      light:{ bg:'linear-gradient(160deg,#e6fff7 0%,#c3f0e1 50%,#fdf1c7 100%)', text:'#0b3b3c', accent:'#0f766e' },
      dark:{ bg:'radial-gradient(circle at 75% 10%,#1d6b63 0%,#063b38 40%,#021616 100%)', accent:'#f2cc60' },
      fx:[{ type:'twinkle', count:80, colors:['#fff7d6','#ffffff'] },
          { type:'rise', emoji:['🏮'], count:7 }],
      finale:{ type:'burst', icon:'🌙', title:'Eid Mubarak, {to}', btn:'Send blessings 🤲', done:'Blessings sent ✨' },
      demo:'May this Eid bring peace, happiness and prosperity to you and your family.\nEid Mubarak!' },
    { id:'newyear', name:'New Year', emoji:'🎆', orbit:['🥂','⏰','✨'], headline:'Happy New Year', pre:'new year, new memories',
      toLabel:"Who's it for?", toPh:'e.g. The gang', mode:'dark',
      light:{ bg:'linear-gradient(160deg,#e0e7ff 0%,#c7d2fe 50%,#fde68a 100%)', text:'#1e1b4b', accent:'#4338ca' },
      dark:{ bg:'radial-gradient(ellipse at top,#2a2670 0%,#0b0a2a 55%,#030312 100%)', accent:'#fcd34d' },
      fx:[{ type:'fireworks', colors:['#fcd34d','#60a5fa','#f472b6','#34d399','#ffffff'] },
          { type:'twinkle', count:60, colors:['#ffffff'] }],
      finale:{ type:'burst', icon:'🎆', title:'Here’s to the new year, {to}', btn:'Start the countdown 🥂', done:'3… 2… 1… Happy New Year! 🎉' },
      demo:'Thank you for being part of my year.\nHere’s to more trips, more laughs and more memories.\nHappy New Year!' },
    { id:'thankyou', name:'Thank You', emoji:'🙏', orbit:['💛','🌼','✨'], headline:'Thank You', pre:'from the bottom of my heart',
      toLabel:"Who's it for?", toPh:'e.g. Coach Ravi', mode:'light',
      light:{ bg:'linear-gradient(160deg,#fff9db 0%,#ffec99 50%,#ffd8a8 100%)', text:'#5c3d00', accent:'#d9480f' },
      dark:{ bg:'radial-gradient(circle at top,#5c3d00 0%,#1f1400 70%)', accent:'#ffd43b' },
      fx:[{ type:'fall', emoji:['🌼','🌸','💛'], count:14 },
          { type:'bokeh', count:14, colors:['#ffffff','#ffe8a3'] }],
      finale:{ type:'burst', icon:'💛', title:'You’re the best, {to}', btn:'Send a hug 🤗', done:'Hug delivered 💛' },
      demo:'Your kindness made a real difference.\nThank you for always being there.\nI’m truly grateful.' },
    { id:'housewarming', name:'Housewarming', emoji:'🏡', orbit:['🔑','🪴','🛋️'], headline:'Happy New Home', pre:'welcome home',
      toLabel:"Who's it for?", toPh:'e.g. Nikhil & Pooja', mode:'light',
      light:{ bg:'linear-gradient(160deg,#f8f1e7 0%,#e9d8c4 50%,#cfe1c4 100%)', text:'#3e2c1c', accent:'#9c4a1a' },
      dark:{ bg:'radial-gradient(circle at top,#4a3523 0%,#160f08 70%)', accent:'#e9b384' },
      fx:[{ type:'fall', emoji:['🍂','🍃','🌿'], count:14 },
          { type:'bokeh', count:12, colors:['#ffffff','#f1e3cf'] }],
      finale:{ type:'burst', icon:'🔑', title:'Make it home, {to}', btn:'Open the door 🚪', done:'Welcome home! 🏡' },
      demo:'Congratulations on your beautiful new home.\nMay it be filled with love, laughter and great dinners.\nCan’t wait to visit!' }
  ];

  /* ----------------------------- templates (layouts) -----------------------------
   * dark: true forces the occasion's dark palette. ai: 'title' | 'caption' | 'message' enables the AI writing helper.
   */
  const commonFields = (occ, tpl) => [
    { key:'to', label: occ.toLabel, type:'text', required:true, placeholder: occ.toPh, max:120 },
    { key:'from', label:"Your name (who it's from)", type:'text', required:true, placeholder:'e.g. Rahul', max:120 },
    ...(tpl && tpl.countdown
      ? [{ key:'date', label:'Birthday date', type:'date', group:'⏰ Countdown timer',
           hint:'Share the link early: until this date it shows a live countdown (e.g. 4 days 0 hrs 45 mins 03 secs to go), then reveals itself. Leave empty to open right away.' },
         { key:'time', label:'Reveal time', type:'time', placeholder:'00:00',
           hint:'Optional. When the surprise unlocks on that day, in the recipient’s own time. Empty means midnight (00:00).' }]
      : [{ key:'date', label:'Date', type:'date', hint:'Shown as day + month only' }])
  ];

  // Occasions currently offered. Others stay defined (and old links keep working) but are hidden.
  const ACTIVE = ['birthday'];
  const isActive = occ => !!occ && ACTIVE.includes(occ.id);

  const TEMPLATES = [
    { id:'party', name:'Confetti Pop', icon:'🎉', dark:false,
      tagline:'Bright, bouncy and full of life.',
      fields:[
        { key:'headline', label:'Headline', type:'text', placeholder:'Leave empty for the default', max:120, ai:'title' },
        { key:'message', label:'Your message', type:'textarea', required:true, placeholder:'Write something from the heart…', ai:'message' },
        { key:'photos', label:'Photos', type:'photos', min:3, max:12, required:true, hint:'3 to 12 photos for the gallery' },
        { key:'voice', label:'Voice note', type:'audio', hint:'Record right here or upload an audio file' },
        { key:'video', label:'Video message', type:'video' }
      ]},
    { id:'memories', name:'Memory Lane', icon:'📸', dark:false,
      tagline:'A polaroid timeline of your moments together.',
      fields:[
        { key:'intro', label:'Intro line', type:'text', placeholder:'Every picture tells our story', max:160, ai:'title' },
        { key:'moments', label:'Memories', type:'items', min:3, max:10, required:true, itemLabel:'Memory', itemPlural:'memories',
          hint:'Each memory is 1 photo + a title + a short caption',
          sub:[
            { key:'photo', label:'Photo', type:'photo', required:true },
            { key:'title', label:'Title', type:'text', placeholder:'Goa road trip, 2021', max:120, ai:'title' },
            { key:'caption', label:'Caption', type:'textarea', placeholder:'What made this moment special?', max:1000, ai:'caption' }
          ]},
        { key:'letter', label:'Closing letter', type:'textarea', required:true, ai:'message' },
        { key:'voice', label:'Voice note', type:'audio' }
      ]},
    { id:'cinema', name:'Movie Night', icon:'🎬', dark:true,
      tagline:'Their story as a blockbuster. Built around one video.',
      fields:[
        { key:'video', label:'Main video', type:'video', required:true, hint:'The "feature film": a montage or a video message' },
        { key:'tagline', label:'Movie tagline', type:'text', placeholder:'One legend. One day. Zero chill.', max:160, ai:'title' },
        { key:'photos', label:'Behind-the-scenes photos', type:'photos', min:3, max:6, required:true },
        { key:'message', label:'Message after the credits', type:'textarea', required:true, ai:'message' }
      ]},
    { id:'voice', name:'Voice Letter', icon:'🎙️', dark:true,
      tagline:'Say it in your own voice. Minimal and emotional.',
      fields:[
        { key:'cover', label:'Cover photo', type:'photo', required:true },
        { key:'voice', label:'Your voice letter', type:'audio', required:true, hint:'The star of this template. 30 sec to 5 min works best' },
        { key:'letter', label:'Written version (optional transcript)', type:'textarea', ai:'message' },
        { key:'photos', label:'Extra photos', type:'photos', min:0, max:4 }
      ]},
    { id:'elegant', name:'Golden Wishes', icon:'✨', dark:true,
      tagline:'Classy and glowing. Collect wishes from everyone.',
      fields:[
        { key:'cover', label:'Cover photo', type:'photo', required:true },
        { key:'message', label:'Main message', type:'textarea', required:true, ai:'message' },
        { key:'wishes', label:'Wishes from friends & family', type:'items', min:1, max:30, required:true, itemLabel:'Wish',
          sub:[
            { key:'name', label:'Name', type:'text', required:true, max:80 },
            { key:'text', label:'Wish', type:'textarea', required:true, max:1000, ai:'caption' },
            { key:'voice', label:'Voice wish', type:'audio' }
          ]},
        { key:'photos', label:'Photo gallery', type:'photos', min:0, max:12 }
      ]}
  ];

  // Birthday uses one all-in-one template with selectable themes; other occasions keep the classic layouts.
  TEMPLATES.push(Story.template, Surprise.template);
  occasion('birthday').templates = ['story', 'surprise'];

  function occasion(id) { return OCCASIONS.find(o => o.id === id); }
  const template = id => TEMPLATES.find(t => t.id === id);
  const templatesFor = occ => occ.templates ? occ.templates.map(template) : TEMPLATES.filter(t => !t.only);
  const allFields = (occ, tpl) => [...commonFields(occ, tpl), ...tpl.fields];

  // Palette actually used for an occasion + layout combination.
  function palette(occ, tpl) {
    const dark = !!(tpl.dark || occ.mode === 'dark');
    const p = dark ? occ.dark : occ.light;
    return {
      dark, bg: p.bg, accent: p.accent,
      accent2: dark ? occ.light.accent : occ.dark.accent,
      text: dark ? '#fbf6ee' : p.text,
      card: dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.74)',
      btnText: dark ? '#1a1208' : '#ffffff'
    };
  }

  /* ----------------------------- validation ----------------------------- */
  function fieldOk(f, obj, isMedia) {
    const v = obj[f.key];
    switch (f.type) {
      case 'text': case 'textarea': case 'date': case 'time': return !!(v && String(v).trim());
      case 'number': return v !== '' && v != null && Number.isFinite(Number(v));
      case 'choice': return !!v;
      case 'photos': return Array.isArray(v) && v.filter(x => isMedia(x, 'photo')).length >= Math.max(f.min || 0, 1);
      case 'photo': case 'video': case 'audio': return isMedia(v, f.type);
      case 'items': return validItems(f, obj, isMedia) >= f.min;
    }
    return false;
  }
  const validItems = (f, obj, isMedia) =>
    (obj[f.key] || []).filter(it => f.sub.every(s => !s.required || fieldOk(s, it, isMedia))).length;

  function sanitize(fields, data, resolveMedia) {
    const out = {};
    for (const f of fields) {
      const v = data ? data[f.key] : undefined;
      switch (f.type) {
        case 'text': out[f.key] = typeof v === 'string' ? v.slice(0, f.max || 200).trim() : ''; break;
        case 'textarea': out[f.key] = typeof v === 'string' ? v.slice(0, f.max || 5000).trim() : ''; break;
        case 'date': out[f.key] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; break;
        case 'time': out[f.key] = typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : ''; break;
        case 'number': {
          const n = Math.round(Number(v));
          out[f.key] = v !== '' && v != null && Number.isFinite(n) ? Math.min(f.max ?? 1e6, Math.max(f.min ?? 0, n)) : '';
          break;
        }
        case 'choice': out[f.key] = f.options.some(o => o.v === v) ? v : (f.default || f.options[0].v); break;
        case 'photos': out[f.key] = (Array.isArray(v) ? v : []).map(x => resolveMedia(x, 'photo')).filter(Boolean).slice(0, f.max); break;
        case 'photo': case 'video': case 'audio': out[f.key] = resolveMedia(v, f.type); break;
        case 'items': out[f.key] = (Array.isArray(v) ? v : []).slice(0, f.max)
          .map(it => sanitize(f.sub, it || {}, resolveMedia))
          .filter(it => f.sub.every(s => !s.required || (s.type === 'photo' || s.type === 'video' || s.type === 'audio' ? !!it[s.key] : !!String(it[s.key] || '').trim())));
          break;
      }
    }
    return out;
  }

  /* ----------------------------- page renderer ----------------------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const nl = s => esc(s).replace(/\n/g, '<br>');

  const SITE_CSS = `
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{font-family:var(--fb);color:var(--text);background:var(--bg);background-attachment:fixed;min-height:100vh;overflow-x:hidden}
#fx{position:fixed;inset:0;pointer-events:none;z-index:0}
#fx2{position:fixed;inset:0;pointer-events:none;z-index:65}
body:not(.go) #fx{z-index:51}
main{max-width:920px;margin:0 auto;padding:20px 16px 90px;position:relative;z-index:1}
h1,h2{font-family:var(--fh);font-weight:400}
.hero{text-align:center;padding:60px 10px 30px}
.pre{letter-spacing:.28em;text-transform:uppercase;font-size:.78rem;opacity:.85}
.hero h1{font-size:clamp(2.4rem,8.5vw,5.2rem);line-height:1.12;color:var(--accent);margin:.2em 0;text-shadow:0 4px 30px rgba(0,0,0,.08)}
.name{font-size:clamp(2rem,7vw,3.8rem);font-family:var(--fh);background:linear-gradient(90deg,var(--text) 20%,var(--accent) 50%,var(--text) 80%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 5s linear infinite}
@keyframes shine{to{background-position:200% center}}
.sub{font-size:1.15rem;opacity:.88;margin-top:8px}
.w{display:inline-block;opacity:0;transform:translateY(.6em) rotate(5deg)}
.go .w{animation:wordIn .9s cubic-bezier(.2,.9,.25,1.25) forwards;animation-delay:calc(.25s + var(--i)*.12s)}
@keyframes wordIn{to{opacity:1;transform:none}}
.orb{position:relative;width:170px;height:170px;margin:0 auto 22px;display:grid;place-items:center;animation:floaty 5s ease-in-out infinite}
.orb::before{content:'';position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.95),var(--accent) 55%,transparent 72%);opacity:.5;filter:blur(6px);animation:breathe 3.2s ease-in-out infinite}
.orb-e{font-size:5.2rem;position:relative;filter:drop-shadow(0 12px 22px rgba(0,0,0,.28))}
.orb img.orb-e{width:170px;height:170px;border-radius:50%;object-fit:cover;border:5px solid var(--accent)}
.ring{position:absolute;inset:-16px;border:2px dashed rgba(255,255,255,.65);border-radius:50%;animation:spin 18s linear infinite}
.ring.r2{inset:-34px;border-style:dotted;border-color:var(--accent);opacity:.55;animation-duration:30s;animation-direction:reverse}
.orbit{position:absolute;inset:-46px;animation:spin 16s linear infinite}
.orbit span{position:absolute;font-size:1.7rem;animation:spin 16s linear infinite reverse}
.orbit span:nth-child(1){left:50%;top:-14px;margin-left:-.5em}.orbit span:nth-child(2){right:-10px;bottom:18%}.orbit span:nth-child(3){left:-10px;bottom:18%}
@keyframes floaty{50%{transform:translateY(-12px)}}
@keyframes breathe{50%{transform:scale(1.08);opacity:.7}}
@keyframes spin{to{transform:rotate(360deg)}}
.card{background:var(--card);border-radius:26px;padding:32px 26px;margin:30px 0;box-shadow:0 14px 44px rgba(0,0,0,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.18);transition:transform .4s}
.card:hover{transform:translateY(-3px)}
.card h2{color:var(--accent);font-size:2rem;margin-bottom:16px;text-align:center}
.msg{font-size:1.14rem;line-height:1.85;text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.grid img,.grid .ph{width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px}
.grid img,.zoom{cursor:zoom-in;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s}
.grid img:hover{transform:scale(1.05) rotate(-1.5deg);box-shadow:0 14px 30px rgba(0,0,0,.25)}
.reveal .grid>*{opacity:0;transform:scale(.85) translateY(16px)}
.reveal.in .grid>*{animation:popIn .7s cubic-bezier(.2,.9,.3,1.2) forwards;animation-delay:calc(var(--i)*70ms)}
@keyframes popIn{to{opacity:1;transform:none}}
video{width:100%;border-radius:18px;background:#000;display:block}
audio{width:100%;margin-top:14px}
.wave{display:flex;gap:4px;justify-content:center;align-items:center;height:64px}
.wave i{width:6px;height:18%;background:var(--accent);border-radius:3px;opacity:.85}
.playing .wave i{animation:bar .7s ease-in-out infinite alternate}
@keyframes bar{from{height:12%}to{height:100%}}
.mini .wave{height:34px;justify-content:flex-start}.mini .wave i{width:4px}
.ph{display:grid;place-items:center;text-align:center;padding:12px;min-height:150px;border-radius:14px;opacity:.85;background:repeating-linear-gradient(45deg,rgba(128,128,128,.14) 0 12px,rgba(128,128,128,.24) 12px 24px)}
.finale{text-align:center}
.cake,.big{font-size:6.5rem;display:inline-block;line-height:1;transition:transform .4s}
.big{animation:floaty 3s ease-in-out infinite}
.big.pop{animation:pop .7s ease}
@keyframes pop{30%{transform:scale(1.35) rotate(-8deg)}60%{transform:scale(.9) rotate(6deg)}}
.candles{display:flex;gap:20px;justify-content:center;margin-bottom:-18px;position:relative;z-index:1}
.candle{width:10px;height:40px;border-radius:3px;position:relative;background:repeating-linear-gradient(45deg,#fff 0 6px,var(--accent) 6px 12px)}
.candle::before{content:'';position:absolute;left:50%;top:-20px;width:14px;height:20px;margin-left:-7px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 50% 70%,#fff8b0,#ffb300 55%,rgba(255,120,0,0) 72%);animation:flick .12s infinite alternate}
@keyframes flick{to{transform:scale(.9,1.08) translateY(-1px)}}
.out .candle::before{display:none}
.btn{font:inherit;background:var(--accent);color:var(--btntext);border:0;padding:14px 30px;border-radius:999px;font-size:1.05rem;cursor:pointer;margin-top:20px;box-shadow:0 10px 26px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 14px 32px rgba(0,0,0,.3)}
.btn:active{transform:scale(.97)}
.sign{margin-top:26px;font-family:var(--fh);font-size:1.7rem}
.gate{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:var(--bg);text-align:center;padding:24px;transition:opacity .9s ease,visibility .9s}
.gate h2{font-family:var(--fh);font-size:clamp(1.6rem,5vw,2.6rem);color:var(--accent);max-width:640px;position:relative;z-index:52}
.gate .btn{position:relative;z-index:52}
.gate.open{opacity:0;visibility:hidden}
.gbox{position:relative;width:150px;height:140px;cursor:pointer;animation:hop 2.4s ease-in-out infinite;z-index:52;outline:none}
.gbox .box{position:absolute;bottom:0;left:12px;width:126px;height:92px;border-radius:12px;background:linear-gradient(90deg,transparent 43%,var(--accent2) 43% 57%,transparent 57%),var(--accent);box-shadow:0 20px 40px rgba(0,0,0,.28)}
.gbox .lid{position:absolute;top:22px;left:0;width:150px;height:32px;border-radius:10px;background:linear-gradient(90deg,transparent 43%,var(--accent2) 43% 57%,transparent 57%),var(--accent);filter:brightness(1.12);box-shadow:0 6px 14px rgba(0,0,0,.2);transition:transform .9s cubic-bezier(.3,-.5,.3,1.4),opacity .9s;z-index:2}
.gbox .bow{position:absolute;left:50%;top:-26px;width:64px;height:30px;margin-left:-32px}
.gbox .bow::before,.gbox .bow::after{content:'';position:absolute;top:0;width:26px;height:24px;border:7px solid var(--accent2);border-radius:50% 50% 0 50%}
.gbox .bow::before{left:0;transform:rotate(-15deg)}.gbox .bow::after{right:0;transform:scaleX(-1) rotate(-15deg)}
.gbox:focus-visible{outline:3px dashed var(--accent);outline-offset:10px;border-radius:12px}
.gate.opening .lid{transform:translate(50px,-170px) rotate(40deg);opacity:0}
.gate.opening .gbox{animation:shake .5s ease}
@keyframes hop{0%,70%,100%{transform:translateY(0)}78%{transform:translateY(-16px) rotate(-4deg)}88%{transform:translateY(0) rotate(4deg)}94%{transform:rotate(-2deg)}}
@keyframes shake{25%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}75%{transform:rotate(-3deg)}}
.lb{position:fixed;inset:0;background:rgba(0,0,0,.9);display:grid;place-items:center;z-index:60;cursor:zoom-out;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
.lb.on{opacity:1;visibility:visible}.lb img{max-width:92vw;max-height:88vh;border-radius:14px;transform:scale(.92);transition:transform .35s cubic-bezier(.2,.9,.3,1.2)}.lb.on img{transform:none}
.conf{position:fixed;top:-20px;width:10px;height:14px;z-index:70;pointer-events:none;animation:fall linear forwards}
.conf.e{width:auto;height:auto;font-size:1.6rem;background:none!important}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg)}}
.reveal{opacity:0;transform:translateY(40px) scale(.98);transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}.reveal.in{opacity:1;transform:none}
.made{text-align:center;font-size:.8rem;opacity:.65;margin-top:30px}.made a{color:inherit}
.timeline{display:flex;flex-direction:column;gap:50px;margin:30px 0;position:relative}
.timeline::before{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:3px dashed var(--accent);opacity:.3}
.moment{display:flex;gap:30px;align-items:center;position:relative}
.moment:nth-child(even){flex-direction:row-reverse}
.pol{background:#fff;padding:14px 14px 18px;box-shadow:0 16px 34px rgba(0,0,0,.22);width:min(340px,90%);transform:rotate(-3deg);color:#333;flex:none;transition:transform .4s}
.pol:hover{transform:rotate(0) scale(1.03)}
.moment:nth-child(even) .pol{transform:rotate(3deg)}
.pol img,.pol .ph{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:2px}
.pol figcaption{font-family:'Caveat',cursive;font-size:1.6rem;text-align:center;margin-top:8px}
.mtext{flex:1;font-size:1.15rem;line-height:1.8;background:var(--card);padding:20px;border-radius:18px;backdrop-filter:blur(8px)}
@media(max-width:640px){.moment,.moment:nth-child(even){flex-direction:column}.timeline::before{display:none}}
.marquee{display:inline-block;border:3px solid var(--accent);padding:6px 22px;letter-spacing:.4em;color:var(--accent);font-family:var(--fh);font-size:1.4rem;animation:neon 1.8s ease-in-out infinite alternate}
@keyframes neon{from{box-shadow:0 0 10px var(--accent),inset 0 0 6px var(--accent)}to{box-shadow:0 0 34px var(--accent),inset 0 0 16px var(--accent)}}
.t-cinema .hero h1{font-size:clamp(3.4rem,14vw,8rem);color:#fff;letter-spacing:.04em;text-shadow:0 0 34px var(--accent)}
.t-cinema::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,.65));pointer-events:none;z-index:0}
.film{background:#000;padding:18px 10px;border-top:12px dotted #3a3a3a;border-bottom:12px dotted #3a3a3a;border-radius:6px}
.film img{border-radius:4px}
.roll{margin-top:22px;text-align:center;letter-spacing:.12em;text-transform:uppercase;font-size:.9rem;line-height:2.2;opacity:.85}
.t-memories::before{content:'';position:fixed;inset:0;background:radial-gradient(rgba(0,0,0,.05) 1px,transparent 1px) 0 0/14px 14px;pointer-events:none;z-index:0}
.t-voice .hero h1{color:#fff}
.cover-wide{width:100%;max-height:480px;object-fit:cover;border-radius:26px;box-shadow:0 24px 60px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.25);animation:kenburns 18s ease-in-out infinite alternate}
@keyframes kenburns{to{transform:scale(1.04)}}
.ph.cover-wide{min-height:320px}
.wishes{columns:2 260px;column-gap:16px}
.wish{break-inside:avoid;margin-bottom:16px;border:1px solid rgba(255,255,255,.22);padding:20px;border-radius:18px;background:rgba(255,255,255,.05);transition:transform .3s,border-color .3s}
.wish:hover{transform:translateY(-3px);border-color:var(--accent)}
.wish p{font-size:1.08rem;line-height:1.7;font-style:italic}
.wish b{display:block;margin-top:10px;color:var(--accent);font-weight:500}
.t-party{--fh:'Pacifico',cursive;--fb:'Poppins',sans-serif}
.t-memories{--fh:'Caveat',cursive;--fb:'Lora',serif}
.t-cinema{--fh:'Bebas Neue',sans-serif;--fb:'Poppins',sans-serif}
.t-voice{--fh:'Playfair Display',serif;--fb:'Poppins',sans-serif}
.t-elegant{--fh:'Great Vibes',cursive;--fb:'Lora',serif}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.w,.reveal,.reveal .grid>*{opacity:1;transform:none}}
`;

  // Animated canvas background + bursts + confetti. Exposes window.WCFX. Serialised with toString(), keep self-contained.
  function fxEngine() {
    const $ = s => document.querySelector(s);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const R = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
    const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

    /* ---- animated background (canvas) ---- */
    const cv = $('#fx'), cv2 = $('#fx2'), g = cv.getContext('2d'), g2 = cv2.getContext('2d');
    const cfg = JSON.parse(document.body.dataset.fx || '[]');
    // Optional theme palette for confetti and fireworks (e.g. all-gold for Champagne Gold).
    const PAL = document.body.dataset.conf ? JSON.parse(document.body.dataset.conf) : null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    function size() {
      W = innerWidth; H = innerHeight;
      for (const [c, x] of [[cv, g], [cv2, g2]]) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    }
    size(); addEventListener('resize', size);
    const density = Math.max(.45, Math.min(1, W / 1100));
    function make(L, init) {
      const p = { L, x: R(0, W), y: 0, s: R(.65, 1.3), ph: R(0, 6.3), a: R(0, 6.3), va: R(-.03, .03),
        c: pick(L.colors || ['#ffffff']), e: L.emoji ? pick(L.emoji) : null };
      if (L.type === 'rise') { p.y = init ? R(0, H) : H + R(30, 140); p.vy = -R(.35, .95); }
      else if (L.type === 'fall') { p.y = init ? R(0, H) : -R(30, 140); p.vy = R(.5, 1.4) * (L.shape === 'snow' ? .7 : 1); }
      else if (L.type === 'drift') { p.x = init ? R(0, W) : -80; p.y = R(H * .08, H * .8); p.vx = R(.6, 1.3); p.vy = R(-.15, .05); }
      else if (L.type === 'bokeh') { p.y = R(0, H); p.r = R(24, 80); p.vx = R(-.18, .18); p.vy = R(-.14, .14); }
      else if (L.type === 'twinkle') { p.y = R(0, H * .9); p.r = R(.6, 1.9); }
      else if (L.type === 'sparkle') { p.y = R(0, H); p.r = R(3, 7); }
      return p;
    }
    const parts = [];
    for (const L of cfg) if (L.type !== 'fireworks') for (let i = 0, n = Math.round((L.count || 20) * density); i < n; i++) parts.push(make(L, true));
    const fw = cfg.find(L => L.type === 'fireworks');
    const sparksBack = [], sparksFront = [], rockets = [];
    function explode(list, x, y, colors, n) {
      const cs = colors || PAL || (fw && fw.colors) || ['#ffd23f', '#ff4f9a', '#3ec1ff', '#7cff6b', '#b06bff'];
      const c = pick(cs);
      for (let i = 0; i < n; i++) { const ang = Math.PI * 2 * i / n + R(-.05, .05), sp = R(1.4, 5); list.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, c: Math.random() < .3 ? pick(cs) : c }); }
    }
    const burst = (x, y) => explode(sparksFront, x, y, null, 80);
    function shape(ctx, p, t) {
      const L = p.L, s = p.s * (L.size || 1);
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.e) { ctx.rotate(Math.sin(t / 900 + p.ph) * .25); ctx.globalAlpha = .9; ctx.font = (28 * s) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText(p.e, 0, 0); }
      else if (L.shape === 'balloon') {
        ctx.rotate(Math.sin(t / 1000 + p.ph) * .12); ctx.globalAlpha = .88;
        ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 23 * s); ctx.quadraticCurveTo(7 * s, 42 * s, 0, 62 * s); ctx.stroke();
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 23 * s, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3 * s, 22 * s); ctx.lineTo(3 * s, 22 * s); ctx.lineTo(0, 27 * s); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-6 * s, -8 * s, 4 * s, 7 * s, -.5, 0, 7); ctx.fill();
      } else if (L.shape === 'heart') {
        const k = 13 * s; ctx.rotate(Math.sin(t / 800 + p.ph) * .3); ctx.globalAlpha = .82; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.moveTo(0, -k * .3); ctx.bezierCurveTo(-k * .5, -k, -k * 1.25, -k * .25, 0, k * .8);
        ctx.bezierCurveTo(k * 1.25, -k * .25, k * .5, -k, 0, -k * .3); ctx.fill();
      } else if (L.shape === 'petal') {
        ctx.rotate(p.a); ctx.globalAlpha = .88; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.ellipse(0, 0, 10 * s, 5 * s * Math.abs(Math.cos(t / 500 + p.ph)) + 1.2, 0, 0, 7); ctx.fill();
      } else if (L.shape === 'glow') {
        // Soft rising light, like out-of-focus candlelight.
        const r = 9 * s + 3, gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        gr.addColorStop(0, 'rgba(255,240,200,.95)'); gr.addColorStop(.4, hexA(p.c, .45)); gr.addColorStop(1, hexA(p.c, 0));
        ctx.globalAlpha = .55 + .45 * Math.abs(Math.sin(t / 1400 + p.ph)); ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      } else if (L.shape === 'snow') {
        ctx.globalAlpha = .9; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(0, 0, 2.4 * s + .8, 0, 7); ctx.fill();
      } else if (L.shape === 'bubble') {
        ctx.globalAlpha = .7; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 14 * s, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-5 * s, -5 * s, 3 * s, 0, 7); ctx.fill();
      } else if (L.shape === 'confetti') {
        ctx.rotate(p.a); ctx.scale(1, Math.cos(t / 300 + p.ph)); ctx.globalAlpha = .9; ctx.fillStyle = p.c; ctx.fillRect(-4 * s, -6 * s, 8 * s, 12 * s);
      }
      ctx.restore();
    }
    function drawSparks(ctx, list) {
      for (let i = list.length - 1; i >= 0; i--) {
        const s = list[i]; s.x += s.vx; s.y += s.vy; s.vy += .045; s.vx *= .985; s.vy *= .985; s.life -= .011;
        if (s.life <= 0) { list.splice(i, 1); continue; }
        ctx.globalAlpha = s.life; ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, 2.3, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    let raf, nextRocket = 0;
    function frame(t) {
      g.clearRect(0, 0, W, H); g2.clearRect(0, 0, W, H);
      for (const p of parts) {
        const L = p.L;
        if (L.type === 'rise' || L.type === 'fall') {
          p.y += p.vy; p.x += Math.sin(t / 1200 + p.ph) * .5; p.a += p.va;
          if ((L.type === 'rise' && p.y < -90) || (L.type === 'fall' && p.y > H + 90)) Object.assign(p, make(L, false));
          shape(g, p, t);
        } else if (L.type === 'drift') {
          p.x += p.vx; p.y += p.vy + Math.sin(t / 900 + p.ph) * .3;
          if (p.x > W + 90) Object.assign(p, make(L, false));
          shape(g, p, t);
        } else if (L.type === 'bokeh') {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -100) p.x = W + 100; if (p.x > W + 100) p.x = -100; if (p.y < -100) p.y = H + 100; if (p.y > H + 100) p.y = -100;
          const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          gr.addColorStop(0, hexA(p.c, .28)); gr.addColorStop(1, hexA(p.c, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
        } else if (L.type === 'twinkle') {
          g.globalAlpha = .3 + .7 * Math.abs(Math.sin(t / 700 + p.ph)); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); g.globalAlpha = 1;
        } else if (L.type === 'sparkle') {
          const k = Math.sin(t / 650 + p.ph);
          if (k < -.97) { p.x = R(0, W); p.y = R(0, H); }
          const r = p.r * Math.max(0, k);
          if (r > .2) {
            g.globalAlpha = .9; g.fillStyle = p.c; g.beginPath();
            g.moveTo(p.x, p.y - r * 2); g.quadraticCurveTo(p.x, p.y, p.x + r * 2, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2);
            g.quadraticCurveTo(p.x, p.y, p.x - r * 2, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2); g.fill(); g.globalAlpha = 1;
          }
        }
      }
      if (fw) {
        if (t > nextRocket) { nextRocket = t + R(700, 1500); rockets.push({ x: R(W * .12, W * .88), y: H + 10, vy: -R(7.5, 10.5), ty: R(H * .1, H * .45) }); }
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i]; r.y += r.vy; r.vy *= .986;
          g.fillStyle = 'rgba(255,236,190,.95)'; g.fillRect(r.x - 1, r.y, 2, 9);
          if (r.y <= r.ty || r.vy > -1.6) { explode(sparksBack, r.x, r.y, fw.colors, 64); rockets.splice(i, 1); }
        }
      }
      drawSparks(g, sparksBack); drawSparks(g2, sparksFront);
      if (!reduce || sparksFront.length) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });
    const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };

    /* ---- confetti (DOM) ---- */
    function confetti(n, emoji) {
      if (reduce) return;
      const c = PAL || ['#ff4f9a', '#ffd23f', '#3ec1ff', '#7cff6b', '#b06bff', '#ff8a3d'];
      for (let i = 0; i < n; i++) {
        const e = document.createElement('i'); e.className = 'conf';
        if (emoji && i % 4 === 0) { e.className += ' e'; e.textContent = emoji; }
        Object.assign(e.style, { left: Math.random() * 100 + 'vw', background: c[i % c.length], animationDuration: 2.4 + Math.random() * 2.6 + 's', animationDelay: Math.random() * .7 + 's' });
        document.body.appendChild(e); setTimeout(() => e.remove(), 6500);
      }
    }
    window.WCFX = { burst, kick, confetti };
  }

  // Interactions for the classic layouts. Needs fxEngine() to have run first.
  function siteRuntime() {
    const $ = s => document.querySelector(s);
    const { burst, kick, confetti } = window.WCFX;
    const W = innerWidth, H = innerHeight;

    /* ---- gift box gate ---- */
    const gate = $('#gate');
    function openGift() {
      if (gate.classList.contains('opening')) return;
      gate.classList.add('opening');
      const b = $('#gbox').getBoundingClientRect();
      burst(b.left + b.width / 2, b.top + 20); kick();
      setTimeout(() => { burst(W * .25, H * .35); burst(W * .75, H * .3); }, 250);
      setTimeout(() => { gate.classList.add('open'); document.body.classList.add('go'); confetti(110); }, 700);
    }
    $('#openGift').onclick = openGift;
    $('#gbox').onclick = openGift;
    $('#gbox').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); } };

    /* ---- lightbox, audio, finale, scroll reveal ---- */
    document.querySelectorAll('.grid img, img.zoom').forEach(im => im.onclick = () => { $('#lb img').src = im.src; $('#lb').classList.add('on'); });
    $('#lb').onclick = () => $('#lb').classList.remove('on');
    document.querySelectorAll('.voice audio').forEach(a => {
      const card = a.closest('.voice');
      a.onplay = () => card.classList.add('playing');
      a.onpause = a.onended = () => card.classList.remove('playing');
    });
    const w = $('#wish');
    w.onclick = () => {
      const cake = $('.cake'), big = $('.big');
      if (cake) cake.classList.add('out');
      if (big) { big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); }
      const r = w.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top - 60); setTimeout(() => burst(r.left - 40, r.top - 140), 200); setTimeout(() => burst(r.right + 40, r.top - 140), 400); kick();
      w.textContent = w.dataset.done; confetti(180, w.dataset.emoji);
    };
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  /*
   * Renders a full celebration page.
   * src(v) turns a stored media value into a URL (blob: URL in the preview, /m/... on the server); null if absent.
   * opts.nonce adds a CSP nonce to the inline script; opts.homeUrl adds a "made with" footer link.
   */
  function render(tpl, occ, d, src, opts = {}) {
    if (tpl.id === Surprise.template.id) return Surprise.render(tpl, occ, d, src, opts, { esc, nl, fxEngine });
    if (tpl.id === Story.template.id) return Story.render(tpl, occ, d, src, opts, { esc, nl });
    const P = palette(occ, tpl);
    const to = esc(d.to || 'You'), from = esc(d.from || 'Someone special');
    const S = v => (v ? src(v) : null);
    const img = (b, cls = '', ph = '📷 Photo') => S(b) ? `<img class="${cls}" src="${esc(S(b))}" alt="">` : `<div class="ph ${cls}">${ph}</div>`;
    const grid = (arr, cls = 'grid') => `<div class="${cls}">${(arr && arr.length ? arr : [null, null, null]).map((b, i) =>
      S(b) ? `<img src="${esc(S(b))}" alt="" style="--i:${i}">` : `<div class="ph" style="--i:${i}">📷</div>`).join('')}</div>`;
    const wave = n => `<div class="wave">${Array.from({ length: n }, (_, i) => `<i style="animation-delay:${((i * 37) % 9) / 10}s"></i>`).join('')}</div>`;
    const voice = (b, title, req) => S(b)
      ? `<section class="card voice reveal"><h2>${title}</h2>${wave(28)}<audio controls preload="metadata" src="${esc(S(b))}"></audio></section>`
      : req ? `<section class="card reveal"><h2>${title}</h2><div class="ph">🎤 Voice note goes here</div></section>` : '';
    const video = (b, title, req) => S(b)
      ? `<section class="card reveal"><h2>${title}</h2><video controls playsinline preload="metadata" src="${esc(S(b))}"></video></section>`
      : req ? `<section class="card reveal"><h2>${title}</h2><div class="ph" style="aspect-ratio:16/9">🎬 Video goes here</div></section>` : '';
    const gallery = (arr, title, req, cls) => (arr && arr.length) || req ? `<section class="card reveal"><h2>${title}</h2>${grid(arr, cls)}</section>` : '';
    const date = d.date ? esc(new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })) : '';
    const text = (v, ph) => v && String(v).trim() ? nl(v) : `<span style="opacity:.6">${ph}</span>`;
    const words = s => esc(s).split(/\s+/).filter(Boolean).map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
    const head = esc(occ.headline);
    const orb = (inner = `<span class="orb-e">${occ.emoji}</span>`) =>
      `<div class="orb" aria-hidden="true"><i class="ring"></i><i class="ring r2"></i>${inner}<div class="orbit">${occ.orbit.map(e => `<span>${e}</span>`).join('')}</div></div>`;

    let body = '';
    if (tpl.id === 'party') body = `
      <header class="hero">${orb()}<p class="pre">${date ? date + ' · ' : ''}${esc(occ.pre)}</p><h1>${words(d.headline || occ.headline)}</h1><div class="name">${to}</div></header>
      <section class="card reveal"><h2>A little note for you</h2><p class="msg">${text(d.message, 'Your message goes here')}</p></section>
      ${gallery(d.photos, 'Favourite moments', true)}
      ${voice(d.voice, 'Press play 🎧')}
      ${video(d.video, 'A video just for you')}`;
    if (tpl.id === 'memories') body = `
      <header class="hero">${orb()}<p class="pre">Memory Lane${date ? ' · ' + date : ''}</p><h1>${words(occ.headline + ',')}</h1><div class="name">${to}</div><p class="sub">${esc(d.intro || 'Every picture tells our story')}</p></header>
      <div class="timeline">${(d.moments && d.moments.length ? d.moments : [{}, {}, {}]).map(m => `
        <div class="moment reveal"><figure class="pol">${img(m.photo, 'zoom', '📷 Memory photo')}<figcaption>${esc(m.title || '')}</figcaption></figure>
        ${m.caption ? `<div class="mtext">${nl(m.caption)}</div>` : '<div style="flex:1"></div>'}</div>`).join('')}</div>
      <section class="card reveal"><h2>Dear ${to},</h2><p class="msg">${text(d.letter, 'Your letter goes here')}</p></section>
      ${voice(d.voice, 'Hear it from me')}`;
    if (tpl.id === 'cinema') body = `
      <header class="hero"><div class="marquee">Now Showing</div><h1>${words(d.to || 'You')}</h1><p class="sub">${esc(d.tagline || occ.headline)} ${occ.emoji}</p><p class="pre" style="margin-top:14px">A ${from} production${date ? ' · Premieres ' + date : ''}</p></header>
      ${video(d.video, 'Feature presentation 🎬', true)}
      ${gallery(d.photos, 'Behind the scenes', true, 'grid film')}
      <section class="card reveal"><h2>End credits</h2><p class="msg">${text(d.message, 'Your message goes here')}</p>
        <p class="roll">${head}<br>Starring <b>${to}</b><br>Directed with love by <b>${from}</b></p></section>`;
    if (tpl.id === 'voice') body = `
      <header class="hero">${orb(S(d.cover) ? `<img class="orb-e zoom" src="${esc(S(d.cover))}" alt="">` : `<span class="orb-e">${occ.emoji}</span>`)}<p class="pre">${head} · a voice letter for</p><h1>${words(d.to || 'You')}</h1><p class="sub">Put on your headphones 🎧</p></header>
      ${voice(d.voice, `Hit play, ${to}`, true)}
      ${d.letter && String(d.letter).trim() ? `<section class="card reveal"><h2>In case you want to read it too</h2><p class="msg">${nl(d.letter)}</p></section>` : ''}
      ${gallery(d.photos, 'Moments', false)}`;
    if (tpl.id === 'elegant') body = `
      <header class="hero">${img(d.cover, 'cover-wide zoom', '🖼️ Cover photo')}<p class="pre" style="margin-top:34px">${date || esc(occ.pre)}</p><h1>${words(occ.headline)}</h1><div class="name">${to}</div></header>
      <section class="card reveal"><h2>To ${to}</h2><p class="msg">${text(d.message, 'Your message goes here')}</p></section>
      <section class="card reveal"><h2>Wishes from your people</h2><div class="wishes">${(d.wishes && d.wishes.length ? d.wishes : [{}]).map(w => `
        <div class="wish"><p>“${nl(w.text || '…')}”</p><b>— ${esc(w.name || 'Name')}</b>
        ${S(w.voice) ? `<div class="voice mini">${wave(16)}<audio controls preload="metadata" src="${esc(S(w.voice))}"></audio></div>` : ''}</div>`).join('')}</div></section>
      ${gallery(d.photos, 'Moments', false)}`;

    const fin = occ.finale, finTitle = esc(fin.title).replace('{to}', to);
    const finVisual = fin.type === 'cake'
      ? `<div class="cake"><div class="candles"><span class="candle"></span><span class="candle"></span><span class="candle"></span></div>🎂</div>`
      : `<div class="big">${fin.icon}</div>`;
    const finale = `<section class="card finale reveal"><h2>${finTitle}</h2>${finVisual}<br>
      <button class="btn" id="wish" data-done="${esc(fin.done)}" data-emoji="${esc(fin.icon || occ.emoji)}">${esc(fin.btn)}</button><p class="sign">With love, ${from}</p></section>`;
    const nonce = opts.nonce ? ` nonce="${esc(opts.nonce)}"` : '';
    const made = opts.homeUrl ? `<p class="made">Made with <a href="${esc(opts.homeUrl)}">WishCraft</a></p>` : '';
    const vars = `--bg:${P.bg};--card:${P.card};--text:${P.text};--accent:${P.accent};--accent2:${P.accent2};--btntext:${P.btnText}`;

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="${esc(P.accent)}"><title>${head}, ${to}</title>
<meta property="og:title" content="${head}, ${to} ${occ.emoji}"><meta property="og:description" content="${from} made something special for you">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500&family=Pacifico&family=Caveat:wght@500&family=Lora:ital@0;1&family=Bebas+Neue&family=Playfair+Display&family=Great+Vibes&display=swap" rel="stylesheet">
<style>${SITE_CSS}</style></head>
<body class="t-${tpl.id} o-${occ.id}${P.dark ? ' dark' : ''}" style="${esc(vars)}" data-fx="${esc(JSON.stringify(occ.fx))}">
<canvas id="fx" aria-hidden="true"></canvas><canvas id="fx2" aria-hidden="true"></canvas>
<div class="gate" id="gate">
  <div class="gbox" id="gbox" role="button" tabindex="0" aria-label="Open your surprise"><div class="lid"><i class="bow"></i></div><div class="box"></div></div>
  <h2>${to}, someone made something special for you ${occ.emoji}</h2>
  <button class="btn" id="openGift">Open your surprise</button>
</div>
<main>${body}${finale}${made}</main>
<div class="lb" id="lb"><img alt="Enlarged photo"></div>
<script${nonce}>(${fxEngine.toString()})();(${siteRuntime.toString()})();<\/script>
</body></html>`;
  }

  return { OCCASIONS, TEMPLATES, THEMES: Surprise.THEMES, ACTIVE, isActive, occasion, template, templatesFor, commonFields, allFields, palette, fieldOk, validItems, sanitize, render, esc };
});
