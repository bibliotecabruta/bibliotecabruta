const sbCategories=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
let categoryRows=[];

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function catNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}

async function initCategories(){
  const root=document.getElementById('categoriesList');
  root.innerHTML='<div class="empty">Carregando categorias…</div>';
  const {data,error}=await sbCategories.from('categories').select('id,name,area,book_categories(book_id)').order('name');
  if(error){root.innerHTML='<div class="empty">Não foi possível carregar as categorias.</div>';return}
  categoryRows=(data||[]).map(c=>({...c,count:(c.book_categories||[]).length})).filter(c=>c.count>0);
  const p=new URLSearchParams(location.search);
  if(p.get('q'))document.getElementById('categorySearch').value=p.get('q');
  if(p.get('area'))document.getElementById('areaFilter').value=p.get('area');
  if(p.get('sort'))document.getElementById('categorySort').value=p.get('sort');
  renderCategories();
}

function clearCategoryFilters(){
  document.getElementById('categorySearch').value='';
  document.getElementById('areaFilter').value='';
  document.getElementById('categorySort').value='name';
  renderCategories();
}

function renderCategories(){
  const root=document.getElementById('categoriesList');
  const raw=(document.getElementById('categorySearch')?.value||'').trim();
  const q=catNorm(raw),area=document.getElementById('areaFilter')?.value||'',sort=document.getElementById('categorySort')?.value||'name';
  const rows=categoryRows.filter(c=>(!q||catNorm(c.name).includes(q)||catNorm(c.area).includes(q))&&(!area||c.area===area));
  rows.sort(sort==='count'?(a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'):(a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  const summary=document.getElementById('categoriesSummary');
  if(summary)summary.textContent=`${rows.length} ${rows.length===1?'categoria encontrada':'categorias encontradas'}`;
  root.innerHTML=rows.length?rows.map(c=>`<a class="entity-card taxonomy-card" href="categoria.html?id=${encodeURIComponent(c.id)}"><div><div class="eyebrow">${esc(c.area)}</div><h2>${esc(c.name)}</h2></div><div class="entity-meta"><strong>${c.count} ${c.count===1?'livro':'livros'}</strong><span>Ver prateleira →</span></div></a>`).join(''):'<div class="empty">Nenhuma categoria encontrada.</div>';
  const p=new URLSearchParams();if(raw)p.set('q',raw);if(area)p.set('area',area);if(sort!=='name')p.set('sort',sort);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString():''));
}

document.addEventListener('DOMContentLoaded',initCategories);