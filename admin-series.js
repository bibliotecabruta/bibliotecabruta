let adminSeriesRows=[];
let adminSeriesIssueFilter='';
const SERIES_ISSUE_LABELS={serie_sem_livros:'Série sem livros',livro_sem_numero:'Livro sem número',volume_duplicado:'Volume duplicado',lacuna_numeracao:'Revisar lacunas',completa_mas_faltam_volumes:'Completa, mas faltam volumes',cadastrados_maior_que_publicados_br:'Cadastrados > publicados BR',volume_acima_total_original:'Volume acima do total original',volume_unico_com_multiplos_livros:'Volume único com vários livros',status_nao_informado:'Status não informado'};

async function showSeriesManager(){
  adminHideAllViews();
  const manager=document.getElementById('seriesManager');
  manager?.classList.remove('hidden');
  ensureSeriesAdminEnhancements();
  cancelSeriesEdit();
  await loadAdminSeries();
  manager?.scrollIntoView({behavior:'smooth',block:'start'});
}

function ensureSeriesAdminEnhancements(){
 const manager=document.getElementById('seriesManager');if(!manager)return;
 if(!document.getElementById('seriesAuditPanel')){
   const search=manager.querySelector('.toolbar');
   const panel=document.createElement('div');panel.id='seriesAuditPanel';panel.className='series-audit-panel';search?.before(panel);
   const style=document.createElement('style');style.textContent=`.series-audit-panel{margin:16px 0}.series-audit-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}.series-audit-card{border:1px solid var(--line);background:#fff;border-radius:7px;padding:12px;text-align:left}.series-audit-card strong{display:block;font-size:22px}.series-audit-card span{font-size:11px;text-transform:uppercase;font-weight:800;color:var(--muted)}.series-audit-card.warn strong{color:var(--red)}.series-audit-filters{display:flex;gap:7px;flex-wrap:wrap}.series-issue-pill{display:inline-block;margin:3px 4px 0 0;padding:3px 6px;border-radius:10px;border:1px solid #d5b4af;background:#f7e7e4;color:var(--red);font-size:9px;font-weight:800;text-transform:uppercase}.series-volume-line{font-size:11px;color:var(--muted);margin-top:5px}.admin-series-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.series-audit-help{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.45}@media(max-width:700px){.series-audit-summary{grid-template-columns:1fr}.admin-series-row{align-items:flex-start;flex-direction:column}.admin-series-actions{justify-content:flex-start}}`;document.head.appendChild(style);
 }
 const form=document.getElementById('seriesForm');
 if(form&&!form.elements.brazil_status){
   const descField=form.querySelector('textarea[name="series_description"]')?.closest('.field');
   const html=document.createElement('div');html.className='field full';html.id='seriesMetaFields';html.innerHTML=`<div class="form-grid"><div class="field"><label>Situação da série no Brasil</label><select name="brazil_status"><option value="">Não informada</option><option>Completa</option><option>Interrompida</option><option>Em andamento</option><option>Volume único</option></select></div><div class="field"><label>Volumes publicados no Brasil</label><input name="brazil_published_volumes" type="number" min="0"></div><div class="field"><label>Nome original da série</label><input name="original_name"></div><div class="field"><label>Total de volumes da série original</label><input name="original_total_volumes" type="number" min="1"></div></div>`;
   descField?.before(html);
 }
}

async function loadAdminSeries(){
  ensureSeriesAdminEnhancements();
  const root=document.getElementById('adminSeriesList');
  if(root)root.innerHTML='<div class="muted">Carregando séries…</div>';
  const {data,error}=await sbAdmin.from('admin_series_audit').select('*').order('name');
  if(error){if(root)root.innerHTML='<div class="note error">Não foi possível carregar a auditoria das séries.</div>';msg('Erro ao carregar séries: '+error.message,'error');return}
  adminSeriesRows=data||[];renderSeriesAudit();renderAdminSeries();
}

function setSeriesIssueFilter(issue){adminSeriesIssueFilter=adminSeriesIssueFilter===issue?'':issue;renderSeriesAudit();renderAdminSeries()}
function renderSeriesAudit(){
 const root=document.getElementById('seriesAuditPanel');if(!root)return;
 const total=adminSeriesRows.length,ok=adminSeriesRows.filter(x=>(x.issues||[]).length===0).length,review=total-ok;
 const counts={};Object.keys(SERIES_ISSUE_LABELS).forEach(k=>counts[k]=0);adminSeriesRows.forEach(r=>(r.issues||[]).forEach(i=>counts[i]=(counts[i]||0)+1));
 root.innerHTML=`<div class="series-audit-summary"><div class="series-audit-card"><strong>${total}</strong><span>Séries cadastradas</span></div><div class="series-audit-card"><strong>${ok}</strong><span>Sem alertas</span></div><div class="series-audit-card warn"><strong>${review}</strong><span>Precisam de revisão</span></div></div><div class="series-audit-filters"><button class="audit-filter ${!adminSeriesIssueFilter?'active':''}" onclick="setSeriesIssueFilter('')">Todas</button>${Object.entries(SERIES_ISSUE_LABELS).filter(([k])=>counts[k]>0).map(([k,label])=>`<button class="audit-filter ${adminSeriesIssueFilter===k?'active':''}" onclick="setSeriesIssueFilter('${k}')">${esc(label)} · ${counts[k]}</button>`).join('')}</div><div class="series-audit-help">“Revisar lacunas” é um alerta, não necessariamente um erro: séries publicadas parcialmente no Brasil podem usar a numeração da série original e, portanto, ter saltos legítimos.</div>`;
}

