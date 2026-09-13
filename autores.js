const sbAuthors=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
let authorRows=[],authorLetter='';

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function aNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
function firstLetter(name){const c=aNorm(name).charAt(0).toUpperCase();return/[A-Z]/.test(c)?c:'#'}

async function initAuthors(){
 const root=document.getElementById('authorsList');
 root.innerHTML='<div class="empty">Carregando autores…</div>';
 const {data,error}=await sbAuthors.from('authors').select('id,name,nationality,books(id,title,area,series_id)').order('name');
 if(error){root.innerHTML='<div class="empty">Não foi possível carregar os autores.</div>';return}
 authorRows=(data||[]).filter(a=>(a.books||[]).length);
 restoreAuthorFilters();
 renderAuthorAlphabet();
 renderAuthors();
}

function restoreAuthorFilters(){
 const p=new URLSearchParams(location.search);
 const q=p.get('q'),letter=p.get('letter'),sort=p.get('sort');
 if(q)document.getElementById('authorSearch').value=q;
 if(letter)authorLetter=letter.toUpperCase();
 if(sort&&document.getElementById('authorSort'))document.getElementById('authorSort').value=sort;
}

function renderAuthorAlphabet(){
 const root=document.getElementById('authorAlphabet');if(!root)return;
 const present=new Set(authorRows.map(a=>firstLetter(a.name)));
 const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l=>present.has(l));
 root.innerHTML='<button type="button" class="'+(!authorLetter?'active':'')+'" onclick="setAuthorLetter(\'\')">Todos</button>'+letters.map(l=>'<button type="button" class="'+(authorLetter===l?'active':'')+'" onclick="setAuthorLetter(\''+l+'\')">'+l+'</button>').join('');
}

function setAuthorLetter(letter){
 authorLetter=letter;
 renderAuthorAlphabet();
 renderAuthors();
}

function clearAuthorFilters(){
 authorLetter='';
 document.getElementById('authorSearch').value='';
 document.getElementById('authorSort').value='name';
 renderAuthorAlphabet();
 renderAuthors();
}

function syncAuthorUrl(){
 const p=new URLSearchParams(),q=(document.getElementById('authorSearch')?.value||'').trim(),sort=document.getElementById('authorSort')?.value||'name';
 if(q)p.set('q',q);if(authorLetter)p.set('letter',authorLetter);if(sort!=='name')p.set('sort',sort);
 history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString():''));
}

function renderAuthors(){
 const root=document.getElementById('authorsList'),q=aNorm(document.getElementById('authorSearch')?.value||''),sort=document.getElementById('authorSort')?.value||'name';
 let rows=authorRows.filter(a=>(!q||aNorm(a.name).includes(q)||aNorm(a.nationality).includes(q))&&(!authorLetter||firstLetter(a.name)===authorLetter));
 if(sort==='books_desc')rows.sort((a,b)=>b.books.length-a.books.length||a.name.localeCompare(b.name,'pt-BR'));
 else if(sort==='nationality')rows.sort((a,b)=>(a.nationality||'').localeCompare(b.nationality||'','pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
 else rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const summary=document.getElementById('authorsSummary');if(summary)summary.textContent=`${rows.length} ${rows.length===1?'autor encontrado':'autores encontrados'}`;
 root.innerHTML=rows.length?rows.map(a=>{const areas=[...new Set((a.books||[]).map(b=>b.area).filter(Boolean))];return `<a class="entity-card author-list-card" href="autor.html?id=${encodeURIComponent(a.id)}"><div><div class="eyebrow">AUTOR</div><h2>${esc(a.name)}</h2>${a.nationality?`<p>${esc(a.nationality)}</p>`:''}</div><div class="entity-meta"><strong>${a.books.length} ${a.books.length===1?'livro':'livros'}</strong><span>${areas.map(esc).join(' • ')}</span></div></a>`}).join(''):'<div class="empty">Nenhum autor encontrado. Tente remover a letra selecionada ou usar menos termos.</div>';
 syncAuthorUrl();
}

document.addEventListener('DOMContentLoaded',initAuthors);