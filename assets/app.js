/* Меню Нейробара: рендер из menu.js + защита от жестов + Wake Lock + частицы + офлайн */
(function () {
  'use strict';
  const M = window.MENU, $ = id => document.getElementById(id);
  $('title').textContent = M.title; $('sub').textContent = M.subtitle; $('foot').textContent = M.footer;

  // карточки
  const grid = $('grid');
  M.cocktails.forEach((c, i) => {
    const card = document.createElement('article'); card.className = 'card';
    card.style.setProperty('--c', c.color); card.style.setProperty('--i', i);
    const g = document.createElement('div'); g.className = 'glass';
    const glow = document.createElement('i'); glow.className = 'glow';
    const img = document.createElement('img'); img.src = c.img; img.alt = ''; img.draggable = false;
    img.style.setProperty('--w', ((c.imgW || 70) * 0.17).toFixed(2));   // ширина бокала в единицах u (одинаковый размер на любом экране)
    g.append(glow, img);
    const name = document.createElement('h2'); name.className = 'name'; name.textContent = c.name;
    const alt = document.createElement('div'); alt.className = 'alt'; alt.textContent = c.alt;
    const ul = document.createElement('ul'); ul.className = 'list';
    c.ingredients.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    const taste = document.createElement('div'); taste.className = 'taste'; taste.textContent = c.taste;
    card.append(g, name, alt, ul, taste); grid.appendChild(card);
  });
  if (/[?&]still=1/.test(location.search)) document.body.classList.add('still');

  // защита: без зума, меню, жестов
  ['contextmenu', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'selectstart', 'dragstart'].forEach(ev =>
    document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  const phone = window.matchMedia('(max-width:600px) and (max-aspect-ratio:1/1)').matches;   // на телефоне меню прокручивается
  if (!phone) {
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.addEventListener('wheel', e => e.preventDefault(), { passive: false });
  }
  document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault(); });

  // экран не засыпает
  /* на первом касании: полный экран + «не засыпать» (запасной способ для старых iPad: крошечное зацикленное видео) */
  const nv = document.createElement('video');
  nv.src = 'assets/nosleep.mp4'; nv.muted = true; nv.loop = true; nv.setAttribute('playsinline', ''); nv.setAttribute('webkit-playsinline', '');
  nv.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:.02;pointer-events:none;z-index:-1';
  document.body.appendChild(nv);
  function keepAwake() { if (nv.paused) { const p = nv.play(); if (p && p.catch) p.catch(() => {}); } }
  function goFull() {
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rq && !(document.fullscreenElement || document.webkitFullscreenElement)) { try { const p = rq.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  }
  let wl = null;
  async function lock() {
    goFull(); keepAwake();
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (e) { wl = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { lock(); fx.start(); } else fx.stop(); });
  document.addEventListener('pointerdown', lock); document.addEventListener('touchend', lock);
  lock();

  // частицы: звёзды и тонкий снег (один canvas, фиксированные массивы)
  const fx = (function () {
    const cv = $('fx'), ctx = cv.getContext('2d');
    let W = 0, H = 0, raf = 0, prev = 0;
    function sprite() {
      const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, '#fff'); gr.addColorStop(.25, 'rgba(220,200,255,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
    }
    const SP = sprite(), rnd = (a, b) => a + Math.random() * (b - a);
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(2, 6), ph: rnd(0, 6.3), sp: rnd(.6, 2) }));
    const snow = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(2, 5), vy: rnd(.02, .06), ph: rnd(0, 6.3), dx: rnd(.01, .03) }));
    let lw = 0;
    function size() {
      if (lw === innerWidth && phone) return;   // на телефоне при прокрутке меняется только высота (адресная строка): не перерисовываем canvas
      lw = innerWidth; const d = Math.min(window.devicePixelRatio || 1, 1.5); W = cv.width = Math.round(innerWidth * d); H = cv.height = Math.round(innerHeight * d);
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (t - prev < 32) return;
      const dt = Math.min(.1, (t - prev) / 1000); prev = t;
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      const u = W / 1920, ts = t / 1000;
      for (const s of stars) { ctx.globalAlpha = .9 * (.35 + .65 * Math.abs(Math.sin(ts * s.sp + s.ph))); const r = s.r * u * 1.6; ctx.drawImage(SP, s.x * W - r, s.y * H - r, r * 2, r * 2); }
      for (const s of snow) {
        s.y += s.vy * dt; s.x += Math.sin(ts * .8 + s.ph) * s.dx * dt; if (s.y > 1.02) { s.y = -.02; s.x = Math.random(); }
        ctx.globalAlpha = .5; const r = s.r * u * .9; ctx.drawImage(SP, s.x * W - r, s.y * H - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    window.addEventListener('resize', size); size();
    return { start() { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); } }, stop() { cancelAnimationFrame(raf); raf = 0; } };
  })();
  fx.start();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
