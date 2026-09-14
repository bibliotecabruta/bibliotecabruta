(()=>{if(!document.querySelector('link[href="links.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='links.css';document.head.appendChild(l)}})();
const sbLinks=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
function linkEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function safeExternalUrl(v){try{const u=new URL(String(v||''));return['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
function uniqueSafeLinks(rows){const seen=new Set(),out=[];for(const row of rows||[]){const url=safeExternalUrl(row?.url);if(!url||seen.has(url))continue;seen.add(url);out.push({...row,url})}return out}
function youtubeEmbedUrl(url){try{const u=new URL(url),host=u.hostname.replace('www.','');let id='';if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];else if(host.includes('youtube.com')){id=u.searchParams.get('v')||((u.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)||[])[1]||'')}return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}`:''}catch{return ''}}
function renderReviewCard(v,i,total){const url=safeExternalUrl(v.url);if(!url)return'';const embed=youtubeEmbedUrl(url),label=v.label||`Vídeo ${i+1}`,showLabel=!!v.label&&!(total===1&&v.label==='Resenha recomendada');return `<article class="review-video-card">${showLabel?`<h3>${linkEsc(label)}</h3>`:''}${embed?`<div class="video-frame"><iframe src="${embed}" title="${linkEsc(label)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:''}<a class="youtube-button" href="${linkEsc(url)}" target="_blank" rel="noopener noreferrer">▶ Abrir no YouTube</a></article>`}
async function renderUsefulLinks(){const id=new URLSearchParams(location.search).get('id');if(!id)return;let target=document.getElementById('bookUsefulLinks');if(!target){for(let i=0;i<30&&!target;i++){await new Promise(r=>setTimeout(r,50));target=document.getElementById('bookUsefulLinks')}}if(!target)return;
 let rawLinks=[],rawVideos=[],legacyVideo='',usedShared=false;
 if(window.BB_BOOK_ENGAGEMENT_PROMISE){
  const {data:ctx,error}=await window.BB_BOOK_ENGAGEMENT_PROMISE;
  if(!error&&ctx){rawLinks=ctx.purchase_links||[];rawVideos=ctx.review_videos||[];legacyVideo=ctx.legacy_youtube_review_url||'';usedShared=true}
 }
 if(!usedShared){
  const [{data:links},{data:videos,error:videoError},{data:book}]=await Promise.all([
   sbLinks.from('book_purchase_links').select('label,url,is_affiliate,sort_order').eq('book_id',id).order('sort_order'),
   sbLinks.from('book_review_videos').select('label,url,sort_order').eq('book_id',id).order('sort_order'),
   (window.BB_BOOK_PROMISE||sbLinks.from('books').select('youtube_review_url').eq('id',id).single())
  ]);
  rawLinks=links||[];rawVideos=!videoError?(videos||[]):[];legacyVideo=book?.youtube_review_url||'';
 }
 const purchaseLinks=uniqueSafeLinks(rawLinks);let reviews=uniqueSafeLinks(rawVideos);if(!reviews.length&&legacyVideo)reviews=uniqueSafeLinks([{label:'Resenha recomendada',url:legacyVideo,sort_order:0}]);if(!purchaseLinks.length&&!reviews.length){target.innerHTML='';return}target.innerHTML=`${purchaseLinks.length?`<section class="purchase-highlight"><div class="purchase-highlight-head"><small>ENCONTRE ESTE LIVRO</small><h2>Onde comprar</h2></div><div class="purchase-buttons">${purchaseLinks.map(x=>`<a class="purchase-button" href="${linkEsc(x.url)}" target="_blank" rel="${x.is_affiliate?'sponsored nofollow noopener noreferrer':'noopener noreferrer'}"><span>Comprar em</span><strong>${linkEsc(x.label)}</strong>${x.is_affiliate?'<small>link comissionado</small>':''}</a>`).join('')}</div>${purchaseLinks.some(x=>x.is_affiliate)?'<p class="affiliate-note">Alguns links desta seção são comissionados. A Biblioteca Bruta pode receber uma comissão pela compra, sem custo adicional para você.</p>':''}</section>`:''}${reviews.length?`<section class="detail-section useful-section"><h2>${reviews.length>1?'Resenhas em vídeo':'Resenha recomendada'}</h2><div class="review-videos-grid ${reviews.length===1?'single':''}">${reviews.map((v,i)=>renderReviewCard(v,i,reviews.length)).join('')}</div></section>`:''}`}
document.addEventListener('DOMContentLoaded',renderUsefulLinks);