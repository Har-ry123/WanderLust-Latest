// AI helpers: "Write with AI" on listing forms and the trip planner on listing pages
(() => {
  const postJSON = async (url, body) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The AI assistant is unavailable right now.');
    return data;
  };

  const setBusy = (button, busy, busyLabel) => {
    const label = button.querySelector('span');
    if (busy) {
      button.dataset.label = label.textContent;
      label.textContent = busyLabel;
    } else {
      label.textContent = button.dataset.label;
    }
    button.disabled = busy;
    button.classList.toggle('ai-loading', busy);
  };

  document.querySelectorAll('[data-ai-describe]').forEach((button) => {
    button.addEventListener('click', async () => {
      const form = button.closest('form');
      const field = (name) => form.querySelector(`[name="listing[${name}]"]`)?.value.trim() || '';
      const textarea = form.querySelector('[name="listing[description]"]');
      if (!field('title') && !field('location')) {
        alert('Add a title or location first so the AI knows what to write about.');
        return;
      }
      setBusy(button, true, 'Writing...');
      try {
        const { text } = await postJSON('/ai/describe', {
          title: field('title'),
          location: field('location'),
          country: field('country'),
          price: field('price'),
        });
        textarea.value = text;
        textarea.dispatchEvent(new Event('input'));
      } catch (err) {
        alert(err.message);
      } finally {
        setBusy(button, false);
      }
    });
  });

  document.querySelectorAll('[data-ai-trip]').forEach((button) => {
    const output = document.querySelector('[data-ai-trip-output]');
    button.addEventListener('click', async () => {
      setBusy(button, true, 'Planning...');
      output.classList.remove('text-danger');
      output.textContent = 'Putting together your trip...';
      try {
        const { text } = await postJSON(`/ai/trip/${button.dataset.aiTrip}`);
        output.classList.remove('text-muted');
        output.classList.add('ai-plan');
        output.textContent = text; // plain text, rendered with white-space: pre-line
        button.dataset.label = 'Plan again';
      } catch (err) {
        output.classList.add('text-danger');
        output.textContent = err.message;
      } finally {
        setBusy(button, false);
      }
    });
  });
})();
