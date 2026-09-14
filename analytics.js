(function(){
'use strict';
const cfg=window.BB_CONFIG||{},measurementId=String(cfg.ga4MeasurementId||'').trim();
if(!/^G-[A-Z0-9]+$/i.test(measurementId))return;

const CONSENT_KEY='bb_analytics_consent';
let loaded=false,searchTimer=null,lastSearch='',lastFilterSig='';
function pageType(){
 const p=(location.pathname.split('/').pop()||'index.html').toLowerCase();
 const map={'index.html':'home','catalogo.html':'catalog','livro.html':'book','serie.html':'series_detail','series.html':'series','autor.html':'author_detail','autores.html':'authors','historica.html':'historical','policial.html':'crime','noticias.html':'news','noticia.html':'article','categoria.html':'category_detail','categorias.html':'categories','tema.html':'theme_detail','temas.html':'themes','sobre.html':'about'};
 return map[p]||p.replace('.html','')||'home';
}
function clean(v,max=100){
 let s=String(v??'').trim().replace(/\s+/g,' ');
 if(/@|\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}/.test(s))return'[redacted]';
 return s.slice(0,max);
}
function consent(){try{return localStorage.getItem(CONSENT_KEY)||''}catch{return''}}
function saveConsent(v){try{localStorage.setItem(CONSENT_KEY,v)}catch{}}
function injectGtag(){
 if(loaded)return;loaded=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||function(){dataLayer.push(arguments)};
 window.gtag('js',new Date());
 window.gtag('config',measurementId,{anonymize_ip:true,send_page_view:true,page_type:pageType()});
 const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);document.head.appendChild(s);
}
function track(name,params={}){
 if(consent()!=='granted')return;
 injectGtag();
 const safe={page_type:pageType()};
 for(const[k,v]of Object.entries(params)){
  if(v===undefined||v===null||v==='')continue;
  safe[k]=typeof v==='string'?clean(v,120):v;
 }
 window.gtag('event',name,safe);
}
window.bbTrack=track;

function ensureConsentUi(){
 const state=consent();
 if(state==='granted'){injectGtag();return}
 if(state==='denied'||document.getElementById('bbAnalyticsConsent'))return;
 const style=document.createElement('style');style.id='bbAnalyticsConsentStyle';style.textContent='.bb-analytics-consent{position:fixed;left:18px;right:18px;bottom:18px;z-index:10000;max-width:760px;margin:auto;background:#15120f;color:#fff;border:1px solid #4a4035;border-left:4px solid #b48b45;border-radius:8px;padding:15px 17px;box-shadow:0 10px 35px #0006;display:flex;align-items:center;gap:16px}.bb-analytics-consent p{margin:0;line-height:1.45;font-size:13px;color:#e5ded4;flex:1}.bb-analytics-consent strong{color:#fff}.bb-analytics-actions{display:flex;gap:8px;flex-wrap:wrap}.bb-analytics-actions button{border-radius:5px;padding:9px 12px;font-size:11px;font-weight:900;cursor:pointer}.bb-analytics-accept{border:0;background:#8e1712;color:#fff}.bb-analytics-decline{border:1px solid #6b6055;background:transparent;color:#eee}@media(max-width:650px){.bb-analytics-consent{align-items:flex-start;flex-direction:column}.bb-analytics-actions{width:100%}.bb-analytics-actions button{flex:1}}';document.head.appendChild(style);
 const box=document.createElement('div');box.id='bbAnalyticsConsent';box.className='bb-analytics-consent';box.setAttribute('role','dialog');box.setAttribute('aria-label','Preferências de métricas');box.innerHTML='<p><strong>Métricas do site.</strong> A Biblioteca Bruta usa Google Analytics para entender quais páginas, buscas e filtros são mais úteis. O Analytics só é carregado se você aceitar.</p><div class="bb-analytics-actions"><button type="button" class="bb-analytics-decline">Agora não</button><button type="button" class="bb-analytics-accept">Aceitar métricas</button></div>';
 document.body.appendChild(box);
 box.querySelector('.bb-analytics-accept').addEventListener('click',()=>{saveConsent('granted');box.remove();injectGtag();track('analytics_consent',{choice:'granted'})});
 box.querySelector('.bb-analytics-decline').addEventListener('click',()=>{saveConsent('denied');box.remove()});
}
function hrefInfo(a){try{return new URL(a.href,location.href)}catch{return null}}
function linkLabel(a){return clean(a.dataset.analyticsLabel||a.querySelector('strong')?.textContent||a.getAttribute('aria-label')||a.textContent||'',100)}
function initClickTracking(){
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a)return;
  const u=hrefInfo(a);if(!u)return;
  const path=(u.pathname.split('/').pop()||'').toLowerCase(),id=u.searchParams.get('id')||'';
  if(a.classList.contains('purchase-button')){
   track('purchase_click',{store:linkLabel(a),item_id:id||new URLSearchParams(location.search).get('id')||'',affiliate:(a.rel||'').includes('sponsored')?'yes':'no'});return;
  }
  if(a.classList.contains('youtube-button')||/youtube\.com|youtu\.be/i.test(u.hostname)){
   track('video_click',{provider:'youtube',link_text:linkLabel(a),item_id:new URLSearchParams(location.search).get('id')||''});return;
  }
  if(u.origin!==location.origin){
   track('outbound_click',{destination_host:u.hostname,link_text:linkLabel(a)});return;
  }
  if(path==='livro.html')track('open_book',{item_id:id,link_text:linkLabel(a)});
  else if(path==='serie.html')track('open_series',{item_id:id,link_text:linkLabel(a)});
  else if(path==='autor.html')track('open_author',{item_id:id,link_text:linkLabel(a)});
 });
}
function initSearchTracking(){
 const home=document.getElementById('q');
 if(home&&pageType()==='home'){
  const fire=()=>{const q=clean(home.value,80);if(q&&q!==lastSearch){lastSearch=q;track('search',{search_term:q,search_location:'home'})}};
  document.querySelector('.search button')?.addEventListener('click',fire,{capture:true});
  home.addEventListener('keydown',e=>{if(e.key==='Enter')fire()},{capture:true});
 }
 const catalog=document.getElementById('filterQ');
 if(catalog){
  catalog.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const q=clean(catalog.value,80);if(q.length>=2&&q!==lastSearch){lastSearch=q;track('search',{search_term:q,search_location:'catalog'})}},900)});
 }
}
function initFilterTracking(){
 const ids=['filterArea','filterCategory','filterTag','filterAuthor','filterSeries','filterStatus','filterSort'];
 for(const id of ids){
  const el=document.getElementById(id);if(!el)continue;
  el.addEventListener('change',()=>{
   const value=clean(el.options?.[el.selectedIndex]?.textContent||el.value,100);
   if(!el.value)return;
   const sig=id+'|'+el.value;if(sig===lastFilterSig)return;lastFilterSig=sig;
   track('filter_use',{filter_name:id.replace(/^filter/, '').toLowerCase(),filter_value:value});
  });
 }
}
function init(){
 ensureConsentUi();
 initClickTracking();
 initSearchTracking();
 initFilterTracking();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();