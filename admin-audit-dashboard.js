const auditDashState={books:[],series:[],authors:[],integrity:[],similar:[],links:[],covers:[],tab:'livros',query:'',filter:'__pending__',loading:false,coverScanning:false};
const SERIES_AUDIT_LABELS={serie_sem_livros:'Série sem livros',livro_sem_numero:'Livro sem número',volume_duplicado:'Volume duplicado',lacuna_numeracao:'Lacuna na numeração',completa_mas_faltam_volumes:'Completa, mas faltam volumes',cadastrados_maior_que_publicados_br:'Mais cadastrados que publicados BR',volume_acima_total_original:'Volume acima do total original',volume_unico_com_multiplos_livros:'Volume único com vários livros',status_nao_informado:'Status não informado'};
const AUTHOR_AUDIT_LABELS={sem_nacionalidade:'Sem nacionalidade',sem_bio:'Sem biografia',sem_foto:'Sem foto',sem_livros:'Sem livros'};
const INTEGRITY_AUDIT_LABELS={isbn_duplicado:'ISBN repetido',multiplas_edicoes_principais:'Múltiplas edições principais',livro_duplicado:'Livro possivelmente duplicado',capa_repetida:'Mesma capa em livros diferentes'};
const LINK_AUDIT_LABELS={url_compra_invalida:'URL de compra inválida',url_video_invalida:'URL de vídeo inválida'};

function showAuditDashboard(){
  adminHideAllViews();
  const section=document.getElementById('auditDashboard');
  if(!section)return;
  section.classList.remove('hidden');
  section.scrollIntoView({behavior:'smooth',block:'start'});
  loadAuditDashboard();
}

async function loadAuditDashboard(){
  const root=document.getElementById('auditDashboardBody');if(!root||auditDashState.loading)return;
  auditDashState.loading=true;
  root.innerHTML='<div class="audit-empty">Carregando auditoria do catálogo…</div>';
  const [books,series,authors,integrity,similar,links,covers]=await Promise.all([
    sbAdmin.from('admin_book_audit').select('*').order('title'),
    sbAdmin.from('admin_series_audit').select('*').order('name'),
    sbAdmin.from('admin_author_audit').select('*').order('name'),
    sbAdmin.from('admin_integrity_audit').select('*'),
    sbAdmin.from('admin_series_similarity_audit').select('*').order('similarity',{ascending:false}),
    sbAdmin.from('admin_link_audit').select('*').order('title'),
    sbAdmin.from('admin_cover_audit_cache').select('*')
  ]);
  const error=[books,series,authors,integrity,similar,links,covers].find(x=>x.error)?.error;
  if(error){root.innerHTML='<div class="note error">Não foi possível carregar a auditoria: '+esc(error.message)+'</div>';auditDashState.loading=false;return}
  auditDashState.books=books.data||[];
  auditDashState.series=series.data||[];
  auditDashState.authors=authors.data||[];
  auditDashState.integrity=integrity.data||[];
  auditDashState.similar=similar.data||[];
  auditDashState.links=links.data||[];
  auditDashState.covers=covers.data||[];
  auditDashState.loading=false;
  renderAuditDashboard();
  setTimeout(()=>scanAuditCovers(false,20,true),450);
}

function auditBookPendingCount(){return auditDashState.books.filter(x=>(x.issues||[]).length).length}
function auditSeriesIssueCount(){return auditDashState.series.filter(x=>(x.issues||[]).length).length}
function auditSeriesIncompleteCount(){return auditDashState.series.filter(x=>['Interrompida','Em andamento'].includes(x.brazil_status)).length}
function auditAuthorPendingCount(){return auditDashState.authors.filter(x=>(x.issues||[]).length).length}
function auditCoverProblemCount(){const current=new Map(auditDashState.books.map(b=>[b.id,b.cover_url]));return auditDashState.covers.filter(x=>current.get(x.book_id)===x.cover_url&&x.status!=='ok').length}
function auditIntegrityCount(){return auditDashState.integrity.length+auditDashState.similar.length}

