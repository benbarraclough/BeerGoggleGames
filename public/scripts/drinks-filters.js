// Drinks filters: manage state, apply visibility, and sync UI (Type, Alcohol base, Difficulty)
(() => {
  const grid = document.getElementById('drink-grid');
  if (!grid) return;

  const clearBtn = document.getElementById('clear-filters');
  const groupToggles = document.querySelectorAll('.filter-toggle[data-filter-group]');

  const state = {
    type: new Set(),
    base: new Set(),
    difficulty: new Set()
  };

  function styleFilterItem(btn, pressed) {
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.classList.toggle('pill--filled', !!pressed);
    btn.classList.toggle('tone-magenta', !!pressed);
    btn.classList.toggle('pill--soft', !pressed);
  }

  function styleGroupToggle(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('pill--filled', !!on);
    btn.classList.toggle('tone-magenta', !!on);
    btn.classList.toggle('pill--soft', !on);
  }

  function syncButtons() {
    // Panel items reflect pressed state
    document.querySelectorAll('.filter-item[data-filter-type]').forEach(btn => {
      const type = btn.getAttribute('data-filter-type');
      const val = (btn.getAttribute('data-value') || '').toLowerCase();
      const pressed = type && state[type]?.has(val);
      styleFilterItem(btn, !!pressed);
    });

    // Group toggles reflect whether there is any selection within that group
    groupToggles.forEach(btn => {
      const group = btn.getAttribute('data-filter-group');
      const on = !!(group && state[group] && state[group].size);
      styleGroupToggle(btn, on);
    });

    // Clear link: disabled when nothing selected
    if (clearBtn) {
      const hasAny = state.type.size || state.base.size || state.difficulty.size;
      clearBtn.setAttribute('aria-disabled', hasAny ? 'false' : 'true');
      clearBtn.classList.toggle('text-muted', !hasAny);
    }
  }

  function apply() {
    const items = Array.from(grid.children);
    let shown = 0;
    items.forEach(li => {
      const searchVisible = li.getAttribute('data-search-visible') !== 'false';
      const type = (li.getAttribute('data-type') || '').toLowerCase();
      const base = (li.getAttribute('data-base') || '').toLowerCase();
      const difficulty = (li.getAttribute('data-difficulty') || '').toLowerCase();

      const typeMatch = state.type.size ? state.type.has(type) : true;
      const baseMatch = state.base.size ? state.base.has(base) : true;
      const diffMatch = state.difficulty.size ? state.difficulty.has(difficulty) : true;

      const vis = searchVisible && typeMatch && baseMatch && diffMatch;
      li.classList.toggle('hidden', !vis);
      if (vis) shown++;
    });

    const txt = `${shown} result${shown === 1 ? '' : 's'}`;
    const resultEl = document.getElementById('result-count');
    const resultElMobile = document.getElementById('result-count-mobile');
    if (resultEl) resultEl.textContent = txt;
    if (resultElMobile) resultElMobile.textContent = txt;

    syncButtons();
    return shown;
  }

  window.bddApplyDrinkFilters = apply;
  window.bddToggleDrinkFilter = (type, value) => {
    const key = String(type);
    const v = (value || '').toLowerCase();
    if (!state[key]) return;
    if (state[key].has(v)) state[key].delete(v); else state[key].add(v);
    apply();
  };

  // Panel item clicks (top dropdown items)
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('.filter-item[data-filter-type]');
    if (!btn) return;
    e.preventDefault();
    const type = btn.getAttribute('data-filter-type');
    const value = btn.getAttribute('data-value');
    if (!type || !value) return;
    window.bddToggleDrinkFilter(type, value);
  });

  // Clear link clears selected filters
  clearBtn?.addEventListener('click', (e) => {
    const isDisabled = clearBtn.getAttribute('aria-disabled') === 'true';
    if (isDisabled) { e.preventDefault(); return; }
    e.preventDefault();
    state.type.clear(); state.base.clear(); state.difficulty.clear();
    apply();
  });

  apply();
})();
