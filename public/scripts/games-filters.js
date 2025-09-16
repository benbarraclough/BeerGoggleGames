// Games filters: manage state, apply visibility, and sync UI (including link styles and group toggles)
(() => {
  const grid = document.getElementById('game-grid');
  if (!grid) return;

  const exclusiveBtn = document.getElementById('exclusive-toggle');
  const clearBtn = document.getElementById('clear-filters');

  // Top-row group toggles: add data-filter-group="category" | "mode" | "tag" to toggle buttons
  const groupToggles = document.querySelectorAll('.filter-toggle[data-filter-group]');

  const state = {
    category: new Set(),
    mode: new Set(),
    tag: new Set(),
    exclusive: false
  };

  function styleFilterItem(btn, pressed) {
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.classList.toggle('pill--filled', !!pressed);
    btn.classList.toggle('tone-cyan', !!pressed);
    btn.classList.toggle('pill--soft', !pressed);
  }

  function styleGroupToggle(btn, on) {
    // Colour the group button cyan if any selection in that group is active
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('pill--filled', !!on);
    btn.classList.toggle('tone-cyan', !!on);
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

    // Exclusive link aria + (dot uses CSS based on aria-pressed)
    if (exclusiveBtn) {
      exclusiveBtn.setAttribute('aria-pressed', state.exclusive ? 'true' : 'false');
    }

    // Clear link: disabled when nothing selected across all groups (exclusive ignored for clear enabling)
    if (clearBtn) {
      const hasAny = state.category.size || state.mode.size || state.tag.size;
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

    const resultEl = document.getElementById('result-count');
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
    window.bggToggleGameFilter(type, value);
  });

  // Exclusive link toggles AND logic (dot color handled by CSS based on aria-pressed)
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
    state.category.clear(); state.mode.clear(); state.tag.clear();
    apply();
  });

  apply();
})();
