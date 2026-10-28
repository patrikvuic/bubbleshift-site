// Motion for the Bubbleshift home page: reveals, scroll-linked depth, pointer effects and looping
// demos. Transforms and opacity only; nothing runs when the visitor prefers reduced motion.
// The try-out (section.try) is left untouched.
(() => {
  const html = document.documentElement;
  if (!html.classList.contains('motion')) return;
  const fine = matchMedia('(pointer: fine)').matches;

  // ---- Scaffolding: aurora backdrop and scroll progress ----
  const aurora = document.createElement('div');
  aurora.className = 'aurora';
  aurora.innerHTML = '<i></i><i></i><i></i>';
  document.body.prepend(aurora);
  const progress = document.createElement('div');
  progress.className = 'progress';
  document.body.append(progress);
  const bar = document.querySelector('.bar');

  // ---- Split headings into words that rise in one after another ----
  const split = el => {
    const words = el.textContent.trim().split(/\s+/);
    const glow = el.querySelector('.glow')?.textContent.trim();
    // The gradient word goes inside its own span, so only the plain outer span is animated.
    el.innerHTML = words.map((w, i) => `<span class="word" style="--i:${i}">${glow && w === glow ? `<span class="glow">${w}</span>` : w}</span>`).join(' ');
  };
  document.querySelectorAll('.hero h1, h2.section, .film-copy h2, .closing h2, .feature h2').forEach(split);

  // ---- Reveal on scroll, staggered among siblings ----
  const targets = ['h2.section', '.section-lead', '.step', '.cap', '.film-list li', '.feature', '.chips', '.local-grid > div',
                   '.closing > *', '.film-copy h2', '.feature h2'];
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    io.unobserve(el);
    // Once revealed, drop the stagger delay so hover effects respond at once.
    const done = ev => { if (ev.target === el && ev.propertyName === 'opacity') { el.classList.add('done'); el.removeEventListener('transitionend', done); } };
    el.addEventListener('transitionend', done);
  }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll(targets.join(',')).forEach(el => {
    if (el.closest('.try')) return;
    const siblings = [...el.parentElement.children].filter(c => c.matches(targets.join(',')));
    el.style.setProperty('--d', `${Math.min(siblings.indexOf(el), 12) * 70}ms`);
    el.classList.add('reveal');
    io.observe(el);
  });
  // How-it-works loops only while visible.
  const loops = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('playing', e.isIntersecting)), { threshold: 0.3 });
  document.querySelectorAll('.step').forEach(el => loops.observe(el));

  // ---- Formats: two marquee rows running in opposite directions ----
  const chips = document.querySelector('.chips');
  if (chips) {
    const items = [...chips.children];
    const half = Math.ceil(items.length / 2);
    const row = (list, reverse) => `<div class="marquee${reverse ? ' reverse' : ''}"><div class="track">${list.map(c => c.outerHTML).join('').repeat(2)}</div></div>`;
    chips.outerHTML = `<div class="chips-rows">${row(items.slice(0, half), false)}${row(items.slice(half), true)}</div>`;
  }

  // ---- Pointer: card spotlight + tilt, magnetic buttons ----
  if (fine) {
    document.querySelectorAll('.cap, .step').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`); card.style.setProperty('--my', `${y * 100}%`);
        card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`); card.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
    document.querySelectorAll('.hero .store, .hero .btn-ghost, .closing .store').forEach(btn => {
      btn.classList.add('magnetic');
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--tx', `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
        btn.style.setProperty('--ty', `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
    });
  }

  // ---- Scroll- and pointer-linked depth, in one animation frame ----
  const heroFrame = document.querySelector('.hero-frame'), floaters = [...document.querySelectorAll('.floaters i')];
  let mouseX = 0, mouseY = 0, queued = false;
  const update = () => {
    queued = false;
    const y = scrollY, h = innerHeight, max = document.documentElement.scrollHeight - h;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    bar?.classList.toggle('scrolled', y > 10);
    aurora.style.transform = `translate3d(0, ${-y * 0.08}px, 0)`;
    if (heroFrame) {
      const r = heroFrame.getBoundingClientRect(), k = Math.min(1, Math.max(0, (h - r.top) / (h * 0.9)));
      heroFrame.style.transform = `perspective(1400px) rotateX(${(1 - k) * 18}deg) scale(${0.9 + 0.1 * k})`;
    }
    floaters.forEach((f, i) => {
      const depth = (i % 3 + 1) * 0.12;
      f.style.translate = `${mouseX * depth * 40}px ${mouseY * depth * 40 - y * depth}px`;
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  if (fine) addEventListener('pointermove', e => { mouseX = e.clientX / innerWidth - 0.5; mouseY = e.clientY / innerHeight - 0.5; queue(); }, { passive: true });
  update();
  requestAnimationFrame(() => html.classList.add('ready'));
})();
