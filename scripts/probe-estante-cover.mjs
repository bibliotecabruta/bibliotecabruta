import {writeFile} from 'node:fs/promises';

const urls=[
 'https://www.estantevirtual.com.br/livros/ed-mcbains',
 'https://www.estantevirtual.com.br/busca?q=O%20Pre%C3%A7o%20de%20uma%20Vida%20Ed%20McBain'
];
const needle='O Preço de uma Vida';
const report=[];
for(const url of urls){
  try{
    const res=await fetch(url,{redirect:'follow',headers:{
      'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      'accept':'text/html,application/xhtml+xml'
    }});
    const html=await res.text();
    const idx=html.normalize('NFC').indexOf(needle.normalize('NFC'));
    const nearby=idx>=0?html.slice(Math.max(0,idx-12000),Math.min(html.length,idx+20000)):'';
    const urlsNear=[...nearby.matchAll(/https?:\\/\\/[^"'<>\\s]+/g)].map(m=>m[0].replaceAll('\\u0026','&').replaceAll('\\/','/'));
    const imageLike=urlsNear.filter(u=>/\\.(?:jpg|jpeg|png|webp)(?:[?&#]|$)|image|img|cdn|static/i.test(u));
    report.push({url,status:res.status,final_url:res.url,bytes:html.length,needle_index:idx,image_candidates:[...new Set(imageLike)].slice(0,100),nearby:nearby.slice(0,30000)});
  }catch(e){report.push({url,error:String(e?.message||e)})}
}
await writeFile('estante-cover-probe.json',JSON.stringify({generated_at:new Date().toISOString(),report},null,2)+'\n');
