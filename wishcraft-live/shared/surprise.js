/*
 * "Birthday Surprise": one all-in-one birthday page. Every section is optional and only
 * appears when the creator fills it in. Six themes share the same format.
 *
 * Sections (original WishCraft designs):
 *   countdown lock · scratch-card reveal · hero · tap-to-light cake + hold-to-blow ·
 *   unrolling scroll letter · swipeable photo stack · pop-the-balloon reasons ·
 *   fortune-cookie wishes · birthday quiz · cassette voice note · vintage TV video ·
 *   "send your wish to the stars" finale · generated music-box tune
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Surprise = api;
})(typeof self !== 'undefined' ? self : this, function () {

  /* ----------------------------- themes (same format, different look) ----------------------------- */
  const THEMES = [
    { id:'champagne', name:'Champagne Gold', dark:true, tagline:'Midnight plum, champagne gold and soft glowing lights.', icons:['✨','🥂','🌙'],
      bg:'radial-gradient(circle at 18% 12%,rgba(150,55,105,.5),transparent 45%),radial-gradient(circle at 85% 88%,rgba(212,175,106,.26),transparent 45%),radial-gradient(circle at 60% 55%,rgba(70,85,170,.3),transparent 40%),linear-gradient(160deg,#170b19 0%,#1d1020 50%,#0c0913 100%)',
      text:'#f6efe6', accent:'#d4af6a', accent2:'#b8893b',
      card:'rgba(255,255,255,.05)', solid:'#1d1020', btn:'#1c1117', fh:"'Cormorant Garamond',Georgia,serif", fb:"'Jost',sans-serif",
      cake:['#ecc9cc','#f4e4d4','#fbf4ea'], icing:'#fbf4ea', conf:['#f6e7b8','#d4af6a','#b8893b','#fff4d6','#e6c48a'],
      fx:[{ type:'rise', shape:'glow', count:18, colors:['#d4af6a','#f3dfa2','#e6a8b8'] },
          { type:'twinkle', count:45, colors:['#f3dfa2','#ffffff'] },
          { type:'sparkle', count:10, colors:['#f3dfa2'] }] },
    { id:'candy', name:'Candy Pop', dark:false, tagline:'Sweet, bubbly and full of balloons.', icons:['🎈','🍬','🎉'],
      bg:'linear-gradient(160deg,#ffd6ec 0%,#e7d4ff 55%,#cde8ff 100%)', text:'#3b2352', accent:'#e2368a', accent2:'#7c4dff',
      card:'rgba(255,255,255,.72)', solid:'#ffffff', btn:'#ffffff', fh:"'Pacifico',cursive", fb:"'Poppins',sans-serif",
      cake:['#ffb3d1','#fff0f6','#d0b8ff'], icing:'#ffffff',
      fx:[{ type:'rise', shape:'balloon', count:12, colors:['#ff5fa2','#ffd23f','#7c5cff','#3ec1ff'] },
          { type:'fall', shape:'confetti', count:26, colors:['#ff5fa2','#ffd23f','#7c5cff','#3ec1ff'] }] },
    { id:'midnight', name:'Midnight Gold', dark:true, tagline:'Starry night, gold glow and fireworks.', icons:['⭐','✨','🌙'],
      bg:'radial-gradient(ellipse at 50% 0%,#2a2f6b 0%,#0d1030 55%,#05061a 100%)', text:'#f7f1de', accent:'#f2c14e', accent2:'#ff7ac6',
      card:'rgba(255,255,255,.07)', solid:'#14173d', btn:'#1a1406', fh:"'Playfair Display',serif", fb:"'Poppins',sans-serif",
      cake:['#2b2f63','#3d4385','#f2c14e'], icing:'#f7e7b4',
      fx:[{ type:'twinkle', count:90, colors:['#fff7d6','#ffffff'] }, { type:'sparkle', count:16, colors:['#f2c14e'] },
          { type:'fireworks', colors:['#f2c14e','#ff7ac6','#8be9fd','#ffffff'] }] },
    { id:'ocean', name:'Ocean Breeze', dark:false, tagline:'Breezy blues, bubbles and beach vibes.', icons:['🫧','🐚','🌊'],
      bg:'linear-gradient(180deg,#e3fbff 0%,#a8e9f4 55%,#6fcbe3 100%)', text:'#073b4c', accent:'#0a8fa3', accent2:'#ff7f5c',
      card:'rgba(255,255,255,.7)', solid:'#ffffff', btn:'#ffffff', fh:"'Fredoka',sans-serif", fb:"'Poppins',sans-serif",
      cake:['#7fd1e8','#e6fbff','#ffb4a2'], icing:'#ffffff',
      fx:[{ type:'rise', shape:'bubble', count:30, colors:['#ffffff','#bdf3ff','#ffb4a2'] }, { type:'bokeh', count:12, colors:['#ffffff','#bdf3ff'] }] },
    { id:'sunset', name:'Retro Sunset', dark:true, tagline:'80s sunset with a warm neon glow.', icons:['🌅','🕶️','✨'],
      bg:'linear-gradient(180deg,#2b1055 0%,#7a2c8f 45%,#e8546f 80%,#ffb85c 100%)', text:'#fff4e6', accent:'#ffc65c', accent2:'#ff4f8b',
      card:'rgba(255,255,255,.1)', solid:'#3a1560', btn:'#2b1055', fh:"'Righteous',sans-serif", fb:"'Poppins',sans-serif",
      cake:['#ff4f8b','#ffc65c','#7a2c8f'], icing:'#fff4e6',
      fx:[{ type:'bokeh', count:16, colors:['#ffc65c','#ff4f8b'] }, { type:'fall', shape:'confetti', count:24, colors:['#ffc65c','#ff4f8b','#7ae7ff'] }] },
    { id:'garden', name:'Garden Party', dark:false, tagline:'Fresh petals, butterflies and bunting.', icons:['🌸','🦋','🌼'],
      bg:'linear-gradient(160deg,#f3ffe9 0%,#d8f5d8 50%,#fde6ef 100%)', text:'#24402a', accent:'#2f9e44', accent2:'#e64980',
      card:'rgba(255,255,255,.72)', solid:'#ffffff', btn:'#ffffff', fh:"'Caveat',cursive", fb:"'Poppins',sans-serif",
      cake:['#b2f2bb','#fff9db','#fcc2d7'], icing:'#ffffff',
      fx:[{ type:'fall', shape:'petal', count:30, colors:['#ffc9de','#ffffff','#ffe066','#b2f2bb'] }, { type:'drift', emoji:['🦋','🐝'], count:5, size:.9 }] },
    { id:'neon', name:'Neon Night', dark:true, tagline:'Glowing neon lights for a night out.', icons:['⚡','💜','✨'],
      bg:'radial-gradient(circle at 50% 25%,#2a0845 0%,#140024 60%,#06000f 100%)', text:'#f3e8ff', accent:'#22e5ff', accent2:'#ff3ec8',
      card:'rgba(255,255,255,.06)', solid:'#1b0633', btn:'#06000f', fh:"'Audiowide',sans-serif", fb:"'Poppins',sans-serif",
      cake:['#3a0f63','#ff3ec8','#22e5ff'], icing:'#f3e8ff',
      fx:[{ type:'twinkle', count:50, colors:['#22e5ff','#ff3ec8','#ffffff'] }, { type:'fall', shape:'confetti', count:22, colors:['#22e5ff','#ff3ec8','#b6ff3b'] }] }
  ];

  const MUSIC = [
    { v:'musicbox', label:'🎶 Music box (Happy Birthday)' },
    { v:'chimes', label:'✨ Dreamy chimes' },
    { v:'none', label:'🔇 No music' }
  ];

  const template = {
    id:'surprise', name:'Birthday Surprise', icon:'🎁', only:true, countdown:true, themes:THEMES,
    tagline:'One page with everything. Skip any section you don\'t need.',
    fields:[
      { key:'theme', label:'Theme', type:'choice', swatches:true, default:'champagne',
        options: THEMES.map(t => ({ v:t.id, label:t.name, bg:t.bg, accent:t.accent })) },
      { key:'age', label:'Turning', type:'number', min:1, max:120, placeholder:'e.g. 25', hint:'Shows a big glowing number and sets the candles on the cake' },
      { key:'headline', label:'Headline', type:'text', placeholder:'Happy Birthday', max:80, ai:'title' },
      { key:'letter', label:'Your letter', type:'textarea', max:3000, ai:'message', placeholder:'Write from the heart…', hint:'Unrolls like a scroll and types itself out' },
      { key:'moments', label:'Photos', type:'items', min:0, max:20, itemLabel:'Photo', itemPlural:'photos',
        hint:'They swipe through these like a stack of prints. Captions are optional.',
        sub:[ { key:'photo', label:'Photo', type:'photo', required:true },
              { key:'caption', label:'Caption', type:'text', max:140, placeholder:'Goa, 2022', ai:'line' } ] },
      { key:'reasons', label:"Reasons they're amazing", type:'items', min:0, max:12, itemLabel:'Reason',
        hint:'Each reason hides inside a balloon they pop',
        sub:[ { key:'text', label:'Reason', type:'text', required:true, max:140, placeholder:'You laugh at my worst jokes', ai:'line' } ] },
      { key:'wishes', label:'Wishes from friends & family', type:'items', min:0, max:20, itemLabel:'Wish', itemPlural:'wishes',
        hint:'Each wish sits inside a fortune cookie they crack open',
        sub:[ { key:'name', label:'Name', type:'text', required:true, max:80 },
              { key:'text', label:'Wish', type:'textarea', required:true, max:600, ai:'caption' },
              { key:'voice', label:'Voice wish', type:'audio' } ] },
      { key:'quiz', label:'Birthday quiz', type:'items', min:0, max:6, itemLabel:'Question',
        hint:'A little game. Add the right answer and one or two wrong ones.',
        sub:[ { key:'question', label:'Question', type:'text', required:true, max:140, placeholder:'Where was our first trip together?' },
              { key:'answer', label:'Right answer', type:'text', required:true, max:80 },
              { key:'wrong1', label:'Wrong answer', type:'text', required:true, max:80 },
              { key:'wrong2', label:'Another wrong answer', type:'text', max:80 } ] },
      { key:'voice', label:'Voice note', type:'audio', hint:'Plays on a retro cassette player' },
      { key:'video', label:'Video message', type:'video', hint:'Plays on a vintage TV' },
      { key:'music', label:'Background tune', type:'choice', default:'musicbox', options:MUSIC,
        hint:'Played by the browser itself, so there are no music copyright worries' }
    ]
  };

  /* ----------------------------- page styles ----------------------------- */
  const CSS = `
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{font-family:var(--fb);color:var(--text);background:var(--bg);background-attachment:fixed;min-height:100vh;overflow-x:hidden}
#fx{position:fixed;inset:0;pointer-events:none;z-index:0}
#fx2{position:fixed;inset:0;pointer-events:none;z-index:65}
body:not(.go) #fx{z-index:51}
main{max-width:860px;margin:0 auto;padding:10px 16px 90px;position:relative;z-index:1}
body:not(.go) main{visibility:hidden}
h1,h2{font-family:var(--fh);font-weight:400}
.btn{font:inherit;font-weight:600;background:var(--accent);color:var(--btn);border:0;padding:14px 28px;border-radius:999px;font-size:1.02rem;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.22);transition:transform .2s,box-shadow .2s,opacity .2s}
.btn:hover:not(:disabled){transform:translateY(-2px) scale(1.03)}
.btn:active:not(:disabled){transform:scale(.97)}
.btn:disabled{opacity:.5;cursor:default}
.btn.ghost{background:transparent;color:var(--text);border:2px solid var(--accent);box-shadow:none}
.btn.small{padding:9px 18px;font-size:.9rem}
.hint{text-align:center;opacity:.78;font-size:.95rem;margin:-4px 0 16px}
.pre{letter-spacing:.26em;text-transform:uppercase;font-size:.78rem;opacity:.85}
/* gates */
.gate2{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:var(--bg);text-align:center;padding:24px;transition:opacity .9s,visibility .9s}
.gate2[hidden]{display:none}
.gate2>*{position:relative;z-index:52}
.gate2.gone{opacity:0;visibility:hidden}
.gate2 h2{font-size:clamp(1.6rem,5vw,2.5rem);color:var(--accent);max-width:620px;line-height:1.25}
.cd-gift{font-size:5rem;animation:hop 2s ease-in-out infinite}
.cd-grid{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.cd-box{background:var(--card);border-radius:18px;min-width:80px;padding:14px 8px;backdrop-filter:blur(8px);box-shadow:0 10px 26px rgba(0,0,0,.15)}
.cd-box b{display:block;font-family:var(--fh);font-size:2.5rem;color:var(--accent);font-weight:400}
.cd-box b.tick{animation:tick .45s ease}
.cd-box small{opacity:.75;text-transform:uppercase;letter-spacing:.15em;font-size:.68rem}
.cd-big{display:none;font-family:var(--fh);font-size:clamp(7rem,30vw,13rem);line-height:1;color:var(--accent);text-shadow:0 0 40px var(--accent),0 10px 30px rgba(0,0,0,.3)}
.cd-big.beat{animation:beat .9s cubic-bezier(.2,.9,.3,1.2)}
@keyframes beat{0%{transform:scale(1.8);opacity:0}30%{opacity:1}100%{transform:scale(1);opacity:.9}}
#cd.final .cd-grid,#cd.final .cd-when,#cd.time .cd-grid,#cd.time .cd-when,#cd.time .cd-gift{display:none}
#cd.final .cd-big{display:block}
#cd.time #cdTitle{font-size:clamp(2.6rem,9vw,4.6rem);animation:beat .9s cubic-bezier(.2,.9,.3,1.2)}
.cd-pv{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:480px}
.cd-pv small{width:100%;opacity:.65}
@keyframes tick{from{transform:rotateX(90deg);opacity:.2}to{transform:none;opacity:1}}
.scratch{width:min(360px,86vw);aspect-ratio:1.45;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.3);animation:floaty 4s ease-in-out infinite}
.under{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--solid);text-align:center;padding:10px}
.scratch:not(.ready) .under{visibility:hidden}
.u-pre{letter-spacing:.25em;text-transform:uppercase;font-size:.78rem;opacity:.8}
.u-name{font-family:var(--fh);font-size:clamp(2rem,8vw,2.8rem);color:var(--accent);line-height:1.25}
.u-age{font-family:var(--fh);font-size:2.3rem;color:var(--accent2)}
#foil{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;transition:opacity .8s}
#foil.done{opacity:0;pointer-events:none}
/* hero */
.hero{text-align:center;padding:64px 6px 30px;min-height:88vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
.bounce{font-size:clamp(2.6rem,10vw,5.6rem);line-height:1.15;color:var(--accent);margin:.15em 0 .1em;text-shadow:0 6px 30px rgba(0,0,0,.12)}
.wd{display:inline-block;white-space:nowrap}
.ch{display:inline-block;opacity:0;animation:chIn .7s cubic-bezier(.2,.9,.3,1.3) forwards,jump 2.8s ease-in-out infinite;animation-delay:calc(.3s + var(--i)*.06s),calc(1.6s + var(--i)*.09s)}
body:not(.go) .ch{animation-play-state:paused}
@keyframes chIn{from{opacity:0;transform:translateY(40px) scale(.4) rotate(-20deg)}to{opacity:1;transform:none}}
@keyframes jump{0%,55%,100%{transform:none}25%{transform:translateY(-14px) rotate(-5deg)}}
.ribbon{position:relative;display:inline-block;margin:14px auto 0;padding:10px 46px;background:var(--accent);color:var(--btn);font-family:var(--fh);font-size:clamp(1.7rem,6vw,2.8rem);line-height:1.2;box-shadow:0 12px 26px rgba(0,0,0,.22);transform:rotate(-2deg);animation:wave 4s ease-in-out infinite}
.ribbon::before,.ribbon::after{content:'';position:absolute;top:12px;width:40px;height:100%;background:var(--accent2);z-index:-1}
.ribbon::before{left:-34px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,30% 50%)}
.ribbon::after{right:-34px;clip-path:polygon(0 0,100% 0,70% 50%,100% 100%,0 100%)}
@keyframes wave{50%{transform:rotate(1.5deg) translateY(-4px)}}
.agebig{position:relative;width:190px;height:190px;margin:30px auto 0;display:grid;place-items:center;animation:floaty 4s ease-in-out infinite}
.agebig span{font-family:var(--fh);font-size:6.4rem;line-height:1;background:linear-gradient(180deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 8px 14px rgba(0,0,0,.25))}
.agering{position:absolute;inset:0;border-radius:50%;border:3px dashed var(--accent);opacity:.55;animation:spin 20s linear infinite}
.agering::before{content:'';position:absolute;inset:16px;border-radius:50%;border:2px dotted var(--accent2);animation:spin 12s linear infinite reverse}
.cue{display:inline-block;margin-top:36px;color:var(--text);opacity:.8;text-decoration:none;font-size:.95rem}
.cue span{display:inline-block;animation:down 1.4s ease-in-out infinite}
@keyframes down{50%{transform:translateY(8px)}}
/* cards */
.card{background:var(--card);border-radius:28px;padding:32px 22px;margin:36px 0;box-shadow:0 14px 44px rgba(0,0,0,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2)}
.card h2{color:var(--accent);font-size:clamp(1.8rem,5vw,2.3rem);text-align:center;margin-bottom:10px}
.sec-ic{font-size:2.6rem;text-align:center;animation:floaty 3s ease-in-out infinite;margin-bottom:6px}
.reveal{opacity:0;transform:translateY(46px) scale(.97);transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}
.reveal.in{opacity:1;transform:none}
/* cake */
.cake3{position:relative;width:280px;height:270px;margin:46px auto 8px}
.tier{position:absolute;left:50%;transform:translateX(-50%);border-radius:16px 16px 12px 12px;box-shadow:inset 0 -10px 0 rgba(0,0,0,.08),0 8px 18px rgba(0,0,0,.15);overflow:hidden}
.tier::before{content:'';position:absolute;left:0;right:0;top:0;height:22px;background:radial-gradient(circle at 10px 6px,var(--icing) 9px,transparent 10px) 0 0/20px 22px repeat-x,linear-gradient(var(--icing),var(--icing)) 0 0/100% 8px no-repeat}
.tier::after{content:'';position:absolute;inset:26px 8px 8px;background-image:radial-gradient(circle,#ff5fa2 2px,transparent 2.5px),radial-gradient(circle,#ffd23f 2px,transparent 2.5px),radial-gradient(circle,#3ec1ff 2px,transparent 2.5px);background-size:34px 26px,28px 30px,40px 22px;background-position:0 0,12px 8px,22px 14px;opacity:.8}
.t1{bottom:20px;width:250px;height:88px;background:var(--c1)}
.t2{bottom:104px;width:190px;height:70px;background:var(--c2)}
.t3{bottom:170px;width:130px;height:52px;background:var(--c3)}
.agetxt{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-family:var(--fh);font-size:2rem;color:var(--icing);text-shadow:0 2px 0 rgba(0,0,0,.25);z-index:1}
.plate{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:290px;height:22px;border-radius:50%;background:linear-gradient(#fff,#d9d9e3);box-shadow:0 8px 16px rgba(0,0,0,.2)}
.candles{position:absolute;bottom:220px;left:50%;transform:translateX(-50%);display:flex;gap:7px;z-index:2}
.cdl{position:relative;width:12px;height:44px;border:0;padding:0;border-radius:4px;cursor:pointer;background:repeating-linear-gradient(-45deg,#fff 0 5px,var(--accent2) 5px 10px);box-shadow:0 2px 6px rgba(0,0,0,.2)}
.cdl::before{content:'';position:absolute;left:50%;top:-7px;width:2px;height:8px;margin-left:-1px;background:#333;border-radius:1px}
.cdl:not(.lit):not(.out){animation:hintc 1.8s ease-in-out infinite}
@keyframes hintc{50%{box-shadow:0 0 0 6px rgba(255,255,255,.35),0 2px 6px rgba(0,0,0,.2)}}
.flame{position:absolute;left:50%;top:-31px;width:14px;height:24px;margin-left:-7px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 50% 70%,#fff8c4,#ffb300 55%,rgba(255,120,0,0) 72%);opacity:0;transform:scale(.2);transform-origin:50% 90%;transition:opacity .3s,transform .3s;pointer-events:none}
.cdl.lit .flame{opacity:1;transform:scale(1);animation:flick .13s infinite alternate}
.cdl.lit::after{content:'';position:absolute;left:50%;top:-44px;width:54px;height:54px;margin-left:-27px;border-radius:50%;background:radial-gradient(rgba(255,200,80,.45),transparent 70%);pointer-events:none}
@keyframes flick{to{transform:scale(.9,1.08) translateY(-1px)}}
.smoke{position:absolute;left:50%;top:-14px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:rgba(210,210,210,.75);opacity:0;pointer-events:none}
.cdl.out .smoke{animation:smoke 1.5s ease-out forwards}
@keyframes smoke{0%{opacity:.85;transform:none}100%{opacity:0;transform:translate(10px,-60px) scale(3.2)}}
.cake-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}
.blow{background:linear-gradient(90deg,rgba(255,255,255,.5) var(--p,0%),transparent var(--p,0%)),var(--accent);touch-action:none;user-select:none;-webkit-user-select:none}
.blow.ready{animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 12px rgba(255,255,255,.18),0 10px 26px rgba(0,0,0,.22)}}
.cake-msg{text-align:center;margin-top:14px;min-height:1.5em;font-weight:600}
/* scroll letter */
.scroll{position:relative;max-width:620px;margin:20px auto 0;cursor:pointer;outline:none}
.scroll:focus-visible .seal{outline:3px dashed var(--accent);outline-offset:6px}
.roller{position:relative;height:26px;margin:0 6px;border-radius:13px;background:linear-gradient(180deg,#d29a5a,#8a5526 60%,#5a3310);box-shadow:0 6px 12px rgba(0,0,0,.25);z-index:2}
.roller::before,.roller::after{content:'';position:absolute;top:-4px;width:22px;height:34px;border-radius:9px;background:var(--accent)}
.roller::before{left:-14px}.roller::after{right:-14px}
.parch{margin:-6px 20px;max-height:0;overflow:hidden;transition:max-height 1.5s cubic-bezier(.4,0,.2,1);background:linear-gradient(90deg,#efdcb6,#fff6e0 18%,#fff6e0 82%,#efdcb6);color:#4a3520;box-shadow:inset 0 10px 10px -8px rgba(0,0,0,.3),inset 0 -10px 10px -8px rgba(0,0,0,.3)}
.scroll.open .parch{max-height:2400px}
.parch-in{padding:34px 30px 26px;font-family:'Caveat',cursive;font-size:1.6rem;line-height:1.45}
.ltext{white-space:pre-line;min-height:2em}
.ltext.typing::after{content:'▍';animation:blink .8s steps(1) infinite;color:#b08050}
@keyframes blink{50%{opacity:0}}
.lsig{text-align:right;margin-top:16px;opacity:0;transition:opacity .8s}
.lsig.show{opacity:1}
.seal{position:absolute;left:50%;top:50%;width:66px;height:66px;margin:-33px 0 0 -33px;border-radius:50%;z-index:3;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#ff8a8a,#b3122e 70%);color:#ffe9e9;font-family:var(--fh);font-size:1.6rem;box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 0 0 5px rgba(0,0,0,.12);transition:transform .7s cubic-bezier(.5,-.5,.5,1.5),opacity .6s;animation:hop 2.2s ease-in-out infinite}
.scroll.open .seal{transform:translateY(-60px) scale(0) rotate(160deg);opacity:0}
/* photo stack */
.stack{position:relative;width:min(320px,78vw);aspect-ratio:3/4;margin:24px auto 30px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.sc{position:absolute;inset:0;margin:0;background:#fff;padding:12px 12px 46px;border-radius:14px;box-shadow:0 16px 34px rgba(0,0,0,.25);transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s;cursor:grab}
.sc img{width:100%;height:100%;object-fit:cover;border-radius:8px;pointer-events:none;-webkit-user-drag:none}
.sc figcaption{position:absolute;left:12px;right:12px;bottom:10px;text-align:center;font-family:'Caveat',cursive;font-size:1.4rem;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stack-ctl{display:flex;justify-content:center;align-items:center;gap:16px;font-weight:600}
.round{width:48px;height:48px;border-radius:50%;border:0;background:var(--accent);color:var(--btn);font-size:1.2rem;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.2);transition:transform .2s}
.round:hover{transform:scale(1.1)}
/* balloons */
.sky{position:relative;border-radius:22px;overflow:hidden;transition:height .8s cubic-bezier(.4,0,.2,1);background:linear-gradient(180deg,rgba(255,255,255,.18),transparent)}
.bal{position:absolute;width:64px;height:78px;border:0;padding:0;cursor:pointer;border-radius:50% 50% 48% 48%/55% 55% 45% 45%;background:radial-gradient(circle at 30% 28%,rgba(255,255,255,.75),transparent 24%),var(--c);box-shadow:inset -6px -8px 0 rgba(0,0,0,.08);animation:bob var(--d) ease-in-out infinite alternate;transition:transform .2s}
.bal:hover{filter:brightness(1.08)}
.bal::before{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-5px;border:5px solid transparent;border-bottom:7px solid var(--c);transform:rotate(180deg)}
.bal::after{content:'';position:absolute;left:50%;top:100%;width:1px;height:46px;background:rgba(0,0,0,.25)}
.bal.pop{animation:popb .28s ease-out forwards;pointer-events:none}
@keyframes bob{from{transform:translateY(0) rotate(-3deg)}to{transform:translateY(-16px) rotate(3deg)}}
@keyframes popb{to{transform:scale(1.7);opacity:0}}
.reasons{list-style:none;padding:0;display:grid;gap:10px;margin-top:18px}
.reasons li{background:var(--solid);color:var(--text);border-left:5px solid var(--accent);padding:13px 16px;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.08);animation:slideIn .5s cubic-bezier(.2,.9,.3,1.2)}
.reasons li::before{content:'💖 '}
@keyframes slideIn{from{opacity:0;transform:translateX(-30px) scale(.9)}to{opacity:1;transform:none}}
.done-msg{text-align:center;font-weight:600;margin-top:16px;font-size:1.1rem}
/* fortune cookies */
.cookies{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px;margin-top:20px}
.ck{text-align:center}
.cookie{position:relative;width:130px;height:84px;border:0;background:none;cursor:pointer;padding:0;animation:wobble 3.2s ease-in-out infinite}
.ck:nth-child(2n) .cookie{animation-delay:-1.4s}
.half{position:absolute;top:0;width:68px;height:84px;background:radial-gradient(circle at 60% 30%,#ffe2a8,#eaa94c 60%,#c47f2a);box-shadow:inset -4px -6px 0 rgba(0,0,0,.08);transition:transform .7s cubic-bezier(.3,1.6,.5,1)}
.half.l{left:0;border-radius:80% 12% 12% 80%/60% 40% 40% 60%;transform-origin:100% 100%}
.half.r{right:0;border-radius:12% 80% 80% 12%/40% 60% 60% 40%;transform-origin:0 100%}
.ck.open .cookie{animation:none}
.ck.open .half.l{transform:translateX(-24px) rotate(-32deg)}
.ck.open .half.r{transform:translateX(24px) rotate(32deg)}
.ck-from{font-size:.88rem;opacity:.8;margin-top:6px}
.slip{max-height:0;opacity:0;overflow:hidden;margin:10px auto 0;padding:0 16px;background:#fffdf3;color:#3b2f1a;border-radius:10px;box-shadow:0 10px 22px rgba(0,0,0,.15);transform:scaleX(.2);transition:max-height .7s ease,opacity .5s,transform .6s cubic-bezier(.2,.9,.3,1.2),padding .5s;text-align:left}
.ck.open .slip{max-height:600px;opacity:1;transform:none;padding:14px 16px}
.slip p{font-style:italic;line-height:1.6}
.slip b{display:block;margin-top:8px;color:#9a5b16}
.slip audio{width:100%;margin-top:10px;height:36px}
@keyframes wobble{0%,70%,100%{transform:rotate(0)}80%{transform:rotate(-6deg)}90%{transform:rotate(6deg)}}
/* quiz */
.q{margin:22px 0}
.qq{font-weight:600;margin-bottom:10px;font-size:1.06rem}
.opts{display:grid;gap:9px}
.opt{font:inherit;text-align:left;padding:13px 16px;border-radius:14px;border:2px solid rgba(128,128,128,.32);background:var(--solid);color:var(--text);cursor:pointer;transition:transform .2s,border-color .2s,background .3s}
.opt:hover:not(:disabled){border-color:var(--accent);transform:translateX(5px)}
.opt.ok{background:#2fbf71;border-color:#2fbf71;color:#fff}
.opt.ok::after{content:'  ✓'}
.opt.no{background:#ef4444;border-color:#ef4444;color:#fff;animation:shake .4s}
.opt:disabled{cursor:default}
.opt:disabled:not(.ok):not(.no){opacity:.5}
@keyframes shake{25%{transform:translateX(-8px)}50%{transform:translateX(8px)}75%{transform:translateX(-4px)}}
.score{text-align:center;font-family:var(--fh);font-size:1.7rem;color:var(--accent);opacity:0;transform:scale(.6);transition:all .5s cubic-bezier(.3,1.6,.5,1)}
.score.show{opacity:1;transform:none}
/* cassette */
.cassette{position:relative;width:min(340px,84vw);aspect-ratio:1.6;margin:16px auto;border-radius:18px;padding:16px;background:linear-gradient(160deg,var(--accent2),var(--accent));box-shadow:0 18px 40px rgba(0,0,0,.3)}
.cassette::before{content:'';position:absolute;inset:8px;border-radius:12px;background:radial-gradient(circle at 8px 8px,rgba(0,0,0,.35) 3px,transparent 4px),radial-gradient(circle at calc(100% - 8px) 8px,rgba(0,0,0,.35) 3px,transparent 4px),radial-gradient(circle at 8px calc(100% - 8px),rgba(0,0,0,.35) 3px,transparent 4px),radial-gradient(circle at calc(100% - 8px) calc(100% - 8px),rgba(0,0,0,.35) 3px,transparent 4px);pointer-events:none}
.clabel{position:relative;background:#fffdf3;color:#333;border-radius:8px;padding:6px 10px;font-family:'Caveat',cursive;font-size:1.45rem;text-align:center;box-shadow:inset 0 -3px 0 rgba(0,0,0,.06)}
.cwin{position:relative;margin:12px auto 0;width:80%;height:42%;background:rgba(20,20,30,.85);border-radius:40px;display:flex;justify-content:space-between;align-items:center;padding:0 16px}
.reel{width:44px;height:44px;border-radius:50%;background:radial-gradient(circle,#f2f2f2 0 6px,#666 7px 9px,transparent 10px),repeating-conic-gradient(#e6e6e6 0 30deg,#9a9a9a 30deg 60deg);box-shadow:0 0 0 var(--tl,14px) #3b2a20}
.reel.r{box-shadow:0 0 0 var(--tr,2px) #3b2a20}
.playing .reel{animation:spin 1.4s linear infinite}
.tbar{height:6px;border-radius:9px;background:rgba(128,128,128,.25);overflow:hidden;width:min(340px,84vw);margin:12px auto}
.tbar i{display:block;height:100%;width:0;background:var(--accent);transition:width .25s linear}
.center{text-align:center}
/* TV */
.tv{position:relative;width:min(560px,94%);margin:60px auto 10px}
.ant{position:absolute;top:-50px;left:50%;width:4px;height:62px;background:#666;border-radius:2px;transform-origin:50% 100%}
.ant.l{transform:rotate(-32deg)}.ant.r{transform:rotate(32deg)}
.ant::after{content:'';position:absolute;top:-6px;left:-4px;width:12px;height:12px;border-radius:50%;background:var(--accent)}
.tvbody{position:relative;background:linear-gradient(160deg,#8b5e3c,#5a3a22);border-radius:30px;padding:18px;display:flex;gap:16px;box-shadow:0 22px 50px rgba(0,0,0,.35),inset 0 -6px 0 rgba(0,0,0,.2)}
.tvs{flex:1;position:relative;aspect-ratio:16/10;border-radius:22px/32px;overflow:hidden;background:#111;box-shadow:inset 0 0 30px rgba(0,0,0,.9)}
.tvs video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
#static{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;transition:opacity .6s}
.tvplay{position:absolute;inset:0;margin:auto;width:78px;height:78px;border-radius:50%;border:0;background:rgba(255,255,255,.92);font-size:1.8rem;cursor:pointer;box-shadow:0 0 0 10px rgba(255,255,255,.25);transition:transform .2s,opacity .5s;animation:pulse 1.6s ease-in-out infinite}
.tvplay:hover{transform:scale(1.1)}
.tv.on #static,.tv.on .tvplay{opacity:0;pointer-events:none}
.knobs{display:flex;flex-direction:column;gap:14px;justify-content:center}
.knobs i{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#eee,#888);box-shadow:0 3px 6px rgba(0,0,0,.3)}
.knobs i:nth-child(3){width:30px;height:46px;border-radius:6px;background:repeating-linear-gradient(0deg,#3a2616 0 3px,#6b4a2e 3px 6px)}
@media(max-width:520px){.knobs{display:none}}
/* finale */
.finale{text-align:center}
.wishform{display:flex;gap:10px;max-width:520px;margin:18px auto 6px;flex-wrap:wrap;justify-content:center}
.wishform input{flex:1;min-width:220px;font:inherit;padding:14px 18px;border-radius:999px;border:2px solid var(--accent);background:var(--solid);color:var(--text);outline:none}
.wishform input:focus{box-shadow:0 0 0 5px rgba(255,255,255,.25)}
.sky2{position:relative;height:170px;margin-top:14px;border-radius:22px;background:radial-gradient(ellipse at center,rgba(10,10,40,.35),transparent 72%)}
.sky2 .st{position:absolute;font-size:1.3rem;animation:tw 1.8s ease-in-out infinite alternate;transform:translate(-50%,-50%)}
@keyframes tw{to{opacity:.5;filter:drop-shadow(0 0 10px #fff3a0)}}
.flying{position:fixed;z-index:70;pointer-events:none;font-family:var(--fh);font-size:1.3rem;color:var(--accent);white-space:nowrap;transition:transform 1.3s cubic-bezier(.3,.1,.3,1),opacity 1.3s}
.sign{margin-top:26px;font-family:var(--fh);font-size:1.8rem}
.made{text-align:center;font-size:.8rem;opacity:.65;margin-top:30px}.made a{color:inherit}
/* chrome */
.prog{position:fixed;top:0;left:0;right:0;height:4px;z-index:40}
.prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.dots{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:30;display:flex;flex-direction:column;gap:13px}
.dots a{display:block;width:12px;height:12px;border-radius:50%;background:var(--text);opacity:.3;position:relative;transition:all .3s}
.dots a.on{opacity:1;background:var(--accent);transform:scale(1.45)}
.dots a::after{content:attr(data-l);position:absolute;right:22px;top:50%;transform:translateY(-50%);white-space:nowrap;background:var(--solid);color:var(--text);padding:3px 10px;border-radius:99px;font-size:.75rem;opacity:0;transition:opacity .2s;pointer-events:none}
.dots a:hover::after,.dots a:focus-visible::after{opacity:1}
body:not(.go) .dots,body:not(.go) .prog{display:none}
@media(max-width:640px){.dots{right:6px;gap:10px}.dots a{width:9px;height:9px}}
.mute{position:fixed;right:16px;bottom:16px;z-index:40;width:50px;height:50px;border-radius:50%;border:0;background:var(--accent);color:var(--btn);font-size:1.25rem;cursor:pointer;box-shadow:0 10px 22px rgba(0,0,0,.25)}
.mute.on{animation:pulse 2s ease-in-out infinite}
.lb{position:fixed;inset:0;background:rgba(0,0,0,.9);display:grid;place-items:center;z-index:60;cursor:zoom-out;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
.lb.on{opacity:1;visibility:visible}.lb img{max-width:92vw;max-height:88vh;border-radius:14px}
.conf{position:fixed;top:-20px;width:10px;height:14px;z-index:70;pointer-events:none;animation:fall linear forwards}
.conf.e{width:auto;height:auto;font-size:1.6rem;background:none!important}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg)}}
@keyframes floaty{50%{transform:translateY(-10px)}}
@keyframes hop{0%,70%,100%{transform:translateY(0)}80%{transform:translateY(-14px) rotate(-5deg)}90%{transform:rotate(4deg)}}
@keyframes spin{to{transform:rotate(360deg)}}
/* theme extras */
.th-neon h1,.th-neon h2,.th-neon .ribbon{text-shadow:0 0 18px var(--accent),0 0 40px var(--accent2)}
.th-neon .card{border-color:rgba(34,229,255,.35);box-shadow:0 0 30px rgba(255,62,200,.15),inset 0 0 30px rgba(34,229,255,.06)}
.th-neon::after{content:'';position:fixed;left:-50%;bottom:0;width:200%;height:42vh;background-image:linear-gradient(var(--accent) 1px,transparent 1px),linear-gradient(90deg,var(--accent) 1px,transparent 1px);background-size:60px 60px;transform:perspective(300px) rotateX(62deg);transform-origin:50% 100%;opacity:.16;animation:grid 3.5s linear infinite;pointer-events:none;z-index:0}
@keyframes grid{to{background-position:0 60px}}
.th-sunset::after{content:'';position:fixed;left:50%;bottom:-200px;width:540px;height:540px;margin-left:-270px;border-radius:50%;background:linear-gradient(#ffd166,#ff4f8b);-webkit-mask:repeating-linear-gradient(to bottom,#000 0 20px,transparent 20px 28px);mask:repeating-linear-gradient(to bottom,#000 0 20px,transparent 20px 28px);opacity:.33;pointer-events:none;z-index:0}
.th-garden::after,.th-candy::after{content:'';position:fixed;top:0;left:0;right:0;height:34px;background:conic-gradient(from 135deg at 50% 0,var(--accent2) 90deg,transparent 0) 0 0/44px 34px repeat-x;opacity:.8;pointer-events:none;z-index:2;filter:drop-shadow(0 3px 2px rgba(0,0,0,.12))}
.th-candy::after{background:conic-gradient(from 135deg at 50% 0,#ffd23f 90deg,transparent 0) 0 0/88px 34px repeat-x,conic-gradient(from 135deg at 50% 0,var(--accent2) 90deg,transparent 0) 44px 0/88px 34px repeat-x}
.th-ocean::after{content:'';position:fixed;left:0;right:0;bottom:0;height:60px;background:radial-gradient(circle at 50% 100%,rgba(255,255,255,.55) 28px,transparent 29px) 0 100%/80px 60px repeat-x;animation:waves 6s linear infinite;pointer-events:none;z-index:0}
@keyframes waves{to{background-position:80px 100%}}
.th-midnight::after{content:'';position:fixed;top:70px;right:9%;width:90px;height:90px;border-radius:50%;box-shadow:-20px 12px 0 0 #f7e7b4;opacity:.85;pointer-events:none;z-index:0;filter:drop-shadow(0 0 20px rgba(247,231,180,.5))}
/* Champagne Gold: champagne-gold on midnight plum (from the original birthday site look) */
.th-champagne{font-weight:300;letter-spacing:.01em}
.th-champagne::before{content:'';position:fixed;inset:-25%;z-index:0;pointer-events:none;
  background:radial-gradient(circle at 25% 20%,rgba(150,55,105,.42),transparent 32%),radial-gradient(circle at 75% 80%,rgba(212,175,106,.22),transparent 34%),radial-gradient(circle at 55% 45%,rgba(70,85,170,.28),transparent 30%);
  animation:aurora 26s ease-in-out infinite alternate}
.th-champagne::after{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.55))}
@keyframes aurora{0%{transform:translate(0,0) scale(1)}50%{transform:translate(6%,4%) scale(1.12)}100%{transform:translate(-5%,7%) scale(.96)}}
.th-champagne .gate2{background:none}
.th-champagne h1,.th-champagne h2{font-weight:600}
.th-champagne h2,.th-champagne .ch,.th-champagne .agebig span{background-image:linear-gradient(100deg,#b8893b 0%,#f6e7b8 25%,#d4af6a 50%,#fff4d6 70%,#b8893b 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
.th-champagne h2{animation:goldShim 7s linear infinite}
@keyframes goldShim{to{background-position:250% 0}}
.th-champagne .bounce{text-shadow:none;filter:drop-shadow(0 4px 22px rgba(212,175,106,.28))}
.th-champagne .ribbon{background:none;box-shadow:none;transform:none;animation:none;padding:0 .3em;font-family:'Great Vibes',cursive;font-size:clamp(3.2rem,13vw,6.2rem);line-height:1.35;color:#f3dfa2;text-shadow:0 0 30px rgba(212,175,106,.45)}
.th-champagne .ribbon::before,.th-champagne .ribbon::after{display:none}
.th-champagne .u-name{font-family:'Great Vibes',cursive;font-size:clamp(2.6rem,10vw,3.4rem);color:#d4af6a}
.th-champagne .pre,.th-champagne .u-pre{letter-spacing:.3em;font-size:.72rem;color:#f3dfa2;opacity:.75}
.th-champagne .btn:not(.ghost),.th-champagne .round,.th-champagne .mute{background:linear-gradient(135deg,#f6e7b8,#d4af6a 50%,#b8893b);color:#1c1117;letter-spacing:.06em;font-weight:500;box-shadow:0 10px 30px rgba(212,175,106,.25),inset 0 1px 0 rgba(255,255,255,.55)}
.th-champagne .btn.ghost{color:#f3dfa2;border:1px solid rgba(212,175,106,.6);background:rgba(255,255,255,.04)}
.th-champagne .card{border:1px solid rgba(212,175,106,.28);box-shadow:0 20px 50px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06)}
.th-champagne .sec-ic{width:84px;height:84px;margin:0 auto 10px;display:grid;place-items:center;font-size:2.1rem;border-radius:50%;border:1px solid rgba(212,175,106,.5);background:radial-gradient(circle,rgba(212,175,106,.16),transparent 70%);box-shadow:0 0 40px rgba(212,175,106,.18)}
.th-champagne .agering{border-color:#d4af6a}
.th-champagne .cd-box{border:1px solid rgba(212,175,106,.35);background:rgba(255,255,255,.04)}
.th-champagne .parch{background:#fbf6ec;color:#2b1e24}
.th-champagne .parch-in{font-family:'Cormorant Garamond',Georgia,serif;font-size:1.3rem;line-height:1.7}
.th-champagne .reasons li{background:rgba(255,255,255,.05);border-left-color:#d4af6a}
.th-champagne .opt{background:rgba(255,255,255,.04);border-color:rgba(212,175,106,.3)}
.th-champagne .opt:hover:not(:disabled){border-color:#d4af6a}
.th-champagne .cdl{background:repeating-linear-gradient(180deg,#fbf4ea 0 7px,#d4af6a 7px 9px)}
.th-champagne .plate{background:linear-gradient(#efdca6,#a9823d)}
.th-champagne .sign{font-family:'Great Vibes',cursive;font-size:2.4rem;color:#f3dfa2}
.th-champagne .prog i{background:linear-gradient(90deg,#b8893b,#f3dfa2);box-shadow:0 0 10px rgba(243,223,162,.7)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal,.ch{opacity:1;transform:none}}
`;

  /* ----------------------------- runtime (in the shared page) ----------------------------- */
  // Serialised with toString(), so it must stay self-contained. Needs window.WCFX from fxEngine().
  function surpriseRuntime() {
    const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const B = document.body, FX = window.WCFX;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const pop = el => { const [x, y] = center(el); FX.burst(x, y); FX.kick(); };

    /* ---- generated background tune (Happy Birthday melody is public domain) ---- */
    let wantMusic = true;
    const muteBtn = $('#mute');
    const Music = (function () {
      const mode = B.dataset.music;
      let ac = null, master = null, on = false, timer = null;
      const HB = [[392,.75],[392,.25],[440,1],[392,1],[523.25,1],[493.88,2],[392,.75],[392,.25],[440,1],[392,1],[587.33,1],[523.25,2],
        [392,.75],[392,.25],[783.99,1],[659.25,1],[523.25,1],[493.88,1],[440,2],[698.46,.75],[698.46,.25],[659.25,1],[523.25,1],[587.33,1],[523.25,3]];
      const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      function tone(f, t, dur, vol) {
        const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
        o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2; g2.gain.value = .22;
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
      }
      function loop() {
        if (!on) return;
        let t = ac.currentTime + .1, len;
        if (mode === 'musicbox') {
          const beat = .42;
          for (const [f, b] of HB) { tone(f * 2, t, 1.3, .1); t += b * beat; }
          len = HB.reduce((s, n) => s + n[1], 0) * beat + 1.4;
        } else {
          for (let i = 0; i < 16; i++) {
            tone(PENTA[Math.floor(Math.random() * PENTA.length)], t, 2.6, .06);
            if (i % 4 === 0) tone(PENTA[0] / 2, t, 3, .045);
            t += .55;
          }
          len = 16 * .55;
        }
        timer = setTimeout(loop, len * 1000 - 150);
      }
      return {
        has: mode === 'musicbox' || mode === 'chimes',
        get on() { return on; },
        unlock() {
          if (!this.has) return;
          const A = window.AudioContext || window.webkitAudioContext;
          if (!ac && A) ac = new A();
          if (ac && ac.state === 'suspended') ac.resume();
        },
        play() {
          if (!this.has || on) return;
          this.unlock(); if (!ac) return;
          master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
          on = true; loop(); updateMute();
        },
        stop() {
          on = false; clearTimeout(timer);
          if (master) { const m = master; m.gain.setTargetAtTime(0, ac.currentTime, .08); setTimeout(() => m.disconnect(), 600); master = null; }
          updateMute();
        }
      };
    })();
    function updateMute() {
      if (!muteBtn) return;
      muteBtn.textContent = Music.on ? '🔊' : '🔇';
      muteBtn.classList.toggle('on', Music.on);
      muteBtn.setAttribute('aria-label', Music.on ? 'Turn music off' : 'Turn music on');
    }
    if (muteBtn) muteBtn.addEventListener('click', () => { wantMusic = !Music.on; wantMusic ? Music.play() : Music.stop(); });
    const anyMediaPlaying = () => $$('audio,video').some(m => !m.paused);
    $$('audio,video').forEach(m => {
      m.addEventListener('play', () => Music.stop());
      m.addEventListener('pause', () => { if (wantMusic && B.classList.contains('go') && !anyMediaPlaying()) Music.play(); });
    });

    /* ---- countdown lock ---- */
    const cd = $('#cd'), sc = $('#scr');
    let scratched = false;
    let target = 0;
    // Unlock moment = date + optional time, in the recipient's own local time.
    if (B.dataset.date) {
      const [y, m, d] = B.dataset.date.split('-').map(Number);
      const [hh, mm] = (B.dataset.time || '00:00').split(':').map(Number);
      const t = new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
      if (t > Date.now() && t - Date.now() < 400 * 864e5) target = t;
    }
    if (target) {
      cd.hidden = false;
      const el = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') }, big = $('#cdBig');
      let done = false;
      const tick = () => {
        const ms = target - Date.now();
        if (ms <= 0) {
          if (done) return; done = true; clearInterval(iv);
          // It's time: celebrate on the countdown screen, then reveal the scratch card.
          cd.classList.remove('final'); cd.classList.add('time');
          $('#cdTitle').textContent = 'It’s time! 🎉';
          const [x, y] = center($('#cdTitle'));
          FX.burst(x, y); setTimeout(() => FX.burst(x - 160, y - 60), 200); setTimeout(() => FX.burst(x + 160, y - 60), 400); FX.kick();
          FX.confetti(160);
          setTimeout(() => { cd.classList.add('gone'); showScratch(); setTimeout(() => { cd.hidden = true; }, 900); }, 1800);
          return;
        }
        if (ms <= 10500) {
          // Final seconds: a big 10…1 pulse.
          cd.classList.add('final');
          const n = String(Math.ceil(ms / 1000));
          if (big.textContent !== n) { big.textContent = n; big.classList.remove('beat'); void big.offsetWidth; big.classList.add('beat'); }
        }
        const v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
        for (const k in v) {
          const s = String(v[k]).padStart(2, '0');
          if (el[k].textContent !== s) { el[k].textContent = s; el[k].classList.remove('tick'); void el[k].offsetWidth; el[k].classList.add('tick'); }
        }
      };
      const iv = setInterval(tick, 250); tick();
      const skip = $('#cdSkip'); if (skip) skip.addEventListener('click', () => { target = Date.now(); tick(); });
      const t10 = $('#cdTen'); if (t10) t10.addEventListener('click', () => { target = Date.now() + 10400; t10.hidden = true; });
    } else showScratch();

    /* ---- scratch card ---- */
    function showScratch() {
      sc.hidden = false;
      const card = $('.scratch'), foil = $('#foil'), g = foil.getContext('2d', { willReadFrequently: true });
      const r = foil.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), W = r.width, H = r.height;
      foil.width = W * dpr; foil.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(B), a = cs.getPropertyValue('--accent').trim() || '#c0c0c0', b = cs.getPropertyValue('--accent2').trim() || '#909090';
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, '#e4e4ee'); gr.addColorStop(.35, a); gr.addColorStop(.7, b); gr.addColorStop(1, '#f4f4fa');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 5;
      for (let x = -H; x < W; x += 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 1.8 + .4, 0, 7); g.fill(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '40px serif'; g.fillText('🎁', W / 2, H / 2 - 28);
      g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 6;
      g.font = '700 21px Poppins, sans-serif'; g.fillText('SCRATCH HERE', W / 2, H / 2 + 20); g.shadowBlur = 0;
      card.classList.add('ready');

      let drawing = false, last = null, moves = 0;
      const pt = e => { const q = foil.getBoundingClientRect(); return [e.clientX - q.left, e.clientY - q.top]; };
      const scratch = (p, q) => {
        g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = 48; g.lineCap = 'round';
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0] + .1, q[1]); g.stroke(); g.globalCompositeOperation = 'source-over';
      };
      const check = () => {
        if (scratched) return;
        const d = g.getImageData(0, 0, foil.width, foil.height).data; let clear = 0, n = 0;
        for (let i = 3; i < d.length; i += 160) { n++; if (d[i] === 0) clear++; }
        if (clear / n > .45) finish();
      };
      foil.addEventListener('pointerdown', e => { Music.unlock(); drawing = true; last = pt(e); scratch(last, last); foil.setPointerCapture(e.pointerId); });
      foil.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); scratch(last, p); last = p; if (++moves % 12 === 0) check(); });
      ['pointerup', 'pointercancel'].forEach(ev => foil.addEventListener(ev, () => { drawing = false; check(); }));
      $('#reveal').addEventListener('click', () => { Music.unlock(); finish(); });
      function finish() {
        if (scratched) return; scratched = true;
        foil.classList.add('done'); $('#reveal').hidden = true;
        const [x, y] = center(card);
        FX.burst(x, y); setTimeout(() => FX.burst(x - 130, y - 80), 200); setTimeout(() => FX.burst(x + 130, y - 70), 400); FX.kick();
        FX.confetti(120);
        $('#scrHint').textContent = '🎉 🎉 🎉';
        setTimeout(enter, 1700);
      }
    }
    function enter() {
      sc.classList.add('gone'); B.classList.add('go'); scrollTo(0, 0);
      setTimeout(() => { sc.hidden = true; }, 900);
      if (Music.has) { muteBtn.hidden = false; if (wantMusic) Music.play(); }
    }

    /* ---- cake ---- */
    const cdls = $$('.cdl'), blow = $('#blow'), cakeMsg = $('#cakeMsg');
    let cakeDone = false, hold = null;
    const lit = () => $$('.cdl.lit').length;
    function light(c) {
      if (cakeDone || c.classList.contains('lit')) return;
      c.classList.add('lit'); c.setAttribute('aria-pressed', 'true');
      const n = lit();
      cakeMsg.textContent = n < cdls.length ? `${n} of ${cdls.length} candles lit` : 'Close your eyes, make a wish… then hold the button 🌬️';
      if (n === cdls.length) { blow.disabled = false; blow.classList.add('ready'); $('#lightAll').hidden = true; }
    }
    cdls.forEach(c => c.addEventListener('click', () => light(c)));
    const la = $('#lightAll'); if (la) la.addEventListener('click', () => cdls.forEach((c, i) => setTimeout(() => light(c), i * 120)));
    function blowOut() {
      if (cakeDone) return; cakeDone = true;
      blow.disabled = true; blow.classList.remove('ready'); blow.style.setProperty('--p', '100%');
      cdls.forEach((c, i) => setTimeout(() => { c.classList.remove('lit'); c.classList.add('out'); }, i * 110));
      setTimeout(() => {
        const [x, y] = center($('.cake3'));
        FX.burst(x, y - 90); setTimeout(() => FX.burst(x - 150, y - 170), 220); setTimeout(() => FX.burst(x + 150, y - 170), 440); FX.kick();
        FX.confetti(170, '🎂');
        cakeMsg.textContent = 'Your wish is on its way ✨';
        blow.textContent = 'Wish made 💫';
      }, cdls.length * 110 + 200);
    }
    if (blow) {
      const stopHold = () => { if (hold) { cancelAnimationFrame(hold); hold = null; if (!cakeDone) blow.style.setProperty('--p', '0%'); } };
      blow.addEventListener('pointerdown', e => {
        if (blow.disabled || cakeDone) return; e.preventDefault();
        const start = performance.now();
        const step = t => { const p = Math.min(1, (t - start) / 1300); blow.style.setProperty('--p', p * 100 + '%'); if (p < 1) hold = requestAnimationFrame(step); else { hold = null; blowOut(); } };
        hold = requestAnimationFrame(step);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => blow.addEventListener(ev, stopHold));
      blow.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !blow.disabled) { e.preventDefault(); blowOut(); } });
    }

    /* ---- scroll letter ---- */
    const scroll = $('#scroll');
    if (scroll) {
      const open = () => {
        if (scroll.classList.contains('open')) return;
        scroll.classList.add('open'); scroll.setAttribute('aria-expanded', 'true');
        const p = $('#ltext'), full = p.dataset.text, sig = $('.lsig');
        if (reduce) { p.textContent = full; sig.classList.add('show'); return; }
        let i = 0; const step = Math.max(1, Math.ceil(full.length / 280));
        setTimeout(() => {
          p.classList.add('typing');
          const iv = setInterval(() => {
            i += step; p.textContent = full.slice(0, i);
            if (i >= full.length) { clearInterval(iv); p.classList.remove('typing'); sig.classList.add('show'); }
          }, 24);
          p.addEventListener('click', () => { i = full.length; }, { once: true });
        }, 650);
      };
      scroll.addEventListener('click', open);
      scroll.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }

    /* ---- lightbox ---- */
    const lb = $('#lb');
    const openLb = src => { lb.querySelector('img').src = src; lb.classList.add('on'); };
    lb.addEventListener('click', () => lb.classList.remove('on'));

    /* ---- photo stack ---- */
    const stack = $('#stack');
    if (stack) {
      const cards = [...stack.children], n = cards.length; let idx = 0;
      const layout = () => {
        cards.forEach((c, i) => {
          const k = (i - idx + n) % n;
          c.style.zIndex = n - k;
          c.style.transform = k === 0 ? 'none' : `translate(${k * 7}px,${k * 9}px) rotate(${(k % 2 ? 1 : -1) * k * 2.6}deg) scale(${1 - k * .04})`;
          c.style.opacity = k > 3 ? 0 : 1;
        });
        $('#mCount').textContent = `${idx + 1} / ${n}`;
      };
      const next = dir => {
        if (n < 2) return;
        const c = cards[idx];
        c.style.transition = 'transform .45s ease, opacity .45s';
        c.style.transform = `translate(${dir * 130}%,-30px) rotate(${dir * 26}deg)`; c.style.opacity = 0;
        setTimeout(() => { idx = (idx + 1) % n; c.style.transition = ''; layout(); }, 340);
      };
      const prev = () => { idx = (idx - 1 + n) % n; layout(); };
      let sx = 0, dx = 0, drag = false, moved = false;
      stack.addEventListener('pointerdown', e => {
        const c = cards[idx]; if (!c.contains(e.target)) return;
        drag = true; moved = false; sx = e.clientX; dx = 0; c.style.transition = 'none'; c.setPointerCapture(e.pointerId);
      });
      stack.addEventListener('pointermove', e => {
        if (!drag) return; dx = e.clientX - sx; if (Math.abs(dx) > 6) moved = true;
        cards[idx].style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
      });
      const end = () => {
        if (!drag) return; drag = false;
        const c = cards[idx]; c.style.transition = '';
        if (Math.abs(dx) > 90) next(Math.sign(dx));
        else { layout(); if (!moved) openLb(c.querySelector('img').src); }
      };
      stack.addEventListener('pointerup', end); stack.addEventListener('pointercancel', end);
      $('#nextM').addEventListener('click', () => next(1));
      $('#prevM').addEventListener('click', prev);
      layout();
    }

    /* ---- pop-the-balloon reasons ---- */
    const bals = $$('.bal');
    if (bals.length) {
      let popped = 0;
      bals.forEach(b => b.addEventListener('click', () => {
        if (b.classList.contains('pop')) return;
        b.classList.add('pop'); b.disabled = true; pop(b);
        const li = document.createElement('li'); li.textContent = b.dataset.reason; $('#reasonList').appendChild(li);
        popped++; $('#popCount').textContent = popped;
        if (popped === bals.length) { FX.confetti(140, '💖'); $('#popDone').hidden = false; setTimeout(() => { $('.sky').style.height = '0'; }, 500); }
      }));
    }

    /* ---- fortune cookies ---- */
    $$('.ck').forEach(ck => {
      const btn = ck.querySelector('.cookie');
      btn.addEventListener('click', () => {
        if (ck.classList.contains('open')) return;
        ck.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); pop(btn);
      });
    });

    /* ---- quiz ---- */
    const qs = $$('.q'); let answered = 0, right = 0;
    qs.forEach(q => {
      const opts = [...q.querySelectorAll('.opt')];
      opts.forEach(o => o.addEventListener('click', () => {
        opts.forEach(x => { x.disabled = true; if (x.dataset.ok === '1') x.classList.add('ok'); });
        if (o.dataset.ok === '1') { right++; pop(o); } else o.classList.add('no');
        if (++answered === qs.length) {
          const s = $('#score');
          s.textContent = right === qs.length ? `Perfect score! ${right}/${qs.length} 🏆` : `You got ${right} out of ${qs.length} 🎉`;
          s.classList.add('show');
          if (right === qs.length) FX.confetti(160, '🏆');
        }
      }));
    });

    /* ---- cassette voice note ---- */
    const ca = $('#cassAudio');
    if (ca) {
      const cass = $('#cass'), btn = $('#cassPlay'), bar = $('#cassProg');
      btn.addEventListener('click', () => (ca.paused ? ca.play() : ca.pause()));
      ca.addEventListener('play', () => { cass.classList.add('playing'); btn.textContent = '❚❚ Pause'; });
      const st = () => { cass.classList.remove('playing'); btn.textContent = ca.ended ? '↺ Play again' : '▶ Play'; };
      ca.addEventListener('pause', st); ca.addEventListener('ended', st);
      ca.addEventListener('timeupdate', () => {
        const p = ca.duration ? ca.currentTime / ca.duration : 0;
        bar.style.width = p * 100 + '%';
        cass.style.setProperty('--tl', (14 - 12 * p) + 'px'); cass.style.setProperty('--tr', (2 + 12 * p) + 'px');
      });
    }

    /* ---- vintage TV ---- */
    const tv = $('#tv');
    if (tv) {
      const v = $('#tvVid'), cvs = $('#static'), g = cvs.getContext('2d');
      cvs.width = 160; cvs.height = 100; const img = g.createImageData(160, 100); let run = false;
      const noise = () => {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) { const c = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        if (run) requestAnimationFrame(noise);
      };
      noise();
      if (!reduce) new IntersectionObserver(es => {
        const want = es[0].isIntersecting && !tv.classList.contains('on');
        if (want && !run) { run = true; noise(); } else if (!want) run = false;
      }).observe(tv);
      $('#tvPlay').addEventListener('click', () => { tv.classList.add('on'); run = false; v.controls = true; v.play(); });
    }

    /* ---- wish to the stars (never leaves the device) ---- */
    const wf = $('#wishForm');
    if (wf) wf.addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('#wishIn'), txt = inp.value.trim();
      if (!txt) { inp.focus(); return; }
      inp.value = '';
      const sky = $('#sky2'), r = inp.getBoundingClientRect(), sr = sky.getBoundingClientRect();
      const fly = document.createElement('div'); fly.className = 'flying';
      fly.textContent = txt.length > 40 ? txt.slice(0, 40) + '…' : txt;
      fly.style.left = r.left + 16 + 'px'; fly.style.top = r.top + 8 + 'px';
      document.body.appendChild(fly);
      const tx = sr.left + sr.width * (.1 + Math.random() * .8), ty = sr.top + sr.height * (.15 + Math.random() * .7);
      requestAnimationFrame(() => requestAnimationFrame(() => { fly.style.transform = `translate(${tx - r.left - 16}px,${ty - r.top - 8}px) scale(.12)`; fly.style.opacity = '0'; }));
      setTimeout(() => {
        fly.remove();
        const st = document.createElement('span'); st.className = 'st'; st.textContent = '⭐'; st.title = txt;
        st.style.left = (tx - sr.left) + 'px'; st.style.top = (ty - sr.top) + 'px'; sky.appendChild(st);
        const q = st.getBoundingClientRect(); FX.burst(q.left + q.width / 2, q.top + q.height / 2); FX.kick();
        $('#wishMsg').textContent = 'Your wish is now a star ✨ Make another?';
      }, 1300);
    });
    const rp = $('#replay'); if (rp) rp.addEventListener('click', () => location.reload());

    /* ---- scroll progress, chapter dots, reveal ---- */
    const bar = $('#progBar');
    addEventListener('scroll', () => {
      const h = document.documentElement;
      bar.style.width = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100 + '%';
    }, { passive: true });
    const dots = $$('.dots a');
    dots.forEach(d => d.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(d.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    const cue = $('.cue'); if (cue) cue.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(cue.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
    const io2 = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) dots.forEach(d => d.classList.toggle('on', d.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -45% 0px' });
    $$('main > [id]').forEach(s => io2.observe(s));
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .1 });
    $$('.reveal').forEach(el => io.observe(el));
  }

  // "19:30" -> "7:30 in the evening". Plain words instead of AM/PM.
  function friendlyTime(t) {
    const [H, M] = String(t || '00:00').split(':').map(Number);
    if (!H && !M) return 'midnight';
    if (H === 12 && !M) return '12 noon';
    const h12 = H % 12 || 12, mm = String(M || 0).padStart(2, '0');
    const part = H < 5 ? 'at night' : H < 12 ? 'in the morning' : H < 17 ? 'in the afternoon' : H < 21 ? 'in the evening' : 'at night';
    return `${h12}:${mm} ${part}`;
  }

  /* ----------------------------- renderer ----------------------------- */
  function render(tpl, occ, d, src, opts, H) {
    const { esc, nl } = H;
    const th = THEMES.find(t => t.id === d.theme) || THEMES[0];
    const S = v => (v ? src(v) : null);
    const to = esc(d.to || 'You'), from = esc(d.from || 'Someone special');
    const age = Number(d.age) > 0 ? Math.round(Number(d.age)) : 0;
    const date = d.date ? esc(new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })) : '';
    let ci = 0;
    const chars = s => String(s).split(/(\s+)/).filter(Boolean).map(w => /^\s+$/.test(w) ? ' '
      : `<span class="wd">${Array.from(w).map(c => `<span class="ch" style="--i:${ci++}">${esc(c)}</span>`).join('')}</span>`).join('');
    const sec = (id, icon, title, hint, inner) =>
      `<section class="card reveal" id="${id}"><div class="sec-ic" aria-hidden="true">${icon}</div><h2>${title}</h2>${hint ? `<p class="hint">${hint}</p>` : ''}${inner}</section>`;

    const moments = (d.moments || []).filter(m => S(m.photo));
    const reasons = (d.reasons || []).filter(r => r.text && String(r.text).trim());
    const wishes = (d.wishes || []).filter(w => w.text && String(w.text).trim());
    const quiz = (d.quiz || []).filter(q => q.question && q.answer && q.wrong1);
    const parts = [], dots = [['s-top', 'Start']];

    // Cake (always shown)
    const nC = age ? Math.min(age, 10) : 5;
    parts.push(sec('s-cake', '🎂', 'Light the candles', 'Tap each candle to light it, then make a wish', `
      <div class="cake3"><div class="candles">${Array.from({ length: nC }, (_, i) =>
        `<button class="cdl" type="button" aria-pressed="false" aria-label="Light candle ${i + 1}"><i class="flame"></i><i class="smoke"></i></button>`).join('')}</div>
        <div class="tier t3"></div><div class="tier t2"></div><div class="tier t1">${age ? `<span class="agetxt">${age}</span>` : ''}</div><div class="plate"></div></div>
      <div class="cake-row"><button class="btn blow" id="blow" type="button" disabled>Hold to blow 🌬️</button><button class="btn ghost small" id="lightAll" type="button">Light them all</button></div>
      <p class="cake-msg" id="cakeMsg" aria-live="polite"></p>`));
    dots.push(['s-cake', 'Cake']);

    if (d.letter && String(d.letter).trim()) {
      parts.push(sec('s-letter', '📜', 'A letter for you', 'Tap the seal to unroll it', `
        <div class="scroll" id="scroll" role="button" tabindex="0" aria-expanded="false" aria-label="Open the letter">
          <div class="roller"></div><div class="parch"><div class="parch-in"><p class="ltext" id="ltext" data-text="${esc(d.letter)}"></p><p class="lsig">— ${from}</p></div></div><div class="roller"></div>
          <div class="seal" aria-hidden="true">${esc(Array.from(d.from || '♥')[0].toUpperCase())}</div>
        </div>`));
      dots.push(['s-letter', 'Letter']);
    }
    if (moments.length) {
      parts.push(sec('s-moments', '📸', 'Our moments', 'Swipe the photo, or tap the arrows', `
        <div class="stack" id="stack">${moments.map(m => `<figure class="sc"><img src="${esc(S(m.photo))}" alt="${esc(m.caption || 'Photo')}" draggable="false">${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ''}</figure>`).join('')}</div>
        <div class="stack-ctl"><button class="round" id="prevM" type="button" aria-label="Previous photo">↶</button><span id="mCount" aria-live="polite"></span><button class="round" id="nextM" type="button" aria-label="Next photo">→</button></div>`));
      dots.push(['s-moments', 'Photos']);
    }
    if (reasons.length) {
      const cols = ['var(--accent)', 'var(--accent2)', '#ffd23f', '#3ec1ff', '#7cd67c', '#ff8a3d'];
      const rows = Math.ceil(reasons.length / 4);
      parts.push(sec('s-reasons', '🎈', 'Reasons you’re amazing', `Pop the balloons · <b id="popCount">0</b> of ${reasons.length}`, `
        <div class="sky" style="height:${rows * 100 + 110}px">${reasons.map((r, i) => {
          const row = Math.floor(i / 4);
          return `<button class="bal" type="button" aria-label="Pop balloon ${i + 1}" data-reason="${esc(r.text)}" style="--c:${cols[i % cols.length]};--d:${(2.2 + (i % 3) * .5).toFixed(1)}s;left:${4 + (i % 4) * 24 + (row % 2 ? 6 : 0)}%;top:${30 + row * 100 + (i % 2 ? 16 : 0)}px"></button>`;
        }).join('')}</div>
        <ol class="reasons" id="reasonList" aria-live="polite"></ol><p class="done-msg" id="popDone" hidden>All of them. And there are many more 💛</p>`));
      dots.push(['s-reasons', 'Reasons']);
    }
    if (wishes.length) {
      parts.push(sec('s-wishes', '🥠', 'Wishes from your people', 'Crack open each fortune cookie', `
        <div class="cookies">${wishes.map(w => `<div class="ck">
          <button class="cookie" type="button" aria-expanded="false" aria-label="Open the wish from ${esc(w.name || 'a friend')}"><span class="half l"></span><span class="half r"></span></button>
          <div class="ck-from">from ${esc(w.name || 'a friend')}</div>
          <div class="slip"><p>“${nl(w.text)}”</p><b>— ${esc(w.name || 'A friend')}</b>${S(w.voice) ? `<audio controls preload="metadata" src="${esc(S(w.voice))}"></audio>` : ''}</div></div>`).join('')}</div>`));
      dots.push(['s-wishes', 'Wishes']);
    }
    if (quiz.length) {
      parts.push(sec('s-quiz', '🧠', 'Birthday quiz', 'How well do you remember these?', `
        ${quiz.map((q, qi) => {
          const o = [[q.answer, 1], [q.wrong1, 0]].concat(q.wrong2 ? [[q.wrong2, 0]] : []);
          const k = (qi * 2 + 1) % o.length, opts = o.slice(k).concat(o.slice(0, k));
          return `<div class="q"><p class="qq">${qi + 1}. ${esc(q.question)}</p><div class="opts">${opts.map(([t, ok]) => `<button class="opt" type="button" data-ok="${ok}">${esc(t)}</button>`).join('')}</div></div>`;
        }).join('')}<p class="score" id="score" aria-live="polite"></p>`));
      dots.push(['s-quiz', 'Quiz']);
    }
    if (S(d.voice)) {
      parts.push(sec('s-voice', '📼', 'A mixtape just for you', 'Press play to hear my voice', `
        <div class="cassette" id="cass"><div class="clabel">For ${to} 💌</div><div class="cwin"><i class="reel l"></i><i class="reel r"></i></div></div>
        <div class="tbar"><i id="cassProg"></i></div>
        <div class="center"><button class="btn" id="cassPlay" type="button">▶ Play</button></div>
        <audio id="cassAudio" preload="metadata" src="${esc(S(d.voice))}"></audio>`));
      dots.push(['s-voice', 'Voice note']);
    }
    if (S(d.video)) {
      parts.push(sec('s-video', '📺', 'Now playing', 'A little video for you', `
        <div class="tv" id="tv"><i class="ant l"></i><i class="ant r"></i>
          <div class="tvbody"><div class="tvs"><video id="tvVid" playsinline preload="metadata" src="${esc(S(d.video))}"></video><canvas id="static" aria-hidden="true"></canvas>
          <button class="tvplay" id="tvPlay" type="button" aria-label="Play video">▶</button></div><div class="knobs" aria-hidden="true"><i></i><i></i><i></i></div></div></div>`));
      dots.push(['s-video', 'Video']);
    }
    parts.push(`<section class="card finale reveal" id="s-final"><div class="sec-ic" aria-hidden="true">🌠</div><h2>Send a wish to the stars</h2>
      <p class="hint">Type a secret wish. It stays on your device, nobody else sees it.</p>
      <form class="wishform" id="wishForm"><input id="wishIn" maxlength="120" placeholder="I wish…" aria-label="Your wish" autocomplete="off"><button class="btn" type="submit">Send ✨</button></form>
      <p class="hint" id="wishMsg" aria-live="polite" style="margin-top:8px"></p>
      <div class="sky2" id="sky2" aria-hidden="true"></div>
      <p class="sign">With love, ${from}</p>
      <button class="btn ghost small" id="replay" type="button" style="margin-top:18px">↺ Replay the surprise</button></section>`);
    dots.push(['s-final', 'Your wish']);

    const hero = `<header class="hero" id="s-top">
      <p class="pre">${date ? date + ' · ' : ''}it's your day</p>
      <h1 class="bounce">${chars(d.headline || 'Happy Birthday')}</h1>
      <div class="ribbon"><span>${to}</span></div>
      ${age ? `<div class="agebig" aria-label="Turning ${age}"><i class="agering"></i><span>${age}</span></div>` : ''}
      <a class="cue" href="#s-cake">Scroll for your surprises <span>↓</span></a></header>`;

    const cdDate = date || 'the big day';
    const cdTime = esc(friendlyTime(/^\d{2}:\d{2}$/.test(d.time || '') ? d.time : '00:00'));
    const gates = `
<section class="gate2" id="cd" hidden aria-live="polite">
  <div class="cd-gift" aria-hidden="true">🎁</div>
  <h2 id="cdTitle">Something special is waiting for ${to}</h2>
  <div class="cd-grid">${[['cdD', 'days'], ['cdH', 'hours'], ['cdM', 'mins'], ['cdS', 'secs']].map(([id, l]) => `<div class="cd-box"><b id="${id}">00</b><small>${l}</small></div>`).join('')}</div>
  <div class="cd-big" id="cdBig" aria-hidden="true"></div>
  <p class="hint cd-when">to go · opens ${cdDate} at ${cdTime}</p>
  ${opts.preview ? '<div class="cd-pv"><button class="btn ghost small" id="cdTen" type="button">▶ Test the last 10 seconds</button><button class="btn ghost small" id="cdSkip" type="button">Skip countdown</button><small>Preview only. The recipient won’t see these buttons.</small></div>' : ''}
</section>
<section class="gate2" id="scr" hidden>
  <p class="pre">${from} sent you a scratch card</p>
  <div class="scratch"><div class="under"><div class="u-pre">Happy Birthday</div><div class="u-name">${to}</div>${age ? `<div class="u-age">${age}</div>` : ''}</div><canvas id="foil" aria-hidden="true"></canvas></div>
  <p class="hint" id="scrHint">Scratch the card with your finger or mouse ✨</p>
  <button class="btn ghost small" id="reveal" type="button">Or tap here to reveal</button>
</section>`;

    const vars = [`--bg:${th.bg}`, `--text:${th.text}`, `--accent:${th.accent}`, `--accent2:${th.accent2}`, `--card:${th.card}`, `--solid:${th.solid}`,
      `--btn:${th.btn}`, `--fh:${th.fh}`, `--fb:${th.fb}`, `--c1:${th.cake[0]}`, `--c2:${th.cake[1]}`, `--c3:${th.cake[2]}`, `--icing:${th.icing}`].join(';');
    const nonce = opts.nonce ? ` nonce="${esc(opts.nonce)}"` : '';
    const music = MUSIC.some(m => m.v === d.music) ? d.music : 'musicbox';
    const made = opts.homeUrl ? `<p class="made">Made with <a href="${esc(opts.homeUrl)}">WishCraft</a></p>` : '';

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="${esc(th.accent)}"><title>Happy Birthday, ${to}</title>
<meta property="og:title" content="Happy Birthday, ${to} 🎂"><meta property="og:description" content="${from} made a birthday surprise for you">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Pacifico&family=Playfair+Display:wght@600&family=Fredoka:wght@500;600&family=Righteous&family=Caveat:wght@600&family=Audiowide&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Great+Vibes&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body class="sp th-${th.id}${th.dark ? ' dark' : ''}" style="${esc(vars)}" data-fx="${esc(JSON.stringify(th.fx))}"${th.conf ? ` data-conf="${esc(JSON.stringify(th.conf))}"` : ''} data-date="${esc(d.date || '')}" data-time="${esc(d.time || '')}" data-music="${music}">
<canvas id="fx" aria-hidden="true"></canvas><canvas id="fx2" aria-hidden="true"></canvas>
<div class="prog" aria-hidden="true"><i id="progBar"></i></div>
${gates}
<nav class="dots" aria-label="Sections">${dots.map(([id, l]) => `<a href="#${id}" data-l="${l}" aria-label="${l}"></a>`).join('')}</nav>
<main>${hero}${parts.join('')}${made}</main>
<button class="mute" id="mute" type="button" hidden aria-label="Turn music off">🔊</button>
<div class="lb" id="lb"><img alt="Enlarged photo"></div>
<script${nonce}>(${H.fxEngine.toString()})();(${surpriseRuntime.toString()})();<\/script>
</body></html>`;
  }

  return { THEMES, MUSIC, template, render, friendlyTime };
});
