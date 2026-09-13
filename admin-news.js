let newsRows=[];let newsCatalog={books:[],series:[],authors:[]};let newsCatalogLoaded=false;let newsSelected={books:new Set(),series:new Set(),authors:new Set()};const _newsHideAllViews=window.adminHideAllViews;window.adminHideAllViews=function(){if(typeof _newsHideAllViews==='function')_newsHideAllViews();document.getElementById('newsManager')?.classList.add('hidden')};function validNewsUrl(v){const value=String(v||'').trim();if(!value)return null;let u;try{u=new URL(value)}catch{throw new Error('Informe links completos começando com https://.')}if(!['http:','https:'].includes(u.protocol))throw new Error('Os links precisam usar http ou https.');return u.href}async function uploadNewsImage(file){if(!file||!file.size)return null;if(file.size>5*1024*1024)throw new Error('A imagem deve ter no máximo 5 MB.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Formato inválido. Use JPG, PNG ou WebP.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path='noticias/'+crypto.randomUUID()+'.'+ext;const {error}=await sbAdmin.storage.from('book-covers').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return sbAdmin.storage.from('book-covers').getPublicUrl(path).data.publicUrl}function localNewsDate(v){const d=v?new Date(v):new Date();const offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,16)}
function newsNorm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
function newsPublicHref(n){return n&&n.slug?'noticia.html?slug='+encodeURIComponent(n.slug):'noticia.html?id='+encodeURIComponent(n.id)}
async function ensureNewsCatalog(){if(newsCatalogLoaded)return;const res=await Promise.all([sbAdmin.from('books').select('id,title,authors(name)').order('title'),sbAdmin.from('series').select('id,name').order('name'),sbAdmin.from('authors').select('id,name').order('name')]);const be=res[0].error,se=res[1].error,ae=res[2].error;if(be||se||ae)throw be||se||ae;newsCatalog.books=(res[0].data||[]).map(x=>Object.assign({},x,{__search:newsNorm(x.title+' '+(x.authors?.name||''))}));newsCatalog.series=(res[1].data||[]).map(x=>Object.assign({},x,{__search:newsNorm(x.name)}));newsCatalog.authors=(res[2].data||[]).map(x=>Object.assign({},x,{__search:newsNorm(x.name)}));newsCatalogLoaded=true}
function newsTypeConfig(type){if(type==='books')return{input:'newsBookSearch',results:'newsBookResults',selected:'newsBookSelected',label:x=>x.title,meta:x=>x.authors?.name||''};if(type==='series')return{input:'newsSeriesSearch',results:'newsSeriesResults',selected:'newsSeriesSelected',label:x=>x.name,meta:()=>''};return{input:'newsAuthorSearch',results:'newsAuthorResults',selected:'newsAuthorSelected',label:x=>x.name,meta:()=>''}}
function renderNewsEntitySearch(type){const cfg=newsTypeConfig(type),input=document.getElementById(cfg.input),root=document.getElementById(cfg.results);if(!input||!root)return;const q=newsNorm(input.value).trim();if(q.length<2){root.innerHTML='';return}const rows=(newsCatalog[type]||[]).filter(x=>!newsSelected[type].has(x.id)&&x.__search.includes(q)).slice(0,8);root.innerHTML=rows.length?rows.map(x=>'<button type="button" onclick="addNewsEntity(\''+type+'\',\''+x.id+'\')"><strong>'+esc(cfg.label(x))+'</strong>'+(cfg.meta(x)?'<span>'+esc(cfg.meta(x))+'</span>':'')+'</button>').join(''):'<div class="muted">Nenhum resultado.</div>'}
function renderNewsSelected(type){const cfg=newsTypeConfig(type),root=document.getElementById(cfg.selected);if(!root)return;const byId=new Map((newsCatalog[type]||[]).map(x=>[x.id,x])),ids=[...newsSelected[type]];root.innerHTML=ids.length?ids.map(id=>{const x=byId.get(id);if(!x)return'';return '<span class="news-selected-chip"><span><strong>'+esc(cfg.label(x))+'</strong>'+(cfg.meta(x)?'<small>'+esc(cfg.meta(x))+'</small>':'')+'</span><button type="button" aria-label="Remover" onclick="removeNewsEntity(\''+type+'\',\''+id+'\')">×</button></span>'}).join(''):'<span class="muted">Nenhum vínculo selecionado.</span>'}
function renderAllNewsSelected(){['books','series','authors'].forEach(renderNewsSelected)}
function addNewsEntity(type,id){newsSelected[type].add(id);renderNewsSelected(type);const cfg=newsTypeConfig(type),input=document.getElementById(cfg.input),results=document.getElementById(cfg.results);if(input)input.value='';if(results)results.innerHTML=''}
function removeNewsEntity(type,id){newsSelected[type].delete(id);renderNewsSelected(type)}
function resetNewsSelected(){newsSelected={books:new Set(),series:new Set(),authors:new Set()};renderAllNewsSelected()}
function previewNewsDraft(){const f=document.getElementById('newsForm'),root=document.getElementById('newsDraftPreview');if(!f||!root)return;const title=f.elements.title.value.trim(),summary=f.elements.summary.value.trim(),body=f.elements.body.value;root.innerHTML=(title?'<h2>'+esc(title)+'</h2>':'')+(summary?'<p class="news-preview-summary">'+esc(summary)+'</p>':'')+(body?'<div class="news-preview-body">'+BB_NEWS.renderBody(body)+'</div>':'<p class="muted">A prévia aparecerá enquanto você escreve.</p>')}
function insertNewsFormat(kind){const ta=document.querySelector('#newsForm textarea[name="body"]');if(!ta)return;const start=ta.selectionStart,end=ta.selectionEnd,sel=ta.value.slice(start,end);let insert='',a=start,b=start;if(kind==='h2'){insert='\n## '+(sel||'Subtítulo')+'\n';a=start+4;b=a+(sel||'Subtítulo').length}else if(kind==='bold'){insert='**'+(sel||'texto em negrito')+'**';a=start+2;b=a+(sel||'texto em negrito').length}else if(kind==='italic'){insert='*'+(sel||'texto em itálico')+'*';a=start+1;b=a+(sel||'texto em itálico').length}else if(kind==='list'){insert=(sel||'item da lista').split('\n').map(x=>'- '+x).join('\n');a=start+2;b=start+insert.length}else if(kind==='link'){insert='['+(sel||'texto do link')+'](https://)';a=start+insert.lastIndexOf('https://');b=a+8}ta.setRangeText(insert,start,end,'end');ta.focus();ta.setSelectionRange(a,b);previewNewsDraft()}
async function uniqueNewsSlug(title,typed,id){const base=BB_NEWS.slugify(typed||title)||'noticia';const q=await sbAdmin.from('news').select('id,slug').like('slug',base+'%');if(q.error)throw q.error;const used=new Set((q.data||[]).filter(x=>x.id!==id).map(x=>x.slug).filter(Boolean));if(!used.has(base))return base;let n=2;while(used.has(base+'-'+n))n++;return base+'-'+n}
async function loadNewsRelations(id){const res=await Promise.all([sbAdmin.from('news_books').select('book_id').eq('news_id',id),sbAdmin.from('news_series').select('series_id').eq('news_id',id),sbAdmin.from('news_authors').select('author_id').eq('news_id',id)]);if(res.some(x=>x.error))throw (res.find(x=>x.error).error);newsSelected={books:new Set((res[0].data||[]).map(x=>x.book_id)),series:new Set((res[1].data||[]).map(x=>x.series_id)),authors:new Set((res[2].data||[]).map(x=>x.author_id))};renderAllNewsSelected()}
async function syncNewsRelations(id){const defs=[['news_books','book_id','books'],['news_series','series_id','series'],['news_authors','author_id','authors']];for(const def of defs){const del=await sbAdmin.from(def[0]).delete().eq('news_id',id);if(del.error)throw del.error;const rows=[...newsSelected[def[2]]].map(x=>{const row={news_id:id};row[def[1]]=x;return row});if(rows.length){const ins=await sbAdmin.from(def[0]).insert(rows);if(ins.error)throw ins.error}}}
function showNewsView(){adminHideAllViews();const box=document.getElementById('newsManager');box?.classList.remove('hidden');cancelNewsEdit();renderNewsAdmin();box?.scrollIntoView({behavior:'smooth',block:'start'})}
async function newNews(){
  await ensureNewsCatalog();
  const f=document.getElementById('newsForm');f.reset();f.elements.news_id.value='';f.elements.published_at.value=localNewsDate();f.elements.is_published.checked=true;f.elements.is_featured.checked=false;resetNewsSelected();previewNewsDraft();f.classList.remove('hidden');document.getElementById('newsSaveButton').textContent='Publicar notícia';f.elements.title.focus();
}
function cancelNewsEdit(){
  const f=document.getElementById('newsForm');f?.classList.add('hidden');f?.reset();
  ['newsBookResults','newsSeriesResults','newsAuthorResults'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=''});
}
async function renderNewsAdmin(){
  const box=document.getElementById('newsList');if(!box)return;box.innerHTML='<div class="muted">Carregando notícias…</div>';
  const q=await sbAdmin.from('news').select('*').order('published_at',{ascending:false});
  if(q.error){box.innerHTML='<div class="note error">Não foi possível carregar as notícias.</div>';return}
  newsRows=q.data||[];
  box.innerHTML=newsRows.length?newsRows.map(n=>{
    const image=n.image_url?'<img class="news-admin-thumb" src="'+esc(n.image_url)+'" alt="">':'<div class="news-admin-thumb"></div>';
    const future=n.is_published&&new Date(n.published_at)>new Date(),state=(!n.is_published?'Rascunho':future?'Agendada':'Publicada')+(n.is_featured?' • ⭐ Destaque':'')+' • '+new Date(n.published_at).toLocaleString('pt-BR');
    const slug=n.slug?'<small class="muted">'+esc(n.slug)+'</small>':'';
    const open=n.is_published&&!future?'<a class="secondary" href="'+newsPublicHref(n)+'" target="_blank" rel="noopener">Abrir</a>':'';
    return '<article class="news-admin-row">'+image+'<div><h3>'+esc(n.title)+'</h3><p>'+state+'</p>'+slug+'</div><div class="news-admin-actions">'+open+'<button class="secondary" type="button" onclick="editNews(\''+n.id+'\')">Editar</button><button class="secondary" type="button" onclick="deleteNews(\''+n.id+'\')">Excluir</button></div></article>';
  }).join(''):'<div class="note">Nenhuma notícia cadastrada. Clique em “Nova notícia” para começar.</div>';
}
async function editNews(id){
  const n=newsRows.find(x=>x.id===id);if(!n)return;await ensureNewsCatalog();
  const f=document.getElementById('newsForm');f.reset();f.elements.news_id.value=n.id;
  ['title','slug','summary','body','image_alt','source_label','source_url','purchase_label','purchase_url'].forEach(name=>{if(f.elements[name])f.elements[name].value=n[name]||''});
  f.elements.published_at.value=localNewsDate(n.published_at);f.elements.is_published.checked=!!n.is_published;f.elements.is_featured.checked=!!n.is_featured;
  await loadNewsRelations(id);previewNewsDraft();f.classList.remove('hidden');document.getElementById('newsSaveButton').textContent='Salvar alterações';f.scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveNews(e){
  e.preventDefault();const f=e.target,fd=new FormData(f),id=String(fd.get('news_id')||''),btn=document.getElementById('newsSaveButton');btn.disabled=true;
  try{
    msg(id?'Atualizando notícia…':'Salvando notícia…');
    const uploaded=await uploadNewsImage(fd.get('image_file')),typedImage=validNewsUrl(fd.get('image_url')),title=String(fd.get('title')||'').trim(),body=String(fd.get('body')||'').trim();
    if(!title||!body)throw new Error('Informe título e texto completo.');
    const slug=await uniqueNewsSlug(title,String(fd.get('slug')||'').trim(),id||null);
    const payload={title,slug,summary:String(fd.get('summary')||'').trim()||null,body,image_alt:String(fd.get('image_alt')||'').trim()||null,source_label:String(fd.get('source_label')||'').trim()||null,source_url:validNewsUrl(fd.get('source_url')),purchase_label:String(fd.get('purchase_label')||'').trim()||null,purchase_url:validNewsUrl(fd.get('purchase_url')),published_at:fd.get('published_at')?new Date(fd.get('published_at')).toISOString():new Date().toISOString(),is_published:fd.get('is_published')==='on',is_featured:fd.get('is_featured')==='on'};
    if(uploaded||typedImage)payload.image_url=uploaded||typedImage;
    let savedId=id;
    if(id){const q=await sbAdmin.from('news').update(payload).eq('id',id).select('id').single();if(q.error)throw q.error;savedId=q.data.id}
    else{payload.image_url=payload.image_url||null;const q=await sbAdmin.from('news').insert(payload).select('id').single();if(q.error)throw q.error;savedId=q.data.id}
    await syncNewsRelations(savedId);
    msg(payload.is_published?'Notícia publicada com sucesso.':'Notícia salva como rascunho.','ok');cancelNewsEdit();await renderNewsAdmin();
  }catch(err){console.error(err);msg('Erro ao salvar notícia: '+(err.message||err),'error')}
  finally{btn.disabled=false}
}
async function deleteNews(id){
  const n=newsRows.find(x=>x.id===id);if(!confirm('Excluir a notícia “'+(n?.title||'selecionada')+'”? Esta ação não pode ser desfeita.'))return;
  const q=await sbAdmin.from('news').delete().eq('id',id);
  if(q.error){msg('Erro ao excluir notícia: '+q.error.message,'error');return}
  msg('Notícia excluída.','ok');await renderNewsAdmin();
}
