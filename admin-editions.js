let adminEditionBookId='';
let adminEditionRows=[];

function editionEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function ensureEditionManagerUI(){
 if(document.getElementById('editionManagerShell'))return;
 const anchor=document.getElementById('bookForm');
 if(!anchor)return;
 const shell=document.createElement('div');
 shell.id='editionManagerShell';
 shell.className='field full hidden';
 shell.innerHTML='<div class="edition-admin-box"><div class="edition-admin-head"><div><h3>Edições brasileiras</h3><p class="muted">Nova edição = mudança editorial relevante. Troca de capa ou reimpressão pode ser cadastrada como variante da mesma edição.</p></div><button class="secondary" type="button" onclick="newEditionAdmin()">+ Adicionar edição</button></div><div id="editionAdminList" class="edition-admin-list"></div><form id="editionAdminForm" class="hidden edition-admin-form" onsubmit="saveEditionAdmin(event)"><input type="hidden" name="edition_id"><div class="form-grid"><div class="field full"><h4 id="editionAdminFormTitle">Nova edição brasileira</h4></div><div class="field"><label>Título nesta edição</label><input name="edition_title" placeholder="Deixe vazio se igual ao título principal"></div><div class="field"><label>Editora / selo</label><input name="publisher" placeholder="Ex.: Marco Polo"></div><div class="field"><label>Ano</label><input name="publication_year" type="number" min="1800" max="2100"></div><div class="field"><label>ISBN</label><input name="isbn"></div><div class="field"><label>Tradutor</label><input name="translator"></div><div class="field"><label>Páginas</label><input name="pages" type="number" min="1"></div><div class="field"><label>Acabamento</label><select name="binding"><option value="">Não informado</option><option>Brochura</option><option>Capa dura</option><option>Capa cartão</option><option>Box</option><option>Edição de bolso</option><option>E-book</option><option>Outro</option></select></div><div class="field full"><label>Identificação da edição</label><input name="edition_label" maxlength="160" placeholder="Ex.: Edição limitada e comemorativa — 25 anos"><small class="muted">Use para distinguir comemorativa, revista, ilustrada, edição de bolso etc.</small></div><div class="field full"><label>Substituir capa principal desta edição</label><input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp"><small class="muted">Use este campo apenas para trocar a capa principal. Para guardar outra capa do mesmo ISBN/miolo, use “Adicionar outra capa”.</small></div><div class="field full"><label>Observações</label><textarea name="notes" maxlength="2000"></textarea></div><div class="field full"><label class="affiliate-check"><input name="make_primary" type="checkbox"> Tornar esta a edição principal do catálogo</label></div></div><div class="actions"><button class="primary" type="submit">Salvar edição</button><button class="secondary" type="button" onclick="cancelEditionAdmin()">Cancelar</button></div></form><form id="editionVariantForm" class="hidden edition-admin-form variant-admin-form" onsubmit="saveVariantAdmin(event)"><input type="hidden" name="variant_id"><input type="hidden" name="edition_id"><div class="form-grid"><div class="field full"><h4 id="editionVariantFormTitle">Outra capa desta edição</h4><p class="muted" id="editionVariantEditionLabel"></p></div><div class="field full"><label>Imagem da capa</label><input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp"><small class="muted">Obrigatória para uma nova variante; deixe vazio ao editar para manter a imagem atual.</small></div><div class="field"><label>Identificação da capa</label><input name="variant_label" maxlength="160" placeholder="Ex.: Capa original / Nova identidade visual"></div><div class="field"><label>Ano aproximado de início</label><input name="publication_year" type="number" min="1800" max="2100" placeholder="Ex.: 2004"></div><div class="field"><label>Ano final</label><input name="end_year" type="number" min="1800" max="2100" placeholder="Opcional"></div><div class="field"><label>Impressão / tiragem</label><input name="printing" maxlength="120" placeholder="Ex.: 3ª impressão"></div><div class="field"><label>Acabamento desta variante</label><select name="binding"><option value="">Herdar da edição</option><option>Brochura</option><option>Capa dura</option><option>Capa cartão</option><option>Box</option><option>Edição de bolso</option><option>E-book</option><option>Outro</option></select></div><div class="field"><label>ISBN específico da variante</label><input name="isbn"><small class="muted">Deixe vazio se for o mesmo ISBN da edição.</small></div><div class="field"><label>Fonte</label><input name="source_label" maxlength="200" placeholder="Ex.: exemplar físico / editora"></div><div class="field full"><label>URL da fonte</label><input name="source_url" type="url" placeholder="https://..."></div><div class="field full"><label>Observações</label><textarea name="notes" maxlength="2000" placeholder="Ex.: mesmo miolo e ISBN; apenas mudança de identidade visual"></textarea></div><div class="field full"><label class="affiliate-check"><input name="make_primary" type="checkbox"> Usar esta como a capa principal desta edição</label></div></div><div class="actions"><button class="primary" type="submit">Salvar capa</button><button class="secondary" type="button" onclick="cancelVariantAdmin()">Cancelar</button></div></form></div>';
 anchor.insertAdjacentElement('afterend',shell);
 injectEditionAdminStyle();
}

