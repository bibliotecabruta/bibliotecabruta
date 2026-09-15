let adminEditionBookId='';
let adminEditionRows=[];

function editionEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function ensureEditionManagerUI(){
 if(document.getElementById('editionManagerShell'))return;
 const notes=document.querySelector('#bookForm [name="edition_notes"]');
 if(!notes)return;
 const anchor=notes.closest('.field.full')||notes.parentElement;
 const shell=document.createElement('div');
 shell.id='editionManagerShell';
 shell.className='field full hidden';
 shell.innerHTML='<div class="edition-admin-box"><div class="edition-admin-head"><div><h3>Outras edições brasileiras</h3><p class="muted">Todas pertencem à mesma obra. A edição principal define a capa e os dados destacados na ficha pública.</p></div><button class="secondary" type="button" onclick="newEditionAdmin()">+ Adicionar edição</button></div><div id="editionAdminList" class="edition-admin-list"></div><form id="editionAdminForm" class="hidden edition-admin-form" onsubmit="saveEditionAdmin(event)"><input type="hidden" name="edition_id"><div class="form-grid"><div class="field full"><h4 id="editionAdminFormTitle">Nova edição brasileira</h4></div><div class="field"><label>Editora / selo</label><input name="publisher" placeholder="Ex.: Marco Polo"></div><div class="field"><label>Ano</label><input name="publication_year" type="number" min="1800" max="2100"></div><div class="field"><label>ISBN</label><input name="isbn"></div><div class="field"><label>Tradutor</label><input name="translator"></div><div class="field"><label>Páginas</label><input name="pages" type="number" min="1"></div><div class="field"><label>Acabamento</label><select name="binding"><option value="">Não informado</option><option>Brochura</option><option>Capa dura</option><option>Capa cartão</option><option>Box</option><option>Edição de bolso</option><option>E-book</option><option>Outro</option></select></div><div class="field full"><label>Identificação da edição</label><input name="edition_label" maxlength="160" placeholder="Ex.: Edição limitada e comemorativa — 25 anos"><small class="muted">Use para distinguir comemorativa, revista, ilustrada, edição de bolso etc.</small></div><div class="field full"><label>Capa desta edição</label><input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp"><small class="muted">Cada edição pode ter sua própria capa. Deixe vazio para manter a atual.</small></div><div class="field full"><label>Observações</label><textarea name="notes" maxlength="2000"></textarea></div><div class="field full"><label class="affiliate-check"><input name="make_primary" type="checkbox"> Tornar esta a edição principal do catálogo</label></div></div><div class="actions"><button class="primary" type="submit">Salvar edição</button><button class="secondary" type="button" onclick="cancelEditionAdmin()">Cancelar</button></div></form></div>';
 anchor.insertAdjacentElement('afterend',shell);
 injectEditionAdminStyle();
}

function injectEditionAdminStyle(){
 if(document.getElementById('editionAdminStyle'))return;
 const s=document.createElement('style');s.id='editionAdminStyle';
 s.textContent='.edition-admin-box{border:1px solid var(--line);border-radius:8px;background:#fffaf0;padding:14px;margin-top:4px}.edition-admin-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.edition-admin-head h3{margin:0 0 4px}.edition-admin-list{display:grid;gap:10px;margin-top:12px}.edition-admin-card{display:grid;grid-template-columns:70px 1fr auto;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:7px;padding:9px}.edition-admin-card.primary-edition{border-color:#9a2a20;box-shadow:inset 3px 0 0 #9a2a20}.edition-admin-cover{width:70px;aspect-ratio:2/3;border-radius:4px;background:#eee center/cover no-repeat}.edition-admin-card h4{margin:0 0 4px;font-size:15px}.edition-admin-card p{margin:2px 0;font-size:12px;color:var(--muted)}.edition-admin-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.edition-admin-tags span{font-size:10px;border:1px solid var(--line);border-radius:12px;padding:2px 6px;background:#fffaf0}.edition-admin-actions{display:flex;gap:5px;flex-direction:column}.edition-admin-actions button{padding:6px 8px}.edition-admin-form{margin-top:14px;border-top:1px solid var(--line);padding-top:14px}.edition-admin-form h4{margin:0}.edition-admin-empty{padding:12px;border:1px dashed var(--line);border-radius:7px;color:var(--muted)}@media(max-width:800px){.edition-admin-card{grid-template-columns:55px 1fr}.edition-admin-cover{width:55px}.edition-admin-actions{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}}';
 document.head.appendChild(s);
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
 const {data,error}=await sbAdmin.from('editions').select('*').eq('book_id',bookId).eq('country','Brasil').order('is_primary',{ascending:false}).order('publication_year',{ascending:false});
 if(error){list.innerHTML='<div class="note error">Erro ao carregar edições: '+editionEsc(error.message)+'</div>';return}
 adminEditionRows=data||[];
 renderEditionAdminList();
}

function editionAdminSummary(e){
 return [e.publisher,e.publication_year,e.binding,e.pages?e.pages+' p.':null].filter(Boolean).join(' • ');
}

function renderEditionAdminList(){
 const list=document.getElementById('editionAdminList');if(!list)return;
 if(!adminEditionRows.length){list.innerHTML='<div class="edition-admin-empty">Nenhuma edição brasileira cadastrada.</div>';return}
 list.innerHTML=adminEditionRows.map(e=>{
   const cover=e.cover_url?'background-image:url(&quot;'+editionEsc(e.cover_url)+'&quot;)':'';
   return '<article class="edition-admin-card '+(e.is_primary?'primary-edition':'')+'"><div class="edition-admin-cover" style="'+cover+'"></div><div><h4>'+editionEsc(e.edition_label||e.publisher||'Edição brasileira')+'</h4><p>'+editionEsc(editionAdminSummary(e)||'Dados editoriais não informados')+'</p>'+(e.isbn?'<p>ISBN '+editionEsc(e.isbn)+'</p>':'')+(e.translator?'<p>Tradução: '+editionEsc(e.translator)+'</p>':'')+'<div class="edition-admin-tags">'+(e.is_primary?'<span>EDIÇÃO PRINCIPAL</span>':'<span>OUTRA EDIÇÃO</span>')+(e.binding?'<span>'+editionEsc(e.binding)+'</span>':'')+'</div></div><div class="edition-admin-actions"><button class="secondary" type="button" onclick="editEditionAdmin(\''+e.id+'\')">Editar</button>'+(!e.is_primary?'<button class="secondary" type="button" onclick="setPrimaryEditionAdmin(\''+e.id+'\')">Tornar principal</button><button class="secondary" type="button" onclick="deleteEditionAdmin(\''+e.id+'\')">Excluir</button>':'')+'</div></article>';
 }).join('');
}

function newEditionAdmin(){
 const f=document.getElementById('editionAdminForm');if(!f)return;
 f.reset();f.elements.edition_id.value='';
 document.getElementById('editionAdminFormTitle').textContent='Nova edição brasileira';
 f.classList.remove('hidden');
 f.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function editEditionAdmin(id){
 const e=adminEditionRows.find(x=>x.id===id),f=document.getElementById('editionAdminForm');if(!e||!f)return;
 f.reset();
 f.elements.edition_id.value=e.id;
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
     if(duplicate)throw new Error('Já existe uma edição deste livro com esse ISBN.');
   }
   const file=fd.get('cover_file');
   const newCover=await uploadCover(file);
   const payload={
     book_id:adminEditionBookId,country:'Brasil',
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
 if(!confirm('Excluir somente esta edição brasileira? A obra e as demais edições serão mantidas.'))return;
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