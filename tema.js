const sbTheme=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function themeBackHref(){try{const r=new URL(document.referrer);if(r.origin===location.origin&&!r.pathname.endsWith('/tema.html'))return r.pathname.split('/').pop()+(r.search||'')}catch{}return'temas.html'}
function themeCover(b){const ed=(b.editions||[]).find(e=>e.country==='Brasil'&&e.is_primary)||(b.editions||[]).find(e=>e.country==='Brasil');return{cover:ed?.cover_url||b.cover_url,pub:[ed?.publisher,ed?.publication_year].filter(Boolean).join(' • ')}}

async function loadTheme(){
  const root=document.getElementById('themePage'),id=new URLSearchParams(location.search).get('id');
  if(!id){root.innerHTML='<div class="empty">Tema não informado.</div>';return}
  const {data:t,error}=await sbTheme.from('tags').select('id,name').eq('id',id).single();
  if(error||!t){root.innerHTML='<div class="empty">Tema não encontrado.</div>';return}
  document.title=`${t.name} — Biblioteca Bruta`;
  const {data:links,error:le}=await sbTheme.from('book_tags').select('books(id,title,cover_url,area,series_volume,authors(id,name),series(id,name),editions(cover_url,publisher,publication_year,is_primary,country))').eq('tag_id',id);
  if(le){root.innerHTML='<div class="empty">Não foi possível carregar os livros deste tema.</div>';return}
  const books=(links||[]).map(x=>x.books).filter(Boolean).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  const areas=[...new Set(books.map(b=>b.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const back=themeBackHref();
  root.innerHTML=`
    <div class="context-back-row"><a class="backlink" href="${esc(back)}">← Voltar</a>${back!=='temas.html'?'<a class="secondary-backlink" href="temas.html">Todos os temas</a>':''}</div>
    <section class="series-hero taxonomy-detail-hero">
      <div class="eyebrow">TEMA</div>
      <h1>${esc(t.name)}</h1>
      <p class="muted">Assunto, característica ou detalhe usado para cruzar diferentes prateleiras do catálogo.</p>
      <div class="series-summary"><strong>${books.length} ${books.length===1?'livro relacionado':'livros relacionados'}</strong>${areas.length?`<span>${esc(areas.join(' • '))}</span>`:''}</div>
      <div class="taxonomy-detail-actions"><a class="secondary" href="catalogo.html?tag=${encodeURIComponent(t.id)}">Abrir no catálogo</a><a class="secondary" href="categorias.html">Explorar categorias</a></div>
    </section>
    <section class="detail-section">
      <h2>Livros com este tema</h2>
      <div class="series-volume-grid">${books.length?books.map(b=>{const x=themeCover(b);return `
        <article class="volume-card taxonomy-book-card">
          <a class="taxonomy-cover-link" href="livro.html?id=${encodeURIComponent(b.id)}">${x.cover?`<img src="${esc(x.cover)}" alt="Capa de ${esc(b.title)}" loading="lazy">`:'<div class="mini-placeholder">Sem capa</div>'}</a>
          <div class="taxonomy-book-body">
            <a class="taxonomy-book-title" href="livro.html?id=${encodeURIComponent(b.id)}"><strong>${esc(b.title)}</strong></a>
            ${b.authors?.id?`<a class="entity-text-link" href="autor.html?id=${encodeURIComponent(b.authors.id)}">${esc(b.authors.name||'Autor não informado')}</a>`:`<span>${esc(b.authors?.name||'Autor não informado')}</span>`}
            ${x.pub?`<span>${esc(x.pub)}</span>`:''}
            ${b.series?.id?`<a class="entity-text-link taxonomy-series-link" href="serie.html?id=${encodeURIComponent(b.series.id)}">${esc(b.series.name)}${b.series_volume?` • vol. ${esc(b.series_volume)}`:''}</a>`:''}
          </div>
        </article>`}).join(''):'<div class="empty">Nenhum livro associado a este tema ainda.</div>'}</div>
    </section>`;
}

document.addEventListener('DOMContentLoaded',loadTheme);