function injectEditionAdminStyle(){
 if(document.getElementById('editionAdminStyle'))return;
 const s=document.createElement('style');s.id='editionAdminStyle';
 s.textContent='.edition-admin-box{border:1px solid var(--line);border-radius:8px;background:#fffaf0;padding:14px;margin-top:4px}.edition-admin-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.edition-admin-head h3{margin:0 0 4px}.edition-admin-list{display:grid;gap:12px;margin-top:12px}.edition-admin-card{display:grid;grid-template-columns:70px 1fr auto;gap:12px;align-items:start;background:#fff;border:1px solid var(--line);border-radius:7px;padding:10px}.edition-admin-card.primary-edition{border-color:#9a2a20;box-shadow:inset 3px 0 0 #9a2a20}.edition-admin-cover{width:70px;aspect-ratio:2/3;border-radius:4px;background:#eee center/cover no-repeat}.edition-admin-card h4{margin:0 0 4px;font-size:15px}.edition-admin-card p{margin:2px 0;font-size:12px;color:var(--muted)}.edition-admin-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.edition-admin-tags span{font-size:10px;border:1px solid var(--line);border-radius:12px;padding:2px 6px;background:#fffaf0}.edition-admin-actions{display:flex;gap:5px;flex-direction:column}.edition-admin-actions button{padding:6px 8px}.edition-admin-form{margin-top:14px;border-top:1px solid var(--line);padding-top:14px}.edition-admin-form h4{margin:0}.edition-admin-empty{padding:12px;border:1px dashed var(--line);border-radius:7px;color:var(--muted)}.edition-variants-admin{grid-column:2/-1;border-top:1px dashed var(--line);padding-top:10px;margin-top:2px}.edition-variants-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.edition-variants-head strong{font-size:12px}.edition-variants-head button{padding:5px 8px}.edition-variant-list{display:grid;gap:7px}.edition-variant-row{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid #e5d9c7;background:#fffaf0;border-radius:6px;padding:6px}.edition-variant-row.primary-variant{border-color:#b58a45}.edition-variant-thumb{width:46px;aspect-ratio:2/3;object-fit:cover;border-radius:3px;background:#eee}.edition-variant-copy strong{display:block;font-size:12px}.edition-variant-copy small{display:block;color:var(--muted);font-size:10px;line-height:1.35}.edition-variant-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.edition-variant-actions button{padding:4px 6px;font-size:10px}.variant-admin-form{background:#fffdf7;border:1px solid var(--line);border-radius:7px;padding:14px;margin-top:14px}@media(max-width:800px){.edition-admin-card{grid-template-columns:55px 1fr}.edition-admin-cover{width:55px}.edition-admin-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}.edition-variants-admin{grid-column:1/-1}.edition-variant-row{grid-template-columns:40px 1fr}.edition-variant-thumb{width:40px}.edition-variant-actions{grid-column:1/-1;justify-content:flex-start}}';
 document.head.appendChild(s);
}

function sortEditionVariants(rows){
 return [...(rows||[])].sort((a,z)=>(z.is_primary?1:0)-(a.is_primary?1:0)||(a.publication_year??9999)-(z.publication_year??9999)||String(a.created_at||'').localeCompare(String(z.created_at||'')));
}

