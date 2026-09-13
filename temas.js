const sbThemes=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
let themeRows=[];
const THEME_AREA_GROUPS={'Policial/Mistério':['Policial/Mistério','Coleção Negra','Coleção Policial'],'Ação / Militar':['Ficção Militar','Ação / Militar'],'Horror / Suspense':['Horror / Suspense']};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function themeNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
function themeAreasForFilter(area){if(!area)return[];return THEME_AREA_GROUPS[area]||[area]}
function themeCountForArea(t,area){if(!area)return t.count;return themeAreasForFilter(area).reduce((sum,a)=>sum+(t.areaCounts[a]||0),0)}

async function initThemes(){
  const target=document.getElementById('themeGrid');
  target.innerHTML='<div class="empty">Carregando temas…</div>';
  const [{data:tags,error:tagError},{data:books,error:bookError}]=await Promise.all([
    sbThemes.from('tags').select('id,name').order('name'),
    sbThemes.from('books').select('area,book_tags(tag_id)')
  ]);
  if(tagError||bookError){target.innerHTML='<div class="empty">Não foi possível carregar os temas.</div>';return}
  const usage=new Map();
  for(const b of books||[])for(const bt of b.book_tags||[]){
    if(!bt.tag_id)continue;
    if(!usage.has(bt.tag_id))usage.set(bt.tag_id,{total:0,areas:{}});
    const u=usage.get(bt.tag_id);u.total++;u.areas[b.area]=(u.areas[b.area]||0)+1;
  }
  themeRows=(tags||[]).map(t=>{const u=usage.get(t.id)||{total:0,areas:{}};return{...t,count:u.total,areaCounts:u.areas}}).filter(t=>t.count>0);
  const p=new URLSearchParams(location.search);
  if(p.get('q'))document.getElementById('themeSearch').value=p.get('q');
  if(p.get('area'))document.getElementById('themeArea').value=p.get('area');
  if(p.get('sort'))document.getElementById('themeSort').value=p.get('sort');
  renderThemes();
}

function clearThemeFilters(){
  document.getElementById('themeSearch').value='';
  document.getElementById('themeArea').value='';
  document.getElementById('themeSort').value='count';
  renderThemes();
}

function renderThemes(){
  const target=document.getElementById('themeGrid');
  const raw=(document.getElementById('themeSearch')?.value||'').trim(),q=themeNorm(raw),area=document.getElementById('themeArea')?.value||'',sort=document.getElementById('themeSort')?.value||'count';
  const rows=themeRows.map(t=>({...t,displayCount:themeCountForArea(t,area)})).filter(t=>t.displayCount>0&&(!q||themeNorm(t.name).includes(q)));
  rows.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name,'pt-BR'):(a,b)=>b.displayCount-a.displayCount||a.name.localeCompare(b.name,'pt-BR'));
  const summary=document.getElementById('themesSummary');
  if(summary)summary.textContent=`${rows.length} ${rows.length===1?'tema encontrado':'temas encontrados'}${area?' em '+area:''}`;
  target.innerHTML=rows.length?rows.map(t=>`<a class="category-card taxonomy-theme-card" href="tema.html?id=${encodeURIComponent(t.id)}"><div class="eyebrow">TEMA</div><h2>${esc(t.name)}</h2><p>${t.displayCount} ${t.displayCount===1?'livro relacionado':'livros relacionados'}</p></a>`).join(''):'<div class="empty">Nenhum tema encontrado nesse recorte.</div>';
  const p=new URLSearchParams();if(raw)p.set('q',raw);if(area)p.set('area',area);if(sort!=='count')p.set('sort',sort);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString():''));
}

document.addEventListener('DOMContentLoaded',initThemes);