function renderAuditDashboard(){
  const root=document.getElementById('auditDashboardBody');if(!root)return;
  const bp=auditBookPendingCount(),sp=auditSeriesIssueCount(),si=auditSeriesIncompleteCount(),ap=auditAuthorPendingCount(),cp=auditCoverProblemCount(),ip=auditIntegrityCount(),lp=auditDashState.links.length;
  root.innerHTML=`
    <div class="audit-dash-head">
      <div><h2>Auditoria automática</h2><p class="muted">Pendências de metadados, estrutura, capas e links em um único lugar.</p></div>
      <div class="audit-dash-actions"><button class="secondary" type="button" onclick="loadAuditDashboard()">↻ Atualizar dados</button><button class="primary" type="button" onclick="scanAuditCovers(true,null,false)">Verificar todas as capas</button></div>
    </div>
    <div class="audit-kpis">
      <button class="audit-kpi warn" onclick="setAuditTab('livros','__pending__')"><strong>${bp}</strong><span>Livros com pendências</span></button>
      <button class="audit-kpi ${sp?'warn':'ok'}" onclick="setAuditTab('series','__issues__')"><strong>${sp}</strong><span>Séries inconsistentes</span></button>
      <button class="audit-kpi" onclick="setAuditTab('series','__incomplete__')"><strong>${si}</strong><span>Séries incompletas</span></button>
      <button class="audit-kpi ${ap?'warn':'ok'}" onclick="setAuditTab('autores','__pending__')"><strong>${ap}</strong><span>Autores pendentes</span></button>
      <button class="audit-kpi ${cp?'warn':'ok'}" onclick="setAuditTab('capas','__problems__')"><strong>${cp}</strong><span>Capas problemáticas</span></button>
      <button class="audit-kpi ${ip?'warn':'ok'}" onclick="setAuditTab('integridade','')"><strong>${ip}</strong><span>Integridade / similares</span></button>
      <button class="audit-kpi ${lp?'warn':'ok'}" onclick="setAuditTab('links','')"><strong>${lp}</strong><span>Links inválidos</span></button>
    </div>
    <div class="audit-tabs">
      ${auditTabButton('livros','Livros',bp)}
      ${auditTabButton('series','Séries',sp)}
      ${auditTabButton('autores','Autores',ap)}
      ${auditTabButton('integridade','Integridade',ip)}
      ${auditTabButton('capas','Capas',cp)}
      ${auditTabButton('links','Links',lp)}
    </div>
    <div id="auditAuthorEditor"></div>
    <div id="auditCoverProgress"></div>
    <div id="auditDashTab"></div>`;
  renderAuditDashTab();
}

function auditTabButton(id,label,count){return `<button class="audit-tab ${auditDashState.tab===id?'active':''}" onclick="setAuditTab('${id}')">${esc(label)}${count?` · ${count}`:''}</button>`}
function setAuditTab(tab,filter){auditDashState.tab=tab;auditDashState.query='';auditDashState.filter=filter!==undefined?filter:(tab==='livros'?'__pending__':tab==='series'?'__issues__':tab==='autores'?'__pending__':tab==='capas'?'__problems__':'');renderAuditDashboard()}
function setAuditFilter(v){auditDashState.filter=v;renderAuditDashTab()}
function setAuditQuery(v){auditDashState.query=(v||'').trim().toLocaleLowerCase('pt-BR');renderAuditDashTab()}
function auditTextMatch(...vals){if(!auditDashState.query)return true;const q=auditDashState.query;return vals.some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q))}

function renderAuditDashTab(){
 const box=document.getElementById('auditDashTab');if(!box)return;
 if(auditDashState.tab==='livros')return renderAuditBooks(box);
 if(auditDashState.tab==='series')return renderAuditSeries(box);
 if(auditDashState.tab==='autores')return renderAuditAuthors(box);
 if(auditDashState.tab==='integridade')return renderAuditIntegrity(box);
 if(auditDashState.tab==='capas')return renderAuditCovers(box);
 if(auditDashState.tab==='links')return renderAuditLinks(box);
}

