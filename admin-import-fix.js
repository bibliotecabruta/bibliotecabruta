window.iSplitTaxonomy=function(v){return String(v??'').trim().split(/[;|/]/).map(x=>x.trim()).filter(Boolean)};

// Área própria para a Coleção Policial da Companhia das Letras.
// IMPORT_AREAS é um const-array do admin-import.js: o array pode ser ampliado
// sem alterar o restante da validação/importação.
try{
  if(typeof IMPORT_AREAS!=='undefined'&&!IMPORT_AREAS.includes('Coleção Policial')){
    const after=IMPORT_AREAS.indexOf('Coleção Negra');
    IMPORT_AREAS.splice(after>=0?after+1:IMPORT_AREAS.length,0,'Coleção Policial');
  }
}catch(err){console.warn('Não foi possível registrar a área Coleção Policial.',err)}

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

document.addEventListener('DOMContentLoaded',()=>{
  ensureColecaoPolicialAreaOptions();
  const observer=new MutationObserver(()=>ensureColecaoPolicialAreaOptions());
  observer.observe(document.body,{childList:true,subtree:true});
});
