const sbHomePublic=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
window.BB_HOME_DISCOVERY_PROMISE=window.BB_HOME_DISCOVERY_PROMISE||(async()=>{
 const {data,error}=await sbHomePublic.from('public_home_discovery').select('item_type,id,name,area,item_count,brazil_status,brazil_published_volumes,original_total_volumes,total_volumes');
 return {data:data||[],error};
})();
function hpEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function goHomeSearch(){const q=(document.getElementById('q')?.value||'').trim();location.href='catalogo.html'+(q?`?q=${encodeURIComponent(q)}`:'')}
function handleHomeSearchKey(e){if(e.key==='Enter'){e.preventDefault();goHomeSearch()}}
function hpPublicArea(area){if(['Policial/Mistério','Coleção Negra','Coleção Policial'].includes(area))return'Policial/Mistério';if(['Ficção Militar','Ação / Militar'].includes(area))return'Ação / Militar';return area||'Outros'}
function hpBalanced(rowsByArea,limit){const order=['Ficção Histórica','Policial/Mistério','Fantasia','Ficção Científica','Ação / Militar','Horror / Suspense'].filter(a=>rowsByArea.has(a)),out=[],used=new Set();for(let rank=0;out.length<limit;rank++){let added=false;for(const area of order){const row=rowsByArea.get(area)?.[rank];if(!row||used.has(row.id))continue;used.add(row.id);out.push({...row,displayArea:area});added=true;if(out.length>=limit)break}if(!added)break}return out}
function updateHomeAreaCards(rows){const counts=new Map((rows||[]).filter(x=>x.item_type==='area').map(x=>[x.area,Number(x.item_count)||0])),configs=[['.area-historica','Ficção Histórica'],['.area-policial','Policial/Mistério'],['.area-fantasia','Fantasia'],['.area-fc','Ficção Científica'],['.area-militar','Ação / Militar'],['.area-negra','Horror / Suspense']];for(const[selector,area]of configs){const card=document.querySelector(selector);if(!card)continue;const count=counts.get(area)||0;if(!card.dataset.originalHref&&card.getAttribute('href'))card.dataset.originalHref=card.getAttribute('href');let state=card.querySelector('.area-state');if(!state){state=document.createElement('span');state.className='area-state';card.appendChild(state)}state.textContent=count?`${count} ${count===1?'livro':'livros'}`:'Em preparação';card.classList.toggle('area-empty',!count);if(count){if(card.dataset.originalHref)card.setAttribute('href',card.dataset.originalHref);card.removeAttribute('aria-disabled')}else{card.removeAttribute('href');card.setAttribute('aria-disabled','true')}}}
function hpSafeLink(v){try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
function hpSafeImage(v){try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
async function renderManagedHomeAreaCards(rows){
 const root=document.querySelector('.cards');if(!root)return;
 const counts=new Map((rows||[]).filter(x=>x.item_type==='area').map(x=>[x.area,Number(x.item_count)||0]));
 const {data,error}=await sbHomePublic.from('home_area_cards').select('id,title,description,href,image_url,background_color,area_key,badge_mode,badge_text,sort_order,is_active').eq('is_active',true).order('sort_order').order('created_at');
 if(error||!data?.length){if(error)console.warn('Cards administráveis da Home indisponíveis:',error);updateHomeAreaCards(rows);return}
 root.innerHTML='';
 for(const c of data){
  const link=hpSafeLink(c.href),image=hpSafeImage(c.image_url),card=document.createElement('a');
  card.className='card area-card';
  if(link)card.href=link;
  card.style.backgroundColor=c.background_color||'#252223';
  if(image)card.style.backgroundImage='url("'+image.replace(/"/g,'%22')+'")';
  const h=document.createElement('h3');h.textContent=c.title||'Área';card.appendChild(h);
  const p=document.createElement('p');p.textContent=c.description||'';card.appendChild(p);
  if(c.badge_mode!=='none'){
   const state=document.createElement('span');state.className='area-state';
   if(c.badge_mode==='manual')state.textContent=c.badge_text||'';
   else{
    const count=counts.get(c.area_key)||0;
    state.textContent=count?count+' '+(count===1?'livro':'livros'):'Em preparação';
    card.classList.toggle('area-empty',!count);
    if(!count){card.removeAttribute('href');card.setAttribute('aria-disabled','true')}
   }
   if(state.textContent)card.appendChild(state);
  }
  root.appendChild(card);
 }
}
async function renderHomeGarimpo(){const tagRoot=document.getElementById('homeTopTags'),catRoot=document.getElementById('homeTopCategories');if(!tagRoot||!catRoot)return;const {data:rows,error}=await window.BB_HOME_DISCOVERY_PROMISE;if(error){tagRoot.innerHTML='<span class="muted">Não foi possível carregar os temas.</span>';catRoot.innerHTML='<span class="muted">Não foi possível carregar as categorias.</span>';return}await renderManagedHomeAreaCards(rows);
 const tagRowsByArea=new Map(),catRowsByArea=new Map();
 for(const x of rows||[]){if(!x.area)continue;const row={id:x.id,name:x.name,count:Number(x.item_count)||0};if(x.item_type==='theme'){if(!tagRowsByArea.has(x.area))tagRowsByArea.set(x.area,[]);tagRowsByArea.get(x.area).push(row)}else if(x.item_type==='category'){if(!catRowsByArea.has(x.area))catRowsByArea.set(x.area,[]);catRowsByArea.get(x.area).push(row)}}
 for(const list of tagRowsByArea.values())list.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));
 for(const list of catRowsByArea.values())list.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));
 const featuredTags=hpBalanced(tagRowsByArea,12),featuredCats=hpBalanced(catRowsByArea,8);
 tagRoot.innerHTML=featuredTags.map(x=>`<a class="garimpo-link" href="catalogo.html?area=${encodeURIComponent(x.displayArea)}&tag=${encodeURIComponent(x.id)}">${hpEsc(x.name)} <small>${hpEsc(x.displayArea)}</small><span>${x.count}</span></a>`).join('');
 catRoot.innerHTML=featuredCats.map(x=>`<a class="garimpo-link" href="catalogo.html?area=${encodeURIComponent(x.displayArea)}&category=${encodeURIComponent(x.id)}">${hpEsc(x.name)} <small>${hpEsc(x.displayArea)}</small><span>${x.count}</span></a>`).join('')}