async function loadEditionAdmin(bookId){
 ensureEditionManagerUI();
 adminEditionBookId=bookId||'';
 const shell=document.getElementById('editionManagerShell');
 if(!shell)return;
 if(!bookId){shell.classList.add('hidden');adminEditionRows=[];return}
 shell.classList.remove('hidden');
 const list=document.getElementById('editionAdminList');
 list.innerHTML='<div class="muted">Carregando edições…</div>';
 const {data,error}=await sbAdmin.from('editions').select('*').eq('book_id',bookId).eq('country','Brasil').order('publication_year',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});
 if(error){list.innerHTML='<div class="note error">Erro ao carregar edições: '+editionEsc(error.message)+'</div>';return}
 const editions=data||[];
 let variants=[];
 const ids=editions.map(e=>e.id);
 if(ids.length){
   const vr=await sbAdmin.from('edition_variants').select('*').in('edition_id',ids).order('publication_year',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});
   if(vr.error){list.innerHTML='<div class="note error">Erro ao carregar capas das edições: '+editionEsc(vr.error.message)+'</div>';return}
   variants=vr.data||[];
 }
 adminEditionRows=editions.map(e=>({...e,edition_variants:sortEditionVariants(variants.filter(v=>v.edition_id===e.id))}));
 renderEditionAdminList();
}

function editionAdminSummary(e){
 return [e.publisher,e.publication_year,e.binding,e.pages?e.pages+' p.':null].filter(Boolean).join(' • ');
}
function variantAdminSummary(v,e){
 const period=v.publication_year?(v.end_year?v.publication_year+'–'+v.end_year:String(v.publication_year)):null;
 const variantIsbn=v.isbn&&normalizedEditionIsbn(v.isbn)!==normalizedEditionIsbn(e.isbn)?'ISBN '+v.isbn:null;
 return [period,v.printing,v.binding,variantIsbn].filter(Boolean).join(' • ');
}
function editionPrimaryVariant(e){
 return (e.edition_variants||[]).find(v=>v.is_primary)||(e.edition_variants||[])[0]||null;
}

function renderEditionAdminList(){
 const list=document.getElementById('editionAdminList');if(!list)return;
 if(!adminEditionRows.length){list.innerHTML='<div class="edition-admin-empty">Nenhuma edição brasileira cadastrada.</div>';return}
 list.innerHTML=adminEditionRows.map(e=>{
   const variants=e.edition_variants||[],primaryVariant=editionPrimaryVariant(e);
   const cover=(primaryVariant?.cover_url||e.cover_url)?'background-image:url(&quot;'+editionEsc(primaryVariant?.cover_url||e.cover_url)+'&quot;)':'';
   const variantRows=variants.length?variants.map(v=>'<div class="edition-variant-row '+(v.is_primary?'primary-variant':'')+'"><img class="edition-variant-thumb" src="'+editionEsc(v.cover_url)+'" alt="" onerror="this.style.visibility=\'hidden\'"><div class="edition-variant-copy"><strong>'+editionEsc(v.variant_label||'Capa sem identificação')+(v.is_primary?' · principal':'')+'</strong><small>'+editionEsc(variantAdminSummary(v,e)||'Mesma edição / dados específicos não informados')+'</small></div><div class="edition-variant-actions"><button class="secondary" type="button" onclick="editVariantAdmin(\''+v.id+'\')">Editar capa</button>'+(!v.is_primary?'<button class="secondary" type="button" onclick="setPrimaryVariantAdmin(\''+v.id+'\')">Tornar principal</button><button class="secondary" type="button" onclick="deleteVariantAdmin(\''+v.id+'\')">Excluir</button>':'')+'</div></div>').join(''):'<div class="edition-admin-empty">Nenhuma capa vinculada a esta edição.</div>';
   return '<article class="edition-admin-card '+(e.is_primary?'primary-edition':'')+'"><div class="edition-admin-cover" style="'+cover+'"></div><div><h4>'+editionEsc(e.edition_label||e.publisher||'Edição brasileira')+'</h4><p>'+editionEsc(editionAdminSummary(e)||'Dados editoriais não informados')+'</p>'+(e.isbn?'<p>ISBN '+editionEsc(e.isbn)+'</p>':'')+(e.translator?'<p>Tradução: '+editionEsc(e.translator)+'</p>':'')+'<div class="edition-admin-tags">'+(e.is_primary?'<span>EDIÇÃO PRINCIPAL</span>':'<span>OUTRA EDIÇÃO</span>')+(e.binding?'<span>'+editionEsc(e.binding)+'</span>':'')+'<span>'+variants.length+' '+(variants.length===1?'CAPA':'CAPAS')+'</span></div></div><div class="edition-admin-actions"><button class="secondary" type="button" onclick="editEditionAdmin(\''+e.id+'\')">Editar edição</button>'+(!e.is_primary?'<button class="secondary" type="button" onclick="setPrimaryEditionAdmin(\''+e.id+'\')">Tornar edição principal</button><button class="secondary" type="button" onclick="deleteEditionAdmin(\''+e.id+'\')">Excluir edição</button>':'')+'</div><div class="edition-variants-admin"><div class="edition-variants-head"><strong>Capas / reimpressões desta edição</strong><button class="secondary" type="button" onclick="newVariantAdmin(\''+e.id+'\')">+ Adicionar outra capa</button></div><div class="edition-variant-list">'+variantRows+'</div></div></article>';
 }).join('');
}

