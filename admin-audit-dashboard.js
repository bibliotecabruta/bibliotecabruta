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
