const sbAuthors=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
let authorRows=[],authorLetter='';
const AUTHOR_AREA_GROUPS={'Policial/Mistério':['Policial/Mistério','Coleção Negra','Coleção Policial'],'Ação / Militar':['Ficção Militar','Ação / Militar'],'Horror / Suspense':['Horror / Suspense']};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function aNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
function firstLetter(name){const c=aNorm(name).charAt(0).toUpperCase();return/[A-Z]/.test(c)?c:'#'}
function authorAreasForFilter(area){if(!area)return[];return AUTHOR_AREA_GROUPS[area]||[area]}
function publicAuthorArea(area){if(['Policial/Mistério','Coleção Negra','Coleção Policial'].includes(area))return'Policial/Mistério';if(['Ficção Militar','Ação / Militar'].includes(area))return'Ação / Militar';return area}
function authorBookCountForArea(a,area){if(!area)return Number(a.book_count)||0;const areas=authorAreasForFilter(area);return areas.reduce((sum,x)=>sum+Number(a.area_counts?.[x]||0),0)}
function authorVisiblePublicAreas(a,area){const source=area?authorAreasForFilter(area):Object.keys(a.area_counts||{});return[...new Set(source.filter(x=>Number(a.area_counts?.[x]||0)>0).map(publicAuthorArea))].sort((x,y)=>x.localeCompare(y,'pt-BR'))}
function normalizeAuthorRows(rows){return(rows||[]).map(a=>{if(a.book_count!=null&&a.area_counts)return a;const counts={};for(const b of a.books||[]){if(b.area)counts[b.area]=(counts[b.area]||0)+1}return{id:a.id,name:a.name,nationality:a.nationality,book_count:(a.books||[]).length,area_counts:counts}}).filter(a=>Number(a.book_count)>0)}
function authorsForCurrentArea(){const area=document.getElementById('authorArea')?.value||'';return authorRows.filter(a=>authorBookCountForArea(a,area)>0)}

async function initAuthors(){
 const root=document.getElementById('authorsList');
 root.innerHTML='<div class="empty">Carregando autores…</div>';
 let {data,error}=await sbAuthors.from('public_author_cards').select('*').order('name');
 if(error){({data,error}=await sbAuthors.from('authors').select('id,name,nationality,books(id,title,area,series_id)').order('name'))}
 if(error){root.innerHTML='<div class="empty">Não foi possível carregar os autores.</div>';return}
 authorRows=normalizeAuthorRows(data);
 restoreAuthorFilters();
 renderAuthorAlphabet();
 renderAuthors();
}

function restoreAuthorFilters(){
 const p=new URLSearchParams(location.search);
 const q=p.get('q'),letter=p.get('letter'),sort=p.get('sort'),area=p.get('area');
 if(q)document.getElementById('authorSearch').value=q;
 if(area&&document.getElementById('authorArea'))document.getElementById('authorArea').value=area;
 if(letter)authorLetter=letter.toUpperCase();
 if(sort&&document.getElementById('authorSort'))document.getElementById('authorSort').value=sort;
}

function renderAuthorAlphabet(){
 const root=document.getElementById('authorAlphabet');if(!root)return;
 const present=new Set(authorsForCurrentArea().map(a=>firstLetter(a.name)));
 if(authorLetter&&!present.has(authorLetter))authorLetter='';
 const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l=>present.has(l));
 root.innerHTML='<button type="button" class="'+(!authorLetter?'active':'')+'" onclick="setAuthorLetter(\'\')">Todos</button>'+letters.map(l=>'<button type="button" class="'+(authorLetter===l?'active':'')+'" onclick="setAuthorLetter(\''+l+'\')">'+l+'</button>').join('');
}

function setAuthorLetter(letter){authorLetter=letter;renderAuthorAlphabet();renderAuthors()}
function onAuthorAreaChange(){renderAuthorAlphabet();renderAuthors()}

function clearAuthorFilters(){
 authorLetter='';
 document.getElementById('authorSearch').value='';
 document.getElementById('authorArea').value='';
 document.getElementById('authorSort').value='name';
 renderAuthorAlphabet();
 renderAuthors();
}

function syncAuthorUrl(){
 const p=new URLSearchParams(),q=(document.getElementById('authorSearch')?.value||'').trim(),area=document.getElementById('authorArea')?.value||'',sort=document.getElementById('authorSort')?.value||'name';
 if(q)p.set('q',q);if(area)p.set('area',area);if(authorLetter)p.set('letter',authorLetter);if(sort!=='name')p.set('sort',sort);
 history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString():''));
}

function renderAuthors(){
 const root=document.getElementById('authorsList'),q=aNorm(document.getElementById('authorSearch')?.value||''),area=document.getElementById('authorArea')?.value||'',sort=document.getElementById('authorSort')?.value||'name';
 let rows=authorRows.map(a=>({...a,visibleBookCount:authorBookCountForArea(a,area)})).filter(a=>a.visibleBookCount&&(!q||aNorm(a.name).includes(q)||aNorm(a.nationality).includes(q))&&(!authorLetter||firstLetter(a.name)===authorLetter));
 if(sort==='books_desc')rows.sort((a,b)=>b.visibleBookCount-a.visibleBookCount||a.name.localeCompare(b.name,'pt-BR'));
 else if(sort==='nationality')rows.sort((a,b)=>(a.nationality||'').localeCompare(b.nationality||'','pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
 else rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const summary=document.getElementById('authorsSummary');if(summary)summary.textContent=`${rows.length} ${rows.length===1?'autor encontrado':'autores encontrados'}${area?' em '+area:''}`;
 root.innerHTML=rows.length?rows.map(a=>{const areas=authorVisiblePublicAreas(a,area);return `<a class="entity-card author-list-card" href="autor.html?id=${encodeURIComponent(a.id)}"><div><div class="eyebrow">AUTOR</div><h2>${esc(a.name)}</h2>${a.nationality?`<p>${esc(a.nationality)}</p>`:''}</div><div class="entity-meta"><strong>${a.visibleBookCount} ${a.visibleBookCount===1?'livro':'livros'}${area?' neste recorte':''}</strong><span>${areas.map(esc).join(' • ')}</span></div></a>`}).join(''):'<div class="empty">Nenhum autor encontrado. Tente remover a letra selecionada ou usar menos termos.</div>';
 syncAuthorUrl();
}

document.addEventListener('DOMContentLoaded',initAuthors);