function renderAuditBooks(box){
 const issueCounts={};auditDashState.books.forEach(b=>(b.issues||[]).forEach(i=>issueCounts[i]=(issueCounts[i]||0)+1));
 let rows=auditDashState.books.filter(b=>auditTextMatch(b.title,b.original_title,b.author,b.series,b.isbn,b.publisher));
 if(auditDashState.filter==='__pending__')rows=rows.filter(b=>(b.issues||[]).length);
 else if(auditDashState.filter==='__ok__')rows=rows.filter(b=>!(b.issues||[]).length);
 else if(auditDashState.filter)rows=rows.filter(b=>(b.issues||[]).includes(auditDashState.filter));
 box.innerHTML=`<div class="audit-toolbar"><input type="search" placeholder="Título, autor, série, ISBN ou editora…" oninput="setAuditQuery(this.value)"><select onchange="setAuditFilter(this.value)"><option value="__pending__" ${auditDashState.filter==='__pending__'?'selected':''}>Com pendências</option><option value="__ok__" ${auditDashState.filter==='__ok__'?'selected':''}>Sem pendências</option><option value="" ${auditDashState.filter===''?'selected':''}>Todos os livros</option>${Object.entries(ADMIN_ISSUE_LABELS).filter(([k])=>issueCounts[k]).map(([k,l])=>`<option value="${esc(k)}" ${auditDashState.filter===k?'selected':''}>${esc(l)} · ${issueCounts[k]}</option>`).join('')}</select><span class="muted">${rows.length} resultado${rows.length===1?'':'s'}</span></div><p class="audit-section-note">Prioridade editorial: capa → páginas → anos BR/original → editora → sinopse → série → título original → ISBN. Tradutor não entra como pendência obrigatória.</p><div class="audit-list">${rows.length?rows.map(bookAuditRow).join(''):'<div class="audit-empty">Nenhum livro neste filtro.</div>'}</div>`;
}
function bookAuditRow(b){const tags=(b.issues||[]).map(i=>`<span class="audit-tag">${esc(ADMIN_ISSUE_LABELS[i]||i)}</span>`).join('');return `<div class="audit-row"><div class="audit-row-main"><strong>${esc(b.title)}</strong><small>${esc(b.author||'Autor não informado')}${b.original_title?' · '+esc(b.original_title):''}</small><div class="audit-tags">${tags||'<span class="audit-tag ok">Sem pendências</span>'}</div></div><div class="audit-row-meta">${esc(b.area||'—')}<br>${esc([b.publisher,b.brazil_year,b.isbn].filter(Boolean).join(' · ')||'Edição principal incompleta')}</div><div class="audit-row-actions"><button class="secondary" type="button" onclick="editBook('${b.id}')">Editar livro</button><a class="secondary" href="livro.html?id=${encodeURIComponent(b.id)}" target="_blank" rel="noopener">Ver ficha</a></div></div>`}

