(function(){
function initPublicNav(){
  const nav=document.querySelector('.topbar .nav');
  if(!nav||nav.dataset.enhanced==='1')return;
  nav.dataset.enhanced='1';
  const brand=nav.querySelector('.brand');
  const links=[...nav.querySelectorAll(':scope > a:not(.brand)')];
  if(!brand||!links.length)return;
  const legacyPolice=links.find(a=>a.getAttribute('href')==='colecao-negra.html');
  if(legacyPolice){legacyPolice.href='policial.html';legacyPolice.textContent='Policial / Mistério';}
  const page=location.pathname.split('/').pop()||'index.html';
  const activeByPage={
    'historica.html':'historica.html',
    'policial.html':'policial.html','colecao-negra.html':'policial.html','colecao-policial.html':'policial.html',
    'militar.html':'militar.html',
    'autores.html':'autores.html','autor.html':'autores.html',
    'series.html':'series.html','serie.html':'series.html',
    'categorias.html':'categorias.html','categoria.html':'categorias.html',
    'temas.html':'temas.html','tema.html':'temas.html',
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
  const items=[['Ficção Histórica','historica.html'],['Policial / Mistério','policial.html'],['Catálogo','catalogo.html'],['Autores','autores.html'],['Séries','series.html'],['Categorias','categorias.html'],['Temas','temas.html']];
  nav.innerHTML=items.map(([label,href])=>`<a href="${href}">${label}</a>`).join('');root.appendChild(nav);
  if(!document.getElementById('publicFooterNavStyle')){const style=document.createElement('style');style.id='publicFooterNavStyle';style.textContent='.footer-nav{display:flex;gap:10px 18px;flex-wrap:wrap;flex-basis:100%;padding-top:15px;border-top:1px solid #ffffff18}.footer-nav a{font-size:11px;font-weight:800;color:#bfb7ab;text-transform:uppercase;letter-spacing:.03em}.footer-nav a:hover,.footer-nav a:focus-visible{color:#d0a252;outline:none}';document.head.appendChild(style)}
}
function initPublicUi(){initPublicNav();initPublicFooter()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPublicUi);
else initPublicUi();
})();