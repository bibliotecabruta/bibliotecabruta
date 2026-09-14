import { readFile, writeFile } from 'node:fs/promises';

const base='https://bibliotecabruta.com.br/';
const config=await readFile('config.js','utf8');
const url=config.match(/supabaseUrl:\s*["']([^"']+)["']/)?.[1];
const key=config.match(/supabasePublishableKey:\s*["']([^"']+)["']/)?.[1];
if(!url||!key)throw new Error('Supabase config not found');

const endpoint=url.replace(/\/$/,'')+'/rest/v1/public_sitemap_entries?select=entry_type,id,slug,lastmod&order=entry_type.asc,id.asc';
const rows=[];
for(let start=0;;start+=1000){
 const res=await fetch(endpoint,{headers:{apikey:key,Range:start+'-'+(start+999)}});
 if(!res.ok)throw new Error('Sitemap source failed: '+res.status+' '+await res.text());
 const batch=await res.json();
 rows.push(...batch);
 if(batch.length<1000)break;
}

const specs={
 author:['sitemap-authors.xml',r=>'autor.html?id='+encodeURIComponent(r.id)],
 category:['sitemap-categories.xml',r=>'categoria.html?id='+encodeURIComponent(r.id)],
 theme:['sitemap-themes.xml',r=>'tema.html?id='+encodeURIComponent(r.id)],
 news:['sitemap-news.xml',r=>r.slug?'noticia.html?slug='+encodeURIComponent(r.slug):'noticia.html?id='+encodeURIComponent(r.id)]
};

function xmlEscape(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function dateOnly(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)}

for(const [type,[file,pathFor]] of Object.entries(specs)){
 const items=rows.filter(r=>r.entry_type===type);
 const body=items.map(r=>{
  const loc=xmlEscape(new URL(pathFor(r),base).href);
  const lastmod=dateOnly(r.lastmod);
  return '  <url><loc>'+loc+'</loc>'+(lastmod?'<lastmod>'+lastmod+'</lastmod>':'')+'</url>';
 }).join('\n');
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+body+(body?'\n':'')+'</urlset>\n';
 await writeFile(file,xml,'utf8');
 console.log(file+': '+items.length+' URLs');
}