function renderAuditSeries(box){
 let rows=auditDashState.series.filter(s=>auditTextMatch(s.name,s.original_name,s.brazil_status));
 if(auditDashState.filter==='__issues__')rows=rows.filter(s=>(s.issues||[]).length);
 else if(auditDashState.filter==='__incomplete__')rows=rows.filter(s=>['Interrompida','Em andamento'].includes(s.brazil_status));
 else if(auditDashState.filter==='__complete__')rows=rows.filter(s=>['Completa','Volume único'].includes(s.brazil_status));
 box.innerHTML=`<div class="audit-toolbar"><input type="search" placeholder="Pesquisar série…" oninput="setAuditQuery(this.value)"><select onchange="setAuditFilter(this.value)"><option value="__issues__" ${auditDashState.filter==='__issues__'?'selected':''}>Com inconsistências</option><option value="__incomplete__" ${auditDashState.filter==='__incomplete__'?'selected':''}>Interrompidas / em andamento</option><option value="__complete__" ${auditDashState.filter==='__complete__'?'selected':''}>Completas / volume único</option><option value="" ${auditDashState.filter===''?'selected':''}>Todas</option></select><span class="muted">${rows.length} resultado${rows.length===1?'':'s'}</span></div><p class="audit-section-note">“Incompleta” aqui é estado editorial no Brasil, não necessariamente um erro. Inconsistências são numeração, volume duplicado, status conflitante ou série vazia.</p><div class="audit-list">${rows.length?rows.map(seriesAuditRow).join(''):'<div class="audit-empty">Nenhuma série neste filtro.</div>'}</div>`;
}
function seriesAuditRow(s){const issues=(s.issues||[]).map(i=>`<span class="audit-tag">${esc(SERIES_AUDIT_LABELS[i]||i)}</span>`).join('');return `<div class="audit-row"><div class="audit-row-main"><strong>${esc(s.name)}</strong><small>${esc(s.original_name||'Nome original não informado')} · ${s.book_count||0} livro(s)</small><div class="audit-tags">${issues||'<span class="audit-tag ok">Estrutura coerente</span>'}</div></div><div class="audit-row-meta">${esc(s.brazil_status||'Status não informado')}<br>Volumes cadastrados: ${esc((s.registered_volumes||[]).join(', ')||'—')}</div><div class="audit-row-actions"><button class="secondary" type="button" onclick='openAuditSeries(${JSON.stringify(s.name)})'>Revisar série</button><a class="secondary" href="serie.html?id=${encodeURIComponent(s.id)}" target="_blank" rel="noopener">Ver página</a></div></div>`}
function openAuditSeries(name){showSeriesManager();setTimeout(()=>{const q=document.getElementById('adminSeriesSearch');if(q){q.value=name;typeof renderAdminSeries==='function'&&renderAdminSeries();q.scrollIntoView({behavior:'smooth',block:'center'})}},120)}

function renderAuditAuthors(box){
 let rows=auditDashState.authors.filter(a=>auditTextMatch(a.name,a.nationality));
 if(auditDashState.filter==='__pending__')rows=rows.filter(a=>(a.issues||[]).length);
 else if(auditDashState.filter==='__ok__')rows=rows.filter(a=>!(a.issues||[]).length);
 box.innerHTML=`<div class="audit-toolbar"><input type="search" placeholder="Pesquisar autor ou nacionalidade…" oninput="setAuditQuery(this.value)"><select onchange="setAuditFilter(this.value)"><option value="__pending__" ${auditDashState.filter==='__pending__'?'selected':''}>Com pendências</option><option value="__ok__" ${auditDashState.filter==='__ok__'?'selected':''}>Sem pendências</option><option value="" ${auditDashState.filter===''?'selected':''}>Todos</option></select><span class="muted">${rows.length} resultado${rows.length===1?'':'s'}</span></div><div class="audit-list">${rows.length?rows.map(authorAuditRow).join(''):'<div class="audit-empty">Nenhum autor neste filtro.</div>'}</div>`;
}
function authorAuditRow(a){const issues=(a.issues||[]).map(i=>`<span class="audit-tag">${esc(AUTHOR_AUDIT_LABELS[i]||i)}</span>`).join('');return `<div class="audit-row"><div class="audit-row-main"><strong>${esc(a.name)}</strong><small>${esc(a.nationality||'Nacionalidade não informada')} · ${a.book_count||0} livro(s)</small><div class="audit-tags">${issues||'<span class="audit-tag ok">Completo</span>'}</div></div><div class="audit-row-meta">${a.bio?esc(a.bio.slice(0,110))+(a.bio.length>110?'…':''):'Sem biografia'}</div><div class="audit-row-actions"><button class="secondary" type="button" onclick="editAuditAuthor('${a.id}')">Editar autor</button><a class="secondary" href="autor.html?id=${encodeURIComponent(a.id)}" target="_blank" rel="noopener">Ver página</a></div></div>`}
function editAuditAuthor(id){const a=auditDashState.authors.find(x=>x.id===id),box=document.getElementById('auditAuthorEditor');if(!a||!box)return;box.innerHTML=`<form class="audit-author-editor" onsubmit="saveAuditAuthor(event,'${a.id}')"><h3>Editar autor — ${esc(a.name)}</h3><div class="form-grid"><div class="field"><label>Nacionalidade</label><input name="nationality" value="${esc(a.nationality||'')}"></div><div class="field"><label>URL da foto</label><input name="photo_url" value="${esc(a.photo_url||'')}"></div><div class="field full"><label>Crédito da foto</label><input name="photo_credit" value="${esc(a.photo_credit||'')}"></div><div class="field full"><label>Biografia</label><textarea name="bio">${esc(a.bio||'')}</textarea></div></div><div class="actions"><button class="primary" type="submit">Salvar autor</button><button class="secondary" type="button" onclick="document.getElementById('auditAuthorEditor').innerHTML=''">Cancelar</button></div></form>`;box.scrollIntoView({behavior:'smooth',block:'center'})}
async function saveAuditAuthor(e,id){e.preventDefault();const fd=new FormData(e.target);const payload={nationality:String(fd.get('nationality')||'').trim()||null,photo_url:String(fd.get('photo_url')||'').trim()||null,photo_credit:String(fd.get('photo_credit')||'').trim()||null,bio:String(fd.get('bio')||'').trim()||null};const {error}=await sbAdmin.from('authors').update(payload).eq('id',id);if(error){msg('Erro ao salvar autor: '+error.message,'error');return}msg('Autor atualizado.','ok');document.getElementById('auditAuthorEditor').innerHTML='';await loadAuditDashboard()}

