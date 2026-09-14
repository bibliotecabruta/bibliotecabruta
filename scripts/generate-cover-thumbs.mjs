import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const srcDir='assets/capas-edicoes';
const outDir='assets/capas-thumb';
await mkdir(outDir,{recursive:true});

const files=(await readdir(srcDir)).filter(f=>/\.(jpe?g|png|webp)$/i.test(f));
let made=0,skipped=0,failed=0;
for(const file of files){
  const src=path.join(srcDir,file);
  const base=file.replace(/\.[^.]+$/,'');
  const out=path.join(outDir,base+'.webp');
  try{
    let rebuild=true;
    try{
      const [a,b]=await Promise.all([stat(src),stat(out)]);
      rebuild=a.mtimeMs>b.mtimeMs;
    }catch{}
    if(!rebuild){skipped++;continue}
    await sharp(src)
      .rotate()
      .resize({width:320,withoutEnlargement:true,fit:'inside'})
      .webp({quality:82,effort:4})
      .toFile(out);
    made++;
  }catch(err){
    failed++;
    console.error('Falha:',file,err.message);
  }
}
console.log(JSON.stringify({source:files.length,generated:made,skipped,failed}));
if(failed)console.warn('Thumbnails ignorados por arquivo inválido:',failed);
