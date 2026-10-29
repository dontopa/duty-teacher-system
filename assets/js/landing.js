/* SIGAP — interaksi & motion landing page */
(function () {
  paintIcons();
  document.getElementById('yr').textContent = new Date().getFullYear();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Nav + bar kemajuan skrol */
  const nav = document.getElementById('nav');
  const prog = document.querySelector('.scroll-progress');
  const flow = document.getElementById('flow');
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 10);
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    if (flow) {
      const r = flow.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height));
      flow.style.setProperty('--p', p.toFixed(3));
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Kiraan nombor */
  function countUp(el) {
    const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1400;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = (to * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* Reveal semasa skrol */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('.count').forEach(countUp);
      if (en.target.classList.contains('count')) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    if (el.closest('.flow')) el.style.setProperty('--d', (i % 3) * 0.08 + 's');
    io.observe(el);
  });

  /* Perkataan bergilir dalam tajuk */
  const words = ['done faster.', 'neatly organised.', 'paper-free.', 'approved instantly.'];
  const rot = document.querySelector('.rot-word');
  let wi = 0;
  if (!reduce) setInterval(() => {
    rot.classList.add('out');
    setTimeout(() => { wi = (wi + 1) % words.length; rot.textContent = words[wi]; rot.classList.remove('out'); rot.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => rot.classList.remove('enter'))); }, 350);
  }, 2600);

  /* Kesan condong (tilt) mockup mengikut tetikus */
  const tilt = document.getElementById('tilt');
  if (tilt && !reduce && matchMedia('(pointer:fine)').matches) {
    const mock = tilt.querySelector('.mock');
    tilt.addEventListener('mousemove', e => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      mock.style.transform = 'rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg)';
    });
    tilt.addEventListener('mouseleave', () => { mock.style.transform = ''; });
  }
})();
