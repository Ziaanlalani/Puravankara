/* Puravankara — motion layer.
   Re-implements, with plain GSAP/Lenis/Swiper, what the Gerax Webflow build did with IX2:
   loader + hero reveal, menu overlay, day/night switch, parallax, split-text reveals, counters, timeline. */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const isMobile = () => window.innerWidth <= 991;
  const ease = 'expo.out';

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll (same settings as Gerax scrollType.js) ---------- */
  let lenis = null;
  try {
    lenis = new Lenis({ duration: 0.5, easing: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      direction: 'vertical', smooth: true, smoothTouch: false, touchMultiplier: 0.5 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch (e) { /* native scroll fallback */ }
  const stopScroll = () => { lenis && lenis.stop(); document.documentElement.style.overflow = 'hidden'; };
  const startScroll = () => { lenis && lenis.start(); document.documentElement.style.overflow = ''; };

  /* ---------- day / night (Gerax summer / winter switch) ---------- */
  const readMode = () => { try { return localStorage.getItem('pv-mode') || 'summer'; } catch (e) { return 'summer'; } };
  function fade(el, visible, display) {
    el.style.transition = 'opacity 250ms ease-in-out';
    if (visible) { el.style.display = display; el.style.opacity = '0'; setTimeout(() => (el.style.opacity = '1'), 10); }
    else { el.style.opacity = '0'; setTimeout(() => { if (el.style.opacity === '0') el.style.display = 'none'; }, 250); }
  }
  function setMode(mode, instant) {
    document.documentElement.dataset.mode = mode;
    [['.is-summer', 'block'], ['.is-winter', 'block'], ['.is-summer-flex', 'flex'], ['.is-winter-flex', 'flex']].forEach(([sel, disp]) => {
      $$(sel).forEach(el => {
        const vis = sel.includes(mode);
        if (instant) { el.style.display = vis ? disp : 'none'; el.style.opacity = vis ? 1 : 0; } else fade(el, vis, disp);
      });
    });
    const summer = mode === 'summer';
    $$('.body').forEach(b => { b.style.transition = 'background-color 300ms ease'; b.style.backgroundColor = summer ? '#F6F1EB' : '#EBEFF6'; });
    $$('.hero-about').forEach(b => { b.style.transition = 'background-color 300ms ease'; b.style.backgroundColor = summer ? '#140d07' : '#EBEFF6'; });
    $$('.change-color-on-toggle').forEach(e => { e.style.transition = 'color 300ms ease'; e.style.color = summer ? 'white' : 'black'; });
    const map = {
      summer: { '.chapter-change': ['backgroundColor', '#140d07'], '.line-change': ['backgroundColor', 'white'], '.years-change': ['backgroundImage', 'linear-gradient(#fff0, #fff 50%, #fff0)'] },
      winter: { '.chapter-change': ['backgroundColor', '#EBEFF6'], '.line-change': ['backgroundColor', 'black'], '.years-change': ['backgroundImage', 'linear-gradient(#0000, #000 50%, #0000)'] }
    }[mode];
    Object.entries(map).forEach(([sel, [prop, val]]) => $$(sel).forEach(e => { e.style.transition = prop + ' 300ms ease'; e.style[prop] = val; }));
    $('.nav') && $('.nav').classList.toggle('is-winter-menu', !summer);
    try { localStorage.setItem('pv-mode', mode); } catch (e) {}
  }
  setMode(readMode(), true);
  const toggle = $('.toggle-switch');
  toggle && toggle.addEventListener('click', () => setMode(readMode() === 'summer' ? 'winter' : 'summer'));

  /* ---------- menu overlay ---------- */
  const nav = $('.nav'), overlay = $('.menu-overlay'), menuBtn = $('.menu-button');
  let menuOpen = false, menuBusy = false;
  const menuLinks = () => $$('.menu-wrap:not([style*="display: none"]) .link-item, .menu-wrap:not([style*="display: none"]) .menu-contact-items .link-item');
  if (overlay) gsap.set(overlay, { y: 0 });
  function openMenu() {
    if (menuBusy) return; menuBusy = true; menuOpen = true;
    nav.classList.add('menu-open'); stopScroll();
    const items = $$('.menu-link .link-item, .menu-bottom-links .link-item, .side-info .text-style-label');
    gsap.set(items, { yPercent: 110, opacity: 0 });
    gsap.timeline({ onComplete: () => (menuBusy = false) })
      .to(overlay, { y: '100vh', duration: 0.9, ease: 'expo.inOut' })
      .to(items, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.04, ease }, 0.35)
      .fromTo('.menu-images-wrap', { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 1.1, ease }, 0.4);
  }
  function closeMenu() {
    if (menuBusy || !menuOpen) return; menuBusy = true; menuOpen = false;
    gsap.timeline({ onComplete: () => { menuBusy = false; nav.classList.remove('menu-open'); startScroll(); } })
      .to(overlay, { y: 0, duration: 0.8, ease: 'expo.inOut' });
    nav.classList.remove('menu-open');
  }
  menuBtn && menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  // menu image follows hovered link (Gerax: first..third, about, contact)
  $$('.menu-wrap').forEach(w => {
    const imgs = {}; $$('.menu-images-wrap .image-inner', w).forEach(i => { ['is-first', 'is-second', 'is-third', 'is-about', 'is-contact', 'initial'].forEach(c => i.classList.contains(c) && (imgs[c] = i)); });
    $$('.menu-link[data-img]', w).forEach(l => {
      l.addEventListener('mouseenter', () => { Object.values(imgs).forEach(i => i.classList.remove('show')); imgs[l.dataset.img] && imgs[l.dataset.img].classList.add('show'); });
      l.addEventListener('mouseleave', () => Object.values(imgs).forEach(i => i.classList.remove('show')));
    });
  });
  $$('.menu-link').forEach(l => l.addEventListener('click', () => { if (l.getAttribute('href') && l.getAttribute('href').startsWith('#')) closeMenu(); }));

  /* ---------- text splitting ---------- */
  function splitChars(el) {
    const txt = el.textContent; el.setAttribute('aria-label', txt);
    const nodes = Array.from(el.childNodes); el.textContent = '';
    const chars = [];
    nodes.forEach(n => {
      if (n.nodeType === 1 && n.tagName === 'BR') { el.appendChild(document.createElement('br')); return; }
      n.textContent.split(/(\s+)/).forEach(w => {
        if (w === '') return;
        if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(' ')); return; }
        const word = document.createElement('span'); word.className = 'split-word'; word.setAttribute('aria-hidden', 'true');
        Array.from(w).forEach(ch => { const c = document.createElement('span'); c.className = 'split-char'; c.textContent = ch; word.appendChild(c); chars.push(c); });
        el.appendChild(word);
      });
    });
    return chars;
  }
  function splitLines(el) {
    // wrap words, group by rendered line, reveal line by line
    const html = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = '';
    const words = [];
    html.forEach((part, i) => {
      const tmp = document.createElement('div'); tmp.innerHTML = part;
      tmp.textContent.split(/\s+/).filter(Boolean).forEach(w => {
        const s = document.createElement('span'); s.className = 'split-word'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' ')); words.push(s);
      });
      if (i < html.length - 1) el.appendChild(document.createElement('br'));
    });
    return words;
  }
  function lineGroups(words) {
    const groups = []; let top = null;
    words.forEach(w => { const t = Math.round(w.getBoundingClientRect().top); if (top === null || Math.abs(t - top) > 4) { groups.push([]); top = t; } groups[groups.length - 1].push(w); });
    return groups;
  }

  /* ---------- scroll reveals ---------- */
  function initScroll() {
    // headings: character rise (Gerax data-effect9 / splitting)
    $$('[data-splitting]').forEach(el => {
      const chars = splitChars(el); el.dataset.splitReady = '1';
      gsap.set(chars, { yPercent: 90, opacity: 0 });
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => gsap.to(chars, { yPercent: 0, opacity: 1, duration: 1, stagger: 0.018, ease }) });
    });
    // paragraphs: line reveal (Gerax data-a-split="line")
    $$('[data-a-split="line"]').forEach(el => {
      const words = splitLines(el);
      requestAnimationFrame(() => {
        const groups = lineGroups(words);
        gsap.set(words, { opacity: 0, y: 14 });
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => groups.forEach((g, i) => gsap.to(g, { opacity: 1, y: 0, duration: 0.9, delay: i * 0.09, ease })) });
      });
    });
    // labels / buttons / blocks: 15px fade-up
    $$('[data-fade]').forEach(el => {
      if (el.closest('.hero-contents')) return;
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease, delay: parseFloat(el.dataset.delay || 0) }) });
    });
    // image parallax
    $$('.image-inner.parallax').forEach(img => gsap.fromTo(img, { yPercent: 0 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('.image-inner.large-parallax').forEach(img => gsap.fromTo(img, { yPercent: 0 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: img.closest('section') || img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('.image-inner.in-scroll-trigger').forEach(img => gsap.to(img, { yPercent: 14, scale: 1.08, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top top', end: 'bottom top', scrub: true } }));
    // masked image reveals
    $$('.image-reveal').forEach(el => gsap.to(el, { scaleX: 0, transformOrigin: 'right center', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: el.parentElement, start: 'top 80%', once: true } }));
    // CTA image scale
    $$('.image-inner.scale').forEach(img => gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.cta'), start: 'top bottom', end: 'bottom 40%', scrub: true } }));
    // custom-image stagger drift
    $$('.custom-image-1, .custom-image-2').forEach((el, i) => gsap.fromTo(el, { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }));
    // big "years" counter: digits roll up inside their masks, line sweeps
    $$('.years-of-experience').forEach(wrap => {
      const digits = $$('.year', wrap), line = $('.years-line', wrap);
      gsap.set(digits, { yPercent: 120 });
      ScrollTrigger.create({ trigger: wrap, start: 'top 75%', once: true, onEnter: () => {
        gsap.to(digits, { yPercent: 0, duration: 1.6, stagger: 0.18, ease: 'expo.out' });
      } });
      if (line) gsap.fromTo(line, { yPercent: -40 }, { yPercent: 40, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // number counters
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const el = en.target, target = parseFloat(el.dataset.count), dur = 2200, t0 = performance.now();
      const step = t => { const p = Math.min((t - t0) / dur, 1); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString('en-IN'); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.4 });
    $$('[data-count]').forEach(el => io.observe(el));
    // nav contrast: sections declare data-nav="light|dark"
    const navEl = $('.nav');
    if (navEl) $$('[data-nav]').forEach(sec => ScrollTrigger.create({
      trigger: sec, start: 'top 60px', end: 'bottom 60px',
      onToggle: s => { if (s.isActive) navEl.classList.toggle('on-light', sec.dataset.nav === 'dark'); }
    }));
  }

  /* ---------- swiper (city slider) ---------- */
  function initSwiper() {
    if (!window.Swiper || !$('.swiper')) return;
    new Swiper('.swiper', { loop: false, direction: 'horizontal', slidesPerView: 2, spaceBetween: 36, speed: 750, allowTouchMove: true,
      breakpoints: { 320: { slidesPerView: 1.2, spaceBetween: 10 }, 480: { slidesPerView: 1.2, spaceBetween: 10 }, 768: { slidesPerView: 2, spaceBetween: 36 } } });
  }

  /* ---------- custom cursors (drag / view) ---------- */
  function initCursors() {
    if (isMobile() || !matchMedia('(hover:hover)').matches) return;
    [['swiper-wrapper', 'Drag'], ['cursor-goto', 'View'], ['object-category', 'View'], ['listing', 'View']].forEach(([cls, label]) => {
      const els = $$('.' + cls); if (!els.length) return;
      const c = document.createElement('div'); c.className = 'cursor-image'; c.textContent = label;
      c.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;pointer-events:none;transform:translate(-50%,-50%) scale(0);transition:transform .3s ease';
      document.body.appendChild(c);
      let tx = 0, ty = 0, cx = 0, cy = 0;
      document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
      (function loop() { cx += (tx - cx) * 0.3; cy += (ty - cy) * 0.3; c.style.left = cx + 'px'; c.style.top = cy + 'px'; requestAnimationFrame(loop); })();
      els.forEach(el => { el.addEventListener('mouseenter', () => (c.style.transform = 'translate(-50%,-50%) scale(1)')); el.addEventListener('mouseleave', () => (c.style.transform = 'translate(-50%,-50%) scale(0)')); });
    });
  }

  /* ---------- timeline (About) ---------- */
  function initTimeline() {
    const wrap = $('.horizontal-scroll'), track = $('.track'); if (!wrap || !track) return;
    if (isMobile()) { gsap.set(track, { x: 0 }); }
    const bar = $('.tl-progress i');
    const sizeWrap = () => { wrap.style.height = (track.scrollWidth - window.innerWidth + window.innerHeight) + 'px'; };
    sizeWrap(); ScrollTrigger.addEventListener('refreshInit', sizeWrap);
    gsap.to(track, { x: () => -(track.scrollWidth - window.innerWidth), ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true,
        onUpdate: s => {
          bar && (bar.style.width = s.progress * 100 + '%');
          const chs = $$('.tl-chapter', track); const n = chs.length;
          const cur = chs[Math.min(n - 1, Math.max(0, Math.round(s.progress * (n - 1))))];
          const navEl = $('.nav'); if (navEl && cur) navEl.classList.toggle('on-light', cur.classList.contains('is-cream'));
        } } });
  }

  /* ---------- listings filter ---------- */
  function initFilter() {
    const list = $('.listings-list'); if (!list) return;
    const items = $$('.listing', list), checks = $$('.location input'), pills = $$('.type-pill'), count = $('.listing-count'), empty = $('.empty-note');
    let type = (location.hash || '').replace('#', '').toLowerCase(); if (!['residential', 'commercial'].includes(type)) type = 'all';
    const apply = () => {
      const cities = checks.filter(c => c.checked).map(c => c.value);
      let n = 0;
      items.forEach(it => { const ok = (!cities.length || cities.includes(it.dataset.city)) && (type === 'all' || it.dataset.type.toLowerCase() === type); it.hidden = !ok; if (ok) n++; });
      count && (count.textContent = n + (n === 1 ? ' project' : ' projects'));
      empty && (empty.style.display = n ? 'none' : 'block');
      $$('.check').forEach(c => c.classList.toggle('w--redirected-checked', c.parentElement.querySelector('input').checked));
      $$('.location .check-field').forEach(f => f.classList.toggle('is-active', f.querySelector('input').checked));
      pills.forEach(p => p.classList.toggle('active', p.dataset.type === type));
      ScrollTrigger.refresh();
    };
    checks.forEach(c => c.addEventListener('change', apply));
    pills.forEach(p => p.addEventListener('click', () => { type = p.dataset.type; apply(); }));
    apply();
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    $$('.faq-item').forEach(it => {
      const q = $('.faq-q', it), a = $('.faq-a', it);
      q.addEventListener('click', () => {
        const open = it.classList.toggle('open'); q.setAttribute('aria-expanded', open);
        gsap.to(a, { height: open ? 'auto' : 0, duration: 0.7, ease: 'expo.out', onUpdate: () => ScrollTrigger.refresh() });
      });
    });
  }

  /* ---------- forms (front-end only) ---------- */
  function initForms() {
    $$('.form-container form').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); f.closest('.form-container').classList.add('done'); ScrollTrigger.refresh(); }));
    $$('.button .hidden-submit').forEach(b => b.addEventListener('click', e => { const f = b.closest('form'); if (f && f.reportValidity()) f.requestSubmit(); e.preventDefault(); }));
  }

  /* ---------- page intro ---------- */
  function intro() {
    const loader = $('.loading-wrapper');
    const heroH = $('.hero-contents h1'), heroBtn = $('.hero-contents .button'), play = $('.video-wrapper');
    const cleanups = () => { startScroll(); initScroll(); ScrollTrigger.refresh(); };

    if (!loader) {                                   // inner pages: quick reveal
      nav && nav.classList.add('is-hidden');
      gsap.delayedCall(0.1, () => nav && nav.classList.remove('is-hidden'));
      initScroll();
      const first = $$('[data-intro]');
      gsap.fromTo(first, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12, ease, delay: 0.15 });
      return;
    }

    // Home: loading counter -> hero image stack -> heading
    stopScroll();
    nav.classList.add('is-hidden');
    const num = $('[counter-element="number"]', loader);
    const order = ['is-fifth', 'is-fourth', 'is-third', 'is-second', 'is-first'].map(c => $('.hero-images-wrapper .' + c)).filter(Boolean);
    const chars = splitChars(heroH);
    gsap.set(chars, { yPercent: 110, opacity: 0 });
    gsap.set(heroBtn, { opacity: 0, y: 15 });
    const cnt = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.fromTo('.loading-line', { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 3.2 }, 0)
      .to(cnt, { v: 100, duration: 3.2, onUpdate: () => (num.textContent = Math.round(cnt.v)) }, 0)
      .fromTo('.loading-top', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease }, 0);
    order.forEach((im, i) => tl.fromTo(im, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power1.out' }, 0.35 + i * 0.6));
    tl.to(loader, { opacity: 0, y: -10, duration: 0.6 }, 3.5);
    // real video present? fade the stack away to reveal it; otherwise keep the lead image
    if ($('.hero-images-wrapper video')) order.slice().reverse().forEach((im, i) => tl.to(im, { opacity: 0, duration: 0.7 }, 3.6 + i * 0.12));
    tl.to(chars, { yPercent: 0, opacity: 1, duration: 1.3, stagger: 0.035, ease }, 3.55)
      .to(heroBtn, { opacity: 1, y: 0, duration: 1, ease }, 4.0)
      .to(play, { opacity: 1, duration: 1, ease }, 4.2)
      .add(() => nav.classList.remove('is-hidden'), 3.9)
      .add(cleanups, 4.0);
    // safety: never leave the page locked
    setTimeout(startScroll, 6500);
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const y = new Date().getFullYear(); $$('.current-year').forEach(e => (e.textContent = y));
    initSwiper(); initCursors(); initTimeline(); initFilter(); initFaq(); initForms();
    intro();
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
