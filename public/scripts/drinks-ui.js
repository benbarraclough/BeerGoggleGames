// Page UI for drinks: card overlay navigation, search+filters integration, panel positioning, per-card tag dropdowns
(() => {
  // Make card clickable (overlay link has pointer-events: none)
  document.getElementById('drink-grid')?.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-card-tags]') || t.closest('.js-card-chip')) return;
    const card = t.closest('.drink-card');
    if (!card) return;
    const a = card.querySelector('a[data-card-link]');
    if (!(a instanceof HTMLAnchorElement)) return;
    window.location.href = a.href;
  });

  // Card chip -> toggle filters
  document.getElementById('drink-grid')?.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const chip = t.closest('.js-card-chip');
    if (!chip) return;
    e.preventDefault();
    e.stopPropagation();
    const type = chip.getAttribute('data-chip-type');
    const value = chip.getAttribute('data-chip-value');
    if (!type || !value) return;
    const pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.setAttribute('aria-pressed', pressed ? 'false' : 'true');
    window.bddToggleDrinkFilter?.(type, value);
    window.bddApplyDrinkFilters?.();
  });

  // Search input integrates with filters
  const input = document.getElementById('drink-search');
  const grid = document.getElementById('drink-grid');
  if (input && grid) {
    const items = Array.from(grid.children);
    function applySearch() {
      const q = input.value.trim().toLowerCase();
      items.forEach(li => {
        const title = li.getAttribute('data-title') || '';
        const tags = li.getAttribute('data-tags') || '';
        const drinkType = li.getAttribute('data-drinktype') || '';
        const base = li.getAttribute('data-base') || '';
        const difficulty = li.getAttribute('data-difficulty') || '';
        const excerpt = li.getAttribute('data-excerpt') || '';
        const match =
          !q ||
          title.includes(q) ||
          tags.includes(q) ||
          drinkType.includes(q) ||
          base.includes(q) ||
          difficulty.includes(q) ||
          excerpt.includes(q);
        li.dataset.searchVisible = match ? 'true' : 'false';
      });
      window.bddApplyDrinkFilters?.();
    }
    input.addEventListener('input', applySearch);
    applySearch();
  }

  // Top filter panels (Drink Type, Alcohol base, Difficulty, Tags)
  const wrappers = document.querySelectorAll('[data-filter-wrapper]');
  let openPanelEl = null;
  let openBtnEl = null;
  function positionFilterPanel(btn, panel) {
    if (!(btn instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;
    const gutter = 8;
    const btnRect = btn.getBoundingClientRect();
    const panelWidth = Math.min(320, Math.max(220, window.innerWidth - gutter * 2));
    const x = Math.round(
      Math.min(Math.max(gutter, btnRect.left), window.innerWidth - gutter - panelWidth),
    );
    const y = Math.round(btnRect.bottom + 6);
    panel.classList.add('floating');
    panel.style.width = panelWidth + 'px';
    panel.style.setProperty('--panel-x', x + 'px');
    panel.style.setProperty('--panel-y', y + 'px');
    const available = Math.max(140, window.innerHeight - y - gutter);
    const inner = panel.querySelector('.panel-inner');
    if (inner instanceof HTMLElement) inner.style.maxHeight = available + 'px';
  }
  function closeAllPanels(except) {
    wrappers.forEach(w => {
      const btn = w.querySelector('.filter-toggle');
      const panel = w.querySelector('.filter-panel');
      if (!panel) return;
      if (panel !== except) {
        panel.classList.add('hidden');
        btn?.setAttribute('aria-expanded', 'false');
        if (panel === openPanelEl) {
          openPanelEl = null;
          openBtnEl = null;
        }
      }
    });
  }
  wrappers.forEach(w => {
    const btn = w.querySelector('.filter-toggle');
    const panel = w.querySelector('.filter-panel');
    if (!btn || !panel) return;
    btn.addEventListener('click', e => {
      e.preventDefault();
      const isOpen = !panel.classList.contains('hidden');
      closeAllPanels(isOpen ? null : panel);
      if (isOpen) {
        panel.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        if (panel === openPanelEl) {
          openPanelEl = null;
          openBtnEl = null;
        }
      } else {
        panel.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        positionFilterPanel(btn, panel);
        openPanelEl = panel;
        openBtnEl = btn;
      }
    });
  });
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('[data-filter-wrapper]')) closeAllPanels(null);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllPanels(null);
  });
  window.addEventListener('resize', () => {
    if (openPanelEl && openBtnEl) positionFilterPanel(openBtnEl, openPanelEl);
  });

  // Per-card tag dropdowns (click-to-toggle)
  function toggleCardTags(trigger, force) {
    const holder = trigger.closest('[data-card-tags]');
    const panel = holder?.querySelector('[data-card-tags-panel]');
    const card = trigger.closest('.drink-card');
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    const willOpen = typeof force === 'boolean' ? force : !isOpen;
    document.querySelectorAll('[data-card-tags-panel]').forEach(p => {
      if (p instanceof HTMLElement) p.style.display = 'none';
    });
    document
      .querySelectorAll('[data-open-card-tags]')
      .forEach(b => b.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.drink-card.on-top').forEach(c => c.classList.remove('on-top'));
    if (willOpen) {
      if (panel instanceof HTMLElement) panel.style.display = 'block';
      trigger.setAttribute('aria-expanded', 'true');
      card?.classList.add('on-top');
    }
  }
  document.getElementById('drink-grid')?.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const trigger = t.closest('[data-open-card-tags]');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    toggleCardTags(trigger);
  });
  document.getElementById('drink-grid')?.addEventListener('keydown', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const trigger = t.closest('[data-open-card-tags]');
    if (!trigger) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCardTags(trigger);
    }
  });
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('[data-card-tags]')) {
      document
        .querySelectorAll('[data-card-tags-panel]')
        .forEach(p => p instanceof HTMLElement && (p.style.display = 'none'));
      document
        .querySelectorAll('[data-open-card-tags]')
        .forEach(b => b.setAttribute('aria-expanded', 'false'));
      document.querySelectorAll('.drink-card.on-top').forEach(c => c.classList.remove('on-top'));
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document
        .querySelectorAll('[data-card-tags-panel]')
        .forEach(p => p instanceof HTMLElement && (p.style.display = 'none'));
      document
        .querySelectorAll('[data-open-card-tags]')
        .forEach(b => b.setAttribute('aria-expanded', 'false'));
      document.querySelectorAll('.drink-card.on-top').forEach(c => c.classList.remove('on-top'));
    }
  });
})();
