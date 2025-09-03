// Drinks Filters (external version)
// Mirrors games filter logic with sets: type, base, difficulty.
// Exclusive = AND across selected groups.
// No tag popover logic needed.

(function(){
  var qs = function(s){ return document.querySelector(s); };
  var qsa = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var selected = {
    type: new Set(),
    base: new Set(),
    difficulty: new Set()
  };
  var exclusive = false;

  var filterItems = qsa('.filter-item');
  var panelToggles = qsa('.filter-toggle');
  var clearBtn = qs('#clear-filters');
  var exclusiveBtn = qs('#exclusive-toggle');
  var resultCount = qs('#result-count');
  var grid = qs('#drinks-grid');

  function anySelected(){
    return selected.type.size || selected.base.size || selected.difficulty.size;
  }

  function updateClearBtn(){
    if (!clearBtn) return;
    clearBtn.disabled = !anySelected();
  }

  function matchCard(li){
    if (!li) return false;
    var t = li.getAttribute('data-type') || '';
    var bases = (li.getAttribute('data-bases') || '').split(',').filter(Boolean);
    var diff = li.getAttribute('data-difficulty') || '';
    if (!anySelected()) return true;

    if (!exclusive){
      if (selected.type.has(t)) return true;
      if (selected.difficulty.has(diff)) return true;
      if (selected.base.size){
        for (var b of selected.base){
          if (bases.indexOf(b) !== -1) return true;
        }
      }
      return false;
    }

    // Exclusive
    if (selected.type.size && !selected.type.has(t)) return false;
    if (selected.difficulty.size && !selected.difficulty.has(diff)) return false;
    if (selected.base.size){
      var ok = false;
      for (var bb of selected.base){
        if (bases.indexOf(bb) !== -1){ ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  }

  function applyFilters(){
    if (!grid) return;
    var cards = qsa('#drinks-grid > li');
    var visible = 0;
    cards.forEach(function(li){
      if (matchCard(li)){
        li.classList.remove('hidden');
        visible++;
      } else {
        li.classList.add('hidden');
      }
    });
    if (resultCount){
      var msg = 'Showing ' + visible + ' of ' + cards.length + ' drinks' + (exclusive ? ' (exclusive)' : '');
      resultCount.textContent = msg;
    }
  }

  function toggleFilter(btn){
    if (!btn) return;
    var type = btn.getAttribute('data-filter-type');
    var value = btn.getAttribute('data-value');
    if (!type || !value) return;
    if (type === 'base') value = value.toLowerCase();
    var set = selected[type];
    var pressed = btn.getAttribute('aria-pressed') === 'true';
    if (pressed){
      set.delete(value);
      btn.setAttribute('aria-pressed','false');
    } else {
      set.add(value);
      btn.setAttribute('aria-pressed','true');
    }
    updateClearBtn();
    applyFilters();
  }

  // Bind filter items
  filterItems.forEach(function(btn){
    btn.addEventListener('click', function(){
      toggleFilter(btn);
    });
    btn.addEventListener('keydown', function(e){
      if (e.key === ' ' || e.key === 'Enter'){
        e.preventDefault();
        toggleFilter(btn);
      }
    });
  });

  // Clear
  if (clearBtn){
    clearBtn.addEventListener('click', function(){
      selected.type.clear();
      selected.base.clear();
      selected.difficulty.clear();
      filterItems.forEach(function(f){ f.setAttribute('aria-pressed','false'); });
      updateClearBtn();
      applyFilters();
    });
  }

  // Exclusive
  if (exclusiveBtn){
    exclusiveBtn.addEventListener('click', function(){
      exclusive = !exclusive;
      exclusiveBtn.setAttribute('aria-pressed', exclusive ? 'true' : 'false');
      applyFilters();
    });
  }

  // Dropdown panels
  function closeAllPanels(exceptId){
    panelToggles.forEach(function(t){
      var id = t.getAttribute('data-panel');
      var panel = document.getElementById('panel-' + id);
      if (!panel) return;
      if (exceptId && id === exceptId) return;
      panel.classList.add('hidden');
      t.setAttribute('aria-expanded','false');
    });
  }

  panelToggles.forEach(function(t){
    t.addEventListener('click', function(){
      var id = t.getAttribute('data-panel');
      var panel = document.getElementById('panel-' + id);
      if (!panel) return;
      var open = !panel.classList.contains('hidden');
      if (open){
        panel.classList.add('hidden');
        t.setAttribute('aria-expanded','false');
      } else {
        closeAllPanels(id);
        panel.classList.remove('hidden');
        t.setAttribute('aria-expanded','true');
      }
    });
  });

  document.addEventListener('click', function(e){
    if (!e.target.closest('[data-filter-wrapper]')){
      closeAllPanels();
    }
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeAllPanels();
  });

  updateClearBtn();
  applyFilters();
  console.debug('[drinks-filters] initialized');
})();
