// Games filters: default uncoloured until selected (filled cyan when selected)
(() => {
  const grid = document.getElementById('game-grid');
  if (!grid) return;

  const exclusiveBtn = document.getElementById('exclusive-toggle');
  const clearBtn = document.getElementById('clear-filters');
  const resultEl = document.getElementById('result-count');

  const state = {
    category: new Set(),
    mode: new Set(),
    tag: new Set(),
    exclusive: false
  };

  function styleButton(btn, pressed) {
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.classList.toggle('pill--filled', !!pressed);
    btn.classList.toggle('tone-cyan', !!pressed);
    btn.classList.toggle('pill--soft', !pressed);
  }

  function syncButtons() {
    document.querySelectorAll('.filter-item[data-filter-type]').forEach(btn => {
      const type = btn.getAttribute('data-filter-type');
      const val = (btn.getAttribute('data-value') || '').toLowerCase();
      const pressed = type && state[type]?.has(val);
      styleButton(btn, !!pressed);
    });
    if (exclusiveBtn) {
      exclusiveBtn.setAttribute('aria-pressed', state.exclusive ? 'true' : 'false');
    }
    if (clearBtn) {
      clearBtn.disabled = !(state.category.size || state.mode.size || state.tag.size);
    }
  }

  function apply() {
    const items = Array.from(grid.children);
    let shown = 0;
    items.forEach(li => {
      const searchVisible = li.getAttribute('data-search-visible') !== 'false';
      const type = (li.getAttribute('data-type') || '').toLowerCase();
      const mode = (li.getAttribute('data-mode') || '').toLowerCase();
      const tags = (li.getAttribute('data-tags') || '').toLowerCase().split(',').filter(Boolean);

      const catMatch = state.category.size ? state.category.has(type) : true;
      const modeMatch = state.mode.size ? state.mode.has(mode) : true;

      let tagMatch = true;
      if (state.tag.size) {
        const selected = Array.from(state.tag);
        tagMatch = state.exclusive
          ? selected.every(t => tags.includes(t))
          : selected.some(t => tags.includes(t));
      }

      const vis = searchVisible && catMatch && modeMatch && tagMatch;
      li.classList.toggle('hidden', !vis);
      if (vis) shown++;
    });

    if (resultEl) resultEl.textContent = `${shown} result${shown === 1 ? '' : 's'}`;
    syncButtons();
    return shown;
  }

  window.bggApplyGameFilters = apply;
  window.bggToggleGameFilter = (type, value) => {
    const v = (value || '').toLowerCase();
    if (!state[type]) return;
    if (state[type].has(v)) state[type].delete(v); else state[type].add(v);
    apply();
  };

  // Panel item clicks
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('.filter-item[data-filter-type]');
    if (!btn) return;
    const type = btn.getAttribute('data-filter-type');
    const value = btn.getAttribute('data-value');
    if (!type || !value) return;
    window.bggToggleGameFilter(type, value);
  });

  // Exclusive + Clear
  exclusiveBtn?.addEventListener('click', () => { state.exclusive = !state.exclusive; apply(); });
  clearBtn?.addEventListener('click', () => {
    state.category.clear(); state.mode.clear(); state.tag.clear(); state.exclusive = false; apply();
  });

  apply();
})();
