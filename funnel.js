// Minimal, fast: nur Funnel + Form-Helfer
function scrollIntoViewSmooth(id) {
  const el = document.getElementById(id);
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initFunnel() {
  const form = document.getElementById('funnel-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.funnel-step'));
  const btnNextList = Array.from(form.querySelectorAll('.next-step'));
  const btnPrevList = Array.from(form.querySelectorAll('.prev-step'));
  const progressBar = document.getElementById('funnel-progress-bar');
  let current = 0;

  function updateProgress() {
    const pct = Math.max(0, Math.min(100, (current / (steps.length - 1)) * 100));
    if (progressBar) progressBar.style.width = pct + '%';
  }
  function showStep(index) {
    steps.forEach((s, i) => { if (i === index) s.removeAttribute('hidden'); else s.setAttribute('hidden',''); });
    updateProgress();
    scrollIntoViewSmooth('funnel');
  }
  function validateStep(index) {
    const step = steps[index]; if (!step) return true;
    const required = Array.from(step.querySelectorAll('[required]'));
    for (const el of required) {
      if (el.type === 'radio') { const name = el.name; const checked = step.querySelector('input[name="' + name + '"]:checked'); if (!checked) return false; }
      else if (el.type === 'checkbox') { if (!el.checked) return false; }
      else if (!el.value) { return false; }
    }
    return true;
  }
  function findFirstInvalid() {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const required = Array.from(step.querySelectorAll('[required]'));
      for (const el of required) {
        let invalid = false;
        if (el.type === 'radio') {
          const name = el.name; const checked = step.querySelector('input[name="' + name + '"]:checked'); invalid = !checked;
        } else if (el.type === 'checkbox') { invalid = !el.checked; }
        else { invalid = !el.value || (typeof el.checkValidity === 'function' && !el.checkValidity()); }
        if (invalid) return { index: i, element: el };
      }
    }
    return null;
  }
  btnNextList.forEach(btn => btn.addEventListener('click', () => {
    if (!validateStep(current)) {
      const firstReq = steps[current].querySelector('[required]');
      if (firstReq && typeof firstReq.reportValidity === 'function') firstReq.reportValidity();
      return;
    }
    if (current < steps.length - 1) { current += 1; showStep(current); }
  }));
  btnPrevList.forEach(btn => btn.addEventListener('click', () => { if (current > 0) { current -= 1; showStep(current); } }));
  form.addEventListener('submit', function(e) {
    if (!form.checkValidity()) {
      e.preventDefault();
      const firstInvalid = findFirstInvalid();
      if (firstInvalid) {
        current = firstInvalid.index; showStep(current);
        if (firstInvalid.element && typeof firstInvalid.element.reportValidity === 'function') firstInvalid.element.reportValidity();
      } else { form.reportValidity(); }
      return;
    }
  });
  showStep(current);
}

// Helpers für Formsubmit: absolute _next + lokaler Dev-Hintergrundsubmit
function initExternalFormNextAbsolute() {
  const forms = Array.from(document.querySelectorAll('form[action*="formsubmit.co"]'));
  forms.forEach((f) => {
    f.addEventListener('submit', () => {
      try {
        const nextInput = f.querySelector('input[name="_next"]');
        if (!nextInput) return;
        const val = (nextInput.value || '').trim();
        const isAbsolute = /^https?:\/\//i.test(val);
        const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
        if (!isAbsolute) {
          const cleaned = val.replace(/^\//, '');
          nextInput.value = origin.replace(/\/$/, '') + '/' + cleaned;
        }
      } catch (_) {}
    });
  });
}
function initLocalDevBackgroundSubmit() {
  const isLocalHost = ['localhost', '127.0.0.1'].includes((window.location.hostname || '').toLowerCase());
  if (!isLocalHost) return;
  const forms = Array.from(document.querySelectorAll('form[action*="formsubmit.co"]'));
  forms.forEach((formEl) => {
    if (formEl.__localSubmitBound) return;
    formEl.__localSubmitBound = true;
    formEl.addEventListener('submit', function(e) {
      if (!formEl.checkValidity()) return;
      e.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'hidden_iframe_' + Date.now();
      document.body.appendChild(iframe);
      const prevTarget = formEl.target;
      formEl.target = iframe.name;
      const nextInput = formEl.querySelector('input[name="_next"]');
      const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      let nextUrl = (nextInput && nextInput.value) ? nextInput.value : 'welcome.html';
      if (!/^https?:\/\//i.test(nextUrl)) {
        const cleaned = nextUrl.replace(/^\//, '');
        nextUrl = origin.replace(/\/$/, '') + '/' + cleaned;
      }
      formEl.submit();
      setTimeout(() => { window.location.href = nextUrl; }, 400);
      setTimeout(() => {
        try {
          formEl.target = prevTarget || '';
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch(_) {}
      }, 2000);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFunnel();
  initExternalFormNextAbsolute();
  initLocalDevBackgroundSubmit();
});


