/**
 * Elena Salon — Revenue Recovery Simulator
 * Calcula el impacto económico de recuperar clientes perdidos.
 */

(function () {
  const ELENA_MONTHLY_COST = 129; // €/mes estimado para el ROI

  const els = {
    lostClients:   document.getElementById('lost-clients'),
    avgTicket:     document.getElementById('avg-ticket'),
    visitsYear:    document.getElementById('visits-year'),
    recoveryRate:  document.getElementById('recovery-rate'),
    recoveryPct:   document.getElementById('recovery-pct'),

    resRecovered:  document.getElementById('res-recovered'),
    resMonthly:    document.getElementById('res-monthly'),
    resAnnual:     document.getElementById('res-annual'),
    resRoi:        document.getElementById('res-roi'),

    barLost:       document.getElementById('bar-lost'),
    barRecovered:  document.getElementById('bar-recovered'),
  };

  function fmt(n) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n);
  }

  function fmtNum(n) {
    return new Intl.NumberFormat('es-ES').format(Math.round(n));
  }

  function flashUpdate(el) {
    el.classList.add('updating');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('updating');
      });
    });
  }

  function calculate() {
    const lost     = Math.max(1,  parseInt(els.lostClients.value)  || 1);
    const ticket   = Math.max(1,  parseFloat(els.avgTicket.value)  || 1);
    const visits   = Math.max(1,  parseInt(els.visitsYear.value)   || 1);
    const rate     = Math.max(0,  parseInt(els.recoveryRate.value) || 0) / 100;

    const recovered   = Math.round(lost * rate);
    const revenueYear = recovered * ticket * visits;
    const revenueMonth = revenueYear / 12;
    const roi = revenueYear > 0
      ? Math.round(revenueYear / (ELENA_MONTHLY_COST * 12))
      : 0;

    // Update label
    els.recoveryPct.textContent = `${Math.round(rate * 100)}%`;

    // Update values with flash
    [els.resRecovered, els.resMonthly, els.resAnnual, els.resRoi].forEach(flashUpdate);

    setTimeout(() => {
      els.resRecovered.textContent = fmtNum(recovered);
      els.resMonthly.textContent   = fmt(revenueMonth);
      els.resAnnual.textContent    = fmt(revenueYear);
      els.resRoi.textContent       = `${roi}×`;

      // Bar chart: lost = 100%, recovered = rate%
      els.barLost.style.width      = `${100 - Math.round(rate * 100)}%`;
      els.barRecovered.style.width = `${Math.round(rate * 100)}%`;
    }, 100);
  }

  // Event listeners
  ['input', 'change'].forEach(ev => {
    els.lostClients.addEventListener(ev, calculate);
    els.avgTicket.addEventListener(ev, calculate);
    els.visitsYear.addEventListener(ev, calculate);
    els.recoveryRate.addEventListener(ev, calculate);
  });

  // Clamp inputs on blur
  els.lostClients.addEventListener('blur', () => {
    const v = parseInt(els.lostClients.value);
    if (isNaN(v) || v < 1) els.lostClients.value = 1;
    if (v > 500)           els.lostClients.value = 500;
    calculate();
  });
  els.avgTicket.addEventListener('blur', () => {
    const v = parseFloat(els.avgTicket.value);
    if (isNaN(v) || v < 10) els.avgTicket.value = 10;
    if (v > 500)             els.avgTicket.value = 500;
    calculate();
  });
  els.visitsYear.addEventListener('blur', () => {
    const v = parseInt(els.visitsYear.value);
    if (isNaN(v) || v < 1) els.visitsYear.value = 1;
    if (v > 24)             els.visitsYear.value = 24;
    calculate();
  });

  // Nav active state on scroll
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navLinks = document.querySelectorAll('.nav__links a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(a => {
            a.style.borderBottomColor = 'transparent';
            if (a.getAttribute('href') === `#${entry.target.id}`) {
              a.style.borderBottomColor = 'var(--color-ink-teal)';
            }
          });
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach(s => observer.observe(s));

  // Form submission (demo)
  const form = document.querySelector('.booking__form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-outline');
      btn.textContent = 'Solicitud enviada — nos ponemos en contacto pronto';
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.6';
    });
  }

  // Init
  calculate();
})();
