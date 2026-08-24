let adminSeriesRows=[];

async function showSeriesManager(){
  adminHideAllViews();
  const manager=document.getElementById('seriesManager');
  manager?.classList.remove('hidden');
  cancelSeriesEdit();
  await loadAdminSeries();
  manager?.scrollIntoView({behavior:'smooth',block:'start'});
}

async function loadAdminSeries(){
  const root=document.getElementById('adminSeriesList');
  if(root)root.innerHTML='<div class="muted">Carregando séries…</div>';
  const {data,error}=await sbAdmin.from('series').select('id,name,description,brazil_status,brazil_published_volumes,original_total_volumes,books(id)').order('name');
  if(error){if(root)root.innerHTML='<div class="note error">Não foi possível carregar as séries.</div>';msg('Erro ao carregar séries: '+error.message,'error');return}
  adminSeriesRows=data||[];renderAdminSeries();
}

function renderAdminSeries(){
  const root=document.getElementById('adminSeriesList');if(!root)return;
  const q=(document.getElementById('adminSeriesSearch')?.value||'').trim().toLowerCase();
  const rows=adminSeriesRows.filter(s=>!q||s.name.toLowerCase().includes(q));
  root.innerHTML=rows.length?rows.map(s=>{const count=s.books?.length||0;const summary=[s.brazil_status,s.brazil_published_volumes!=null?`${s.brazil_published_volumes} volume${s.brazil_published_volumes===1?'':'s'} no Brasil`:null,`${count} cadastrado${count===1?'':'s'}`].filter(Boolean).join(' · ');const preview=s.description?`<p class="series-description-preview">${esc(s.description.length>220?s.description.slice(0,220)+'…':s.description)}</p>`:'<p>Descrição ainda não preenchida.</p>';return `<div class="admin-series-row"><div><h3>${esc(s.name)}</h3><p>${esc(summary)}</p>${preview}</div><button class="secondary" type="button" onclick="editSeriesDescription('${s.id}')">${s.description?'Editar':'Adicionar descrição'}</button></div>`}).join(''):'<div class="empty">Nenhuma série encontrada.</div>';
}

function editSeriesDescription(id){const s=adminSeriesRows.find(row=>row.id===id);if(!s)return;const form=document.getElementById('seriesForm');form.elements.series_id.value=s.id;form.elements.series_name.value=s.name||'';form.elements.series_description.value=s.description||'';form.classList.remove('hidden');form.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>form.elements.series_description.focus(),250)}
function cancelSeriesEdit(){const form=document.getElementById('seriesForm');if(!form)return;form.reset();form.elements.series_id.value='';form.classList.add('hidden')}

async function saveSeriesDescription(event){event.preventDefault();const form=event.target,id=form.elements.series_id.value,description=form.elements.series_description.value.trim()||null;if(!id)return;const button=document.getElementById('seriesSaveButton');button.disabled=true;button.textContent='Salvando…';const {data,error}=await sbAdmin.from('series').update({description}).eq('id',id).select('id,description').single();button.disabled=false;button.textContent='Salvar descrição';if(error){msg('Erro ao salvar descrição: '+error.message,'error');return}const row=adminSeriesRows.find(s=>s.id===data.id);if(row)row.description=data.description;renderAdminSeries();cancelSeriesEdit();msg('Descrição da série salva com sucesso.','ok')}
