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
  const fractureAction = fractureTrigger?.querySelector('.fracture-action');
  const fractureMode = fractureTrigger?.querySelector('.fracture-trigger-copy small');
  const fractureState = fractureViewport?.querySelector('.fracture-state');
  const dragonCanvas = document.querySelector('#dragon-canvas');

  if (fractureTrigger && fractureViewport && fractureCount && fractureAction && fractureMode && fractureState && dragonCanvas) {
    let crackLevel = 0;
    let revealTimer = 0;
    let strikeTimer = 0;
    let transforming = false;
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
      fractureAction.textContent = 'click the fracture';
      fractureMode.textContent = 'Interactive breach';
      fractureState.textContent = fractureStates[level];
      fractureTrigger.setAttribute('aria-label', level === 3
        ? 'The large fracture is fully open and transforming into a dragon.'
        : `Large fractured object. ${level} of 3 fractures open. Click again.`);
      if (strike) pulseFracture();
    };

    const wakeDragon = () => {
      window.clearTimeout(revealTimer);
      transforming = false;
      fractureViewport.classList.add('is-dragon-awake');
      dragonCanvas.setAttribute('aria-hidden', 'false');
      fractureTrigger.setAttribute('aria-expanded', 'true');
      fractureTrigger.setAttribute('aria-label', 'Interactive 3D dragon. Move the cursor to make it follow you. Click to reseal.');
      fractureCount.textContent = 'AWAKE';
      fractureAction.textContent = 'move cursor · click to reseal';
      fractureMode.textContent = 'Tracking entity';
      fractureState.textContent = 'ENTITY / TRACKING';
      window.dispatchEvent(new CustomEvent('dragon:wake'));
    };

    const resealFracture = () => {
      if (!fractureViewport.classList.contains('is-dragon-awake')) return;
      window.clearTimeout(revealTimer);
      fractureViewport.classList.remove('is-dragon-awake');
      fractureTrigger.setAttribute('aria-expanded', 'false');
      fractureAction.textContent = 'resealing';
      window.setTimeout(() => {
        dragonCanvas.setAttribute('aria-hidden', 'true');
        window.dispatchEvent(new CustomEvent('dragon:sleep'));
        setCrackLevel(0);
        fractureTrigger.focus();
      }, reducedMotion ? 0 : 560);
    };

    fractureTrigger.addEventListener('click', () => {
      if (fractureViewport.classList.contains('is-dragon-awake')) {
        resealFracture();
        return;
      }
      if (transforming) return;
      const nextLevel = Math.min(3, crackLevel + 1);
      setCrackLevel(nextLevel, { strike: true });
      if (nextLevel === 3) {
        transforming = true;
        revealTimer = window.setTimeout(wakeDragon, reducedMotion ? 0 : 440);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') resealFracture();
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
