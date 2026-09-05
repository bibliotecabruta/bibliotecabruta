window.iSplitTaxonomy=function(v){return String(v??'').trim().split(/[;|/]/).map(x=>x.trim()).filter(Boolean)};

// Área própria para a Coleção Policial da Companhia das Letras.
try{
  if(typeof IMPORT_AREAS!=='undefined'&&!IMPORT_AREAS.includes('Coleção Policial')){
    const after=IMPORT_AREAS.indexOf('Coleção Negra');
    IMPORT_AREAS.splice(after>=0?after+1:IMPORT_AREAS.length,0,'Coleção Policial');
  }
}catch(err){console.warn('Não foi possível registrar a área Coleção Policial.',err)}

// Compatibilidade com a planilha final da Coleção Policial.
// O importador antigo não reconhecia "Nº na série" nem "ISBN-13".
try{
  const _bbBaseMapSpreadsheetRow=window.mapSpreadsheetRow;
  window.mapSpreadsheetRow=function(row,index){
    const r=_bbBaseMapSpreadsheetRow(row,index);
    const seriePos=iPick(row,['Nº na série','No na série','N na série','Número na série','Numero na serie','Nº da série','Numero da serie','Volume','Volume BR','Vol','Nº volume','Numero volume','Número volume']);
    const n=Number(String(seriePos??'').trim().replace(',','.'));
    r.series_volume=Number.isFinite(n)&&String(seriePos??'').trim()!==''?n:null;
    r.isbn=iText(iPick(row,['ISBN-13','ISBN 13','ISBN13','ISBN','ISBN BR']))||r.isbn;
    return r;
  };
}catch(err){console.warn('Não foi possível ampliar o mapeamento da planilha.',err)}

function ensureColecaoPolicialAreaOptions(){
  const selectors=['#areaSelect','#importDefaultArea','select[name="category_area"]','#batchArea'];
  selectors.forEach(selector=>{
    document.querySelectorAll(selector).forEach(select=>{
      if([...select.options].some(o=>o.value==='Coleção Policial'))return;
      const option=document.createElement('option');
      option.value='Coleção Policial';
      option.textContent='Coleção Policial';
      const anchor=[...select.options].find(o=>o.value==='Coleção Negra'||o.textContent.trim()==='Coleção Negra');
      if(anchor&&anchor.nextSibling)select.insertBefore(option,anchor.nextSibling);
      else if(anchor)select.appendChild(option);
      else select.appendChild(option);
    });
  });
}

function bbFixedImportExistingMatch(r){
  const nt=iNorm(r.title),na=iNorm(r.author),ns=iNorm(r.series);
  // Título + autor é a identificação mais segura para uma obra já existente.
  const exact=spreadsheetExistingBooks.find(b=>iNorm(b.title)===nt&&iNorm(b.authors?.name)===na);
  if(exact)return exact;
  // Só usar série + volume quando houver um volume realmente informado.
  const raw=r.series_volume;
  const nv=(raw===null||raw===undefined||String(raw).trim()==='')?null:Number(raw);
  if(r.series&&nv!==null&&Number.isFinite(nv)){
    const m=spreadsheetExistingBooks.find(b=>iNorm(b.series?.name)===ns&&b.series_volume!==null&&b.series_volume!==undefined&&String(b.series_volume).trim()!==''&&Number(b.series_volume)===nv);
    if(m)return m;
  }
  return null;
}

document.addEventListener('DOMContentLoaded',()=>{
  ensureColecaoPolicialAreaOptions();
  // admin-import-batch.js é carregado depois deste arquivo e redefinia a
  // detecção de duplicatas. Reaplicamos a versão segura após todos os scripts.
  window.normalizedVolume=function(v){
    if(v===null||v===undefined||String(v).trim()==='')return null;
    const n=Number(v);
    return Number.isFinite(n)?n:null;
  };
  window.existingMatch=bbFixedImportExistingMatch;
  const observer=new MutationObserver(()=>ensureColecaoPolicialAreaOptions());
  observer.observe(document.body,{childList:true,subtree:true});
});