function renderAdminSeries(){
  const root=document.getElementById('adminSeriesList');if(!root)return;
  const q=(document.getElementById('adminSeriesSearch')?.value||'').trim().toLowerCase();
  const rows=adminSeriesRows.filter(s=>(!q||`${s.name} ${s.original_name||''}`.toLowerCase().includes(q))&&(!adminSeriesIssueFilter||(s.issues||[]).includes(adminSeriesIssueFilter)));
  root.innerHTML=rows.length?rows.map(s=>{const count=s.book_count||0;const summary=[s.brazil_status,s.brazil_published_volumes!=null?`${s.brazil_published_volumes} volume${s.brazil_published_volumes===1?'':'s'} publicados no Brasil`:null,`${count} cadastrado${count===1?'':'s'}`].filter(Boolean).join(' · ');const preview=s.description?`<p class="series-description-preview">${esc(s.description.length>220?s.description.slice(0,220)+'…':s.description)}</p>`:'<p>Descrição ainda não preenchida.</p>';const issues=(s.issues||[]).map(i=>`<span class="series-issue-pill">${esc(SERIES_ISSUE_LABELS[i]||i)}</span>`).join('');const volumes=(s.registered_volumes||[]).length?`Volumes cadastrados: ${(s.registered_volumes||[]).join(', ')}`:'Nenhum volume numerado';const gaps=(s.missing_integer_volumes||[]).length?` · Lacunas: ${(s.missing_integer_volumes||[]).join(', ')}`:'';return `<div class="admin-series-row"><div><h3>${esc(s.name)}</h3><p>${esc(summary||'Sem metadados de situação')}</p>${issues?`<div>${issues}</div>`:''}<div class="series-volume-line">${esc(volumes+gaps)}</div>${preview}</div><div class="admin-series-actions"><button class="secondary" type="button" onclick="openSeriesBooks('${s.id}')">Ver livros</button><button class="secondary" type="button" onclick="editSeriesDescription('${s.id}')">Editar série</button></div></div>`}).join(''):'<div class="empty">Nenhuma série encontrada.</div>';
}

function openSeriesBooks(id){const s=adminSeriesRows.find(row=>row.id===id);if(!s)return;showBookListView();setTimeout(()=>{const input=document.getElementById('adminSearch');if(input){input.value=s.name;renderTable()}},80)}

function editSeriesDescription(id){const s=adminSeriesRows.find(row=>row.id===id);if(!s)return;ensureSeriesAdminEnhancements();const form=document.getElementById('seriesForm');form.elements.series_id.value=s.id;form.elements.series_name.value=s.name||'';form.elements.series_description.value=s.description||'';form.elements.brazil_status.value=s.brazil_status||'';form.elements.brazil_published_volumes.value=s.brazil_published_volumes??'';form.elements.original_name.value=s.original_name||'';form.elements.original_total_volumes.value=s.original_total_volumes??'';form.classList.remove('hidden');form.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>form.elements.brazil_status.focus(),250)}
function cancelSeriesEdit(){const form=document.getElementById('seriesForm');if(!form)return;form.reset();form.elements.series_id.value='';form.classList.add('hidden')}

async function saveSeriesDescription(event){event.preventDefault();const form=event.target,id=form.elements.series_id.value;if(!id)return;const payload={description:form.elements.series_description.value.trim()||null,brazil_status:form.elements.brazil_status.value||null,brazil_published_volumes:form.elements.brazil_published_volumes.value?Number(form.elements.brazil_published_volumes.value):null,original_name:form.elements.original_name.value.trim()||null,original_total_volumes:form.elements.original_total_volumes.value?Number(form.elements.original_total_volumes.value):null};payload.total_volumes=payload.original_total_volumes;const button=document.getElementById('seriesSaveButton');button.disabled=true;button.textContent='Salvando…';const {error}=await sbAdmin.from('series').update(payload).eq('id',id);button.disabled=false;button.textContent='Salvar descrição';if(error){msg('Erro ao salvar série: '+error.message,'error');return}cancelSeriesEdit();await loadAdminSeries();msg('Série atualizada e auditoria recalculada.','ok')}

// Carrega a camada de integridade sem depender de alteração manual do HTML do Admin.
document.addEventListener('DOMContentLoaded',()=>{if(!document.querySelector('script[data-admin-integrity]')){const s=document.createElement('script');s.src='admin-integrity.js?v=20260912-1';s.dataset.adminIntegrity='1';document.body.appendChild(s)}});
