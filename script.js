/* =========================================================
   UNICAMBIOSVE · Landing JS
   - Loader
   - Mobile nav
   - Stat counters
   - Currency picker
   - Live FX (open.er-api.com) + USDT (CoinGecko)
   - Live ticker
   ========================================================= */

(() => {
  'use strict';

  /* ---------- CONFIG ---------- */
  const CURRENCIES = [
    { code: 'USD', name: 'Dólar estadounidense', country: 'Estados Unidos', flag: '🇺🇸' },
    { code: 'VES', name: 'Bolívar venezolano',   country: 'Venezuela',      flag: '🇻🇪' },
    { code: 'COP', name: 'Peso colombiano',      country: 'Colombia',       flag: '🇨🇴' },
    { code: 'MXN', name: 'Peso mexicano',        country: 'México',         flag: '🇲🇽' },
    { code: 'PEN', name: 'Sol peruano',          country: 'Perú',           flag: '🇵🇪' },
    { code: 'BRL', name: 'Real brasileño',       country: 'Brasil',         flag: '🇧🇷' },
    { code: 'CLP', name: 'Peso chileno',         country: 'Chile',          flag: '🇨🇱' },
    { code: 'ARS', name: 'Peso argentino',       country: 'Argentina',      flag: '🇦🇷' },
    { code: 'PYG', name: 'Guaraní paraguayo',    country: 'Paraguay',       flag: '🇵🇾' },
  ];
  const CRYPTO = [
    { code: 'USDT', name: 'Tether',              country: 'Stablecoin',     flag: '💠' }
  ];

  const WHATSAPP = '573233947051';
  const FX_API = 'https://open.er-api.com/v6/latest/USD';
  const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd';

  /* ---------- STATE ---------- */
  const state = {
    mode: 'remesa',                 // 'remesa' | 'usdt'
    send:  { code: 'USD', amount: 100 },
    recv:  { code: 'COP' },
    rates: {},                       // USD-based rates
    usdtUsd: 1,                      // USDT price in USD
    lastUpdate: null,
    target: 'send',                  // which field the picker edits
  };

  /* ---------- HELPERS ---------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  const fmtNumber = (n, opts = {}) => {
    if (!isFinite(n)) return '—';
    const max = opts.max ?? 2;
    const min = Math.min(opts.min ?? 2, max);
    return new Intl.NumberFormat('es-ES', {
      maximumFractionDigits: max,
      minimumFractionDigits: min,
    }).format(n);
  };

  const findCcy = code => [...CURRENCIES, ...CRYPTO].find(c => c.code === code);

  const timeAgo = ts => {
    if (!ts) return '—';
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
    return new Date(ts).toLocaleString('es-ES');
  };

  /* ---------- LOADER ---------- */
  window.addEventListener('load', () => {
    setTimeout(() => $('#loader').classList.add('hidden'), 500);
  });

  /* ---------- YEAR ---------- */
  $('#year').textContent = new Date().getFullYear();

  /* ---------- MOBILE NAV ---------- */
  const burger = $('#burger');
  const nav = $('#nav');
  if (burger) {
    burger.addEventListener('click', () => {
      nav.classList.toggle('nav-mobile-open');
      burger.classList.toggle('open');
    });
    $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('nav-mobile-open');
      burger.classList.remove('open');
    }));
  }

  /* ---------- STAT COUNTERS ---------- */
  const counters = $$('.stat-num');
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || '';
      const duration = 1500;
      const start = performance.now();
      const step = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.floor(target * eased);
        el.textContent = val.toLocaleString('es-ES') + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('es-ES') + suffix;
      };
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach(c => counterObserver.observe(c));

  /* =========================================================
     CONVERTER
     ========================================================= */

  const els = {
    sendAmount: $('#send-amount'),
    sendCode:   $('#send-code'),
    sendFlag:   $('#send-flag'),
    sendBtn:    $('#send-currency-btn'),
    recvAmount: $('#recv-amount'),
    recvCode:   $('#recv-code'),
    recvFlag:   $('#recv-flag'),
    recvBtn:    $('#recv-currency-btn'),
    swap:       $('#conv-swap'),
    rateDisp:   $('#rate-display'),
    rateUpd:    $('#rate-updated'),
    cta:        $('#conv-cta'),
    tabs:       $$('.converter-tabs .tab'),
  };

  /* ---------- TABS ---------- */
  els.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      els.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.mode = tab.dataset.tab;
      if (state.mode === 'usdt') {
        state.send = { code: 'USDT', amount: state.send.amount };
        state.recv = { code: 'VES' };
      } else {
        state.send = { code: 'USD', amount: state.send.amount };
        state.recv = { code: 'COP' };
      }
      renderFields();
      recompute();
    });
  });

  /* ---------- FIELD INTERACTIONS ---------- */
  els.sendAmount.addEventListener('input', e => {
    const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
    state.send.amount = parseFloat(raw) || 0;
    recompute();
  });

  els.swap.addEventListener('click', () => {
    // No invertimos en modo USDT (USDT siempre es origen)
    if (state.mode === 'usdt') return;
    const tmp = state.send.code;
    state.send.code = state.recv.code;
    state.recv.code = tmp;
    renderFields();
    recompute();
  });

  els.sendBtn.addEventListener('click', () => openPicker('send'));
  els.recvBtn.addEventListener('click', () => openPicker('recv'));

  /* ---------- RENDER FIELDS ---------- */
  function renderFields() {
    const s = findCcy(state.send.code) || CURRENCIES[0];
    const r = findCcy(state.recv.code) || CURRENCIES[1];
    els.sendCode.textContent = s.code;
    els.sendFlag.textContent = s.flag;
    els.recvCode.textContent = r.code;
    els.recvFlag.textContent = r.flag;
  }

  /* ---------- COMPUTE ---------- */
  function getUsdRate(code) {
    if (code === 'USD') return 1;
    if (code === 'USDT') return 1 / state.usdtUsd;  // USDT→USD
    return state.rates[code];
  }

  function recompute() {
    const sendRate = getUsdRate(state.send.code);
    const recvRate = getUsdRate(state.recv.code);

    if (!sendRate || !recvRate) {
      els.recvAmount.value = '—';
      els.rateDisp.textContent = 'Cargando…';
      return;
    }

    // amount in USD
    const usd = state.send.amount / sendRate;
    const recvVal = usd * recvRate;
    els.recvAmount.value = fmtNumber(recvVal, {
      max: recvVal >= 1000 ? 0 : 2,
      min: recvVal >= 1000 ? 0 : 2,
    });

    // 1 send = X recv
    const oneTo = recvRate / sendRate;
    els.rateDisp.textContent = `1 ${state.send.code} = ${fmtNumber(oneTo, {
      max: oneTo >= 1000 ? 0 : (oneTo >= 1 ? 4 : 6),
      min: 2,
    })} ${state.recv.code}`;

    els.rateUpd.textContent = timeAgo(state.lastUpdate);

    // Build whatsapp link with prefilled message
    const msg = `Hola, quiero ${state.mode === 'usdt' ? 'cambiar USDT' : 'enviar una remesa'}.\n` +
                `Envío: ${fmtNumber(state.send.amount)} ${state.send.code}\n` +
                `Recibo aprox: ${fmtNumber(recvVal, { max: recvVal >= 1000 ? 0 : 2 })} ${state.recv.code}`;
    els.cta.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  /* ---------- FETCH RATES ---------- */
  async function fetchRates() {
    try {
      const [fxRes, cgRes] = await Promise.all([
        fetch(FX_API).then(r => r.json()),
        fetch(COINGECKO_API).then(r => r.json()).catch(() => null),
      ]);
      if (fxRes && fxRes.result === 'success' && fxRes.rates) {
        state.rates = fxRes.rates;
        state.lastUpdate = Date.now();
      }
      if (cgRes && cgRes.tether && cgRes.tether.usd) {
        state.usdtUsd = cgRes.tether.usd;
      }
      recompute();
      buildTicker();
    } catch (e) {
      console.warn('FX fetch failed', e);
      els.rateDisp.textContent = 'Sin conexión — reintenta';
    }
  }

  /* ---------- TICKER ---------- */
  function buildTicker() {
    const track = $('#ticker-track');
    if (!track || !Object.keys(state.rates).length) return;

    const pairs = [
      { from: 'USD', to: 'VES' },
      { from: 'USD', to: 'COP' },
      { from: 'USD', to: 'MXN' },
      { from: 'USDT', to: 'COP' },
      { from: 'USDT', to: 'VES' },
      { from: 'USD', to: 'PEN' },
      { from: 'USD', to: 'BRL' },
      { from: 'USD', to: 'CLP' },
      { from: 'USD', to: 'ARS' },
    ];

    const items = pairs.map(p => {
      const sR = getUsdRate(p.from), rR = getUsdRate(p.to);
      if (!sR || !rR) return '';
      const v = rR / sR;
      const dir = Math.random() > 0.5 ? 'up' : 'down';
      const pct = (Math.random() * 0.8 + 0.1).toFixed(2);
      return `
        <span class="t-item">
          <span class="t-pair">${p.from}/${p.to}</span>
          <span>${fmtNumber(v, { max: v >= 1000 ? 0 : 4, min: 2 })}</span>
          <span class="t-${dir}">${dir === 'up' ? '▲' : '▼'} ${pct}%</span>
        </span>
        <span class="ticker-dot">●</span>
      `;
    }).join('');

    // Duplicado para loop continuo
    track.innerHTML = items + items;
  }

  /* =========================================================
     CURRENCY PICKER
     ========================================================= */
  const picker = {
    overlay: $('#picker-overlay'),
    list:    $('#picker-list'),
    search:  $('#picker-search'),
    title:   $('#picker-title'),
    close:   $('#picker-close'),
  };

  function openPicker(target) {
    state.target = target;
    picker.title.textContent = target === 'send' ? 'Tú envías' : 'Tú recibes';
    picker.search.value = '';
    renderPickerList('');
    picker.overlay.classList.add('open');
    setTimeout(() => picker.search.focus(), 50);
  }
  function closePicker() {
    picker.overlay.classList.remove('open');
  }
  function renderPickerList(q) {
    const norm = q.trim().toLowerCase();
    const pool = state.mode === 'usdt' && state.target === 'send'
      ? CRYPTO
      : [...CURRENCIES, ...(state.target === 'send' ? CRYPTO : CRYPTO)];

    const currentCode = state.target === 'send' ? state.send.code : state.recv.code;
    const filtered = pool.filter(c =>
      !norm ||
      c.code.toLowerCase().includes(norm) ||
      c.name.toLowerCase().includes(norm) ||
      c.country.toLowerCase().includes(norm)
    );

    picker.list.innerHTML = filtered.map(c => `
      <li data-code="${c.code}" class="${c.code === currentCode ? 'active' : ''}">
        <span class="pflag">${c.flag}</span>
        <div>
          <b>${c.country}</b>
          <small>${c.name}</small>
        </div>
        <span class="pcode">${c.code}</span>
      </li>
    `).join('');

    picker.list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const code = li.dataset.code;
        if (state.target === 'send') state.send.code = code;
        else                          state.recv.code = code;
        renderFields();
        recompute();
        closePicker();
      });
    });
  }

  picker.overlay.addEventListener('click', e => {
    if (e.target === picker.overlay) closePicker();
  });
  picker.close.addEventListener('click', closePicker);
  picker.search.addEventListener('input', e => renderPickerList(e.target.value));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && picker.overlay.classList.contains('open')) closePicker();
  });

  /* =========================================================
     CAROUSELS (móvil): scroll-snap + dots dinámicos
     ========================================================= */
  function initCarousel(selector) {
    const track = document.querySelector(selector);
    if (!track || track.dataset.carouselInit) return;
    const items = [...track.children];
    if (items.length < 2) return;
    track.dataset.carouselInit = '1';

    const dots = document.createElement('div');
    dots.className = 'carousel-dots';
    dots.setAttribute('role', 'tablist');

    items.forEach((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Ir al elemento ${i + 1}`);
      d.dataset.idx = i;
      d.addEventListener('click', () => {
        items[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      dots.appendChild(d);
    });
    track.after(dots);

    const setActive = (idx) => {
      [...dots.children].forEach((d, i) => d.classList.toggle('active', i === idx));
    };

    // El item con su centro más cercano al centro del track es el activo
    const syncByCenter = () => {
      const tr = track.getBoundingClientRect();
      const center = tr.left + tr.width / 2;
      let bestIdx = 0, bestDist = Infinity;
      items.forEach((it, i) => {
        const r = it.getBoundingClientRect();
        const ic = r.left + r.width / 2;
        const dist = Math.abs(ic - center);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      setActive(bestIdx);
    };

    // Fuente 1: scroll listener (throttled vía timestamp)
    let lastSync = 0;
    track.addEventListener('scroll', () => {
      const now = Date.now();
      if (now - lastSync < 50) return;
      lastSync = now;
      syncByCenter();
    }, { passive: true });

    // Fuente 2: IntersectionObserver como respaldo
    const ratios = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => ratios.set(e.target, e.intersectionRatio));
      let bestIdx = 0, bestR = -1;
      items.forEach((it, i) => {
        const r = ratios.get(it) || 0;
        if (r > bestR) { bestR = r; bestIdx = i; }
      });
      setActive(bestIdx);
    }, {
      root: track,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    items.forEach(it => io.observe(it));

    // Llamada inicial tras layout
    requestAnimationFrame(syncByCenter);
  }

  ['.cards', '.steps', '.testimonials'].forEach(initCarousel);

  /* =========================================================
     INIT
     ========================================================= */
  renderFields();
  fetchRates();
  setInterval(fetchRates, 5 * 60 * 1000);  // refresh every 5 min
  setInterval(() => { els.rateUpd.textContent = timeAgo(state.lastUpdate); }, 30 * 1000);

})();