function renderAuditIntegrity(box){
 const hard=auditDashState.integrity,sim=auditDashState.similar;
 box.innerHTML=`<p class="audit-section-note">Problemas objetivos vêm primeiro. Nomes de séries semelhantes são apenas candidatos a revisão e não devem ser mesclados sem confirmação editorial.</p><div class="audit-subhead"><h3>Problemas objetivos</h3><span class="muted">${hard.length}</span></div><div class="audit-list">${hard.length?hard.map(r=>`<div class="audit-row"><div class="audit-row-main"><strong>${esc(INTEGRITY_AUDIT_LABELS[r.issue_type]||r.issue_type)}</strong><small>${esc((r.titles||[]).join(' × '))}</small></div><div class="audit-row-meta">${r.occurrences||0} ocorrência(s)</div><div class="audit-row-actions">${r.book_ids?.[0]?`<button class="secondary" onclick="editBook('${r.book_ids[0]}')">Abrir livro</button>`:''}</div></div>`).join(''):'<div class="audit-empty">Nenhum problema estrutural objetivo.</div>'}</div><div class="audit-subhead"><h3>Séries com nomes semelhantes</h3><span class="muted">${sim.length}</span></div><div class="audit-list">${sim.length?sim.map(r=>`<div class="audit-row"><div class="audit-row-main"><strong>${esc(r.series_a)} ↔ ${esc(r.series_b)}</strong><small>Semelhança ${Math.round(Number(r.similarity||0)*100)}% · ${r.series_a_books} + ${r.series_b_books} livros</small></div><div class="audit-row-meta">Revisão manual</div><div class="audit-row-actions"><button class="secondary" onclick='openAuditSeries(${JSON.stringify(r.series_a)})'>Revisar</button></div></div>`).join(''):'<div class="audit-empty">Nenhum par de séries semelhante acima do limite.</div>'}</div>`;
}

