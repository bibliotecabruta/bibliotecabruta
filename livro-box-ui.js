const sbBoxUi=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
function boxEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function boxCover(book){const ed=(book.editions||[]).find(e=>e.country==='Brasil'&&e.is_primary)||(book.editions||[]).find(e=>e.country==='Brasil');return ed?.cover_url||book.cover_url}
function boxBookCard(book,label=''){const cover=boxCover(book);return `<a class="volume-card" href="livro.html?id=${encodeURIComponent(book.id)}">${cover?`<img src="${boxEsc(cover)}" alt="${boxEsc(book.title)}">`:'<div class="mini-placeholder">Sem capa</div>'}<div>${label?`<small>${boxEsc(label)}</small>`:''}<strong>${boxEsc(book.title)}</strong>${book.series_volume?`<span>Volume ${boxEsc(book.series_volume)}</span>`:''}</div></a>`}
async function waitForBookPage(){for(let i=0;i<40;i++){const root=document.getElementById('bookPage');if(root?.querySelector('h1'))return root;await new Promise(resolve=>setTimeout(resolve,100))}return null}
async function renderBoxRelations(){const id=new URLSearchParams(location.search).get('id');if(!id)return;const {data:book}=await sbBoxUi.from('books').select('id,item_type').eq('id',id).maybeSingle();if(!book)return;const root=await waitForBookPage();if(!root)return;
  if(book.item_type==='box'){
    const {data,error}=await sbBoxUi.from('box_books').select('sort_order,books!box_books_book_id_fkey(id,title,cover_url,series_volume,editions(cover_url,is_primary,country))').eq('box_id',id).order('sort_order');
    if(!error&&data?.length){const section=document.createElement('section');section.className='detail-section';section.innerHTML=`<div class="eyebrow">BOX DA SÉRIE</div><h2>Livros incluídos neste box</h2><p class="muted">Este produto reúne os volumes abaixo, que continuam com suas fichas individuais no catálogo.</p><div class="series-volume-grid">${data.map(x=>boxBookCard(x.books,x.books?.series_volume?`VOLUME ${x.books.series_volume}`:'' )).join('')}</div>`;root.appendChild(section)}
  }else{
    const {data,error}=await sbBoxUi.from('box_books').select('sort_order,boxes:books!box_books_box_id_fkey(id,title,cover_url,editions(cover_url,is_primary,country,publisher,publication_year))').eq('book_id',id);
    if(!error&&data?.length){const section=document.createElement('section');section.className='detail-section';section.innerHTML=`<h2>Também disponível em box</h2><div class="series-volume-grid">${data.map(x=>boxBookCard(x.boxes,'BOX DA SÉRIE')).join('')}</div>`;root.appendChild(section)}
  }
}
document.addEventListener('DOMContentLoaded',renderBoxRelations);