async function renderHomeSeries(){const root=document.getElementById('homeSeriesGrid');if(!root)return;const {data:all,error}=await window.BB_HOME_DISCOVERY_PROMISE;if(error){root.innerHTML='<div class="empty">Não foi possível carregar as séries.</div>';return}
 const rowsByArea=new Map();for(const x of all||[]){if(x.item_type!=='series'||!x.area)continue;if(!rowsByArea.has(x.area))rowsByArea.set(x.area,[]);rowsByArea.get(x.area).push({id:x.id,name:x.name,count:Number(x.item_count)||0,brazil_status:x.brazil_status,brazil_published_volumes:x.brazil_published_volumes,original_total_volumes:x.original_total_volumes,total_volumes:x.total_volumes})}
 for(const rows of rowsByArea.values())rows.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));
 const rows=hpBalanced(rowsByArea,4);
 root.innerHTML=rows.map(s=>{const total=s.original_total_volumes??s.total_volumes;const line=s.brazil_published_volumes!=null&&total?`${s.brazil_published_volumes} de ${total} volumes no Brasil`:s.brazil_published_volumes!=null?`${s.brazil_published_volumes} volumes no Brasil`:`${s.count} volumes no catálogo`;return `<a class="home-series-card" href="serie.html?id=${encodeURIComponent(s.id)}"><small>SÉRIE · ${hpEsc(s.displayArea)}</small><strong>${hpEsc(s.name)}</strong><span>${hpEsc(line)}${s.brazil_status?` • ${hpEsc(s.brazil_status)}`:''}</span></a>`}).join('')}
function renderRecentBooks(){
 const section=document.getElementById('recentBooksSection'),root=document.getElementById('homeRecentBooks');if(!section||!root)return;
 let rows=[];try{rows=JSON.parse(localStorage.getItem('bb_recent_books')||'[]')}catch{}
 rows=(Array.isArray(rows)?rows:[]).filter(x=>x&&x.id).slice(0,6);
 if(!rows.length){section.classList.add('hidden');return}
 section.classList.remove('hidden');
 root.innerHTML=rows.map(x=>`<a class="book book-link" href="livro.html?id=${encodeURIComponent(x.id)}"><div class="cover">${x.cover?`<img src="${hpEsc(x.cover)}" alt="Capa de ${hpEsc(x.title)}" loading="lazy" onerror="this.remove()">`:hpEsc(x.title)}</div><div class="book-body"><div class="book-title">${hpEsc(x.title)}</div><div class="book-author">${hpEsc(x.author||'')}</div></div></a>`).join('');
}
function clearRecentBooks(){try{localStorage.removeItem('bb_recent_books')}catch{}document.getElementById('recentBooksSection')?.classList.add('hidden')}

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('q')?.addEventListener('keydown',handleHomeSearchKey);renderHomeGarimpo();renderHomeSeries();renderRecentBooks()});