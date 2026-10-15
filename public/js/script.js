(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})();

// "Show total incl. taxes" switch on the listings page (18% GST)
(() => {
  const toggle = document.getElementById('displayTotalAfterTaxes');
  if (!toggle) return;
  const TAX = 0.18;
  const format = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  const render = () => {
    document.querySelectorAll('.stay-price[data-price]').forEach((el) => {
      const base = Number(el.dataset.price);
      const value = el.querySelector('.price-value');
      const unit = el.querySelector('.price-unit');
      if (!base || !value || !unit) return;
      value.textContent = format(toggle.checked ? base * (1 + TAX) : base);
      unit.textContent = toggle.checked ? 'night incl. taxes' : 'night';
    });
  };

  try { toggle.checked = localStorage.getItem('wl-taxes') === '1'; } catch {}
  toggle.addEventListener('change', () => {
    try { localStorage.setItem('wl-taxes', toggle.checked ? '1' : '0'); } catch {}
    render();
  });
  render();
})();

// Live preview card on the new/edit listing forms
(() => {
  const form = document.querySelector('[data-listing-form]');
  if (!form) return;
  const img = document.querySelector('[data-preview-img]');
  const fallbacks = { title: 'Your listing title', location: 'Your city', country: 'Country', price: '0' };

  form.querySelectorAll('[data-preview]').forEach((input) => {
    const key = input.dataset.preview;
    const update = () => {
      const value = input.value.trim();
      if (key === 'image') {
        if (img && /^https?:\/\/.+/.test(value)) img.src = value;
        return;
      }
      const text = key === 'price' && value ? Number(value).toLocaleString('en-IN') : value;
      document.querySelectorAll(`[data-preview-text="${key}"]`).forEach((el) => {
        el.textContent = text || fallbacks[key];
      });
    };
    input.addEventListener('input', update);
  });
})();
