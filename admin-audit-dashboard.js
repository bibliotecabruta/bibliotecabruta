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
