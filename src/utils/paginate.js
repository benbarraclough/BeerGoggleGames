export function paginate(items, perPage = 30) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  return { totalPages, perPage,
    slice(page) {
      const p = Math.min(Math.max(1, page), totalPages);
      const start = (p - 1) * perPage;
      return items.slice(start, start + perPage);
    }
  };
}
