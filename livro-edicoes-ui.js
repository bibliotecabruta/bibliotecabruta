function enhanceBookEditionUI() {
  const page = document.getElementById('bookPage');
  if (!page || page.dataset.editionUiReady === 'true' || !page.querySelector('.book-detail')) return;
  page.dataset.editionUiReady = 'true';

  const main = page.querySelector('.book-detail-main');
  if (main && !main.querySelector('.series-line')) {
    const line = document.createElement('p');
    line.className = 'series-line single-volume-line';
    line.innerHTML = '<span class="badge status-volume-unico">Volume único</span><span class="single-volume-note">História completa neste livro; não faz parte de uma série.</span>';
    main.querySelector('h2')?.insertAdjacentElement('afterend', line);
  }

  const cards = [...page.querySelectorAll('.edition-card')];
  const section = cards[0]?.closest('.detail-section');
  const heading = section?.querySelector('h2');
  if (heading && cards.length) {
    const header = document.createElement('div');
    header.className = 'edition-heading';
    heading.replaceWith(header);
    header.append(heading);
    heading.textContent = cards.length === 1 ? 'Edição publicada no Brasil' : 'Edições publicadas no Brasil';
    const count = document.createElement('span');
    count.className = 'badge edition-count-badge';
    count.textContent = `${cards.length} ${cards.length === 1 ? 'edição cadastrada' : 'edições cadastradas'}`;
    header.append(count);
  }

  cards.forEach((card, index) => {
    const body = card.querySelector('div');
    const isPrimary = card.textContent.includes('edição principal');
    if (isPrimary) card.classList.add('edition-primary');
    const label = document.createElement('small');
    label.className = 'edition-label';
    label.textContent = isPrimary ? 'EDIÇÃO PRINCIPAL NO SITE' : `OUTRA EDIÇÃO BRASILEIRA${cards.length > 2 ? ` · ${index + 1}` : ''}`;
    body?.prepend(label);
    if (!card.querySelector('img')) {
      const placeholder = document.createElement('div');
      placeholder.className = 'edition-cover-placeholder';
      placeholder.textContent = 'Capa não cadastrada';
      card.prepend(placeholder);
    }
  });
}

const bookEditionObserver = new MutationObserver(enhanceBookEditionUI);
bookEditionObserver.observe(document.getElementById('bookPage'), { childList: true, subtree: true });
enhanceBookEditionUI();
