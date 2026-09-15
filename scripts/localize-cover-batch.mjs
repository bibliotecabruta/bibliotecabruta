import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';

const batch=JSON.parse(await readFile('cover-migration-batch.json','utf8'));
const outDir='assets/capas-edicoes';
await mkdir(outDir,{recursive:true});
const results=[];

function extFrom(type,url){
 const t=String(type||'').toLowerCase();
 if(t.includes('jpeg')||t.includes('jpg'))return'.jpg';
 if(t.includes('png'))return'.png';
 if(t.includes('webp'))return'.webp';
 const m=String(url||'').match(/\.(jpe?g|png|webp)(?:$|[?#])/i);
 return m?'.'+m[1].toLowerCase().replace('jpeg','jpg'):'.jpg';
}
function looksLikeImage(buf,type){
 const t=String(type||'').toLowerCase();
 return t.includes('jpeg')||t.includes('jpg')||t.includes('png')||t.includes('webp')||
        (buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff) ||
        (buf[0]===0x89&&buf[1]===0x50&&buf[2]===0x4e&&buf[3]===0x47) ||
        (buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP');
}
function imageDimensions(buf,type){
 const t=String(type||'').toLowerCase();
 if((t.includes('jpeg')||t.includes('jpg')||(buf[0]===0xff&&buf[1]===0xd8))){
  let i=2;
  const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  while(i+9<buf.length){
   if(buf[i]!==0xff){i++;continue}
   const marker=buf[i+1];i+=2;
   if(marker===0xd8||marker===0xd9)continue;
   if(marker===0xda)break;
   if(i+1>=buf.length)break;
   const len=buf.readUInt16BE(i);
   if(len<2||i+len>buf.length)break;
   if(sof.has(marker))return{width:buf.readUInt16BE(i+5),height:buf.readUInt16BE(i+3)};
   i+=len;
  }
 }
 if((t.includes('png')||(buf[0]===0x89&&buf[1]===0x50&&buf[2]===0x4e&&buf[3]===0x47))&&buf.length>=24){
  return{width:buf.readUInt32BE(16),height:buf.readUInt32BE(20)};
 }
 if((t.includes('webp')||(buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP'))&&buf.length>=30){
  const chunk=buf.subarray(12,16).toString();
  if(chunk==='VP8X'){
   return{width:1+buf[24]+(buf[25]<<8)+(buf[26]<<16),height:1+buf[27]+(buf[28]<<8)+(buf[29]<<16)};
  }
  if(chunk==='VP8 '&&buf.length>=30&&buf[23]===0x9d&&buf[24]===0x01&&buf[25]===0x2a){
   return{width:buf.readUInt16LE(26)&0x3fff,height:buf.readUInt16LE(28)&0x3fff};
  }
  if(chunk==='VP8L'&&buf.length>=25&&buf[20]===0x2f){
   const b0=buf[21],b1=buf[22],b2=buf[23],b3=buf[24];
   return{width:1+(((b1&0x3f)<<8)|b0),height:1+(((b3&0x0f)<<10)|(b2<<2)|((b1&0xc0)>>6))};
  }
 }
 return{width:null,height:null};
}
function decodeHtmlUrl(value,baseUrl){
 const decoded=String(value||'').replace(/&amp;/g,'&').replace(/\\u0026/g,'&').replace(/\\\//g,'/');
 try{return new URL(decoded,baseUrl).href}catch{return ''}
}
function htmlImageCandidates(html,baseUrl,item={}){
 const rows=[];
 const targetIsbn=String(item.target_isbn||item.isbn||'').replace(/[^0-9Xx]/g,'').toUpperCase();
 const targetYear=item.target_year||item.publication_year||null;
 const contextBoost=(index)=>{
  if(index==null)return 0;
  const context=html.slice(Math.max(0,index-1800),Math.min(html.length,index+2800));
  let boost=0;
  if(targetIsbn){
   const compact=context.replace(/[^0-9Xx]/g,'').toUpperCase();
   if(compact.includes(targetIsbn))boost+=600;
  }
  if(targetYear&&context.includes(String(targetYear)))boost+=120;
  return boost;
 };
 const add=(value,score=0,source='html',index=null)=>{
  const url=decodeHtmlUrl(value,baseUrl);
  if(!url||!/^https?:/i.test(url))return;
  if(/(?:logo|icon|avatar|sprite|placeholder)/i.test(url))score-=20;
  score+=contextBoost(index);
  rows.push({url,score,source});
 };
 const metaPatterns=[
  [/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,25,'og:image'],
  [/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,25,'og:image'],
  [/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,20,'twitter:image'],
  [/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,20,'twitter:image']
 ];
 for(const [rx,score,source] of metaPatterns){for(const m of html.matchAll(rx))add(m[1],score,source,m.index)}
 for(const m of html.matchAll(/<img\b[^>]*>/gi)){
  const tag=m[0],boost=/(?:product|gallery|book|livro|cover|capa|zoom)/i.test(tag)?45:0,penalty=/(?:author|autor|avatar|logo|icon)/i.test(tag)?-35:0;
  for(const attr of ['data-zoom-image','data-large-image','data-original','data-src','src']){
   const am=tag.match(new RegExp(attr+'=["\\\']([^"\\\']+)["\\\']','i'));
   if(am)add(am[1],boost+penalty+(attr.includes('zoom')||attr.includes('large')?30:0),'img:'+attr,m.index);
  }
  for(const attr of ['data-srcset','srcset']){
   const am=tag.match(new RegExp(attr+'=["\\\']([^"\\\']+)["\\\']','i'));
   if(am){for(const part of am[1].split(',')){const u=part.trim().split(/\s+/)[0];if(u)add(u,boost+penalty+20,'img:'+attr,m.index)}}
  }
 }
 for(const m of html.matchAll(/"image"\s*:\s*"([^"]+)"/gi))add(m[1],40,'jsonld:image',m.index);
 for(const m of html.matchAll(/"(?:imageUrl|image_url|large_image|zoom_image)"\s*:\s*"([^"]+)"/gi))add(m[1],35,'json:image',m.index);
 const uniq=new Map();
 for(const row of rows){const prev=uniq.get(row.url);if(!prev||row.score>prev.score)uniq.set(row.url,row)}
 return [...uniq.values()].sort((a,b)=>b.score-a.score).slice(0,80);
}
async function fetchBinaryImage(url,headers){
 const res=await fetch(url,{redirect:'follow',headers:{...headers,accept:'image/webp,image/jpeg,image/png,image/*;q=0.9,*/*;q=0.5'}});
 if(!res.ok)return null;
 const type=res.headers.get('content-type')||'',buf=Buffer.from(await res.arrayBuffer());
 if(buf.length<5000||!looksLikeImage(buf,type))return null;
 return{type,buf,dims:imageDimensions(buf,type),url:res.url};
}
async function fetchCover(url,item={}){
 const headers={'user-agent':'Mozilla/5.0 (compatible; BibliotecaBruta/1.0; +https://bibliotecabruta.com.br/)','accept':'image/webp,image/jpeg,image/png,image/*;q=0.8,text/html;q=0.7,*/*;q=0.5'};
 const res=await fetch(url,{redirect:'follow',headers});
 if(!res.ok)throw new Error('HTTP '+res.status);
 const type=res.headers.get('content-type')||'';
 if(!type.toLowerCase().includes('text/html')){
  const buf=Buffer.from(await res.arrayBuffer());
  return{type,buf,imageUrl:res.url,candidatesChecked:1};
 }
 const html=await res.text(),candidates=htmlImageCandidates(html,res.url,item);
 let best=null,checked=0;
 for(const candidate of candidates){
  try{
   const img=await fetchBinaryImage(candidate.url,headers);checked++;
   if(!img?.dims?.width||!img?.dims?.height)continue;
   const ratio=img.dims.height/img.dims.width;if(ratio<1.2)continue;
   const score=(img.dims.width*img.dims.height)+(candidate.score*25000);
   if(!best||score>best.score)best={...img,score,source:candidate.source};
  }catch{}
 }
 if(!best)throw new Error('nenhuma imagem vertical válida entre '+checked+' candidatas');
 return{type:best.type,buf:best.buf,imageUrl:best.url,candidatesChecked:checked,candidateSource:best.source};
}

for(const item of batch){
 let result={edition_id:item.edition_id,book_id:item.book_id,title:item.title,original_url:item.url,status:'failed'};
 try{
  const fetched=await fetchCover(item.url,item);
  const type=fetched.type,buf=fetched.buf;
  if(buf.length<5000)throw new Error('arquivo pequeno demais: '+buf.length+' bytes');
  if(!looksLikeImage(buf,type))throw new Error('resposta não parece imagem: '+type);
  const ext=extFrom(type,item.url),file=path.join(outDir,item.edition_id+ext),dims=imageDimensions(buf,type);
  let status='ok',quality='ok';
  const ratio=dims.width&&dims.height?dims.height/dims.width:0;
  if(!dims.width||!dims.height){status='rejected_unknown_dimensions';quality='unknown_dimensions'}
  else if(item.preserve_existing){status='ok_preserve';quality='existing_cover_exception'}
  else if(ratio<1.2){status='rejected_aspect_ratio';quality='not_portrait'}
  else if(dims.width<600||dims.height<900){
    if(item.allow_exception&&dims.width>=300&&dims.height>=450){status='ok_exception';quality='low_resolution_exception'}
    else{status='rejected_low_resolution';quality='low_resolution'}
  }
  if(!['ok','ok_exception','ok_preserve'].includes(status)){
    result={...result,status,quality,width:dims.width,height:dims.height,bytes:buf.length,content_type:type};
  }else{
    await writeFile(file,buf);
    result={...result,status,quality,width:dims.width,height:dims.height,source_image_url:fetched.imageUrl,candidate_source:fetched.candidateSource||'direct',candidates_checked:fetched.candidatesChecked||1,local_path:file,public_url:'https://bibliotecabruta.com.br/'+file,bytes:buf.length,content_type:type};
  }
 }catch(err){
  result={...result,error:String(err?.message||err)};
 }
 results.push(result);
 console.log(result.status.toUpperCase(),item.title,result.local_path||result.error);
}
await writeFile('cover-migration-results.json',JSON.stringify({generated_at:new Date().toISOString(),results},null,2)+'\n','utf8');
if(!results.length)process.exitCode=2;
