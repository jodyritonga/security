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

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
        navigation.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
        toggle.focus();
      }
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

  const fractureTrigger = document.querySelector('#fracture-trigger');
  const fractureViewport = document.querySelector('#fracture-viewport');
  const fractureCount = fractureTrigger?.querySelector('.fracture-count');
  const fractureState = fractureViewport?.querySelector('.fracture-state');
  const dragonReveal = document.querySelector('#dragon-reveal');
  const dragonDismiss = dragonReveal?.querySelector('.dragon-dismiss');

  if (fractureTrigger && fractureViewport && fractureCount && fractureState && dragonReveal && dragonDismiss) {
    let crackLevel = 0;
    let revealTimer = 0;
    let strikeTimer = 0;
    const fractureStates = ['SEALED / 00', 'HAIRLINE / 01', 'WIDENING / 02', 'BREACHED / 03'];

    const pulseFracture = () => {
      window.clearTimeout(strikeTimer);
      fractureViewport.classList.remove('is-struck');
      void fractureViewport.offsetWidth;
      fractureViewport.classList.add('is-struck');
      strikeTimer = window.setTimeout(() => fractureViewport.classList.remove('is-struck'), 420);
    };

    const setCrackLevel = (level, { strike = false } = {}) => {
      crackLevel = level;
      fractureTrigger.dataset.crackLevel = String(level);
      fractureViewport.dataset.crackLevel = String(level);
      fractureCount.textContent = `${level} / 3`;
      fractureState.textContent = fractureStates[level];
      fractureTrigger.setAttribute('aria-label', level === 3
        ? 'The large fracture is fully open. The dragon is awake.'
        : `Large fractured object. ${level} of 3 fractures open. Click again.`);
      if (strike) pulseFracture();
    };

    const wakeDragon = () => {
      window.clearTimeout(revealTimer);
      dragonReveal.classList.add('is-awake');
      dragonReveal.setAttribute('aria-hidden', 'false');
      fractureTrigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('dragon-awake');
      window.dispatchEvent(new CustomEvent('dragon:wake'));
      revealTimer = window.setTimeout(() => dragonDismiss.focus({ preventScroll: true }), reducedMotion ? 80 : 720);
    };

    const resealFracture = () => {
      if (!dragonReveal.classList.contains('is-awake')) return;
      window.clearTimeout(revealTimer);
      dragonReveal.classList.remove('is-awake');
      dragonReveal.setAttribute('aria-hidden', 'true');
      fractureTrigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('dragon-awake');
      window.dispatchEvent(new CustomEvent('dragon:sleep'));
      window.setTimeout(() => {
        setCrackLevel(0);
        fractureTrigger.focus();
      }, reducedMotion ? 0 : 380);
    };

    fractureTrigger.addEventListener('click', () => {
      if (dragonReveal.classList.contains('is-awake')) return;
      const nextLevel = Math.min(3, crackLevel + 1);
      setCrackLevel(nextLevel, { strike: true });
      if (nextLevel === 3) revealTimer = window.setTimeout(wakeDragon, reducedMotion ? 0 : 440);
    });

    dragonDismiss.addEventListener('click', resealFracture);
    dragonReveal.addEventListener('click', (event) => {
      if (event.target === dragonReveal) resealFracture();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') resealFracture();
      if (event.key === 'Tab' && dragonReveal.classList.contains('is-awake')) {
        event.preventDefault();
        dragonDismiss.focus();
      }
    });
  }

  if (hero && !reducedMotion) {
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      const pointerX = ((event.clientX - bounds.left) / bounds.width) - 0.5;
      const pointerY = ((event.clientY - bounds.top) / bounds.height) - 0.5;
      hero.style.setProperty('--pointer-x', pointerX.toFixed(3));
      hero.style.setProperty('--pointer-y', pointerY.toFixed(3));
    });

    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--pointer-x', '0');
      hero.style.setProperty('--pointer-y', '0');
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
