import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';

const base='https://bibliotecabruta.com.br/';
const config=await readFile('config.js','utf8');
const supabaseUrl=config.match(/supabaseUrl:\s*["']([^"']+)["']/)?.[1];
const key=config.match(/supabasePublishableKey:\s*["']([^"']+)["']/)?.[1];
if(!supabaseUrl||!key)throw new Error('Supabase config not found');

const headers={apikey:key,Authorization:'Bearer '+key};
const api=supabaseUrl.replace(/\/$/,'')+'/rest/v1/';
async function get(path){
 const res=await fetch(api+path,{headers});
 if(!res.ok)throw new Error(path+': '+res.status+' '+await res.text());
 return res.json();
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'item'}
function bookPath(b){return 'livros/'+slug(b.title)+'-'+b.id+'.html'}
function seriesPath(s){return 'series/'+slug(s.name)+'-'+s.id+'.html'}
function authorPath(a){return 'autores/'+slug(a.name)+'-'+a.id+'.html'}
function primaryBrEdition(b){return (b.editions||[]).find(e=>e.country==='Brasil'&&e.is_primary)||(b.editions||[]).find(e=>e.country==='Brasil')||(b.editions||[])[0]}
function abs(path){return new URL(path,base).href}
function safeText(v,max=155){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
function xml(v){return esc(v).replace(/&#039;/g,'&apos;')}

const bookSelect='id,title,original_title,original_year,original_country,synopsis,area,series_volume,cover_url,authors(id,name),series(id,name),editions(country,publisher,publication_year,isbn,pages,translator,is_primary,cover_url,notes,edition_label,binding,created_at),book_categories(categories(id,name)),book_tags(tags(id,name))';
const seriesSelect='id,name,original_name,description,brazil_status,brazil_published_volumes,original_total_volumes,books(id,title,original_title,series_volume,item_type,cover_url,authors(id,name),editions(country,publisher,publication_year,is_primary,cover_url))';
const authorSelect='id,name,nationality,bio,photo_url,photo_credit,books(id,title,area,cover_url,series_volume,item_type,series(id,name),editions(country,publisher,publication_year,is_primary,cover_url))';
const [books,seriesRows,authorRows,sitemapRows]=await Promise.all([
 get('books?select='+encodeURIComponent(bookSelect)+'&order=title.asc'),
 get('series?select='+encodeURIComponent(seriesSelect)+'&order=name.asc'),
 get('authors?select='+encodeURIComponent(authorSelect)+'&order=name.asc'),
 get('public_sitemap_entries?select=entry_type,id,lastmod&entry_type=in.(book,series,author)')
]);
const lastmod=new Map(sitemapRows.map(r=>[r.entry_type+':'+r.id,r.lastmod]));

await rm('livros',{recursive:true,force:true});
await rm('series',{recursive:true,force:true});
await rm('autores',{recursive:true,force:true});
await mkdir('livros',{recursive:true});
await mkdir('series',{recursive:true});
await mkdir('autores',{recursive:true});

function nav(){
 return '<header class="topbar"><nav class="nav"><a class="brand" href="index.html">BIBLIOTECA <b>BRUTA</b></a><a href="historica.html">Ficção Histórica</a><a href="policial.html">Policial / Mistério</a><a href="militar.html">Ficção Militar</a><a href="autores.html">Autores</a><a href="series.html">Séries</a><a href="categorias.html">Categorias</a><a href="temas.html">Temas</a><a href="catalogo.html">Catálogo</a></nav></header>';
}
function footer(){return '<footer class="footer"><div class="footer-inner"><strong>BIBLIOTECA BRUTA</strong><span>Catálogos para quem ainda gosta de garimpar livros.</span></div></footer>'}

for(const b of books){
 const brEditions=(b.editions||[]).filter(e=>e.country==='Brasil').sort((a,z)=>(a.publication_year??9999)-(z.publication_year??9999)||((z.is_primary?1:0)-(a.is_primary?1:0))||String(a.created_at||'').localeCompare(String(z.created_at||'')));
 const ed=brEditions.find(e=>e.is_primary)||brEditions[0],cover=ed?.cover_url||b.cover_url||'',author=b.authors?.name||'Autor não informado';
 const canonical=abs(bookPath(b));
 const desc=safeText(b.synopsis||`${b.title}, de ${author}, no catálogo Biblioteca Bruta`);
 const cats=(b.book_categories||[]).map(x=>x.categories?.name).filter(Boolean);
 const tags=(b.book_tags||[]).map(x=>x.tags?.name).filter(Boolean);
 const facts=[
  b.original_title?'<div><small>Título original</small><strong>'+esc(b.original_title)+'</strong></div>':'',
  (b.original_year||b.original_country)?'<div><small>Publicação original</small><strong>'+esc([b.original_year,b.original_country?'('+b.original_country+')':null].filter(Boolean).join(' '))+'</strong></div>':'',
  ed?.publisher?'<div><small>Editora no Brasil</small><strong>'+esc(ed.publisher)+'</strong></div>':'',
  ed?.publication_year?'<div><small>Ano no Brasil</small><strong>'+esc(ed.publication_year)+'</strong></div>':'',
  ed?.pages?'<div><small>Páginas</small><strong>'+esc(ed.pages)+'</strong></div>':'',
  ed?.isbn?'<div><small>ISBN</small><strong>'+esc(ed.isbn)+'</strong></div>':''
 ].filter(Boolean).join('');
 const editionCards=brEditions.length?'<section class="detail-section"><h2>Edições publicadas no Brasil</h2><div class="edition-grid">'+brEditions.map(e=>'<article class="edition-card '+(e.is_primary?'edition-primary':'')+'">'+(e.cover_url?'<img src="'+esc(e.cover_url)+'" alt="Capa da edição '+esc(e.publisher||'brasileira')+'" loading="lazy">':'')+'<div>'+(e.is_primary?'<span class="edition-primary-label">Edição principal no catálogo</span>':'')+'<strong>'+esc(e.edition_label||e.publisher||'Edição brasileira')+'</strong><p>'+esc([e.edition_label&&e.publisher?e.publisher:null,e.publication_year,e.binding].filter(Boolean).join(' • ')||'Dados editoriais não informados')+'</p>'+(e.isbn?'<p>ISBN: '+esc(e.isbn)+'</p>':'')+(e.translator?'<p>Tradução: '+esc(e.translator)+'</p>':'')+(e.pages?'<p>'+esc(e.pages)+' páginas</p>':'')+'</div></article>').join('')+'</div></section>':'';
 const schema={'@context':'https://schema.org','@type':'Book',name:b.title,url:canonical,inLanguage:'pt-BR'};
 if(b.original_title)schema.alternateName=b.original_title;
 if(b.synopsis)schema.description=b.synopsis;
 if(cover)schema.image=cover;
 if(b.authors?.name)schema.author={'@type':'Person',name:b.authors.name,url:abs('autor.html?id='+encodeURIComponent(b.authors.id))};
 if(ed?.isbn)schema.isbn=ed.isbn;
 if(ed?.publisher)schema.publisher={'@type':'Organization',name:ed.publisher};
 if(ed?.pages)schema.numberOfPages=Number(ed.pages)||ed.pages;
 if(ed?.publication_year)schema.datePublished=String(ed.publication_year);
 if(b.series?.name)schema.isPartOf={'@type':'BookSeries',name:b.series.name,url:abs('serie.html?id='+encodeURIComponent(b.series.id))};
 const fallback=`<nav class="book-breadcrumb" aria-label="Navegação estrutural"><a href="catalogo.html">Catálogo</a><span aria-hidden="true">›</span><span aria-current="page">${esc(b.title)}</span></nav><section class="book-detail"><div class="book-detail-cover">${cover?'<img src="'+esc(cover)+'" alt="Capa brasileira de '+esc(b.title)+'">':'<div class="cover-placeholder">'+esc(b.title)+'</div>'}</div><div class="book-detail-main"><div class="eyebrow">${esc(b.area||'LIVRO')}</div><h1>${esc(b.title)}</h1><h2>${esc(author)}</h2>${b.series?.name?'<p class="series-line">Série: <a href="serie.html?id='+encodeURIComponent(b.series.id)+'">'+esc(b.series.name)+'</a>'+ (b.series_volume?' · volume '+esc(b.series_volume):'')+'</p>':''}${facts?'<div class="facts">'+facts+'</div>':''}${b.synopsis?'<section class="detail-section"><h2>Sinopse</h2><p>'+esc(b.synopsis)+'</p></section>':''}${cats.length?'<section class="detail-section"><h2>Categorias</h2><p>'+esc(cats.join(' • '))+'</p></section>':''}${tags.length?'<section class="detail-section"><h2>Temas</h2><p>'+esc(tags.join(' • '))+'</p></section>':''}</div></section>${editionCards}`;
 const html=`<!doctype html><html lang="pt-BR"><head><base href="/"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="favicon.svg"><link rel="manifest" href="site.webmanifest"><meta name="theme-color" content="#0c0b09"><title>${esc(b.title)} — Biblioteca Bruta</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(b.title)} — Biblioteca Bruta"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="book">${cover?'<meta property="og:image" content="'+esc(cover)+'">':''}<meta property="og:site_name" content="Biblioteca Bruta"><meta name="twitter:card" content="${cover?'summary_large_image':'summary'}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="style.css?v=20260913-3"><link rel="stylesheet" href="livro-public-ui.css?v=20260914-2"></head><body data-book-id="${esc(b.id)}">${nav()}<main><div id="bookPage" class="book-public">${fallback}</div></main>${footer()}<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="config.js"></script><script src="livro.js?v=20260914-10"></script><script src="livro-related.js?v=20260914-2"></script><script src="livro-edicoes-ui.js?v=20260912-2"></script><script src="livro-links.js?v=20260914-3"></script><script src="livro-box-ui.js?v=20260914-2"></script><script src="public-nav.js?v=20260914-4"></script></body></html>`;
 await writeFile(bookPath(b),html,'utf8');
}

for(const s of seriesRows){
 const volumes=(s.books||[]).filter(b=>b.item_type!=='box').sort((a,b)=>(Number(a.series_volume)||9999)-(Number(b.series_volume)||9999)||a.title.localeCompare(b.title,'pt-BR'));
 const first=volumes[0],firstEd=first?primaryBrEdition(first):null,cover=first?(firstEd?.cover_url||first.cover_url||''):'';
 const canonical=abs(seriesPath(s));
 const status=s.brazil_status||'';
 const desc=safeText(s.description||`${s.name}: série no catálogo Biblioteca Bruta`);
 const schema={'@context':'https://schema.org','@type':'BookSeries',name:s.name,url:canonical,inLanguage:'pt-BR',numberOfItems:volumes.length};
 if(s.original_name)schema.alternateName=s.original_name;
 if(s.description)schema.description=s.description;
 if(volumes.length)schema.hasPart=volumes.map(b=>({'@type':'Book',name:b.title,url:abs(bookPath(b)),position:b.series_volume||undefined}));
 const list=volumes.map(b=>{const ed=primaryBrEdition(b),img=ed?.cover_url||b.cover_url||'',meta=[ed?.publisher,ed?.publication_year].filter(Boolean).join(' • ');return '<a class="volume-card" href="'+esc(bookPath(b))+'">'+(img?'<img src="'+esc(img)+'" alt="'+esc(b.title)+'">':'<div class="mini-placeholder">Sem capa</div>')+'<div><small>'+(b.series_volume?'VOLUME '+esc(b.series_volume):'VOLUME')+'</small><strong>'+esc(b.title)+'</strong>'+(meta?'<span>'+esc(meta)+'</span>':'')+'</div></a>'}).join('');
 const fallback=`<nav class="series-breadcrumb" aria-label="Navegação estrutural"><a href="series.html">Séries</a><span aria-hidden="true">›</span><span aria-current="page">${esc(s.name)}</span></nav><section class="series-hero"><div class="eyebrow">SÉRIE NO BRASIL</div><h1>${esc(s.name)}</h1><div class="series-summary">${status?'<span class="badge">'+esc(status)+'</span>':''}</div>${s.description?'<p class="series-description">'+esc(s.description)+'</p>':''}</section><div class="series-dashboard"><div class="series-stat"><small>Volumes no catálogo</small><strong>${volumes.length}</strong></div><div class="series-stat"><small>Publicados no Brasil</small><strong>${s.brazil_published_volumes??'—'}</strong></div><div class="series-stat"><small>Total original</small><strong>${s.original_total_volumes??'—'}</strong></div></div><section class="series-section"><div class="series-section-head"><h2>Ordem da série</h2></div><div class="series-volume-grid">${list||'<div class="empty">Nenhum volume cadastrado.</div>'}</div></section>`;
 const html=`<!doctype html><html lang="pt-BR"><head><base href="/"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="favicon.svg"><link rel="manifest" href="site.webmanifest"><meta name="theme-color" content="#0c0b09"><title>${esc(s.name)} — Biblioteca Bruta</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(s.name)} — Biblioteca Bruta"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website">${cover?'<meta property="og:image" content="'+esc(cover)+'">':''}<meta property="og:site_name" content="Biblioteca Bruta"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="style.css?v=20260913-3"><link rel="stylesheet" href="serie-public-ui.css?v=20260914-1"></head><body data-series-id="${esc(s.id)}">${nav()}<main><div id="seriesPage" class="series-public">${fallback}</div></main>${footer()}<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="config.js"></script><script src="cover-utils.js?v=20260914-2"></script><script src="series.js?v=20260914-6"></script><script src="public-nav.js?v=20260914-4"></script></body></html>`;
 await writeFile(seriesPath(s),html,'utf8');
}


for(const a of authorRows){
 const authorBooks=(a.books||[]).sort((x,y)=>String(x.series?.name||'').localeCompare(String(y.series?.name||''),'pt-BR')||(Number(x.series_volume)||9999)-(Number(y.series_volume)||9999)||x.title.localeCompare(y.title,'pt-BR'));
 const canonical=abs(authorPath(a));
 const desc=safeText(a.bio||`${a.name}: ${authorBooks.length} ${authorBooks.length===1?'livro':'livros'} cadastrados na Biblioteca Bruta`);
 const schema={'@context':'https://schema.org','@type':'Person',name:a.name,url:canonical,mainEntityOfPage:canonical};
 if(a.bio)schema.description=a.bio;
 if(a.photo_url)schema.image=a.photo_url;
 if(authorBooks.length)schema.subjectOf=authorBooks.slice(0,20).map(b=>({'@type':'Book',name:b.title,url:abs(bookPath(b))}));
 const cards=authorBooks.map(b=>{const ed=primaryBrEdition(b),cover=ed?.cover_url||b.cover_url||'',meta=[ed?.publisher,ed?.publication_year].filter(Boolean).join(' • '),series=b.series?.name?'<span>'+esc(b.series.name)+(b.series_volume?' · vol. '+esc(b.series_volume):'')+'</span>':'';return '<a class="volume-card" href="'+esc(bookPath(b))+'">'+(cover?'<img src="'+esc(cover)+'" alt="'+esc(b.title)+'" loading="lazy">':'<div class="mini-placeholder">Sem capa</div>')+'<div><strong>'+esc(b.title)+'</strong>'+series+(meta?'<span>'+esc(meta)+'</span>':'')+'</div></a>'}).join('');
 const photo=a.photo_url?'<div class="author-photo"><img src="'+esc(a.photo_url)+'" alt="Foto de '+esc(a.name)+'"></div>':'';
 const fallback=`<nav class="author-breadcrumb" aria-label="Navegação estrutural"><a href="autores.html">Autores</a><span aria-hidden="true">›</span><span aria-current="page">${esc(a.name)}</span></nav><section class="author-hero">${photo}<div><div class="eyebrow">AUTOR</div><h1>${esc(a.name)}</h1>${a.nationality?'<div class="author-nationality">'+esc(a.nationality)+'</div>':''}${a.bio?'<p class="author-bio">'+esc(a.bio)+'</p>':''}<div class="author-stats"><div class="author-stat"><small>Livros no catálogo</small><strong>${authorBooks.length}</strong></div></div></div></section><section class="author-section"><div class="author-section-head"><div><h2>Livros no catálogo</h2></div><span class="badge">${authorBooks.length}</span></div><div class="series-volume-grid">${cards||'<div class="empty">Nenhum livro cadastrado.</div>'}</div></section>`;
 const html=`<!doctype html><html lang="pt-BR"><head><base href="/"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="favicon.svg"><link rel="manifest" href="site.webmanifest"><meta name="theme-color" content="#0c0b09"><title>${esc(a.name)} — Biblioteca Bruta</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(a.name)} — Biblioteca Bruta"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="profile">${a.photo_url?'<meta property="og:image" content="'+esc(a.photo_url)+'">':''}<meta property="og:site_name" content="Biblioteca Bruta"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="style.css?v=20260913-3"><link rel="stylesheet" href="autor-public-ui.css?v=20260914-1"></head><body data-author-id="${esc(a.id)}">${nav()}<main><div id="authorPage" class="author-public">${fallback}</div></main>${footer()}<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="config.js"></script><script src="cover-utils.js?v=20260914-2"></script><script src="autor.js?v=20260914-3"></script><script src="public-nav.js?v=20260914-4"></script></body></html>`;
 await writeFile(authorPath(a),html,'utf8');
}

function sitemap(type,items,pathFor){
 const body=items.map(x=>{const lm=lastmod.get(type+':'+x.id);return '  <url><loc>'+xml(abs(pathFor(x)))+'</loc>'+(lm?'<lastmod>'+new Date(lm).toISOString().slice(0,10)+'</lastmod>':'')+'</url>'}).join('\n');
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+body+(body?'\n':'')+'</urlset>\n';
}
await writeFile('sitemap-books.xml',sitemap('book',books,bookPath),'utf8');
await writeFile('sitemap-series.xml',sitemap('series',seriesRows,seriesPath),'utf8');
await writeFile('sitemap-authors.xml',sitemap('author',authorRows,authorPath),'utf8');
console.log('SEO books:',books.length,'series:',seriesRows.length,'authors:',authorRows.length);
