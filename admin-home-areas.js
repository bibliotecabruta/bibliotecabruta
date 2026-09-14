let adminHomeAreaCards=[];

function homeAreaEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function injectHomeAreaAdminStyle(){
 if(document.getElementById('homeAreaAdminStyle'))return;
 const style=document.createElement('style');style.id='homeAreaAdminStyle';
 style.textContent='.home-area-admin-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:20px;align-items:start}.home-area-list{display:grid;gap:10px}.home-area-row{display:grid;grid-template-columns:110px 1fr auto;gap:14px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px}.home-area-row.inactive{opacity:.58}.home-area-thumb{width:110px;aspect-ratio:16/9;border-radius:6px;background:#24211d center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;text-align:center;padding:8px}.home-area-row h3{margin:0 0 5px;font-size:17px}.home-area-row p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}.home-area-meta{margin-top:7px;display:flex;gap:6px;flex-wrap:wrap}.home-area-meta span{font-size:10px;border:1px solid var(--line);border-radius:12px;padding:3px 7px;background:#fffaf0}.home-area-actions{display:flex;gap:5px;flex-direction:column}.home-area-actions button{padding:7px 9px}.home-area-form-card{position:sticky;top:70px;background:#fffaf0;border:1px solid var(--line);border-radius:8px;padding:16px}.home-area-form-card h3{margin-top:0}.home-area-preview{min-height:180px;border-radius:8px;background:#252223 center/cover no-repeat;color:#fff;padding:22px;display:flex;flex-direction:column;justify-content:flex-end;position:relative;overflow:hidden;margin:10px 0 16px}.home-area-preview:before{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.86),rgba(0,0,0,.2))}.home-area-preview>*{position:relative;z-index:1}.home-area-preview strong{font-size:23px;text-transform:uppercase}.home-area-preview span{color:#f0d9a8;line-height:1.4;margin-top:7px}.home-area-inline{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:850px){.home-area-admin-grid{grid-template-columns:1fr}.home-area-form-card{position:static}.home-area-row{grid-template-columns:90px 1fr}.home-area-actions{grid-column:1/-1;flex-direction:row}.home-area-thumb{width:90px}}';
 document.head.appendChild(style);
}

async function showHomeAreaManager(){
 adminHideAllViews();injectHomeAreaAdminStyle();populateHomeAreaQuickLinks();
 document.getElementById('homeAreaManager')?.classList.remove('hidden');
 await loadHomeAreaCards();
 document.getElementById('homeAreaManager')?.scrollIntoView({behavior:'smooth',block:'start'});
}

async function loadHomeAreaCards(){
 const root=document.getElementById('homeAreaList');if(!root)return;
 root.innerHTML='<div class="muted">Carregando cards da Home…</div>';
 const res=await sbAdmin.from('home_area_cards').select('*').order('sort_order').order('created_at');
 if(res.error){root.innerHTML='<div class="note error">Não foi possível carregar os cards: '+homeAreaEsc(res.error.message)+'</div>';return}
 adminHomeAreaCards=res.data||[];renderHomeAreaCardsAdmin();
}

function populateHomeAreaQuickLinks(){
 const select=document.getElementById('homeAreaQuickLink');if(!select)return;
 const areas=[
  ['Ficção Histórica','historica.html'],['Policial / Mistério','policial.html'],['Fantasia','catalogo.html?area=Fantasia'],['Ficção Científica','catalogo.html?area='+encodeURIComponent('Ficção Científica')],['Ação / Militar','catalogo.html?area='+encodeURIComponent('Ação / Militar')],['Horror / Suspense','catalogo.html?area='+encodeURIComponent('Horror / Suspense')]
 ];
 let out='<option value="">Escolher área, categoria ou tema…</option><optgroup label="Áreas">'+areas.map(x=>'<option value="'+homeAreaEsc(x[1])+'">Área · '+homeAreaEsc(x[0])+'</option>').join('')+'</optgroup>';
 if(Array.isArray(allCategories)&&allCategories.length)out+='<optgroup label="Categorias">'+allCategories.map(x=>'<option value="catalogo.html?area='+encodeURIComponent(x.area||'')+'&category='+encodeURIComponent(x.id)+'">Categoria · '+homeAreaEsc(x.name)+(x.area?' · '+homeAreaEsc(x.area):'')+'</option>').join('')+'</optgroup>';
 if(Array.isArray(allTags)&&allTags.length)out+='<optgroup label="Temas">'+allTags.map(x=>'<option value="catalogo.html?tag='+encodeURIComponent(x.id)+'">Tema · '+homeAreaEsc(x.name)+'</option>').join('')+'</optgroup>';
 select.innerHTML=out;
}
function applyHomeAreaQuickLink(value){const f=document.getElementById('homeAreaForm');if(!f||!value)return;f.elements.href.value=value;}

