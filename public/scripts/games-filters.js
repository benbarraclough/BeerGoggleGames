// Games Filters (externalized)
// Assumes markup structure in src/pages/games/index.astro

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
  const tagTriggers = qsa('[data-tag-trigger]');

  function updateClearBtn() {
    const any = selected.category.size || selected.mode.size || selected.tag.size;
    if (clearBtn) clearBtn.disabled = !any;
  }

  function matchGame(li) {
    const type = li.getAttribute('data-type') || '';
    const mode = li.getAttribute('data-mode') || '';
    const tags = (li.getAttribute('data-tags') || '').split(',').filter(Boolean);

    const hasFilters = selected.category.size || selected.mode.size || selected.tag.size;
    if (!hasFilters) return true;

    if (!exclusive) {
      if (selected.category.has(type)) return true;
      if (selected.mode.has(mode)) return true;
      if (selected.tag.size) {
        for (const t of selected.tag) {
          if (tags.includes(t)) return true;
        }
      }
      return false;
    }

    // Exclusive
    if (selected.category.size && !selected.category.has(type)) return false;
    if (selected.mode.size && !selected.mode.has(mode)) return false;
    if (selected.tag.size) {
      for (const t of selected.tag) {
        if (!tags.includes(t)) return false;
      }
    }
    return true;
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
    if (!target.closest('[data-filter-wrapper]')) closeAllPanels();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllPanels();
  });

  // Tag popover logic (touch/click)
  function closeAllTagPopovers(except) {
    tagTriggers.forEach(tr => {
      if (tr === except) return;
      tr.setAttribute('data-open','false');
      tr.setAttribute('aria-expanded','false');
    });
  }

  tagTriggers.forEach(tr => {
    tr.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = tr.getAttribute('data-open') === 'true';
      if (isOpen) {
        tr.setAttribute('data-open','false');
        tr.setAttribute('aria-expanded','false');
      } else {
        closeAllTagPopovers(tr);
        tr.setAttribute('data-open','true');
        tr.setAttribute('aria-expanded','true');
      }
    });
    tr.addEventListener('mousedown', e => e.stopPropagation());
  });

  document.addEventListener('click', e => {
    const t = e.target;
    if (!t.closest('.group\\/tag')) closeAllTagPopovers(null);
  });

  // Init
  updateClearBtn();
  applyFilters();
  console.log('Games filters loaded');
})();
