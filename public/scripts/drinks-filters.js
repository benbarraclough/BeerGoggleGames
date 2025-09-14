// Drinks Filters with search integration and programmatic API
// NOTE: Lives under public/ to load via <script src="...">
(function init() {
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  const selected = { type: new Set(), base: new Set(), difficulty: new Set() };
  let exclusive = false;

  const grid = qs('#drinks-grid');
  const clearBtn = qs('#clear-filters');
  const exclusiveBtn = qs('#exclusive-toggle');
  const resultCount = qs('#result-count');
  const panelToggles = qsa('.filter-toggle');
  const filterItems = qsa('.filter-item');

  function updateClearBtn() {
    const any = selected.type.size || selected.base.size || selected.difficulty.size;
    if (clearBtn) clearBtn.disabled = !any;
  }

  function matchDrink(li) {
    const dt = (li.getAttribute('data-type') || '').toLowerCase();
    const bases = (li.getAttribute('data-bases') || '').split(',').map(s=>s.toLowerCase()).filter(Boolean);
    const diff = (li.getAttribute('data-difficulty') || '').toLowerCase();
    const searchVisible = li.getAttribute('data-search-visible') !== 'false';

    const anySel = selected.type.size || selected.base.size || selected.difficulty.size;
    let filterPass = true;

    if (anySel) {
      if (!exclusive) {
        filterPass = (
          selected.type.has(dt) ||
          selected.difficulty.has(diff) ||
          (selected.base.size && Array.from(selected.base).some(b => bases.includes(b)))
        );
      } else {
        if (selected.type.size && !selected.type.has(dt)) filterPass = false;
        if (selected.difficulty.size && !selected.difficulty.has(diff)) filterPass = false;
        if (selected.base.size && filterPass) {
          let ok = false;
          for (const b of selected.base) { if (bases.includes(b)) { ok = true; break; } }
          if (!ok) filterPass = false;
        }
      }
    }

    return searchVisible && (!anySel || filterPass);
  }

  function applyFilters() {
    if (!grid) return;
    const cards = qsa('#drinks-grid > li');
    let shown = 0;
    cards.forEach(li => {
      if (matchDrink(li)) {
        li.classList.remove('hidden');
        shown++;
      } else {
        li.classList.add('hidden');
      }
    });
    if (resultCount) {
      resultCount.textContent = `Showing ${shown} of ${cards.length} drinks${exclusive ? ' (exclusive)' : ''}`;
    }
  }

  function toggleFilter(btn) {
    const type = btn.getAttribute('data-filter-type');
    let value = btn.getAttribute('data-value');
    if (!type || !value) return;
    if (type === 'base') value = value.toLowerCase();
    const set = selected[type];
    const active = btn.getAttribute('aria-pressed') === 'true';
    if (active) {
      set.delete(value);
      btn.setAttribute('aria-pressed','false');
    } else {
      set.add(value);
      btn.setAttribute('aria-pressed','true');
    }
    updateClearBtn();
    applyFilters();
  }

  // Programmatic API for clickable chips
  function programmaticToggle(type, value) {
    if (type === 'base') value = value.toLowerCase();
    const btn = filterItems.find(b => b.getAttribute('data-filter-type') === type && (b.getAttribute('data-value') || '').toLowerCase() === value.toLowerCase());
    if (btn) {
      toggleFilter(btn);
    } else {
      const set = selected[type];
      if (set) { if (set.has(value)) set.delete(value); else set.add(value); }
      applyFilters();
    }
  }

  filterItems.forEach(btn => {
    btn.addEventListener('click', () => toggleFilter(btn));
    btn.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleFilter(btn);
      }
    });
  });

  clearBtn?.addEventListener('click', () => {
    selected.type.clear();
    selected.base.clear();
    selected.difficulty.clear();
    filterItems.forEach(f => f.setAttribute('aria-pressed','false'));
    updateClearBtn();
    applyFilters();
  });

  exclusiveBtn?.addEventListener('click', () => {
    exclusive = !exclusive;
    exclusiveBtn.setAttribute('aria-pressed', exclusive ? 'true':'false');
    applyFilters();
  });

  function closeAllPanels(exceptId) {
    panelToggles.forEach(t => {
      const id = t.getAttribute('data-panel');
      const panel = document.getElementById('panel-' + id);
      if (!panel) return;
      if (id === exceptId) return;
      panel.classList.add('hidden');
      t.setAttribute('aria-expanded','false');
    });
  }

  panelToggles.forEach(t => {
    t.addEventListener('click', () => {
      const id = t.getAttribute('data-panel');
      const panel = document.getElementById('panel-' + id);
      if (!panel) return;
      const open = !panel.classList.contains('hidden');
      if (open) {
        panel.classList.add('hidden');
        t.setAttribute('aria-expanded','false');
      } else {
        closeAllPanels(id);
        panel.classList.remove('hidden');
        t.setAttribute('aria-expanded','true');
      }
    });
  });

  document.addEventListener('click', e => {
    const el = e.target && /** @type {Element} */ (e.target);
    if (!el?.closest) return;
    if (!el.closest('[data-filter-wrapper]')) closeAllPanels();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllPanels();
  });

  // Expose for page scripts
  window.bggApplyDrinkFilters = applyFilters;
  window.bggToggleDrinkFilter = programmaticToggle;

  updateClearBtn();
  applyFilters();
  console.log('[drinks-filters] loaded');
})();
