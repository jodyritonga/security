(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Header: a hairline once the page slides underneath, and the red thread as a
  // reading-progress line along its foot.
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    const max = root.scrollHeight - window.innerHeight;
    header.style.setProperty('--progress', `${max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0}%`);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // Reveal blocks as they enter the viewport (or if they are already above it).
  const revealTargets = document.querySelectorAll('.reveal, [data-board]');
  const showAll = () => revealTargets.forEach((element) => element.classList.add('is-visible'));
  try {
    if (!('IntersectionObserver' in window) || reduceMotion) throw new Error('no observer');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealTargets.forEach((element) => observer.observe(element));
  } catch (_) {
    showAll();
  }

  // Evidence board: a red thread stitched from pin to pin, drawn behind the cards.
  document.querySelectorAll('[data-board]').forEach((board) => {
    const path = board.querySelector('.board-thread path');
    const cards = [...board.querySelectorAll('.card')];
    if (!path || cards.length < 2) return;
    const stitch = () => {
      const origin = board.getBoundingClientRect();
      const points = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 - origin.left, y: rect.top - origin.top + 1 };
      });
      let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const sag = Math.min(48, Math.hypot(b.x - a.x, b.y - a.y) * 0.16);
        const cx = (a.x + b.x) / 2;
        const cy = Math.max(a.y, b.y) - Math.abs(b.y - a.y) * 0.1 + sag;
        d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      path.setAttribute('d', d);
      path.style.setProperty('--len', path.getTotalLength().toFixed(0));
    };
    stitch();
    if ('ResizeObserver' in window) new ResizeObserver(stitch).observe(board);
    window.addEventListener('load', stitch);
    board.addEventListener('transitionend', (event) => { if (event.propertyName === 'transform') stitch(); });
  });

  // The hero lens: a magnifier that follows the pointer over the collage.
  const art = document.querySelector('[data-lens]');
  if (art && finePointer) {
    const img = art.querySelector('img');
    const lens = art.querySelector('.lens');
    const field = document.querySelector('.hero-field');
    const zoom = 2.1;
    const radius = 100;
    const size = () => {
      const rect = art.getBoundingClientRect();
      lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
      lens.style.backgroundSize = `${rect.width * zoom}px ${rect.height * zoom}px`;
      return rect;
    };
    let rect = size();
    window.addEventListener('resize', () => { rect = size(); });
    art.addEventListener('pointerenter', () => { rect = size(); art.classList.add('is-looking'); });
    art.addEventListener('pointerleave', () => {
      art.classList.remove('is-looking');
      if (!reduceMotion) { img.style.transform = ''; if (field) field.style.transform = ''; }
    });
    art.addEventListener('pointermove', (event) => {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      lens.style.left = `${x}px`;
      lens.style.top = `${y}px`;
      lens.style.backgroundPosition = `${radius - x * zoom}px ${radius - y * zoom}px`;
      if (reduceMotion) return;
      const dx = (x / rect.width - 0.5);
      const dy = (y / rect.height - 0.5);
      img.style.transform = `translate(${(-dx * 10).toFixed(1)}px, ${(-dy * 10).toFixed(1)}px)`;
      if (field) field.style.transform = `translate(${(dx * 8).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
    });
  }

  // Navigation drawer on small screens.
  const toggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.site-nav');
  if (!toggle || !navigation) return;
  const closeNavigation = () => {
    navigation.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Menu';
  };
  toggle.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  });
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      closeNavigation();
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target) && !toggle.contains(event.target)) closeNavigation();
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', closeNavigation);
})();
