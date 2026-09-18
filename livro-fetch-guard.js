(()=>{
 const nativeFetch=window.fetch.bind(window);
 window.fetch=(input,init={})=>{
  let url='';try{url=typeof input==='string'?input:(input?.url||'')}catch{}
  if(!/\.supabase\.co\//i.test(url))return nativeFetch(input,init);
  const controller=new AbortController(),upstream=init?.signal;
  const abort=()=>{try{controller.abort()}catch{}};
  if(upstream){if(upstream.aborted)abort();else upstream.addEventListener('abort',abort,{once:true})}
  const timer=setTimeout(abort,6000);
  return nativeFetch(input,{...init,signal:controller.signal}).finally(()=>{clearTimeout(timer);if(upstream)upstream.removeEventListener?.('abort',abort)});
 };
})();