function homeAreaBadgeLabel(c){
 if(c.badge_mode==='none')return 'Sem selo';
 if(c.badge_mode==='manual')return 'Selo manual'+(c.badge_text?': '+c.badge_text:'');
 return 'Contagem automática'+(c.area_key?' · '+c.area_key:'');
}

function renderHomeAreaCardsAdmin(){
 const root=document.getElementById('homeAreaList');if(!root)return;
 if(!adminHomeAreaCards.length){root.innerHTML='<div class="empty">Nenhum card cadastrado.</div>';return}
 root.innerHTML=adminHomeAreaCards.map(function(c){
   const bg=c.image_url?'background-image:url(&quot;'+homeAreaEsc(c.image_url)+'&quot;);background-color:'+homeAreaEsc(c.background_color||'#252223'):'background-color:'+homeAreaEsc(c.background_color||'#252223');
   return '<article class="home-area-row '+(c.is_active?'':'inactive')+'"><div class="home-area-thumb" style="'+bg+'">'+(c.image_url?'':homeAreaEsc(c.title))+'</div><div><h3>'+homeAreaEsc(c.title)+'</h3><p>'+homeAreaEsc(c.description||'')+'</p><div class="home-area-meta"><span>Ordem '+c.sort_order+'</span><span>'+(c.is_active?'Visível':'Oculto')+'</span><span>'+homeAreaEsc(homeAreaBadgeLabel(c))+'</span></div></div><div class="home-area-actions"><button class="secondary" type="button" onclick="editHomeAreaCard(\''+c.id+'\')">Editar</button><button class="secondary" type="button" onclick="moveHomeAreaCard(\''+c.id+'\',-1)">↑</button><button class="secondary" type="button" onclick="moveHomeAreaCard(\''+c.id+'\',1)">↓</button><button class="secondary" type="button" onclick="deleteHomeAreaCard(\''+c.id+'\')">Excluir</button></div></article>';
 }).join('');
}

function newHomeAreaCard(){
 const f=document.getElementById('homeAreaForm');if(!f)return;
 f.reset();f.elements.card_id.value='';f.elements.background_color.value='#252223';f.elements.badge_mode.value='auto';f.elements.sort_order.value=(adminHomeAreaCards.length?adminHomeAreaCards[adminHomeAreaCards.length-1].sort_order:0)+10;f.elements.is_active.checked=true;
 document.getElementById('homeAreaFormTitle').textContent='Novo card de área';
 document.getElementById('homeAreaCurrentImage').value='';document.getElementById('homeAreaDeleteImage').classList.add('hidden');
 toggleHomeAreaBadgeFields();previewHomeAreaCard();
}

function editHomeAreaCard(id){
 const c=adminHomeAreaCards.find(x=>x.id===id),f=document.getElementById('homeAreaForm');if(!c||!f)return;
 f.elements.card_id.value=c.id;f.elements.title.value=c.title||'';f.elements.description.value=c.description||'';f.elements.href.value=c.href||'';f.elements.image_url.value=c.image_url||'';f.elements.background_color.value=c.background_color||'#252223';f.elements.area_key.value=c.area_key||'';f.elements.badge_mode.value=c.badge_mode||'auto';f.elements.badge_text.value=c.badge_text||'';f.elements.sort_order.value=c.sort_order??0;f.elements.is_active.checked=!!c.is_active;f.elements.image_file.value='';
 document.getElementById('homeAreaCurrentImage').value=c.image_url||'';document.getElementById('homeAreaFormTitle').textContent='Editar card';document.getElementById('homeAreaDeleteImage').classList.toggle('hidden',!c.image_url);
 toggleHomeAreaBadgeFields();previewHomeAreaCard();
}

function toggleHomeAreaBadgeFields(){
 const f=document.getElementById('homeAreaForm');if(!f)return;
 const mode=f.elements.badge_mode.value;
 document.getElementById('homeAreaAutoField')?.classList.toggle('hidden',mode!=='auto');
 document.getElementById('homeAreaManualField')?.classList.toggle('hidden',mode!=='manual');
 previewHomeAreaCard();
}

