(function(){
function initPublicNav(){
  const nav=document.querySelector('.topbar .nav');
  if(!nav||nav.dataset.enhanced==='1')return;
  nav.dataset.enhanced='1';
  const brand=nav.querySelector('.brand');
  const links=[...nav.querySelectorAll(':scope > a:not(.brand)')];
  if(!brand||!links.length)return;

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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPublicNav);
else initPublicNav();
})();