function currentCoverCacheMap(){return new Map(auditDashState.covers.map(x=>[x.book_id,x]))}
function isCoverCacheCurrent(book,cache){if(!cache||cache.cover_url!==book.cover_url)return false;const age=Date.now()-new Date(cache.checked_at).getTime();return age<30*24*60*60*1000}
function renderAuditCovers(box){
 const cache=currentCoverCacheMap();
 let rows=auditDashState.books.filter(b=>b.cover_url).map(b=>({book:b,cache:cache.get(b.id)})).filter(x=>auditTextMatch(x.book.title,x.book.author,x.book.cover_url));
 if(auditDashState.filter==='__problems__')rows=rows.filter(x=>x.cache&&x.cache.cover_url===x.book.cover_url&&x.cache.status!=='ok');
 else if(auditDashState.filter==='__unknown__')rows=rows.filter(x=>!isCoverCacheCurrent(x.book,x.cache));
 else if(auditDashState.filter==='quebrada')rows=rows.filter(x=>x.cache?.cover_url===x.book.cover_url&&x.cache.status==='quebrada');
 else if(auditDashState.filter==='baixa_resolucao')rows=rows.filter(x=>x.cache?.cover_url===x.book.cover_url&&x.cache.status==='baixa_resolucao');
 const valid=auditDashState.covers.filter(x=>auditDashState.books.some(b=>b.id===x.book_id&&b.cover_url===x.cover_url)),ok=valid.filter(x=>x.status==='ok').length,low=valid.filter(x=>x.status==='baixa_resolucao').length,broken=valid.filter(x=>x.status==='quebrada').length,unknown=auditDashState.books.filter(b=>b.cover_url&&!isCoverCacheCurrent(b,cache.get(b.id))).length;
 box.innerHTML=`<div class="audit-cover-stats"><span class="audit-tag ok">OK · ${ok}</span><span class="audit-tag">Baixa resolução · ${low}</span><span class="audit-tag">Quebradas · ${broken}</span><span class="audit-tag neutral">Não verificadas / antigas · ${unknown}</span></div><div class="audit-toolbar"><input type="search" placeholder="Pesquisar título ou autor…" oninput="setAuditQuery(this.value)"><select onchange="setAuditFilter(this.value)"><option value="__problems__" ${auditDashState.filter==='__problems__'?'selected':''}>Problemáticas</option><option value="__unknown__" ${auditDashState.filter==='__unknown__'?'selected':''}>Não verificadas / antigas</option><option value="baixa_resolucao" ${auditDashState.filter==='baixa_resolucao'?'selected':''}>Baixa resolução</option><option value="quebrada" ${auditDashState.filter==='quebrada'?'selected':''}>Quebradas</option><option value="" ${auditDashState.filter===''?'selected':''}>Todas com capa</option></select><button class="secondary" onclick="scanAuditCovers(false,50,false)">Verificar próximas 50</button></div><p class="audit-section-note">A auditoria carrega a imagem real. Consideramos baixa resolução quando a capa tem menos de 600 px de largura ou 900 px de altura. Resultados ficam em cache por 30 dias e são invalidados se a URL mudar.</p><div class="audit-list">${rows.length?rows.map(coverAuditRow).join(''):'<div class="audit-empty">Nenhuma capa neste filtro.</div>'}</div>`;
}
function coverAuditRow(x){const b=x.book,c=x.cache,current=c&&c.cover_url===b.cover_url;let label='<span class="audit-tag neutral">Não verificada</span>',meta='';if(current){if(c.status==='ok')label='<span class="audit-tag ok">OK</span>';if(c.status==='baixa_resolucao')label='<span class="audit-tag">Baixa resolução</span>';if(c.status==='quebrada')label='<span class="audit-tag">Quebrada</span>';meta=c.width&&c.height?`${c.width}×${c.height}px`:''}return `<div class="audit-row"><div class="audit-row-main"><strong><img class="audit-cover-thumb" src="${esc(b.cover_url)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">${esc(b.title)}</strong><small>${esc(b.author||'—')}</small><div class="audit-tags">${label}</div></div><div class="audit-row-meta">${esc(meta||b.cover_url)}</div><div class="audit-row-actions"><button class="secondary" onclick="scanSingleAuditCover('${b.id}')">Verificar</button><button class="secondary" onclick="editBook('${b.id}')">Editar livro</button></div></div>`}

