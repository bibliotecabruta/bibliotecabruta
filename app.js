const sb=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function bookAuthors(b){
  const links=(b.book_authors||[]).slice().sort((a,z)=>(a.author_order??999)-(z.author_order??999));
  const names=links.map(x=>x.authors).filter(Boolean);
  return names.length?names:(b.authors?[b.authors]:[]);
}
function bookSeries(b){
  const links=(b.book_series||[]).map(x=>({id:x.series?.id,name:x.series?.name,series_volume:x.series_volume,is_primary:x.is_primary})).filter(x=>x.id);
  if(links.length)return links.sort((a,z)=>(z.is_primary?1:0)-(a.is_primary?1:0)||(a.series_volume??9999)-(z.series_volume??9999)||String(a.name||'').localeCompare(String(z.name||''),'pt-BR'));
  return b.series?.id?[{id:b.series.id,name:b.series.name,series_volume:b.series_volume,is_primary:true}]:[];
}
function authorText(b){return bookAuthors(b).map(a=>a.name).filter(Boolean).join(' & ')||'Autor não informado'}
function seriesText(b){return bookSeries(b).map(s=>`${s.name}${s.series_volume!=null?` · vol. ${s.series_volume}`:''}`).join(' • ')}
async function enrichBookRelations(rows){
  const ids=(rows||[]).map(b=>b.id).filter(Boolean);
  if(!ids.length)return rows||[];
  try{
    const [{data:authorLinks,error:ae},{data:seriesLinks,error:se}]=await Promise.all([
      sb.from('book_authors').select('book_id,author_order,is_primary,authors(id,name)').in('book_id',ids),
      sb.from('book_series').select('book_id,series_volume,is_primary,series(id,name)').in('book_id',ids)
    ]);
    if(ae||se){console.warn('Relações adicionais indisponíveis; usando compatibilidade.',ae||se);return rows}
    const am=new Map(),sm=new Map();
    for(const x of authorLinks||[]){if(!am.has(x.book_id))am.set(x.book_id,[]);am.get(x.book_id).push(x)}
    for(const x of seriesLinks||[]){if(!sm.has(x.book_id))sm.set(x.book_id,[]);sm.get(x.book_id).push(x)}
    for(const b of rows){b.book_authors=am.get(b.id)||[];b.book_series=sm.get(b.id)||[]}
  }catch(err){console.warn('Falha ao enriquecer relações; usando compatibilidade.',err)}
  return rows
}
async function loadBooks(area="",query="",limit=0){
  let req=sb.from("books").select(`id,title,original_title,area,original_year,cover_url,series_volume,series_id,created_at,authors(id,name),series(id,name),book_categories(categories(name)),book_tags(tags(name)),editions(publisher,publication_year,is_primary,country)`).order("created_at",{ascending:false});
  if(area)req=req.eq("area",area);
  if(limit&&!String(query||"").trim())req=req.limit(limit);
  const {data,error}=await req;
  if(error){console.error('Erro ao carregar livros:',error);return {data:[],error}}
  let rows=await enrichBookRelations(data||[]);
  const q=(query||"").trim().toLowerCase();
  if(q)rows=rows.filter(b=>[b.title,b.original_title,b.area,...bookAuthors(b).map(a=>a.name),...bookSeries(b).map(s=>s.name),...(b.book_categories||[]).map(x=>x.categories?.name),...(b.book_tags||[]).map(x=>x.tags?.name),...(b.editions||[]).map(e=>`${e.publisher||""} ${e.publication_year||""}`)].filter(Boolean).join(" ").toLowerCase().includes(q));
  return {data:rows,error:null}
}
function primaryBrEdition(b){return (b.editions||[]).find(e=>e.country==="Brasil"&&e.is_primary)||(b.editions||[]).find(e=>e.country==="Brasil")}
function bookCard(b){
  const cats=(b.book_categories||[]).map(x=>x.categories?.name).filter(Boolean).join(" • "),tags=(b.book_tags||[]).map(x=>x.tags?.name).filter(Boolean).join(" • "),ed=primaryBrEdition(b);
  const cover=b.cover_url?`<img src="${esc(b.cover_url)}" alt="Capa brasileira de ${esc(b.title)}">`:esc(b.title);const br=[ed?.publisher,ed?.publication_year].filter(Boolean).join(" · ");
  const stext=seriesText(b);
  return `<a class="book book-link" href="livro.html?id=${encodeURIComponent(b.id)}"><div class="cover">${cover}</div><div class="book-body"><div class="book-title">${esc(b.title)}</div><div class="book-author">${esc(authorText(b))}</div>${br?`<div class="book-meta"><strong>Brasil:</strong> ${esc(br)}</div>`:""}${stext?`<div class="book-meta">${esc(stext)}</div>`:""}${cats?`<div class="book-meta">${esc(cats)}</div>`:""}${tags?`<div class="book-meta">${esc(tags)}</div>`:""}${b.original_title?`<div class="book-meta" style="margin-top:7px">Original: ${esc(b.original_title)}${b.original_year?" ("+esc(b.original_year)+")":""}</div>`:""}</div></a>`
}
async function renderBooks(targetId,area=""){
  const target=document.getElementById(targetId);if(!target)return;target.innerHTML='<div class="empty">Carregando catálogo…</div>';
  const q=document.getElementById("q")?.value||"";const isHomeLatest=targetId==="latest";const {data,error}=await loadBooks(area,q,isHomeLatest?6:0);
  if(error){target.innerHTML='<div class="empty">Não foi possível carregar o catálogo.</div>';return}
  const visible=isHomeLatest?data.slice(0,6):data;target.innerHTML=visible.length?visible.map(bookCard).join(""):'<div class="empty">Nenhum livro cadastrado ainda.</div>'
}
function safePublicUrl(v){try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}}
function newsText(v){return esc(v||'').replace(/\n/g,'<br>')}
async function renderNews(){
  const target=document.getElementById("newsGrid");if(!target)return;
  const {data,error}=await sb.from("news").select("id,title,body,summary,image_url,image_alt,source_label,source_url,purchase_label,purchase_url,published_at").eq("is_published",true).order("published_at",{ascending:false}).limit(3);
  if(error||!data?.length){target.innerHTML='<article class="news-item"><div class="news-content"><small>BIBLIOTECA BRUTA</small><h3>Notícias em breve</h3><p>As atualizações publicadas pelo painel aparecerão aqui.</p></div></article>';return}
  target.innerHTML=data.map(n=>{const image=safePublicUrl(n.image_url),source=safePublicUrl(n.source_url),purchase=safePublicUrl(n.purchase_url),summary=n.summary||String(n.body||'').slice(0,220);return `<article class="news-item">${image?`<a class="news-image" href="noticia.html?id=${encodeURIComponent(n.id)}"><img src="${esc(image)}" alt="${esc(n.image_alt||n.title)}"></a>`:''}<div class="news-content"><small>${new Date(n.published_at).toLocaleDateString("pt-BR")}</small><h3><a href="noticia.html?id=${encodeURIComponent(n.id)}">${esc(n.title)}</a></h3><p>${newsText(summary)}${!n.summary&&String(n.body||'').length>220?'…':''}</p><div class="news-actions"><a class="news-read" href="noticia.html?id=${encodeURIComponent(n.id)}">Leia mais</a>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${esc(n.source_label||'Fonte')}</a>`:''}${purchase?`<a class="news-buy" href="${esc(purchase)}" target="_blank" rel="sponsored noopener noreferrer">${esc(n.purchase_label||'Comprar')}</a>`:''}</div></div></article>`}).join("")
}
document.addEventListener("DOMContentLoaded",()=>{renderBooks("latest");renderBooks("catalog",document.body.dataset.area||"");renderNews()});
