/* ================================================================
   MENVI EYEWEAR — Interactions
================================================================ */

(function () {
  'use strict';

  // ============ LOADER · animated counter + premium exit ============
  const loader = document.getElementById('loader');
  const counter = document.getElementById('loaderCounter');
  const TOTAL_LOAD_MS = 2400; // synced with bar-fill animation
  const startTime = performance.now();

  const tickCounter = (now) => {
    if (!counter) return;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / TOTAL_LOAD_MS, 1);
    const eased = 1 - Math.pow(1 - t, 1.6);
    const val = Math.floor(eased * 100);
    counter.textContent = String(val).padStart(2, '0');
    if (t < 1) requestAnimationFrame(tickCounter);
    else counter.textContent = '100';
  };
  requestAnimationFrame(tickCounter);

  const hideLoader = () => {
    if (loader) loader.classList.add('done');
  };
  // Hide either when page loads OR after min duration — whichever is later
  let pageLoaded = false;
  let minDurationElapsed = false;
  const tryHide = () => {
    if (pageLoaded && minDurationElapsed) hideLoader();
  };
  window.addEventListener('load', () => { pageLoaded = true; tryHide(); });
  setTimeout(() => { minDurationElapsed = true; tryHide(); }, TOTAL_LOAD_MS + 400);
  // Fallback in case page never fires load
  setTimeout(() => { if (loader && !loader.classList.contains('done')) loader.classList.add('done'); }, 5000);

  // ============ NAV SCROLL ============
  const nav = document.getElementById('nav');
  const marquee = document.querySelector('.marquee');
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) {
      if (y > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
    if (marquee) {
      if (y > 40) marquee.classList.add('hidden');
      else marquee.classList.remove('hidden');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ============ BURGER MENU ============
  const burger = document.getElementById('burger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // ============ SIDE INDICATOR ============
  const sections = [
    { id: 'top',       num: '01', label: 'Inicio' },
    { id: 'marca',     num: '02', label: 'La Marca' },
    { id: 'servicios', num: '03', label: 'Servicios' },
    { id: 'productos', num: '04', label: 'Productos' },
    { id: 'galeria',   num: '05', label: 'Estilo' },
    { id: 'contacto',  num: '06', label: 'Contacto' },
  ];
  const sideIndicator = document.getElementById('sideIndicator');
  const sideNum   = sideIndicator?.querySelector('.side-num');
  const sideTotal = sideIndicator?.querySelector('.side-total');
  const sideLabel = sideIndicator?.querySelector('.side-label');
  if (sideTotal) sideTotal.textContent = String(sections.length).padStart(2, '0');

  const updateIndicator = () => {
    if (!sideIndicator) return;
    const y = window.scrollY + window.innerHeight * 0.4;
    let current = sections[0];
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el && el.offsetTop <= y) current = s;
    });
    if (sideNum)   sideNum.textContent = current.num;
    if (sideLabel) sideLabel.textContent = current.label;
  };
  window.addEventListener('scroll', updateIndicator, { passive: true });
  updateIndicator();

  // ============ REVEAL ON SCROLL ============
  const revealTargets = document.querySelectorAll(
    '.section-head, .pilar-card, .svc-card, .prod-card, .test-card, ' +
    '.gal-item, .contacto-item, .propuesta-content, .propuesta-img, ' +
    '.cta-banner-content, .stat'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('in'));
  }

  // ============ SMOOTH ANCHOR ============
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ============ SCROLL PROGRESS ============
  const progress = document.getElementById('scrollProgress');
  const updateProgress = () => {
    if (!progress) return;
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    progress.style.width = scrolled + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ============ MOBILE STICKY CTA ============
  const mobileCta = document.getElementById('mobileCta');
  const toggleMobileCta = () => {
    if (!mobileCta) return;
    if (window.scrollY > window.innerHeight * 0.4) {
      mobileCta.classList.add('visible');
    } else {
      mobileCta.classList.remove('visible');
    }
  };
  window.addEventListener('scroll', toggleMobileCta, { passive: true });
  toggleMobileCta();

  // ============ COUNTERS ============
  const counters = document.querySelectorAll('.num[data-count]');
  const animateCount = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const duration = 1800;
    const start = performance.now();
    const startVal = 0;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.floor(startVal + (target - startVal) * eased);
      el.textContent = val.toLocaleString('es-CO');
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('es-CO');
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const countObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((el) => countObs.observe(el));
  } else {
    counters.forEach((el) => animateCount(el));
  }

  // ============ MAGNETIC BUTTONS ============
  const magneticBtns = document.querySelectorAll('.btn-magnetic');
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isFinePointer) {
    magneticBtns.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ============ FORM ENHANCEMENT ============
  document.querySelectorAll('.contacto-form select').forEach(sel => {
    const update = () => {
      if (sel.value) sel.setAttribute('data-filled', 'true');
      else sel.removeAttribute('data-filled');
    };
    sel.addEventListener('change', update);
    update();
  });

})();
