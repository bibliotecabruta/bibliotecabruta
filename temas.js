const sbThemes=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
let themeRows=[];

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function themeNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}

async function initThemes(){
  const target=document.getElementById('themeGrid');
  target.innerHTML='<div class="empty">Carregando temas…</div>';
  const {data,error}=await sbThemes.from('tags').select('id,name,book_tags(book_id)').order('name');
  if(error){target.innerHTML='<div class="empty">Não foi possível carregar os temas.</div>';return}
  themeRows=(data||[]).map(t=>({...t,count:(t.book_tags||[]).length})).filter(t=>t.count>0);
  const p=new URLSearchParams(location.search);
  if(p.get('q'))document.getElementById('themeSearch').value=p.get('q');
  if(p.get('sort'))document.getElementById('themeSort').value=p.get('sort');
  renderThemes();
}

function clearThemeFilters(){
  document.getElementById('themeSearch').value='';
  document.getElementById('themeSort').value='count';
  renderThemes();
}

function renderThemes(){
  const target=document.getElementById('themeGrid');
  const raw=(document.getElementById('themeSearch')?.value||'').trim(),q=themeNorm(raw),sort=document.getElementById('themeSort')?.value||'count';
  const rows=themeRows.filter(t=>!q||themeNorm(t.name).includes(q));
  rows.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name,'pt-BR'):(a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));
  const summary=document.getElementById('themesSummary');
  if(summary)summary.textContent=`${rows.length} ${rows.length===1?'tema encontrado':'temas encontrados'}`;
  target.innerHTML=rows.length?rows.map(t=>`<a class="category-card taxonomy-theme-card" href="tema.html?id=${encodeURIComponent(t.id)}"><div class="eyebrow">TEMA</div><h2>${esc(t.name)}</h2><p>${t.count} ${t.count===1?'livro relacionado':'livros relacionados'}</p></a>`).join(''):'<div class="empty">Nenhum tema encontrado.</div>';
  const p=new URLSearchParams();if(raw)p.set('q',raw);if(sort!=='count')p.set('sort',sort);
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString():''));
}

document.addEventListener('DOMContentLoaded',initThemes);