async function inspectAuditCover(book){
 return new Promise(resolve=>{
  let done=false;const img=new Image();const finish=(status,w=null,h=null)=>{if(done)return;done=true;clearTimeout(timer);resolve({book_id:book.id,cover_url:book.cover_url,width:w,height:h,status,checked_at:new Date().toISOString()})};
  const timer=setTimeout(()=>finish('quebrada'),12000);
  img.onload=()=>{const w=img.naturalWidth||0,h=img.naturalHeight||0;finish((w<600||h<900)?'baixa_resolucao':'ok',w,h)};
  img.onerror=()=>finish('quebrada');
  try{img.src=new URL(book.cover_url,location.href).href}catch{finish('quebrada')}
 });
}
async function scanSingleAuditCover(id){const b=auditDashState.books.find(x=>x.id===id);if(!b?.cover_url)return;const rec=await inspectAuditCover(b);const {error}=await sbAdmin.from('admin_cover_audit_cache').upsert(rec);if(error){msg('Erro ao registrar auditoria da capa: '+error.message,'error');return}auditDashState.covers=auditDashState.covers.filter(x=>x.book_id!==id);auditDashState.covers.push(rec);renderAuditDashboard()}
async function scanAuditCovers(all=false,limit=null,silent=false){
 if(auditDashState.coverScanning)return;
 const cache=currentCoverCacheMap();
 let queue=auditDashState.books.filter(b=>b.cover_url&&(all||!isCoverCacheCurrent(b,cache.get(b.id))));
 if(limit)queue=queue.slice(0,limit);
 if(!queue.length){if(!silent)msg('Não há capas pendentes para verificar.','ok');return}
 auditDashState.coverScanning=true;
 const progress=document.getElementById('auditCoverProgress');let done=0;
 const paint=()=>{if(progress&&!silent)progress.innerHTML=`<div class="note">Verificando capas: ${done} de ${queue.length}</div><div class="audit-progress"><span style="width:${Math.round(done/queue.length*100)}%"></span></div>`};
 paint();
 let cursor=0;
 async function worker(){while(cursor<queue.length){const book=queue[cursor++];const rec=await inspectAuditCover(book);const {error}=await sbAdmin.from('admin_cover_audit_cache').upsert(rec);if(!error){auditDashState.covers=auditDashState.covers.filter(x=>x.book_id!==book.id);auditDashState.covers.push(rec)}done++;paint()}}
 await Promise.all(Array.from({length:Math.min(5,queue.length)},()=>worker()));
 auditDashState.coverScanning=false;
 if(progress)progress.innerHTML='';
 if(!silent)msg(`Auditoria de capas concluída: ${done} verificadas.`,'ok');
 renderAuditDashboard();
}

function renderAuditLinks(box){
 let rows=auditDashState.links.filter(r=>auditTextMatch(r.title,r.label,r.url,r.link_type));
 box.innerHTML=`<div class="audit-toolbar"><input type="search" placeholder="Pesquisar livro, loja ou URL…" oninput="setAuditQuery(this.value)"><select disabled><option>URLs sintaticamente inválidas</option></select><span class="muted">${rows.length} problema${rows.length===1?'':'s'}</span></div><p class="audit-section-note">Este bloco detecta URLs vazias ou malformadas. Respostas 403/404 de lojas não são classificadas automaticamente para evitar falsos positivos causados por bloqueio de robôs.</p><div class="audit-list">${rows.length?rows.map(r=>`<div class="audit-row"><div class="audit-row-main"><strong>${esc(r.title)}</strong><small>${esc(r.label||r.link_type||'Link')}</small><div class="audit-tags"><span class="audit-tag">${esc(LINK_AUDIT_LABELS[r.issue_type]||r.issue_type)}</span></div></div><div class="audit-row-meta">${esc(r.url||'URL vazia')}</div><div class="audit-row-actions"><button class="secondary" onclick="editBook('${r.book_id}')">Editar livro</button></div></div>`).join(''):'<div class="audit-empty">Nenhuma URL inválida encontrada.</div>'}</div>`;
}

window.showAuditDashboard=showAuditDashboard;
