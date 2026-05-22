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
    { code: 'USDT', name: 'Tether',              country: 'Stablecoin',     flag: '', icon: 'logos/usdt.png' }
  ];

  const WHATSAPP = '573233947051';
  // Fuentes en tiempo real (sin API key, CORS-enabled, refresco frecuente)
  const FX_PRIMARY  = 'https://api.coinbase.com/v2/exchange-rates?currency=USD';
  const FX_FALLBACK = 'https://open.er-api.com/v6/latest/USD';
  const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd&include_24hr_change=true';
  const REFRESH_MS  = 15 * 1000;   // refresco cada 15s
  const TIME_AGO_MS = 1000;        // re-renderizar "hace X" cada 1s

  /* ---------- STATE ---------- */
  const state = {
    mode: 'usdt',                    // solo modo USDT/cripto
    send:  { code: 'USDT', amount: 100 },
    recv:  { code: 'VES' },
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

  // Formato fijo de monto (siempre 2 decimales, con separador de miles)
  const fmtAmount = n => fmtNumber(n, { max: 2, min: 2 });

  // Formato de tasa con precisión adaptativa
  const fmtRate = n => {
    if (!isFinite(n)) return '—';
    let max;
    if (n >= 100)   max = 4;   // 3729.5274
    else if (n >= 1)    max = 6;   // 5.024250
    else if (n >= 0.01) max = 8;   // 0.04253712
    else                max = 10;  // 0.0001234567
    return fmtNumber(n, { max, min: max });
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
    rateSrc:    $('#rate-source'),
    xeVerify:   $('#xe-verify'),
    nextTick:   $('#next-tick'),
    cta:        $('#conv-cta'),
    tabs:       $$('.converter-tabs .tab'),
  };

  const SOURCE_LABELS = {
    coinbase: 'Coinbase',
    erapi: 'OpenER (resp.)',
  };

  /* ---------- FIELD INTERACTIONS ---------- */
  els.sendAmount.addEventListener('input', e => {
    const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
    state.send.amount = parseFloat(raw) || 0;
    recompute();
  });

  // Swap libre: permite vender o comprar USDT (USDT↔fiat en ambos sentidos)
  els.swap.addEventListener('click', () => {
    const tmp = state.send.code;
    state.send.code = state.recv.code;
    state.recv.code = tmp;
    renderFields();
    recompute();
  });

  els.sendBtn.addEventListener('click', () => openPicker('send'));
  els.recvBtn.addEventListener('click', () => openPicker('recv'));

  /* ---------- RENDER FIELDS ---------- */
  function setFlag(el, ccy) {
    if (ccy.icon) {
      el.innerHTML = `<img src="${ccy.icon}" alt="${ccy.code}" class="flag-img" />`;
    } else {
      el.textContent = ccy.flag;
    }
  }
  function renderFields() {
    const s = findCcy(state.send.code) || CURRENCIES[0];
    const r = findCcy(state.recv.code) || CURRENCIES[1];
    els.sendCode.textContent = s.code;
    setFlag(els.sendFlag, s);
    els.recvCode.textContent = r.code;
    setFlag(els.recvFlag, r);
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
    els.recvAmount.value = fmtAmount(recvVal);

    // 1 send = X recv (precisión adaptativa)
    const oneTo = recvRate / sendRate;
    els.rateDisp.textContent = `1 ${state.send.code} = ${fmtRate(oneTo)} ${state.recv.code}`;

    els.rateUpd.textContent = timeAgo(state.lastUpdate);
    if (els.rateSrc) els.rateSrc.textContent = SOURCE_LABELS[state.source] || 'tiempo real';

    // Link de verificación a CoinMarketCap (página oficial de USDT)
    // Es URL estática, no necesita actualización dinámica

    // Build whatsapp link with prefilled message (valores exactos)
    const msg = `Hola, quiero cambiar USDT.\n` +
                `Envío: ${fmtAmount(state.send.amount)} ${state.send.code}\n` +
                `Recibo aprox: ${fmtAmount(recvVal)} ${state.recv.code}\n` +
                `Tasa: 1 ${state.send.code} = ${fmtRate(oneTo)} ${state.recv.code}`;
    els.cta.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  /* ---------- FETCH RATES (tiempo real) ---------- */
  async function fetchFxRates() {
    // Primario: Coinbase (refresca cada minuto)
    try {
      const r = await fetch(FX_PRIMARY, { cache: 'no-store' });
      if (!r.ok) throw new Error('cb status ' + r.status);
      const j = await r.json();
      if (!j.data || !j.data.rates) throw new Error('cb bad shape');
      const rates = {};
      for (const [k, v] of Object.entries(j.data.rates)) {
        const n = parseFloat(v);
        if (isFinite(n) && n > 0) rates[k] = n;
      }
      return { rates, source: 'coinbase' };
    } catch (e) {
      console.warn('Primary FX failed, falling back:', e.message);
    }
    // Fallback: open.er-api.com (refresca diario)
    try {
      const r = await fetch(FX_FALLBACK, { cache: 'no-store' });
      const j = await r.json();
      if (j.result === 'success' && j.rates) return { rates: j.rates, source: 'erapi' };
    } catch (e) { console.warn('Fallback FX failed:', e.message); }
    return null;
  }

  async function fetchRates() {
    try {
      const [fxRes, cgRes] = await Promise.all([
        fetchFxRates(),
        fetch(COINGECKO_API, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ]);
      let changed = false;
      if (fxRes && fxRes.rates) {
        // Detectar si la tasa principal del par actual cambió
        const oldRecv = state.rates[state.recv.code];
        const newRecv = fxRes.rates[state.recv.code];
        if (oldRecv && newRecv && Math.abs(oldRecv - newRecv) / oldRecv > 0.0001) changed = true;

        state.rates = fxRes.rates;
        state.lastUpdate = Date.now();
        state.source = fxRes.source;
      }
      if (cgRes && cgRes.tether && cgRes.tether.usd) {
        state.usdtUsd = cgRes.tether.usd;
      }
      recompute();
      buildTicker();
      if (changed) pulseRate();
    } catch (e) {
      console.warn('FX fetch failed', e);
    }
  }

  function pulseRate() {
    const el = document.querySelector('.conv-rate');
    if (!el) return;
    el.classList.remove('rate-flash');
    void el.offsetWidth; // forzar reflow
    el.classList.add('rate-flash');
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
          <span>${fmtRate(v)}</span>
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
        <span class="pflag">${c.icon ? `<img src="${c.icon}" alt="${c.code}" class="flag-img" />` : c.flag}</span>
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
  setInterval(fetchRates, REFRESH_MS);

  // Tick cada segundo: actualiza "hace Xs" y la cuenta regresiva
  setInterval(() => {
    els.rateUpd.textContent = timeAgo(state.lastUpdate);
    if (els.nextTick && state.lastUpdate) {
      const elapsed = Date.now() - state.lastUpdate;
      const remaining = Math.max(0, Math.ceil((REFRESH_MS - elapsed) / 1000));
      els.nextTick.textContent = remaining;
    }
  }, TIME_AGO_MS);

  // Re-fetch al volver al tab (datos frescos cuando vuelve el foco)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchRates();
  });

})();
