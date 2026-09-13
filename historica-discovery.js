const sbHistoricalDiscovery=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);

function hdEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function hdCatalogUrl(kind,id){const p=new URLSearchParams({area:'Ficção Histórica'});p.set(kind,id);return 'catalogo.html?'+p.toString()}

async function initHistoricalDiscovery(){
  const catRoot=document.getElementById('historicalCategoryLinks'),tagRoot=document.getElementById('historicalThemeLinks');
  if(!catRoot||!tagRoot)return;
  const [{data:categories,error:catError},{data:tags,error:tagError},{data:books,error:bookError}]=await Promise.all([
    sbHistoricalDiscovery.from('categories').select('id,name,book_categories(book_id)').eq('area','Ficção Histórica').order('name'),
    sbHistoricalDiscovery.from('tags').select('id,name').order('name'),
    sbHistoricalDiscovery.from('books').select('id,book_tags(tag_id)').eq('area','Ficção Histórica')
  ]);
  if(catError||tagError||bookError){catRoot.innerHTML='<span class="muted">Não foi possível carregar as categorias.</span>';tagRoot.innerHTML='<span class="muted">Não foi possível carregar os temas.</span>';return}
  const cats=(categories||[]).map(c=>({...c,count:(c.book_categories||[]).length})).filter(c=>c.count>0).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,10);
  const tagCounts=new Map();
  for(const b of books||[])for(const bt of b.book_tags||[])if(bt.tag_id)tagCounts.set(bt.tag_id,(tagCounts.get(bt.tag_id)||0)+1);
  const themeById=new Map((tags||[]).map(t=>[t.id,t]));
  const themes=[...tagCounts.entries()].map(([id,count])=>({...themeById.get(id),id,count})).filter(t=>t.name).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,12);
  catRoot.innerHTML=cats.map(c=>`<a class="historical-discovery-chip" href="${hdCatalogUrl('category',c.id)}"><span>${hdEsc(c.name)}</span><b>${c.count}</b></a>`).join('');
  tagRoot.innerHTML=themes.map(t=>`<a class="historical-discovery-chip historical-theme-chip" href="${hdCatalogUrl('tag',t.id)}"><span>${hdEsc(t.name)}</span><b>${t.count}</b></a>`).join('');
}

document.addEventListener('DOMContentLoaded',initHistoricalDiscovery);
