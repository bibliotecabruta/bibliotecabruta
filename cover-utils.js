(function(){
'use strict';

/**
 * Returns a lighter cover URL for list/card contexts.
 * Supabase Storage covers are served through the image render endpoint with width/quality.
 * Local repository covers stay on the Biblioteca Bruta domain and fall back to the original file.
 */
function coverUrl(url,width=320,quality=82){
  const raw=String(url||'').trim();
  if(!raw)return '';
  try{
    const u=new URL(raw,location.origin);
    const storagePrefix='/storage/v1/object/public/';
    if(u.hostname.endsWith('.supabase.co')&&u.pathname.includes(storagePrefix)){
      const transformed=new URL(u.href);
      transformed.pathname=u.pathname.replace(storagePrefix,'/storage/v1/render/image/public/');
      transformed.searchParams.set('width',String(Math.max(80,Math.min(900,Number(width)||320))));
      transformed.searchParams.set('quality',String(Math.max(40,Math.min(95,Number(quality)||82))));
      transformed.searchParams.set('resize','contain');
      return transformed.href;
    }
    return u.href;
  }catch{
    return raw;
  }
}

function coverSrcSet(url,widths=[180,260,360]){
  const raw=String(url||'').trim();
  if(!raw)return '';
  const items=[];
  for(const w of widths){
    const src=coverUrl(raw,w);
    if(src&&src!==raw)items.push(src+' '+w+'w');
  }
  return items.join(', ');
}

function coverAttrs(url,opts={}){
  const width=opts.width||320;
  const src=coverUrl(url,width,opts.quality||82);
  const set=coverSrcSet(url,opts.srcsetWidths||[180,260,360]);
  return {src,srcset:set,sizes:opts.sizes||'(max-width: 700px) 45vw, 180px'};
}

window.bbCoverUrl=coverUrl;
window.bbCoverSrcSet=coverSrcSet;
window.bbCoverAttrs=coverAttrs;
})();