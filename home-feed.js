(()=>{const sb=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function homeSlug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'livro'}
function homeBookHref(b){return 'livros/'+homeSlug(b.title)+'-'+b.id+'.html'}
function primaryBrEdition(b){return (b.editions||[]).find(e=>e.country==="Brasil"&&e.is_primary)||(b.editions||[]).find(e=>e.country==="Brasil")}
function latestBookCard(b){
 const catNames=(b.book_categories||[]).map(x=>x.categories?.name).filter(Boolean),tagNames=(b.book_tags||[]).map(x=>x.tags?.name).filter(Boolean),cats=catNames.slice(0,2),tags=tagNames.slice(0,3),ed=primaryBrEdition(b),cover=ed?.cover_url||b.cover_url;
 const ca=cover&&window.bbCoverAttrs?window.bbCoverAttrs(cover,{width:300,srcsetWidths:[160,240,320],sizes:'(max-width: 700px) 45vw, 180px'}):{src:cover,srcset:'',sizes:''};
 const coverHtml=cover?`<img src="${esc(ca.src||cover)}"${ca.srcset?` srcset="${esc(ca.srcset)}" sizes="${esc(ca.sizes)}"`:''} alt="Capa brasileira de ${esc(b.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.parentElement.textContent=this.alt.replace('Capa brasileira de ','')">`:esc(b.title);
 const br=[ed?.publisher,ed?.publication_year].filter(Boolean).join(" · ");
 const catLine=cats.length?`<div class="book-meta"><strong>${catNames.length===1?'Categoria':'Categorias'}:</strong> ${esc(cats.join(" • "))}${catNames.length>cats.length?` • +${catNames.length-cats.length}`:''}</div>`:'';
 const tagLine=tags.length?`<div class="book-meta"><strong>Temas:</strong> ${esc(tags.join(" • "))}${tagNames.length>tags.length?` • +${tagNames.length-tags.length}`:''}</div>`:'';
 return `<a class="book book-link" href="${homeBookHref(b)}"><div class="cover">${coverHtml}</div><div class="book-body"><div class="book-title">${esc(b.title)}</div><div class="book-author">${esc(b.authors?.name||"Autor não informado")}</div>${br?`<div class="book-meta"><strong>Brasil:</strong> ${esc(br)}</div>`:""}<div class="book-meta">${esc(b.series?.name||"")}${b.series_volume?" · vol. "+esc(b.series_volume):""}</div>${catLine}${tagLine}${b.original_title?`<div class="book-meta" style="margin-top:7px">Original: ${esc(b.original_title)}${b.original_year?" ("+esc(b.original_year)+")":""}</div>`:""}</div></a>`;
}
async function renderLatest(){
 const target=document.getElementById("latest");if(!target)return;
 target.innerHTML='<div class="empty">Carregando catálogo…</div>';
 const {data,error}=await sb.from("books").select("id,title,original_title,original_year,cover_url,series_volume,created_at,authors(name),series(name),book_categories(categories(name)),book_tags(tags(name)),editions(cover_url,publisher,publication_year,is_primary,country)").order("created_at",{ascending:false}).limit(6);
 if(error){target.innerHTML='<div class="empty">Não foi possível carregar o catálogo.</div>';return}
 target.innerHTML=data?.length?data.map(latestBookCard).join(""):'<div class="empty">Nenhum livro cadastrado ainda.</div>';
}
function safeUrl(v){try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
function newsText(v){return esc(v||'').replace(/\n/g,'<br>')}
async function renderNews(){
 const target=document.getElementById("newsGrid");if(!target)return;
 const {data,error}=await sb.from("news").select("id,title,slug,body,summary,image_url,image_alt,source_label,source_url,purchase_label,purchase_url,purchase_is_affiliate,published_at,is_featured").eq("is_published",true).lte("published_at",new Date().toISOString()).order("is_featured",{ascending:false}).order("published_at",{ascending:false}).limit(3);
 if(error||!data?.length){target.innerHTML='<article class="news-item"><div class="news-content"><small>BIBLIOTECA BRUTA</small><h3>Notícias em breve</h3><p>As primeiras novidades editoriais da Biblioteca Bruta aparecerão aqui.</p></div></article>';return}
 target.innerHTML=data.map(n=>{const image=safeUrl(n.image_url),source=safeUrl(n.source_url),purchase=safeUrl(n.purchase_url),summary=n.summary||String(n.body||'').replace(/[#*\[\]()\-]/g,'').slice(0,220),href=n.slug?'noticia.html?slug='+encodeURIComponent(n.slug):'noticia.html?id='+encodeURIComponent(n.id);return '<article class="news-item '+(n.is_featured?'news-home-featured':'')+'">'+(image?'<a class="news-image" href="'+href+'"><img src="'+esc(image)+'" alt="'+esc(n.image_alt||n.title)+'" loading="lazy" decoding="async"></a>':'')+'<div class="news-content"><small>'+(n.is_featured?'DESTAQUE • ':'')+new Date(n.published_at).toLocaleDateString("pt-BR")+'</small><h3><a href="'+href+'">'+esc(n.title)+'</a></h3><p>'+newsText(summary)+(!n.summary&&String(n.body||'').length>220?'…':'')+'</p><div class="news-actions"><a class="news-read" href="'+href+'">Leia mais</a>'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">'+esc(n.source_label||'Fonte')+'</a>':'')+(purchase?'<a class="news-buy" href="'+esc(purchase)+'" target="_blank" rel="'+(n.purchase_is_affiliate?'sponsored nofollow noopener noreferrer':'noopener noreferrer')+'">'+esc(n.purchase_label||'Comprar')+'</a>':'')+'</div></div></article>'}).join("");
}
document.addEventListener("DOMContentLoaded",()=>{renderLatest();renderNews()});
})();