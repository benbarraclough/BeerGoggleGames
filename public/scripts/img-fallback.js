// Global image fallback: try common filename variants when an image 404s
(function () {
  if (window.__imgFallback) return;
  function uniq(arr) {
    return Array.from(new Set(arr));
  }
  function baseName(url) {
    try {
      url = String(url);
    } catch {
      return '';
    }
    const m = url.match(/([^\/]+)\.webp$/i);
    return m ? m[1] : '';
  }
  function makeCandidates(name) {
    const out = [];
    const original = name;
    const noHyphen = name.replace(/-/g, '');
    const andToAmp = name.replace(/-and-/g, '&').replace(/-/g, '');
    const removeOf = name.replace(/-of-/g, '-');
    const ofNoHyphen = removeOf.replace(/-/g, '');
    const m = name.match(/^(\d+-\d+)-(.*)$/); // 7-11-doubles -> 7-11doubles
    const numericJoin = m ? m[1] + m[2].replace(/-/g, '') : '';
    [original, noHyphen, andToAmp, ofNoHyphen, numericJoin]
      .filter(Boolean)
      .forEach(n => out.push(n + '.webp'));
    return uniq(out);
  }
  window.__imgFallback = function (img) {
    try {
      if (!(img instanceof HTMLImageElement)) return;
      const cur = img.getAttribute('src') || '';
      const currentName = baseName(cur);
      const key = img.getAttribute('data-fb-key') || currentName;
      const list = (img.__fbList = img.__fbList || makeCandidates(key));
      let i = img.__fbIndex || 0;
      while (i < list.length && cur.includes('/' + list[i])) i++;
      if (i >= list.length) {
        img.style.display = 'none';
        return;
      }
      img.__fbIndex = i + 1;
      const next = list[i];
      const prefix = (cur.split('/images/')[0] || '').replace(/\/$/, '');
      img.src = prefix + '/images/' + next;
    } catch {}
  };
})();
