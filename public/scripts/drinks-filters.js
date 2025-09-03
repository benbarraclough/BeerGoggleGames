// Drinks Filters (public version)
// NOTE: This must live under public/ to load via <script src="...">
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
    const dt = li.getAttribute('data-type') || '';
    const bases = (li.getAttribute('data-bases') || '').split(',').filter(Boolean);
    const diff = li.getAttribute('data-difficulty') || '';
    const anySel = selected.type.size || selected.base.size || selected.difficulty.size;
    if (!anySel) return true;

    if (!exclusive) {
      if (selected.type.has(dt)) return true;
      if (selected.difficulty.has(diff)) return true;
      if (selected.base.size) {
        for (const b of selected.base) if (bases.includes(b)) return true;
      }
      return false;
    }

    if (selected.type.size && !selected.type.has(dt)) return false;
    if (selected.difficulty.size && !selected.difficulty.has(diff)) return false;
    if (selected.base.size) {
      let ok = false;
      for (const b of selected.base) {
        if (bases.includes(b)) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
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
    const target = e.target;
    if (!target.closest('[data-filter-wrapper]')) closeAllPanels();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllPanels();
  });

  updateClearBtn();
  applyFilters();
  console.log('Drinks filters loaded');
})();
