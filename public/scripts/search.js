// Unified site search logic externalized for CSP compliance
(function () {
  const BASE = document.documentElement.getAttribute('data-base') || '/';
  const input = document.getElementById('q');
  const list = document.getElementById('results');
  const status = document.getElementById('status');
  if (!input || !list || !status) return;
  let data = [];
  let ready = false;

  function log(...args) {
    console.log('[search]', ...args);
  }
  function escapeHTML(s) {
    return s.replace(
      /[&<>\"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  }
  function buildHref(m) {
    const c = (m.c || '').replace(/^\/+|\/+$/g, '');
    if (!m.slug) return BASE + (c ? c + '/' : '');
    return BASE + c + '/' + m.slug.replace(/^\/+|\/+$/g, '') + '/';
  }
  function groupLabel(m) {
    const segs = (m.c || '').split('/');
    const group = (segs[0] || '').toLowerCase();
    if (group === 'games' || group === 'drinks') {
      return (group || '') + (m.type ? '/' + (m.type || '') : '');
    }
    return m.c || '';
  }
  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<li class="text-muted text-sm">No results.</li>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const m of items) {
      const li = document.createElement('li');
      const title = escapeHTML(m.title || '');
      const meta = escapeHTML(groupLabel(m));
      const href = buildHref(m);
      li.innerHTML = `<a class="hover:text-neon font-medium" href="${href}">${title}</a> <small class="text-muted">(${meta})</small>`;
      frag.appendChild(li);
    }
    list.appendChild(frag);
  }
  function doSearch(q) {
    if (!ready) return;
    const term = q.trim().toLowerCase();
    if (!term) {
      list.innerHTML = '';
      status.textContent = 'Enter a term to see results.';
      return;
    }
    status.textContent = '';
    const terms = term.split(/\s+/);
    const matches = data
      .filter(item => {
        const hay = (
          item.title +
          ' ' +
          (item.excerpt || '') +
          ' ' +
          (item.type || '') +
          ' ' +
          (item.ingredients || []).join(' ')
        ).toLowerCase();
        return terms.every(t => hay.includes(t));
      })
      .slice(0, 150);
    render(matches);
  }

  input.addEventListener('input', () => doSearch(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(input.value);
    }
  });

  const url = BASE + 'search-index.json';
  log('Fetching index', url);
  fetch(url, { cache: 'no-cache' })
    .then(r => {
      log('Response status', r.status);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(json => {
      data = json || [];
      ready = true;
      status.textContent = 'Index loaded. Start typing.';
      log('Index loaded', data.length, 'items');
    })
    .catch(err => {
      console.error('[search] index load error', err);
      status.textContent = 'Failed to load search index.';
    });
})();
