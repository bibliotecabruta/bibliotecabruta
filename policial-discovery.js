const sbPoliceDiscovery=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
const POLICE_DISCOVERY_AREAS=['Policial/Mistério','Coleção Negra','Coleção Policial'];

function pdEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function pdCatalogUrl(params){const p=new URLSearchParams(params);return 'catalogo.html?'+p.toString()}

async function initPoliceDiscovery(){
  const catRoot=document.getElementById('policeCategoryLinks'),tagRoot=document.getElementById('policeThemeLinks'),countRoot=document.getElementById('policeBookCount');
  if(!catRoot||!tagRoot)return;
  const [{data:categories,error:catError},{data:tags,error:tagError},{data:books,error:bookError}]=await Promise.all([
    sbPoliceDiscovery.from('categories').select('id,name,book_categories(book_id)').eq('area','Policial/Mistério').order('name'),
    sbPoliceDiscovery.from('tags').select('id,name').order('name'),
    sbPoliceDiscovery.from('books').select('id,area,book_tags(tag_id)').in('area',POLICE_DISCOVERY_AREAS)
  ]);
  if(catError||tagError||bookError){catRoot.innerHTML='<span class="muted">Não foi possível carregar as categorias.</span>';tagRoot.innerHTML='<span class="muted">Não foi possível carregar os temas.</span>';return}
  if(countRoot)countRoot.textContent=`${(books||[]).length} livros no acervo policial`;
  const cats=(categories||[]).map(c=>({...c,count:(c.book_categories||[]).length})).filter(c=>c.count>0).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));
  const tagCounts=new Map();
  for(const b of books||[])for(const bt of b.book_tags||[])if(bt.tag_id)tagCounts.set(bt.tag_id,(tagCounts.get(bt.tag_id)||0)+1);
  const themeById=new Map((tags||[]).map(t=>[t.id,t]));
  const themes=[...tagCounts.entries()].map(([id,count])=>({...themeById.get(id),id,count})).filter(t=>t.name).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,14);
  catRoot.innerHTML=cats.map(c=>`<a class="historical-discovery-chip" href="${pdCatalogUrl({area:'Policial/Mistério',category:c.id})}"><span>${pdEsc(c.name)}</span><b>${c.count}</b></a>`).join('');
  tagRoot.innerHTML=themes.map(t=>`<a class="historical-discovery-chip historical-theme-chip" href="${pdCatalogUrl({area:'Policial/Mistério',tag:t.id})}"><span>${pdEsc(t.name)}</span><b>${t.count}</b></a>`).join('');
}

document.addEventListener('DOMContentLoaded',initPoliceDiscovery);
