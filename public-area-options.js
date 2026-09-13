(function(){
const GROUPS={'Policial/Mistério':['Policial/Mistério','Coleção Negra','Coleção Policial'],'Ação / Militar':['Ficção Militar','Ação / Militar'],'Horror / Suspense':['Horror / Suspense']};
const SELECT_IDS=['filterArea','themeArea','authorArea','seriesArea','areaFilter'];
const EMPTY_CONFIG={
  'catalogo.html':['filteredCatalog','clearCatalogFilters'],
  'temas.html':['themeGrid','clearThemeFilters'],
  'categorias.html':['categoriesList','clearCategoryFilters'],
  'autores.html':['authorsList','clearAuthorFilters'],
  'series.html':['seriesGrid','clearSeriesFilters']
};
function areasFor(value){return GROUPS[value]||[value]}
function decorateSelect(el,counts){if(!el)return;for(const option of el.querySelectorAll('option')){const value=option.value;if(!value)continue;const count=areasFor(value).reduce((sum,a)=>sum+(counts.get(a)||0),0);if(!option.dataset.baseLabel)option.dataset.baseLabel=option.textContent.replace(/\s+\(\d+\)$/,'');option.textContent=`${option.dataset.baseLabel} (${count})`;option.disabled=count===0;option.dataset.empty=count===0?'1':'0'} }
function decorateQuickFilters(counts){document.querySelectorAll('#quickFilters button').forEach(btn=>{const call=btn.getAttribute('onclick')||'';let area='';if(call.includes("'fantasia'"))area='Fantasia';else if(call.includes("'historica'"))area='Ficção Histórica';else if(call.includes("'policial'"))area='Policial/Mistério';if(!area)return;const count=areasFor(area).reduce((sum,a)=>sum+(counts.get(a)||0),0);btn.disabled=count===0;btn.classList.toggle('area-unavailable',count===0);if(count===0)btn.title='Área em preparação';else btn.removeAttribute('title')})}
function addEmptyReset(root,fnName){if(!root)return;const empty=root.querySelector('.empty');if(!empty||empty.querySelector('.empty-reset'))return;const text=(empty.textContent||'').trim();if(!/^(Nenhum|Nenhuma|Nada)/i.test(text))return;const fn=window[fnName];if(typeof fn!=='function')return;const btn=document.createElement('button');btn.type='button';btn.className='secondary empty-reset';btn.textContent='Limpar filtros';btn.style.marginTop='14px';btn.addEventListener('click',fn);empty.appendChild(document.createElement('br'));empty.appendChild(btn)}
function setupEmptyReset(){const page=location.pathname.split('/').pop()||'index.html',cfg=EMPTY_CONFIG[page];if(!cfg)return;const root=document.getElementById(cfg[0]);if(!root)return;const refresh=()=>addEmptyReset(root,cfg[1]);new MutationObserver(refresh).observe(root,{childList:true,subtree:true});refresh()}
async function initAreaAvailability(){setupEmptyReset();if(!window.supabase||!window.BB_CONFIG)return;const client=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);const {data,error}=await client.from('books').select('area');if(error)return;const counts=new Map();for(const b of data||[])if(b.area)counts.set(b.area,(counts.get(b.area)||0)+1);SELECT_IDS.forEach(id=>decorateSelect(document.getElementById(id),counts));decorateQuickFilters(counts)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAreaAvailability);else initAreaAvailability();
})();
