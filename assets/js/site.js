(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.site-nav');

  if (toggle && navigation) {
    toggle.addEventListener('click', () => {
      const open = navigation.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });

    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navigation.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
      });
    });
  }

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty('--scroll', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  const hero = document.querySelector('.hero');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hero && !reducedMotion) {
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      const pointerX = ((event.clientX - bounds.left) / bounds.width) - 0.5;
      const pointerY = ((event.clientY - bounds.top) / bounds.height) - 0.5;
      hero.style.setProperty('--pointer-x', pointerX.toFixed(3));
      hero.style.setProperty('--pointer-y', pointerY.toFixed(3));
    });
  }

  const revealTargets = document.querySelectorAll('.research-card, .discovery-row, .method-grid article, .method-detail article, .experience-list article');

  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealTargets.forEach((target, index) => {
      target.classList.add('reveal-item');
      target.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 70}ms`);
      observer.observe(target);
    });
  }
})();
