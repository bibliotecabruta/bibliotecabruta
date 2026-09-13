const PENDING_HISTORICAL_TAXONOMY_CLEANUP=[
  {source:'Antiguidade bíblica',targets:['Antiguidade'],detail:'Antiguidade bíblica'},
  {source:'Califórnia espanhola',targets:['México Colonial'],detail:'Califórnia espanhola'},
  {source:'Cerco de Malta',targets:['Século XVI'],detail:'Cerco de Malta'},
  {source:'Conquista do México',targets:['Império Asteca'],detail:'Conquista do México'},
  {source:'Conquista espanhola',targets:['Império Asteca'],detail:'Conquista espanhola'},
  {source:'Guerra do Peloponeso',targets:['Grécia Antiga'],detail:'Guerra do Peloponeso'},
  {source:'Guerra dos Oitenta Anos',targets:['Século XVI','Século XVII'],detail:'Guerra dos Oitenta Anos'},
  {source:'Guerra dos Trinta Anos',targets:['Século XVII'],detail:'Guerra dos Trinta Anos'},
  {source:'Guerra Mahdista',targets:['África colonial','Século XIX'],detail:'Guerra Mahdista'},
  {source:'pré-Conquista',targets:['Império Asteca'],detail:'Pré-Conquista'},
  {source:'Rota da Seda',targets:['Império Mongol'],detail:'Rota da Seda'},
  {source:'Século V',targets:['Hunos','Antiguidade'],detail:'Século V'},
  {source:'Brasil Holandês',targets:['Brasil colonial'],detail:'Brasil Holandês'}
];

function taxNorm(v){
  return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}

async function ensureCleanupTag(name,tags){
  let row=tags.find(t=>taxNorm(t.name)===taxNorm(name));
  if(row)return row;
  const {data,error}=await sbAdmin.from('tags').insert({name}).select('id,name').single();
  if(error)throw error;
  tags.push(data);
  return data;
}

async function migrateHistoricalTaxonomyItem(item,categories,tags){
  const source=categories.find(c=>c.area==='Ficção Histórica'&&taxNorm(c.name)===taxNorm(item.source));
  if(!source)return{source:item.source,status:'already_done'};
  const targets=item.targets.map(name=>categories.find(c=>c.area==='Ficção Histórica'&&taxNorm(c.name)===taxNorm(name)));
  if(targets.some(x=>!x))return{source:item.source,status:'blocked',error:'Categoria-mãe ausente'};
  const tag=await ensureCleanupTag(item.detail,tags);

  const {data:sourceLinks,error:sourceError}=await sbAdmin.from('book_categories').select('book_id').eq('category_id',source.id);
  if(sourceError)throw sourceError;
  const bookIds=[...new Set((sourceLinks||[]).map(x=>x.book_id))];

  if(bookIds.length){
    const [{data:catLinks,error:catError},{data:tagLinks,error:tagError}]=await Promise.all([
      sbAdmin.from('book_categories').select('book_id,category_id').in('book_id',bookIds),
      sbAdmin.from('book_tags').select('book_id,tag_id').in('book_id',bookIds)
    ]);
    if(catError)throw catError;
    if(tagError)throw tagError;

    const catSet=new Set((catLinks||[]).map(x=>`${x.book_id}|${x.category_id}`));
    const tagSet=new Set((tagLinks||[]).map(x=>`${x.book_id}|${x.tag_id}`));
    const addCats=[];
    const addTags=[];

    for(const bookId of bookIds){
      for(const target of targets){
        const key=`${bookId}|${target.id}`;
        if(!catSet.has(key))addCats.push({book_id:bookId,category_id:target.id});
      }
      const tagKey=`${bookId}|${tag.id}`;
      if(!tagSet.has(tagKey))addTags.push({book_id:bookId,tag_id:tag.id});
    }

    if(addCats.length){
      const {error}=await sbAdmin.from('book_categories').insert(addCats);
      if(error)throw error;
    }
    if(addTags.length){
      const {error}=await sbAdmin.from('book_tags').insert(addTags);
      if(error)throw error;
    }
  }

  const {error:unlinkError}=await sbAdmin.from('book_categories').delete().eq('category_id',source.id);
  if(unlinkError)throw unlinkError;
  const {error:deleteError}=await sbAdmin.from('categories').delete().eq('id',source.id);
  if(deleteError)throw deleteError;

  return{source:item.source,status:'migrated',books:bookIds.length};
}

async function runPendingHistoricalTaxonomyCleanup(options={}){
  const silent=options.silent===true;
  const user=await currentAdmin();
  if(!user)return{ok:false,reason:'not_admin'};

  const [{data:categories,error:catError},{data:tags,error:tagError}]=await Promise.all([
    sbAdmin.from('categories').select('id,name,area').order('name'),
    sbAdmin.from('tags').select('id,name').order('name')
  ]);
  if(catError||tagError){
    if(!silent)msg('Não foi possível carregar a taxonomia para manutenção: '+(catError||tagError).message,'error');
    return{ok:false,error:catError||tagError};
  }

  const results=[];
  for(const item of PENDING_HISTORICAL_TAXONOMY_CLEANUP){
    try{
      const result=await migrateHistoricalTaxonomyItem(item,categories,tags);
      results.push(result);
      if(result.status==='migrated'){
        const idx=categories.findIndex(c=>c.area==='Ficção Histórica'&&taxNorm(c.name)===taxNorm(item.source));
        if(idx>=0)categories.splice(idx,1);
      }
    }catch(error){
      results.push({source:item.source,status:'error',error:error.message});
    }
  }

  const migrated=results.filter(x=>x.status==='migrated');
  const failed=results.filter(x=>x.status==='error'||x.status==='blocked');
  const pending=results.filter(x=>x.status!=='migrated'&&x.status!=='already_done');

  await populateSelects();
  if(typeof renderTaxonomyLists==='function')await renderTaxonomyLists();

  if(!silent){
    if(!failed.length)msg(`Taxonomia histórica finalizada: ${migrated.length} categoria(s) migrada(s); ${results.length-migrated.length} já estavam concluídas.`,'ok');
    else msg(`Taxonomia histórica: ${migrated.length} migrada(s), ${failed.length} pendência(s). ${failed.map(x=>x.source+': '+x.error).join(' | ')}`,'error');
  }
  return{ok:!failed.length,results,pending};
}

window.runPendingHistoricalTaxonomyCleanup=runPendingHistoricalTaxonomyCleanup;
