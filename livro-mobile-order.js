(()=>{
 const mq=window.matchMedia('(max-width: 850px)');
 let placeholder=null;
 function repositionOriginalInfo(){
  const root=document.getElementById('bookPage');
  const original=root?.querySelector('.book-original');
  const contentGrid=root?.querySelector('.book-content-grid');
  const side=root?.querySelector('.book-content-side');
  if(!root||!original||!contentGrid||!side)return false;
  if(!placeholder){placeholder=document.createComment('book-original-desktop-position');original.before(placeholder)}
  if(mq.matches){
   if(original.parentElement!==root||original.nextElementSibling!==contentGrid)root.insertBefore(original,contentGrid);
   original.classList.add('book-original-mobile-promoted');
  }else{
   if(placeholder.parentNode)placeholder.parentNode.insertBefore(original,placeholder.nextSibling);
   original.classList.remove('book-original-mobile-promoted');
  }
  return true;
 }
 function schedule(){
  let tries=0;
  const timer=setInterval(()=>{tries++;if(repositionOriginalInfo()||tries>40)clearInterval(timer)},75);
 }
 mq.addEventListener?.('change',repositionOriginalInfo);
 document.addEventListener('DOMContentLoaded',schedule);
 const root=document.getElementById('bookPage');
 if(root)new MutationObserver(()=>repositionOriginalInfo()).observe(root,{childList:true,subtree:true});
 const style=document.createElement('style');
 style.textContent='@media(max-width:850px){.book-original-mobile-promoted{margin-top:28px;margin-bottom:8px}.book-original-mobile-promoted h2{margin-top:0}}';
 document.head.appendChild(style);
})();