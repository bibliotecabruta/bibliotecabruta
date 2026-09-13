const sbCategory=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function categoryBackHref(){try{const r=new URL(document.referrer);if(r.origin===location.origin&&!r.pathname.endsWith('/categoria.html'))return r.pathname.split('/').pop()+(r.search||'')}catch{}return'categorias.html'}
function categoryCover(b){const ed=(b.editions||[]).find(e=>e.country==='Brasil'&&e.is_primary)||(b.editions||[]).find(e=>e.country==='Brasil');return{cover:ed?.cover_url||b.cover_url,pub:[ed?.publisher,ed?.publication_year].filter(Boolean).join(' • ')}}

async function loadCategory(){
  const root=document.getElementById('categoryPage'),id=new URLSearchParams(location.search).get('id');
  if(!id){root.innerHTML='<div class="empty">Categoria não informada.</div>';return}
  const {data:c,error}=await sbCategory.from('categories').select('id,name,area,book_categories(books(id,title,cover_url,series_volume,authors(id,name),series(id,name),editions(cover_url,is_primary,country,publisher,publication_year)))').eq('id',id).single();
  if(error||!c){root.innerHTML='<div class="empty">Categoria não encontrada.</div>';return}
  document.title=`${c.name} — Biblioteca Bruta`;
  const books=(c.book_categories||[]).map(x=>x.books).filter(Boolean).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  const back=categoryBackHref();
  root.innerHTML=`
    <div class="context-back-row"><a class="backlink" href="${esc(back)}">← Voltar</a>${back!=='categorias.html'?'<a class="secondary-backlink" href="categorias.html">Todas as categorias</a>':''}</div>
    <section class="series-hero taxonomy-detail-hero">
      <div class="eyebrow">${esc(c.area)}</div>
      <h1>${esc(c.name)}</h1>
      <p class="muted">Prateleira estrutural da Biblioteca Bruta.</p>
      <div class="series-summary"><strong>${books.length} ${books.length===1?'livro relacionado':'livros relacionados'}</strong></div>
      <div class="taxonomy-detail-actions"><a class="secondary" href="catalogo.html?category=${encodeURIComponent(c.id)}">Abrir no catálogo</a><a class="secondary" href="temas.html">Explorar temas</a></div>
    </section>
    <section class="detail-section">
      <h2>Livros nesta categoria</h2>
      <div class="series-volume-grid">${books.length?books.map(b=>{const x=categoryCover(b);return `
        <article class="volume-card taxonomy-book-card">
          <a class="taxonomy-cover-link" href="livro.html?id=${encodeURIComponent(b.id)}">${x.cover?`<img src="${esc(x.cover)}" alt="Capa de ${esc(b.title)}" loading="lazy">`:'<div class="mini-placeholder">Sem capa</div>'}</a>
          <div class="taxonomy-book-body">
            <a class="taxonomy-book-title" href="livro.html?id=${encodeURIComponent(b.id)}"><strong>${esc(b.title)}</strong></a>
            ${b.authors?.id?`<a class="entity-text-link" href="autor.html?id=${encodeURIComponent(b.authors.id)}">${esc(b.authors.name||'Autor não informado')}</a>`:`<span>${esc(b.authors?.name||'Autor não informado')}</span>`}
            ${x.pub?`<span>${esc(x.pub)}</span>`:''}
            ${b.series?.id?`<a class="entity-text-link taxonomy-series-link" href="serie.html?id=${encodeURIComponent(b.series.id)}">${esc(b.series.name)}${b.series_volume?` • vol. ${esc(b.series_volume)}`:''}</a>`:''}
          </div>
        </article>`}).join(''):'<div class="empty">Nenhum livro associado a esta categoria ainda.</div>'}</div>
    </section>`;
}

document.addEventListener('DOMContentLoaded',loadCategory);