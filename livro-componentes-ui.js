(()=>{
 const css=`.edition-components{margin-top:14px;padding-top:12px;border-top:1px solid rgba(127,127,127,.25)}.edition-components>small{display:block;font-weight:700;letter-spacing:.06em;margin-bottom:9px}.edition-component-grid{display:flex;flex-wrap:wrap;gap:12px}.edition-component{width:min(150px,45%);margin:0}.edition-component img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:5px}.edition-component figcaption{font-size:.78rem;line-height:1.25;margin-top:5px}.edition-component figcaption span{display:block;opacity:.72}.component-variant-set{margin-top:10px}.component-variant-set>strong{display:block;font-size:.82rem;margin-bottom:7px}.component-variant-grid{display:flex;flex-wrap:wrap;gap:9px}.component-variant-grid figure{width:min(120px,42%);margin:0}.component-variant-grid img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:5px}.component-variant-grid figcaption{font-size:.72rem;margin-top:4px}`;
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 async function enhance(){
  if(!window.sbBook||!window.BB_BOOK_ID)return;
  const {data:eds}=await sbBook.from('editions').select('id').eq('book_id',BB_BOOK_ID).eq('country','Brasil');
  const ids=(eds||[]).map(x=>x.id);if(!ids.length)return;
  const [{data:parts},{data:vars}]=await Promise.all([
   sbBook.from('edition_components').select('*').in('edition_id',ids).order('component_number',{ascending:true}),
   sbBook.from('edition_variants').select('*').in('edition_id',ids).not('component_id','is',null).order('publication_year',{ascending:false})
  ]);
  if(!(parts||[]).length)return;
  const cards=[...document.querySelectorAll('.edition-card')];
  const editions=(window.__bbEditionOrder||ids);
  // livro.js renders cards in the same newest-to-oldest edition order; reconstruct that order here.
  const {data:ordered}=await sbBook.from('editions').select('id,publication_year,is_primary').in('id',ids);
  const order=(ordered||[]).sort((a,z)=>(z.publication_year??-1)-(a.publication_year??-1)||((z.is_primary?1:0)-(a.is_primary?1:0))).map(x=>x.id);
  order.forEach((eid,i)=>{
   const card=cards[i],ps=(parts||[]).filter(p=>p.edition_id===eid);if(!card||!ps.length)return;
   const html=ps.map(p=>{
    const pv=(vars||[]).filter(v=>v.component_id===p.id),base=p.cover_url?`<img src="${esc(p.cover_url)}" alt="Capa de ${esc(p.component_label||p.title||'volume')}" loading="lazy">`:'';
    const meta=[p.pages?`${p.pages} p.`:'',p.isbn?`ISBN ${p.isbn}`:''].filter(Boolean).join(' • ');
    const variants=pv.length?`<div class="component-variant-set"><strong>Capas variantes</strong><div class="component-variant-grid">${pv.map(v=>`<figure>${v.cover_url?`<img src="${esc(v.cover_url)}" alt="${esc(v.variant_label||'Capa variante')}" loading="lazy">`:''}<figcaption>${esc(v.variant_label||'Outra capa')}${v.publication_year?` • ${esc(v.publication_year)}`:''}</figcaption></figure>`).join('')}</div></div>`:'';
    return `<figure class="edition-component">${base}<figcaption><strong>${esc(p.component_label||`Volume ${p.component_number}`)}</strong>${p.title?`<span>${esc(p.title)}</span>`:''}${meta?`<span>${esc(meta)}</span>`:''}</figcaption>${variants}</figure>`;
   }).join('');
   const host=card.querySelector('div')||card;host.insertAdjacentHTML('beforeend',`<div class="edition-components"><small>VOLUMES DESTA EDIÇÃO</small><div class="edition-component-grid">${html}</div></div>`);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,500));else setTimeout(enhance,500);
})();
