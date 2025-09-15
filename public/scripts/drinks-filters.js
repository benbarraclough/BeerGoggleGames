// Drinks filters: default uncoloured until selected (filled magenta when selected)
(() => {
  const grid = document.getElementById('drinks-grid');
  if (!grid) return;

  const exclusiveBtn = document.getElementById('exclusive-toggle');
  const clearBtn = document.getElementById('clear-filters');
  const resultEl = document.getElementById('result-count');

  const state = {
    type: new Set(),
    base: new Set(),
    difficulty: new Set(),
    exclusive: false
  };

  function styleButton(btn, pressed) {
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.classList.toggle('pill--filled', !!pressed);
    btn.classList.toggle('tone-magenta', !!pressed);
    btn.classList.toggle('pill--soft', !pressed);
  }

  function syncButtons() {
    document.querySelectorAll('.filter-item[data-filter-type]').forEach(btn => {
      const type = btn.getAttribute('data-filter-type');
      const val = (btn.getAttribute('data-value') || '').toLowerCase();
      const pressed = type && state[type]?.has(val);
      styleButton(btn, !!pressed);
    });
    exclusiveBtn?.setAttribute('aria-pressed', state.exclusive ? 'true' : 'false');
    if (clearBtn) clearBtn.disabled = !(state.type.size || state.base.size || state.difficulty.size);
  }

  function apply() {
    const items = Array.from(grid.children);
    let shown = 0;
    items.forEach(li => {
      const searchVisible = li.getAttribute('data-search-visible') !== 'false';

      const type = (li.getAttribute('data-type') || '').toLowerCase();
      const diff = (li.getAttribute('data-difficulty') || '').toLowerCase();
      const bases = (li.getAttribute('data-bases') || '').toLowerCase().split(',').filter(Boolean);

      const typeMatch = state.type.size ? state.type.has(type) : true;
      const diffMatch = state.difficulty.size ? state.difficulty.has(diff) : true;

      let baseMatch = true;
      if (state.base.size) {
        const selected = Array.from(state.base);
        baseMatch = state.exclusive
          ? selected.every(b => bases.includes(b))
          : selected.some(b => bases.includes(b));
      }

      const vis = searchVisible && typeMatch && diffMatch && baseMatch;
      li.classList.toggle('hidden', !vis);
      if (vis) shown++;
    });

    if (resultEl) resultEl.textContent = `${shown} result${shown === 1 ? '' : 's'}`;
    syncButtons();
    return shown;
  }

  window.bggApplyDrinkFilters = apply;
  window.bggToggleDrinkFilter = (type, value) => {
    const v = (value || '').toLowerCase();
    if (!state[type]) return;
    if (state[type].has(v)) state[type].delete(v); else state[type].add(v);
    apply();
  };

  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('.filter-item[data-filter-type]');
    if (!btn) return;
    const type = btn.getAttribute('data-filter-type');
    const value = btn.getAttribute('data-value');
    if (!type || !value) return;
    window.bggToggleDrinkFilter(type, value);
  });

  exclusiveBtn?.addEventListener('click', () => { state.exclusive = !state.exclusive; apply(); });
  clearBtn?.addEventListener('click', () => {
    state.type.clear(); state.base.clear(); state.difficulty.clear(); state.exclusive = false; apply();
  });

  apply();
})();
