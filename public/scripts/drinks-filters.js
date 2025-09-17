// Drinks filters: manage state, apply visibility, and sync UI (Drink Type, Alcohol base, Difficulty, Tags + Exclusive)
(() => {
  const grid = document.getElementById('drink-grid');
  if (!grid) return;

  const clearBtn = document.getElementById('clear-filters');
  const exclusiveBtn = document.getElementById('exclusive-toggle');
  const groupToggles = document.querySelectorAll('.filter-toggle[data-filter-group]');

  const state = {
    drinkType: new Set(),
    base: new Set(),
    difficulty: new Set(),
    tag: new Set(),
    exclusive: false // AND across tags when true; OR when false
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

    // Exclusive link aria
    if (exclusiveBtn) {
      exclusiveBtn.setAttribute('aria-pressed', state.exclusive ? 'true' : 'false');
    }

    // Clear link: disabled when nothing selected
    if (clearBtn) {
      const hasAny = state.drinkType.size || state.base.size || state.difficulty.size || state.tag.size;
      clearBtn.setAttribute('aria-disabled', hasAny ? 'false' : 'true');
      clearBtn.classList.toggle('text-muted', !hasAny);
    }
  }

  function apply() {
    const items = Array.from(grid.children);
    const total = items.length;
    let shown = 0;

    items.forEach(li => {
      const searchVisible = li.getAttribute('data-search-visible') !== 'false';
      const drinkType = (li.getAttribute('data-drinktype') || '').toLowerCase();
      const base = (li.getAttribute('data-base') || '').toLowerCase();
      const difficulty = (li.getAttribute('data-difficulty') || '').toLowerCase();
      const tags = (li.getAttribute('data-tags') || '').toLowerCase().split(',').filter(Boolean);

      const typeMatch = state.drinkType.size ? state.drinkType.has(drinkType) : true;
      const baseMatch = state.base.size ? state.base.has(base) : true;
      const diffMatch = state.difficulty.size ? state.difficulty.has(difficulty) : true;

      let tagMatch = true;
      if (state.tag.size) {
        const selected = Array.from(state.tag);
        tagMatch = state.exclusive
          ? selected.every(t => tags.includes(t))
          : selected.some(t => tags.includes(t));
      }

      const vis = searchVisible && typeMatch && baseMatch && diffMatch && tagMatch;
      li.classList.toggle('hidden', !vis);
      if (vis) shown++;
    });

    const txt = `${shown} of ${total} result${total === 1 ? '' : 's'}`;
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

  // Panel item clicks (top dropdown items and per-card tag dropdown items)
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

  // Exclusive toggle
  exclusiveBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    state.exclusive = !state.exclusive;
    apply();
  });

  // Clear link clears selected filters (not exclusive)
  clearBtn?.addEventListener('click', (e) => {
    const isDisabled = clearBtn.getAttribute('aria-disabled') === 'true';
    if (isDisabled) { e.preventDefault(); return; }
    e.preventDefault();
    state.drinkType.clear(); state.base.clear(); state.difficulty.clear(); state.tag.clear();
    apply();
  });

  apply();
})();
