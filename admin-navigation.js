function adminHideAllViews(){const form=document.getElementById('bookForm'),list=document.getElementById('bookList'),tax=document.getElementById('taxonomyManager'),series=document.getElementById('seriesManager'),bulk=document.getElementById('bulkSeriesView'),imp=document.getElementById('spreadsheetImportView'),news=document.getElementById('newsManager'),title=document.getElementById('formTitle'),intro=document.getElementById('formIntro');if(form)form.classList.add('hidden');if(list)list.classList.add('hidden');if(tax)tax.classList.add('hidden');if(series)series.classList.add('hidden');if(bulk)bulk.classList.add('hidden');if(imp)imp.classList.add('hidden');if(news)news.classList.add('hidden');if(title)title.classList.add('hidden');if(intro)intro.classList.add('hidden')}
function showBookListView(){adminHideAllViews();const list=document.getElementById('bookList');if(list){list.classList.remove('hidden');renderTable();list.scrollIntoView({behavior:'smooth',block:'start'})}}
function showBookFormView(reset=false){adminHideAllViews();const form=document.getElementById('bookForm'),title=document.getElementById('formTitle'),intro=document.getElementById('formIntro');if(form)form.classList.remove('hidden');if(title)title.classList.remove('hidden');if(intro)intro.classList.remove('hidden');if(reset&&typeof newBook==='function')newBook();setTimeout(()=>title?.scrollIntoView({behavior:'smooth',block:'start'}),50)}
function showSpreadsheetImportView(){adminHideAllViews();const imp=document.getElementById('spreadsheetImportView');if(imp){imp.classList.remove('hidden');imp.scrollIntoView({behavior:'smooth',block:'start'})}}
const _navEditBook=window.editBook;window.editBook=async function(id){adminHideAllViews();document.getElementById('bookForm')?.classList.remove('hidden');document.getElementById('formTitle')?.classList.remove('hidden');document.getElementById('formIntro')?.classList.remove('hidden');await _navEditBook(id)};
const _navShowTaxonomy=window.showTaxonomyManager;window.showTaxonomyManager=function(which){adminHideAllViews();const tax=document.getElementById('taxonomyManager');if(tax)tax.classList.remove('hidden');if(typeof _navShowTaxonomy==='function')_navShowTaxonomy(which)};

let adminAuditRows=[];
let adminIssueFilter='';
let adminAreaFilter='';
let adminSearchTimer=null;
const ADMIN_ISSUE_LABELS={sem_capa:'Sem capa',sem_titulo_original:'Sem título original',sem_ano_original:'Sem ano original',sem_sinopse:'Sem sinopse',sem_edicao_principal:'Sem edição principal',sem_editora:'Sem editora',sem_ano_br:'Sem ano BR',sem_paginas:'Sem páginas',menos_de_5_tags:'Menos de 5 tags'};

function injectAdminAuditUI(){
 const list=document.getElementById('bookList');
 const toolbar=list?.querySelector('.toolbar');
 if(!list||!toolbar||document.getElementById('adminAuditPanel'))return;
 const style=document.createElement('style');
 style.textContent=`.admin-audit{margin:18px 0 8px}.audit-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}.audit-card{border:1px solid var(--line);background:#fff;border-radius:7px;padding:13px;text-align:left;cursor:pointer}.audit-card:hover{border-color:var(--gold)}.audit-card strong{display:block;font-size:24px}.audit-card span{font-size:11px;text-transform:uppercase;font-weight:800;color:var(--muted)}.audit-card.warn strong{color:var(--red)}.audit-filters{display:flex;gap:7px;flex-wrap:wrap}.audit-filter{border:1px solid var(--line);background:#fff;padding:7px 10px;border-radius:18px;font-size:11px;font-weight:800;cursor:pointer}.audit-filter.active{background:var(--red);border-color:var(--red);color:#fff}.admin-toolbar-plus{display:grid;grid-template-columns:minmax(240px,2fr) minmax(170px,1fr);gap:10px;width:100%}.admin-toolbar-plus input,.admin-toolbar-plus select{width:100%;min-width:0}.issue-pills{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.issue-pill{font-size:9px;font-weight:800;text-transform:uppercase;background:#f7e7e4;color:var(--red);border:1px solid #d5b4af;border-radius:10px;padding:3px 6px}.admin-result-count{font-size:12px;color:var(--muted);margin:8px 0}.admin-loading{opacity:.55}@media(max-width:700px){.audit-summary{grid-template-columns:repeat(2,1fr)}.admin-toolbar-plus{grid-template-columns:1fr}}`;
 document.head.appendChild(style);
 const audit=document.createElement('div');audit.id='adminAuditPanel';audit.className='admin-audit';toolbar.before(audit);
 toolbar.innerHTML=`<div class="admin-toolbar-plus"><input id="adminSearch" placeholder="Pesquisar título, autor, série ou título original..." autocomplete="off"><select id="adminAreaFilter"><option value="">Todas as áreas</option></select></div>`;
 document.getElementById('adminSearch').addEventListener('input',()=>{clearTimeout(adminSearchTimer);adminSearchTimer=setTimeout(renderTable,220)});
 document.getElementById('adminAreaFilter').addEventListener('change',e=>{adminAreaFilter=e.target.value;renderTable()});
}

