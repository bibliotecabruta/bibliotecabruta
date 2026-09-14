const sbRelated=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
function relEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function relPublicArea(area){if(['Policial/Mistério','Coleção Negra','Coleção Policial'].includes(area))return'Policial/Mistério';if(['Ficção Militar','Ação / Militar'].includes(area))return'Ação / Militar';return area||'Catálogo'}
function relCover(b){const ed=(b.editions||[]).find(e=>e.country==='Brasil'&&e.is_primary)||(b.editions||[]).find(e=>e.country==='Brasil');return ed?.cover_url||b.cover_url||''}
function relAreaHref(area){return `catalogo.html?area=${encodeURIComponent(relPublicArea(area))}`}
async function loadRelatedLegacy(b,id,cats,tags){
 const catIds=cats.map(x=>x.category_id),tagIds=tags.map(x=>x.tag_id),scores=new Map(),matches=new Map();
 function add(bookId,points,label){if(!bookId||bookId===id)return;scores.set(bookId,(scores.get(bookId)||0)+points);if(!matches.has(bookId))matches.set(bookId,new Set());if(label)matches.get(bookId).add(label)}
 if(catIds.length){const {data}=await sbRelated.from('book_categories').select('book_id,category_id').in('category_id',catIds);const names=new Map(cats.map(x=>[x.category_id,x.categories?.name]));for(const x of data||[])add(x.book_id,3,names.get(x.category_id))}
 if(tagIds.length){const {data}=await sbRelated.from('book_tags').select('book_id,tag_id').in('tag_id',tagIds);const names=new Map(tags.map(x=>[x.tag_id,x.tags?.name]));for(const x of data||[])add(x.book_id,1,names.get(x.tag_id))}
 const ids=[...scores.entries()].sort((a,z)=>z[1]-a[1]).slice(0,36).map(([bookId])=>bookId);if(!ids.length)return[];
 const {data:rows}=await sbRelated.from('books').select('id,title,cover_url,area,author_id,series_id,authors(name),series(name),editions(cover_url,is_primary,country)').in('id',ids);
 const currentArea=relPublicArea(b.area);
 return (rows||[]).filter(x=>x.id!==id&&(!b.series_id||x.series_id!==b.series_id)&&(!b.author_id||x.author_id!==b.author_id)).map(x=>({...x,__score:(scores.get(x.id)||0)+(relPublicArea(x.area)===currentArea?2:0),__matches:[...(matches.get(x.id)||[])].filter(Boolean)})).sort((a,z)=>z.__score-a.__score||a.title.localeCompare(z.title,'pt-BR')).slice(0,6)
}
async function injectRelated(){
 const id=new URLSearchParams(location.search).get('id');if(!id)return;
 const {data:b,error}=window.BB_BOOK_PROMISE?await window.BB_BOOK_PROMISE:await sbRelated.from('books').select('id,area,author_id,series_id,book_categories(category_id,categories(name)),book_tags(tag_id,tags(name))').eq('id',id).single();
 if(error||!b)return;
 const cats=(b.book_categories||[]).filter(x=>x.category_id),tags=(b.book_tags||[]).filter(x=>x.tag_id);
 if(!cats.length&&!tags.length)return;
 let related=[];
 const {data:rpcRows,error:rpcError}=await sbRelated.rpc('related_books_for_book',{p_book_id:id,p_limit:6});
 if(!rpcError&&rpcRows?.length){
  related=rpcRows.map(x=>({...x,__score:x.score||0,__matches:Array.isArray(x.match_labels)?x.match_labels:[]}));
 }else{
  related=await loadRelatedLegacy(b,id,cats,tags);
 }
 if(!related.length)return;
 const currentArea=relPublicArea(b.area);
 const html=`<section class="detail-section related-books"><div class="author-more-head"><div><small>CONTINUE GARIMPANDO</small><h2>Livros por caminhos parecidos</h2><p class="muted">Outros autores que compartilham categorias ou temas deste livro.</p></div><a class="series-inline-link" href="${relAreaHref(b.area)}">Explorar ${relEsc(currentArea)} →</a></div><div class="author-more-grid">${related.map(x=>{const cover=relCover(x),why=(x.__matches||[]).slice(0,2).join(' • ');return `<a class="author-more-card" href="livro.html?id=${encodeURIComponent(x.id)}">${cover?`<img src="${relEsc(cover)}" alt="Capa de ${relEsc(x.title)}" loading="lazy" onerror="this.remove()">`:'<div class="mini-placeholder">Sem capa</div>'}<strong>${relEsc(x.title)}</strong><span>${relEsc(x.authors?.name||'Autor não informado')}</span>${why?`<small>${relEsc(why)}</small>`:''}</a>`}).join('')}</div></section>`;
 let tries=0;const place=()=>{const main=document.querySelector('.book-content-main');if(main){main.insertAdjacentHTML('beforeend',html);return}if(tries++<40)setTimeout(place,50)};place();
}
document.addEventListener('DOMContentLoaded',injectRelated);
