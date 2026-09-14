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
 if(String(type||'').toLowerCase().startsWith('image/'))return true;
 return (buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff) ||
        (buf[0]===0x89&&buf[1]===0x50&&buf[2]===0x4e&&buf[3]===0x47) ||
        (buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP');
}
for(const item of batch){
 let result={edition_id:item.edition_id,book_id:item.book_id,title:item.title,original_url:item.url,status:'failed'};
 try{
  const res=await fetch(item.url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (compatible; BibliotecaBruta/1.0; +https://bibliotecabruta.com.br/)','accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'}});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const type=res.headers.get('content-type')||'';
  const buf=Buffer.from(await res.arrayBuffer());
  if(buf.length<5000)throw new Error('arquivo pequeno demais: '+buf.length+' bytes');
  if(!looksLikeImage(buf,type))throw new Error('resposta não parece imagem: '+type);
  const ext=extFrom(type,item.url),file=path.join(outDir,item.edition_id+ext);
  await writeFile(file,buf);
  result={...result,status:'ok',local_path:file,public_url:'https://bibliotecabruta.com.br/'+file,bytes:buf.length,content_type:type};
 }catch(err){
  result={...result,error:String(err?.message||err)};
 }
 results.push(result);
 console.log(result.status.toUpperCase(),item.title,result.local_path||result.error);
}
await writeFile('cover-migration-results.json',JSON.stringify({generated_at:new Date().toISOString(),results},null,2)+'\n','utf8');
if(!results.some(x=>x.status==='ok'))process.exitCode=2;
