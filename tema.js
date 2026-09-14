const sbTheme=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
let themeBooks=[],themeVisible=48;

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function themeBackHref(){try{const r=new URL(document.referrer);if(r.origin===location.origin&&!r.pathname.endsWith('/tema.html'))return r.pathname.split('/').pop()+(r.search||'')}catch{}return'temas.html'}
function themeCover(b){const ed=(b.editions||[]).find(e=>e.country==='Brasil'&&e.is_primary)||(b.editions||[]).find(e=>e.country==='Brasil');return{cover:ed?.cover_url||b.cover_url,pub:[ed?.publisher,ed?.publication_year].filter(Boolean).join(' • ')}}
function publicThemeArea(area){if(['Policial/Mistério','Coleção Negra','Coleção Policial'].includes(area))return'Policial/Mistério';if(['Ficção Militar','Ação / Militar'].includes(area))return'Ação / Militar';return area||'Outros'}
function themeBookCard(b){const x=themeCover(b);return `<article class="volume-card taxonomy-book-card"><a class="taxonomy-cover-link" href="livro.html?id=${encodeURIComponent(b.id)}">${x.cover?`<img src="${esc(x.cover)}" alt="Capa de ${esc(b.title)}" loading="lazy">`:'<div class="mini-placeholder">Sem capa</div>'}</a><div class="taxonomy-book-body"><a class="taxonomy-book-title" href="livro.html?id=${encodeURIComponent(b.id)}"><strong>${esc(b.title)}</strong></a>${b.authors?.id?`<a class="entity-text-link" href="autor.html?id=${encodeURIComponent(b.authors.id)}">${esc(b.authors.name||'Autor não informado')}</a>`:`<span>${esc(b.authors?.name||'Autor não informado')}</span>`}<span class="badge">${esc(publicThemeArea(b.area))}</span>${x.pub?`<span>${esc(x.pub)}</span>`:''}${b.series?.id?`<a class="entity-text-link taxonomy-series-link" href="serie.html?id=${encodeURIComponent(b.series.id)}">${esc(b.series.name)}${b.series_volume?` • vol. ${esc(b.series_volume)}`:''}</a>`:''}</div></article>`}
function setThemeMeta(attr,key,value){if(!value)return;let m=document.head.querySelector(`meta[${attr}="${key}"]`);if(!m){m=document.createElement('meta');m.setAttribute(attr,key);document.head.appendChild(m)}m.content=value}
function updateThemeMeta(t,books){
 const title=`${t.name} — Biblioteca Bruta`,desc=`Livros relacionados ao tema ${t.name}: ${books.length} ${books.length===1?'título':'títulos'} no catálogo Biblioteca Bruta.`.slice(0,155),url=`${location.origin}${location.pathname}?id=${encodeURIComponent(t.id)}`;
 let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta)}meta.content=desc;
 let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=url;
 setThemeMeta('property','og:title',title);setThemeMeta('property','og:description',desc);setThemeMeta('property','og:url',url);setThemeMeta('property','og:type','website');
 const data={'@context':'https://schema.org','@type':'CollectionPage',name:title,url,description:desc,isPartOf:{'@type':'WebSite',name:'Biblioteca Bruta',url:'https://bibliotecabruta.com.br/'},about:{'@type':'DefinedTerm',name:t.name},mainEntity:{'@type':'ItemList',numberOfItems:books.length,itemListElement:books.slice(0,50).map((b,i)=>({'@type':'ListItem',position:i+1,url:new URL('livro.html?id='+encodeURIComponent(b.id),location.href).href,name:b.title}))}};
 const id='bbThemeStructuredData';let script=document.getElementById(id);if(!script){script=document.createElement('script');script.type='application/ld+json';script.id=id;document.head.appendChild(script)}script.textContent=JSON.stringify(data);
}
function renderThemeBooks(){const grid=document.getElementById('themeBooksGrid'),wrap=document.getElementById('themeMoreWrap');if(!grid||!wrap)return;const shown=themeBooks.slice(0,themeVisible);grid.innerHTML=shown.length?shown.map(themeBookCard).join(''):'<div class="empty">Nenhum livro associado a este tema ainda.</div>';const remaining=Math.max(0,themeBooks.length-shown.length);wrap.innerHTML=remaining?`<button class="secondary" type="button" onclick="showMoreThemeBooks()">Mostrar mais ${Math.min(48,remaining)} livros</button><span class="muted">${shown.length} de ${themeBooks.length}</span>`:themeBooks.length?`<span class="muted">${themeBooks.length} ${themeBooks.length===1?'livro':'livros'} neste tema</span>`:''}
function showMoreThemeBooks(){themeVisible+=48;renderThemeBooks()}

async function loadTheme(){
  const root=document.getElementById('themePage'),id=new URLSearchParams(location.search).get('id');
  if(!id){root.innerHTML='<div class="empty">Tema não informado.</div>';return}
  const {data:t,error}=await sbTheme.from('tags').select('id,name').eq('id',id).single();
  if(error||!t){root.innerHTML='<div class="empty">Tema não encontrado.</div>';return}
  document.title=`${t.name} — Biblioteca Bruta`;
  const {data:links,error:le}=await sbTheme.from('book_tags').select('books(id,title,cover_url,area,series_volume,authors(id,name),series(id,name),editions(cover_url,publisher,publication_year,is_primary,country))').eq('tag_id',id);
  if(le){root.innerHTML='<div class="empty">Não foi possível carregar os livros deste tema.</div>';return}
  themeBooks=(links||[]).map(x=>x.books).filter(Boolean).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));themeVisible=48;updateThemeMeta(t,themeBooks);
  const areaCounts=new Map();for(const b of themeBooks){const a=publicThemeArea(b.area);areaCounts.set(a,(areaCounts.get(a)||0)+1)}
  const areas=[...areaCounts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));
  const onlyArea=areas.length===1?areas[0][0]:'';
  const catalogHref=`catalogo.html?${onlyArea?`area=${encodeURIComponent(onlyArea)}&`:''}tag=${encodeURIComponent(t.id)}`;
  const categoriesHref=onlyArea?`categorias.html?area=${encodeURIComponent(onlyArea)}`:'categorias.html';
  const back=themeBackHref();
  root.innerHTML=`<div class="context-back-row"><a class="backlink" href="${esc(back)}">← Voltar</a>${back!=='temas.html'?'<a class="secondary-backlink" href="temas.html">Todos os temas</a>':''}</div><section class="series-hero taxonomy-detail-hero"><div class="eyebrow">TEMA</div><h1>${esc(t.name)}</h1><p class="muted">Assunto, característica ou detalhe usado para cruzar diferentes prateleiras do catálogo.</p><div class="series-summary"><strong>${themeBooks.length} ${themeBooks.length===1?'livro relacionado':'livros relacionados'}</strong>${areas.map(([area,count])=>`<a class="entity-text-link" href="catalogo.html?area=${encodeURIComponent(area)}&tag=${encodeURIComponent(t.id)}">${esc(area)} · ${count}</a>`).join('')}</div><div class="taxonomy-detail-actions"><a class="secondary" href="${catalogHref}">Abrir no catálogo</a><a class="secondary" href="${categoriesHref}">Explorar categorias</a></div></section><section class="detail-section"><h2>Livros com este tema</h2><div id="themeBooksGrid" class="series-volume-grid"></div><div id="themeMoreWrap" class="area-catalog-more"></div></section>`;
  renderThemeBooks();
}

document.addEventListener('DOMContentLoaded',loadTheme);