async function loadAdminAudit(){
 injectAdminAuditUI();
 const {data,error}=await sbAdmin.from('admin_book_audit').select('*').order('title');
 if(error){console.error('Erro na auditoria do Admin:',error);return}
 adminAuditRows=data||[];
 const areaSelect=document.getElementById('adminAreaFilter');
 if(areaSelect){const current=areaSelect.value;const areas=[...new Set(adminAuditRows.map(x=>x.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));areaSelect.innerHTML='<option value="">Todas as áreas</option>'+areas.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');areaSelect.value=current}
 renderAdminAudit();
}

function setAdminIssueFilter(issue){adminIssueFilter=adminIssueFilter===issue?'':issue;renderAdminAudit();renderTable()}
function renderAdminAudit(){
 const box=document.getElementById('adminAuditPanel');if(!box)return;
 const total=adminAuditRows.length;
 const withCover=adminAuditRows.filter(x=>x.cover_url).length;
 const complete=adminAuditRows.filter(x=>(x.issues||[]).length===0).length;
 const needs=total-complete;
 const counts={};Object.keys(ADMIN_ISSUE_LABELS).forEach(k=>counts[k]=0);adminAuditRows.forEach(r=>(r.issues||[]).forEach(i=>counts[i]=(counts[i]||0)+1));
 box.innerHTML=`<div class="audit-summary"><button class="audit-card" onclick="setAdminIssueFilter('')"><strong>${total}</strong><span>Livros no catálogo</span></button><button class="audit-card" onclick="setAdminIssueFilter('sem_capa')"><strong>${withCover}</strong><span>Com capa</span></button><button class="audit-card"><strong>${complete}</strong><span>Sem pendências</span></button><button class="audit-card warn"><strong>${needs}</strong><span>Precisam de revisão</span></button></div><div class="audit-filters"><button class="audit-filter ${!adminIssueFilter?'active':''}" onclick="setAdminIssueFilter('')">Todos</button>${Object.entries(ADMIN_ISSUE_LABELS).filter(([k])=>counts[k]>0).map(([k,label])=>`<button class="audit-filter ${adminIssueFilter===k?'active':''}" onclick="setAdminIssueFilter('${k}')">${esc(label)} · ${counts[k]}</button>`).join('')}</div>`;
}

function auditRowHtml(b){
 const pub=[b.publisher,b.brazil_year].filter(Boolean).join(' · ')||'—';
 const issues=(b.issues||[]).map(i=>`<span class="issue-pill">${esc(ADMIN_ISSUE_LABELS[i]||i)}</span>`).join('');
 return `<tr><td><strong>${esc(b.title)}</strong>${issues?`<div class="issue-pills">${issues}</div>`:''}</td><td>${esc(b.author||'—')}</td><td>${esc(pub)}</td><td>${esc(b.series||'—')}</td><td><button class="secondary" onclick="editBook('${b.id}')">Editar</button> <button class="secondary" onclick="deleteBook('${b.id}')">Excluir</button></td></tr>`;
}

window.renderTable=async function renderCompleteAdminTable(){
 injectAdminAuditUI();
 if(!adminAuditRows.length)await loadAdminAudit();
 const table=document.getElementById('adminTable');if(!table)return;
 const query=(document.getElementById('adminSearch')?.value||'').trim();
 adminAreaFilter=document.getElementById('adminAreaFilter')?.value||adminAreaFilter;
 table.classList.add('admin-loading');
 let rows=[];
 if(query){
   const {data,error}=await sbAdmin.rpc('admin_search_books',{q:query,area_filter:adminAreaFilter||null,limit_count:200});
   if(error){console.error('Erro na busca administrativa:',error);table.innerHTML='<tr><td colspan="5">Erro ao pesquisar.</td></tr>';table.classList.remove('admin-loading');return}
   const auditMap=new Map(adminAuditRows.map(x=>[x.id,x]));rows=(data||[]).map(x=>({...auditMap.get(x.id),...x}));
 }else rows=adminAuditRows.filter(x=>!adminAreaFilter||x.area===adminAreaFilter);
 if(adminIssueFilter)rows=rows.filter(x=>(x.issues||[]).includes(adminIssueFilter));
 table.innerHTML=rows.length?rows.map(auditRowHtml).join(''):'<tr><td colspan="5">Nenhum livro encontrado com estes filtros.</td></tr>';
 table.classList.remove('admin-loading');
 let count=document.getElementById('adminResultCount');if(!count){count=document.createElement('div');count.id='adminResultCount';count.className='admin-result-count';table.closest('div[style*="overflow"]')?.before(count)}count.textContent=`${rows.length} resultado${rows.length===1?'':'s'}${query?` para “${query}”`:''}`;
};

const _auditDeleteBook=window.deleteBook;window.deleteBook=async function(id){await _auditDeleteBook(id);adminAuditRows=[];await loadAdminAudit();await renderTable()};
const _auditSaveBook=window.saveBook;window.saveBook=async function(e){await _auditSaveBook(e);adminAuditRows=[];await loadAdminAudit()};

document.addEventListener('DOMContentLoaded',()=>{injectAdminAuditUI();setTimeout(async()=>{if(!document.getElementById('adminPanel')?.classList.contains('hidden')){await loadAdminAudit();showBookListView()}},900)});
