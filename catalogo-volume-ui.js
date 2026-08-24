const originalApplyCatalogFilters = applyCatalogFilters;

applyCatalogFilters = function applyCatalogFiltersWithStandaloneBooks() {
  const changed = [];
  for (const book of catalogRows) {
    if (!book.series) {
      changed.push(book);
      book.series = { id: '', name: '', brazil_status: 'Volume único', __standalone: true };
    }
  }
  try {
    originalApplyCatalogFilters();
  } finally {
    for (const book of changed) book.series = null;
  }
  enhanceStandaloneCatalogCards();
};

function enhanceStandaloneCatalogCards() {
  document.querySelectorAll('#filteredCatalog .book-link').forEach(card => {
    const id = new URL(card.href, location.href).searchParams.get('id');
    const book = catalogRows.find(row => String(row.id) === String(id));
    if (!book) return;
    const body = card.querySelector('.book-body');
    const metadata = body?.querySelectorAll('.book-meta');
    const seriesMetadata = metadata?.[1];
    if (!book.series && seriesMetadata && !seriesMetadata.textContent.trim()) {
      seriesMetadata.innerHTML = '<span class="badge status-volume-unico">Volume único</span>';
    }
    const editionCount = (book.editions || []).filter(edition => edition.country === 'Brasil').length;
    if (editionCount > 1 && body && !body.querySelector('.edition-mini-badge')) {
      const badge = document.createElement('div');
      badge.className = 'book-meta edition-mini-badge';
      badge.textContent = `${editionCount} edições brasileiras`;
      seriesMetadata?.insertAdjacentElement('afterend', badge);
    }
  });
}
