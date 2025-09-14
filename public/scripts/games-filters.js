// Games Filters with search integration and programmatic API
// Works with src/pages/games/index.astro
(function init() {
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  const selected = { category: new Set(), mode: new Set(), tag: new Set() };
  let exclusive = false;

  const gameGrid = qs('#game-grid');
  const clearBtn = qs('#clear-filters');
  const exclusiveBtn = qs('#exclusive-toggle');
  const resultCount = qs('#result-count');
  const panelToggles = qsa('.filter-toggle');
  const filterItems = qsa('.filter-item');

  function updateClearBtn() {
    const any = selected.category.size || selected.mode.size || selected.tag.size;
    if (clearBtn) clearBtn.disabled = !any;
  }

  function matchGame(li) {
    const type = li.getAttribute('data-type') || '';
    const mode = li.getAttribute('data-mode') || '';
    const tags = (li.getAttribute('data-tags') || '').split(',').filter(Boolean);
    const searchVisible = li.getAttribute('data-search-visible') !== 'false'; // treat '' as true

    const hasFilters = selected.category.size || selected.mode.size || selected.tag.size;
    let filterPass = true;

    if (hasFilters) {
      if (!exclusive) {
        filterPass = (
          selected.category.has(type) ||
          selected.mode.has(mode) ||
          (selected.tag.size && Array.from(selected.tag).some(t => tags.includes(t)))
        );
      } else {
        if (selected.category.size && !selected.category.has(type)) filterPass = false;
        if (selected.mode.size && !selected.mode.has(mode)) filterPass = false;
        if (selected.tag.size && filterPass) {
          for (const t of selected.tag) {
            if (!tags.includes(t)) { filterPass = false; break; }
          }
        }
      }
    }

    return searchVisible && (!hasFilters || filterPass);
  }

  function applyFilters() {
    if (!gameGrid) return;
    const cards = qsa('#game-grid > li');
    let visible = 0;
    cards.forEach(li => {
      if (matchGame(li)) {
        li.classList.remove('hidden');
        visible++;
      } else {
        li.classList.add('hidden');
      }
    });
    if (resultCount) {
      resultCount.textContent = `Showing ${visible} of ${cards.length} games${exclusive ? ' (exclusive)' : ''}`;
    }
  }

  function toggleFilterItem(btn) {
    const type = btn.getAttribute('data-filter-type');
    const value = btn.getAttribute('data-value');
    if (!type || !value) return;
    const set = selected[type];
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    if (pressed) {
      set.delete(value);
      btn.setAttribute('aria-pressed','false');
    } else {
      set.add(value);
      btn.setAttribute('aria-pressed','true');
    }
    updateClearBtn();
    applyFilters();
  }

  // Programmatic API to toggle a filter by type/value and reflect UI
  function programmaticToggle(type, value) {
    const btn = filterItems.find(b => b.getAttribute('data-filter-type') === type && b.getAttribute('data-value') === value);
    if (btn) {
      toggleFilterItem(btn);
    } else {
      // if filter pill not in panel (e.g., value not listed), just toggle set
      const set = selected[type];
      if (set) {
        if (set.has(value)) set.delete(value); else set.add(value);
      }
      applyFilters();
    }
  }

  filterItems.forEach(btn => {
    btn.addEventListener('click', () => toggleFilterItem(btn));
    btn.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleFilterItem(btn);
      }
    });
  });

  clearBtn?.addEventListener('click', () => {
    selected.category.clear();
    selected.mode.clear();
    selected.tag.clear();
    filterItems.forEach(f => f.setAttribute('aria-pressed','false'));
    updateClearBtn();
    applyFilters();
  });

  exclusiveBtn?.addEventListener('click', () => {
    exclusive = !exclusive;
    exclusiveBtn.setAttribute('aria-pressed', exclusive ? 'true' : 'false');
    applyFilters();
  });

  // Dropdown (panels)
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

  panelToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const id = toggle.getAttribute('data-panel');
      const panel = document.getElementById('panel-' + id);
      if (!panel) return;
      const open = !panel.classList.contains('hidden');
      if (open) {
        panel.classList.add('hidden');
        toggle.setAttribute('aria-expanded','false');
      } else {
        closeAllPanels(id);
        panel.classList.remove('hidden');
        toggle.setAttribute('aria-expanded','true');
      }
    });
  });

  document.addEventListener('click', e => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('[data-filter-wrapper]')) closeAllPanels();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllPanels();
  });

  // Expose small API for page scripts
  window.bggApplyGameFilters = applyFilters;
  window.bggToggleGameFilter = programmaticToggle;

  // Init
  updateClearBtn();
  applyFilters();
  console.log('[games-filters] loaded');
})();
