(function(){
function initAnalyticsLoader(){if(document.querySelector('script[data-bb-analytics]'))return;const s=document.createElement('script');s.src='analytics.js?v=20260914-1';s.defer=true;s.dataset.bbAnalytics='1';document.head.appendChild(s)}
function initPublicNav(){
  const nav=document.querySelector('.topbar .nav');
  if(!nav||nav.dataset.enhanced==='1')return;
  nav.dataset.enhanced='1';
  const brand=nav.querySelector('.brand');
  const links=[...nav.querySelectorAll(':scope > a:not(.brand)')];
  if(!brand||!links.length)return;
  const legacyPolice=links.find(a=>a.getAttribute('href')==='colecao-negra.html');
  if(legacyPolice){legacyPolice.href='policial.html';legacyPolice.textContent='Policial / Mistério';}
  if(!links.some(a=>a.getAttribute('href')==='noticias.html')){
    const newsLink=document.createElement('a');newsLink.href='noticias.html';newsLink.textContent='Notícias';
    const catalogIndex=links.findIndex(a=>a.getAttribute('href')==='catalogo.html');
    if(catalogIndex>=0)links.splice(catalogIndex,0,newsLink);else links.push(newsLink);
  }
  const page=location.pathname.split('/').pop()||'index.html';
  const activeByPage={
    'historica.html':'historica.html',
    'policial.html':'policial.html','colecao-negra.html':'policial.html','colecao-policial.html':'policial.html',
    'militar.html':'militar.html',
    'autores.html':'autores.html','autor.html':'autores.html',
    'series.html':'series.html','serie.html':'series.html',
    'categorias.html':'categorias.html','categoria.html':'categorias.html',
    'temas.html':'temas.html','tema.html':'temas.html',
    'noticias.html':'noticias.html','noticia.html':'noticias.html',
    'catalogo.html':'catalogo.html'
  };
  const activeHref=activeByPage[page];
  if(activeHref){const active=links.find(a=>a.getAttribute('href')===activeHref);if(active){active.classList.add('nav-active');active.setAttribute('aria-current','page')}}

  const quickSearch=document.createElement('a');
  quickSearch.href='catalogo.html';
  quickSearch.className='nav-search';
  quickSearch.textContent='Buscar';
  quickSearch.setAttribute('aria-label','Abrir busca do catálogo');

  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='nav-toggle';
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','publicNavLinks');
  toggle.innerHTML='<span aria-hidden="true">☰</span> Menu';

  const wrap=document.createElement('div');
  wrap.className='nav-links';
  wrap.id='publicNavLinks';
  links.forEach(a=>wrap.appendChild(a));

  nav.appendChild(quickSearch);
  nav.appendChild(toggle);
  nav.appendChild(wrap);

  const close=()=>{nav.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false')};
  toggle.addEventListener('click',()=>{
    const open=nav.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded',String(open));
  });
  wrap.addEventListener('click',e=>{if(e.target.closest('a'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  document.addEventListener('click',e=>{if(innerWidth<=850&&!nav.contains(e.target))close()});
}
function initPublicFooter(){
  const root=document.querySelector('.footer .footer-inner');if(!root||root.dataset.enhanced==='1')return;root.dataset.enhanced='1';
  const nav=document.createElement('nav');nav.className='footer-nav';nav.setAttribute('aria-label','Atalhos do rodapé');
  const items=[['Ficção Histórica','historica.html'],['Policial / Mistério','policial.html'],['Notícias','noticias.html'],['Catálogo','catalogo.html'],['Autores','autores.html'],['Séries','series.html'],['Categorias','categorias.html'],['Temas','temas.html'],['Sobre','sobre.html'],['Privacidade','privacidade.html']];
  nav.innerHTML=items.map(([label,href])=>`<a href="${href}">${label}</a>`).join('');root.appendChild(nav);
  if(!document.getElementById('publicFooterNavStyle')){const style=document.createElement('style');style.id='publicFooterNavStyle';style.textContent='.footer-nav{display:flex;gap:10px 18px;flex-wrap:wrap;flex-basis:100%;padding-top:15px;border-top:1px solid #ffffff18}.footer-nav a{font-size:11px;font-weight:800;color:#bfb7ab;text-transform:uppercase;letter-spacing:.03em}.footer-nav a:hover,.footer-nav a:focus-visible{color:#d0a252;outline:none}.public-error-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:14px}.public-error-actions .secondary{text-decoration:none}.public-to-top{position:fixed;right:18px;bottom:18px;z-index:50;width:42px;height:42px;border:1px solid #ffffff35;border-radius:50%;background:#181510e8;color:#fff;font-size:20px;font-weight:900;box-shadow:0 6px 20px #0003;cursor:pointer;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .18s ease,transform .18s ease,background .18s ease}.public-to-top.visible{opacity:1;transform:none;pointer-events:auto}.public-to-top:hover,.public-to-top:focus-visible{background:#8e1712;outline:2px solid #d0a252;outline-offset:2px}.skip-link{position:fixed;left:12px;top:8px;z-index:1000;transform:translateY(-180%);background:#fff;color:#181510;border:2px solid #d0a252;border-radius:4px;padding:9px 12px;font-size:12px;font-weight:900;transition:transform .15s ease}.skip-link:focus{transform:none;outline:none}@media(max-width:680px){.public-to-top{right:12px;bottom:12px;width:40px;height:40px}}';document.head.appendChild(style)}
}
function initDetailRecovery(){
  const page=location.pathname.split('/').pop()||'';
  const destinations={
    'autor.html':['autores.html','Ver todos os autores'],
    'serie.html':['series.html','Ver todas as séries'],
    'tema.html':['temas.html','Ver todos os temas'],
    'categoria.html':['categorias.html','Ver todas as categorias'],
    'livro.html':['catalogo.html','Voltar ao catálogo'],
    'noticia.html':['noticias.html','Ver todas as notícias']
  };
  const target=destinations[page];if(!target)return;
  const decorate=()=>document.querySelectorAll('.empty').forEach(empty=>{
    if(empty.dataset.recovery==='1')return;
    const text=(empty.textContent||'').trim();
    if(!/(não informad[oa]|não encontrad[oa]|não foi possível)/i.test(text))return;
    empty.dataset.recovery='1';
    const actions=document.createElement('div');actions.className='public-error-actions';
    actions.innerHTML=`<a class="secondary" href="${target[0]}">${target[1]}</a>${target[0]!=='catalogo.html'?'<a class="secondary" href="catalogo.html">Abrir catálogo</a>':''}`;
    empty.appendChild(actions);
  });
  new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true});decorate();
}
function initScrollTop(){
  const button=document.createElement('button');button.type='button';button.className='public-to-top';button.setAttribute('aria-label','Voltar ao topo');button.title='Voltar ao topo';button.textContent='↑';document.body.appendChild(button);
  const sync=()=>button.classList.toggle('visible',scrollY>700);window.addEventListener('scroll',sync,{passive:true});sync();
  button.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
}
function initAccessibility(){
  const main=document.querySelector('main');if(main&&!main.id)main.id='main-content';
  if(main&&!document.querySelector('.skip-link')){const skip=document.createElement('a');skip.className='skip-link';skip.href='#'+main.id;skip.textContent='Pular para o conteúdo';document.body.insertBefore(skip,document.body.firstChild)}
  const labels={q:'Pesquisar no acervo',filterQ:'Pesquisar no catálogo',filterArea:'Filtrar por área',filterCategory:'Filtrar por categoria',filterTag:'Filtrar por tema',filterAuthor:'Filtrar por autor',filterSeries:'Filtrar por série',filterStatus:'Filtrar por situação no Brasil',filterSort:'Ordenar resultados',themeSearch:'Pesquisar tema',themeArea:'Filtrar temas por área',themeSort:'Ordenar temas',categorySearch:'Pesquisar categoria',areaFilter:'Filtrar categorias por área',categorySort:'Ordenar categorias',authorSearch:'Pesquisar autor ou nacionalidade',authorArea:'Filtrar autores por área',authorSort:'Ordenar autores',qSeries:'Pesquisar série',seriesArea:'Filtrar séries por área',statusFilter:'Filtrar séries por situação',seriesSort:'Ordenar séries'};
  for(const[id,label]of Object.entries(labels)){const el=document.getElementById(id);if(el&&!el.getAttribute('aria-label'))el.setAttribute('aria-label',label)}
}
function initSmartBack(){
  let sameOriginRef=false;try{sameOriginRef=!!document.referrer&&new URL(document.referrer).origin===location.origin}catch{}
  if(!sameOriginRef)return;
  document.addEventListener('click',e=>{const a=e.target.closest('a.backlink');if(!a||!/voltar/i.test(a.textContent||''))return;if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0)return;e.preventDefault();history.back()});
}
function initPublicUi(){initAnalyticsLoader();initPublicNav();initPublicFooter();initDetailRecovery();initScrollTop();initAccessibility();initSmartBack()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPublicUi);
else initPublicUi();
})();