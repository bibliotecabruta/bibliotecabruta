window.BB_NEWS=(()=>{
 function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
 function safeUrl(v){try{const u=new URL(String(v||''));return['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
 function inline(raw){
   const text=String(raw||'');
   let out='',last=0;
   const re=/\[([^\]]+)\]\(([^)]+)\)/g;let m;
   while((m=re.exec(text))){
     out+=esc(text.slice(last,m.index));
     const url=safeUrl(m[2]);
     out+=url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(m[1])}</a>`:esc(m[0]);
     last=re.lastIndex;
   }
   out+=esc(text.slice(last));
   out=out.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
   return out;
 }
 function renderBody(raw){
   const lines=String(raw||'').replace(/\r/g,'').split('\n'),html=[];let list=[];
   const flush=()=>{if(list.length){html.push('<ul>'+list.map(x=>`<li>${inline(x)}</li>`).join('')+'</ul>');list=[]}};
   for(const line of lines){
     const t=line.trim();
     if(!t){flush();continue}
     if(/^###\s+/.test(t)){flush();html.push(`<h3>${inline(t.replace(/^###\s+/,''))}</h3>`);continue}
     if(/^##\s+/.test(t)){flush();html.push(`<h2>${inline(t.replace(/^##\s+/,''))}</h2>`);continue}
     if(/^-\s+/.test(t)){list.push(t.replace(/^-\s+/,''));continue}
     flush();html.push(`<p>${inline(t)}</p>`);
   }
   flush();return html.join('');
 }
 function slugify(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)}
 return{esc,safeUrl,inline,renderBody,slugify};
})();