function previewHomeAreaCard(){
 const f=document.getElementById('homeAreaForm'),p=document.getElementById('homeAreaPreview');if(!f||!p)return;
 const title=f.elements.title.value||'Título do card',description=f.elements.description.value||'Texto de destaque do card.',color=f.elements.background_color.value||'#252223',img=f.elements.image_url.value||document.getElementById('homeAreaCurrentImage')?.value||'';
 p.style.backgroundColor=color;p.style.backgroundImage=img?'url("'+img.replace(/"/g,'')+'")':'none';p.innerHTML='<strong>'+homeAreaEsc(title)+'</strong><span>'+homeAreaEsc(description)+'</span>';
}

async function uploadHomeAreaImage(file){
 if(!file||!file.size)return null;
 if(file.size>5*1024*1024)throw new Error('A imagem deve ter no máximo 5 MB.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Formato inválido. Use JPG, PNG ou WebP.');
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
 const path='home-areas/'+crypto.randomUUID()+'.'+ext;
 const up=await sbAdmin.storage.from('book-covers').upload(path,file,{contentType:file.type,upsert:false});
 if(up.error)throw up.error;
 return sbAdmin.storage.from('book-covers').getPublicUrl(path).data.publicUrl;
}

function clearHomeAreaImage(){
 const f=document.getElementById('homeAreaForm');if(!f)return;
 f.elements.image_url.value='';f.elements.image_file.value='';document.getElementById('homeAreaCurrentImage').value='';document.getElementById('homeAreaDeleteImage').classList.add('hidden');previewHomeAreaCard();
}

async function saveHomeAreaCard(e){
 e.preventDefault();const f=e.target,fd=new FormData(f),id=String(fd.get('card_id')||'');
 try{
  const uploaded=await uploadHomeAreaImage(fd.get('image_file')),current=document.getElementById('homeAreaCurrentImage')?.value||'';
  const payload={title:String(fd.get('title')||'').trim(),description:String(fd.get('description')||'').trim(),href:String(fd.get('href')||'').trim()||'catalogo.html',image_url:uploaded||String(fd.get('image_url')||'').trim()||current||null,background_color:String(fd.get('background_color')||'').trim()||'#252223',area_key:String(fd.get('area_key')||'').trim()||null,badge_mode:String(fd.get('badge_mode')||'auto'),badge_text:String(fd.get('badge_text')||'').trim()||null,sort_order:Number(fd.get('sort_order')||0),is_active:fd.get('is_active')==='on',updated_at:new Date().toISOString()};
  if(!payload.title)throw new Error('Informe o título do card.');
  const res=id?await sbAdmin.from('home_area_cards').update(payload).eq('id',id):await sbAdmin.from('home_area_cards').insert(payload);
  if(res.error)throw res.error;
  msg(id?'Card atualizado.':'Novo card criado.','ok');await loadHomeAreaCards();newHomeAreaCard();
 }catch(err){console.error(err);msg('Erro ao salvar o card: '+(err.message||err),'error')}
}

async function deleteHomeAreaCard(id){
 const c=adminHomeAreaCards.find(x=>x.id===id);if(!c||!confirm('Excluir o card “'+c.title+'”?'))return;
 const res=await sbAdmin.from('home_area_cards').delete().eq('id',id);
 if(res.error){msg('Erro ao excluir: '+res.error.message,'error');return}
 msg('Card excluído.','ok');await loadHomeAreaCards();newHomeAreaCard();
}

async function moveHomeAreaCard(id,direction){
 const ordered=[...adminHomeAreaCards].sort((a,b)=>a.sort_order-b.sort_order),i=ordered.findIndex(x=>x.id===id),j=i+direction;if(i<0||j<0||j>=ordered.length)return;
 const a=ordered[i],b=ordered[j],aOrder=a.sort_order,bOrder=b.sort_order;
 let res=await sbAdmin.from('home_area_cards').update({sort_order:bOrder,updated_at:new Date().toISOString()}).eq('id',a.id);if(res.error){msg('Não foi possível reordenar: '+res.error.message,'error');return}
 res=await sbAdmin.from('home_area_cards').update({sort_order:aOrder,updated_at:new Date().toISOString()}).eq('id',b.id);if(res.error){msg('Não foi possível reordenar: '+res.error.message,'error');return}
 await loadHomeAreaCards();
}

document.addEventListener('DOMContentLoaded',()=>{injectHomeAreaAdminStyle();newHomeAreaCard()});