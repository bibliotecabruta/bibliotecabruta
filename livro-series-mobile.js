(()=>{
function seriesWindow(){
 const root=document.getElementById('bookPage');
 if(!root)return;
 const row=root.querySelector('.series-feature .series-books');
 if(!row)return;
 const cards=[...row.querySelectorAll('.series-book')];
 if(cards.length<=5)return;
 const current=cards.findIndex(x=>x.classList.contains('current'));
 let start=current<0?0:Math.max(0,Math.min(current-2,cards.length-5));
 // Near the end, keep the current volume visible and finish with the last volume.
 if(current>=cards.length-3)start=cards.length-5;
 cards.forEach((card,i)=>card.classList.toggle('series-mobile-hidden',i<start||i>=start+5));
 row.classList.add('series-windowed');
}
function run(){seriesWindow()}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,500);setTimeout(run,1200)});
window.addEventListener('resize',run);
})();