function newEditionAdmin(){
 cancelVariantAdmin();
 const f=document.getElementById('editionAdminForm');if(!f)return;
 f.reset();f.elements.edition_id.value='';
 document.getElementById('editionAdminFormTitle').textContent='Nova edição brasileira';
 f.classList.remove('hidden');
 f.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function editEditionAdmin(id){
 cancelVariantAdmin();
 const e=adminEditionRows.find(x=>x.id===id),f=document.getElementById('editionAdminForm');if(!e||!f)return;
 f.reset();
 f.elements.edition_id.value=e.id;
 f.elements.edition_title.value=e.edition_title||'';
 f.elements.publisher.value=e.publisher||'';
 f.elements.publication_year.value=e.publication_year||'';
 f.elements.isbn.value=e.isbn||'';
 f.elements.translator.value=e.translator||'';
 f.elements.pages.value=e.pages||'';
 f.elements.binding.value=e.binding||'';
 f.elements.edition_label.value=e.edition_label||'';
 f.elements.notes.value=e.notes||'';
 f.elements.make_primary.checked=!!e.is_primary;
 document.getElementById('editionAdminFormTitle').textContent='Editar edição brasileira';
 f.classList.remove('hidden');
 f.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function cancelEditionAdmin(){document.getElementById('editionAdminForm')?.classList.add('hidden')}

function normalizedEditionIsbn(v){return String(v||'').replace(/[^0-9Xx]/g,'').toUpperCase()}

async function syncEditionCoverVariant(editionId,coverUrl){
 if(!editionId||!coverUrl)return;
 const parent=adminEditionRows.find(e=>e.id===editionId);
 const primary=(parent?.edition_variants||[]).find(v=>v.is_primary);
 if(primary){
   const {error}=await sbAdmin.from('edition_variants').update({cover_url:coverUrl,updated_at:new Date().toISOString()}).eq('id',primary.id);
   if(error)throw error;
 }else{
   const {error}=await sbAdmin.from('edition_variants').insert({edition_id:editionId,cover_url:coverUrl,variant_label:'Capa principal cadastrada',is_primary:true});
   if(error)throw error;
 }
}

async function saveEditionAdmin(ev){
 ev.preventDefault();
 if(!adminEditionBookId){msg('Salve a obra antes de adicionar outras edições.','error');return}
 const f=ev.target,fd=new FormData(f),editionId=String(fd.get('edition_id')||'');
 try{
   msg(editionId?'Atualizando edição…':'Salvando nova edição…');
   const isbn=String(fd.get('isbn')||'').trim()||null;
   if(isbn){
     const norm=normalizedEditionIsbn(isbn);
     const duplicate=adminEditionRows.find(x=>x.id!==editionId&&normalizedEditionIsbn(x.isbn)===norm);
     if(duplicate)throw new Error('Já existe outra edição deste livro com esse ISBN. Se mudou apenas a capa, use “Adicionar outra capa” na edição existente.');
   }
   const file=fd.get('cover_file');
   const newCover=await uploadCover(file);
   const payload={
     book_id:adminEditionBookId,country:'Brasil',
     edition_title:String(fd.get('edition_title')||'').trim()||null,
     publisher:String(fd.get('publisher')||'').trim()||null,
     publication_year:fd.get('publication_year')?Number(fd.get('publication_year')):null,
     isbn,
     translator:String(fd.get('translator')||'').trim()||null,
     pages:fd.get('pages')?Number(fd.get('pages')):null,
     binding:String(fd.get('binding')||'').trim()||null,
     edition_label:String(fd.get('edition_label')||'').trim()||null,
     notes:String(fd.get('notes')||'').trim()||null
   };
   if(newCover)payload.cover_url=newCover;
   let savedId=editionId;
   if(editionId){
     const {error}=await sbAdmin.from('editions').update(payload).eq('id',editionId);
     if(error)throw error;
   }else{
     payload.is_primary=false;
     const {data,error}=await sbAdmin.from('editions').insert(payload).select('id').single();
     if(error)throw error;savedId=data.id;
   }
   if(newCover)await syncEditionCoverVariant(savedId,newCover);
   const shouldPrimary=fd.get('make_primary')==='on'||!adminEditionRows.some(x=>x.is_primary);
   if(shouldPrimary){
     const {error}=await sbAdmin.rpc('set_primary_edition',{p_edition_id:savedId});
     if(error)throw error;
   }
   await loadEditionAdmin(adminEditionBookId);
   syncPrimaryEditionAdmin();
   f.classList.add('hidden');
   msg(editionId?'Edição atualizada.':'Nova edição adicionada à mesma obra.','ok');
 }catch(err){console.error(err);msg('Erro ao salvar edição: '+(err.message||err),'error')}
}

function findVariantAdmin(id){
 for(const e of adminEditionRows){const v=(e.edition_variants||[]).find(x=>x.id===id);if(v)return{edition:e,variant:v}}
 return null;
}
function newVariantAdmin(editionId){
 cancelEditionAdmin();
 const e=adminEditionRows.find(x=>x.id===editionId),f=document.getElementById('editionVariantForm');if(!e||!f)return;
 f.reset();f.elements.variant_id.value='';f.elements.edition_id.value=editionId;
 document.getElementById('editionVariantFormTitle').textContent='Adicionar outra capa da mesma edição';
 document.getElementById('editionVariantEditionLabel').textContent=editionAdminSummary(e)||e.publisher||'Edição brasileira';
 f.classList.remove('hidden');
 f.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function editVariantAdmin(id){
 cancelEditionAdmin();
 const found=findVariantAdmin(id),f=document.getElementById('editionVariantForm');if(!found||!f)return;
 const {edition:e,variant:v}=found;
 f.reset();f.elements.variant_id.value=v.id;f.elements.edition_id.value=e.id;
 f.elements.variant_label.value=v.variant_label||'';
 f.elements.publication_year.value=v.publication_year||'';
 f.elements.end_year.value=v.end_year||'';
 f.elements.printing.value=v.printing||'';
 f.elements.binding.value=v.binding||'';
 f.elements.isbn.value=v.isbn||'';
 f.elements.source_label.value=v.source_label||'';
 f.elements.source_url.value=v.source_url||'';
 f.elements.notes.value=v.notes||'';
 f.elements.make_primary.checked=!!v.is_primary;
 document.getElementById('editionVariantFormTitle').textContent='Editar capa / reimpressão';
 document.getElementById('editionVariantEditionLabel').textContent=editionAdminSummary(e)||e.publisher||'Edição brasileira';
 f.classList.remove('hidden');
 f.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function cancelVariantAdmin(){document.getElementById('editionVariantForm')?.classList.add('hidden')}

async function saveVariantAdmin(ev){
 ev.preventDefault();
 const f=ev.target,fd=new FormData(f),variantId=String(fd.get('variant_id')||''),editionId=String(fd.get('edition_id')||'');
 const e=adminEditionRows.find(x=>x.id===editionId);
 if(!e){msg('Edição não encontrada para esta capa.','error');return}
 try{
   msg(variantId?'Atualizando capa…':'Salvando outra capa…');
   const file=fd.get('cover_file');
   const newCover=await uploadCover(file);
   const existing=variantId?findVariantAdmin(variantId)?.variant:null;
   const coverUrl=newCover||existing?.cover_url||'';
   if(!coverUrl)throw new Error('Selecione a imagem da capa.');
   const payload={
     edition_id:editionId,
     cover_url:coverUrl,
     variant_label:String(fd.get('variant_label')||'').trim()||null,
     publication_year:fd.get('publication_year')?Number(fd.get('publication_year')):null,
     end_year:fd.get('end_year')?Number(fd.get('end_year')):null,
     printing:String(fd.get('printing')||'').trim()||null,
     binding:String(fd.get('binding')||'').trim()||null,
     isbn:String(fd.get('isbn')||'').trim()||null,
     source_label:String(fd.get('source_label')||'').trim()||null,
     source_url:String(fd.get('source_url')||'').trim()||null,
     notes:String(fd.get('notes')||'').trim()||null,
     updated_at:new Date().toISOString()
   };
   let savedId=variantId;
   if(variantId){
     const {error}=await sbAdmin.from('edition_variants').update(payload).eq('id',variantId);
     if(error)throw error;
   }else{
     payload.is_primary=false;
     const {data,error}=await sbAdmin.from('edition_variants').insert(payload).select('id').single();
     if(error)throw error;savedId=data.id;
   }
   const shouldPrimary=fd.get('make_primary')==='on'||!(e.edition_variants||[]).length;
   if(shouldPrimary){
     const {error}=await sbAdmin.rpc('set_primary_edition_variant',{p_variant_id:savedId});
     if(error)throw error;
   }else if(existing?.is_primary&&newCover){
     const {error}=await sbAdmin.from('editions').update({cover_url:newCover}).eq('id',editionId);
     if(error)throw error;
   }
   await loadEditionAdmin(adminEditionBookId);
   syncPrimaryEditionAdmin();
   f.classList.add('hidden');
   msg(variantId?'Capa atualizada.':'Outra capa adicionada à mesma edição.','ok');
 }catch(err){console.error(err);msg('Erro ao salvar capa: '+(err.message||err),'error')}
}

async function setPrimaryVariantAdmin(id){
 try{
   const {error}=await sbAdmin.rpc('set_primary_edition_variant',{p_variant_id:id});
   if(error)throw error;
   await loadEditionAdmin(adminEditionBookId);
   syncPrimaryEditionAdmin();
   msg('Capa principal da edição alterada. ISBN e dados da edição foram preservados.','ok');
 }catch(err){console.error(err);msg('Erro ao alterar capa principal: '+(err.message||err),'error')}
}

async function deleteVariantAdmin(id){
 const found=findVariantAdmin(id);if(!found)return;
 const {variant:v}=found;
 if(v.is_primary){msg('Escolha outra capa como principal antes de excluir esta.','error');return}
 if(!confirm('Excluir somente esta variante de capa? A edição e as demais capas serão mantidas.'))return;
 const {error}=await sbAdmin.from('edition_variants').delete().eq('id',id);
 if(error){msg('Erro ao excluir capa: '+error.message,'error');return}
 await loadEditionAdmin(adminEditionBookId);msg('Variante de capa removida; a edição foi preservada.','ok');
}

async function setPrimaryEditionAdmin(id){
 try{
   const {error}=await sbAdmin.rpc('set_primary_edition',{p_edition_id:id});
   if(error)throw error;
   await loadEditionAdmin(adminEditionBookId);
   syncPrimaryEditionAdmin();
   msg('Edição principal alterada. A ficha pública continuará sendo a mesma obra.','ok');
 }catch(err){console.error(err);msg('Erro ao alterar edição principal: '+(err.message||err),'error')}
}

async function deleteEditionAdmin(id){
 const e=adminEditionRows.find(x=>x.id===id);if(!e)return;
 if(e.is_primary){msg('Escolha outra edição como principal antes de excluir esta.','error');return}
 if(!confirm('Excluir esta edição brasileira e todas as variantes de capa ligadas a ela? A obra e as demais edições serão mantidas.'))return;
 const {error}=await sbAdmin.from('editions').delete().eq('id',id);
 if(error){msg('Erro ao excluir edição: '+error.message,'error');return}
 await loadEditionAdmin(adminEditionBookId);msg('Edição removida; a ficha da obra foi preservada.','ok');
}

function syncPrimaryEditionAdmin(){
 const e=adminEditionRows.find(x=>x.is_primary),f=document.getElementById('bookForm');if(!e||!f)return;
 f.elements.publisher.value=e.publisher||'';
 f.elements.publication_year.value=e.publication_year||'';
 f.elements.isbn.value=e.isbn||'';
 f.elements.translator.value=e.translator||'';
 f.elements.pages.value=e.pages||'';
 f.elements.edition_notes.value=e.notes||'';
}

(function installEditionAdminHooks(){
 const oldEdit=window.editBook;
 if(typeof oldEdit==='function')window.editBook=async function(id){await oldEdit(id);await loadEditionAdmin(id)};
 const oldNew=window.newBook;
 if(typeof oldNew==='function')window.newBook=function(...args){const r=oldNew(...args);adminEditionBookId='';adminEditionRows=[];document.getElementById('editionManagerShell')?.classList.add('hidden');return r};
 document.addEventListener('DOMContentLoaded',ensureEditionManagerUI);
})();