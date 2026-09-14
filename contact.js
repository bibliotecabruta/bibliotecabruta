(function(){
'use strict';
const form=document.getElementById('contactForm');
if(!form)return;
const sb=window.supabase.createClient(BB_CONFIG.supabaseUrl,BB_CONFIG.supabasePublishableKey);
const status=document.getElementById('contactStatus'),button=document.getElementById('contactSubmit');
function show(message,ok=false){status.textContent=message;status.classList.remove('hidden','ok','error');status.classList.add(ok?'ok':'error')}
function clean(v,max){return String(v||'').trim().slice(0,max)}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(document.getElementById('contactWebsite')?.value)return;
 const name=clean(document.getElementById('contactName').value,100);
 const email=clean(document.getElementById('contactEmail').value,254);
 const subject=clean(document.getElementById('contactSubject').value,160);
 const message=clean(document.getElementById('contactMessage').value,4000);
 if(name.length<2){show('Informe seu nome.');return}
 if(message.length<10){show('Escreva uma mensagem um pouco mais detalhada.');return}
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){show('Confira o e-mail informado ou deixe o campo em branco.');return}
 try{
  const last=Number(localStorage.getItem('bb_contact_last')||0);
  if(last&&Date.now()-last<60000){show('Aguarde um minuto antes de enviar outra mensagem.');return}
 }catch{}
 button.disabled=true;button.textContent='Enviando…';
 const {error}=await sb.from('contact_messages').insert({name,email:email||null,subject:subject||null,message});
 button.disabled=false;button.textContent='Enviar mensagem';
 if(error){console.error(error);show('Não foi possível enviar agora. Tente novamente em instantes.');return}
 try{localStorage.setItem('bb_contact_last',String(Date.now()))}catch{}
 form.reset();show('Mensagem enviada. Obrigado por ajudar a melhorar a Biblioteca Bruta.',true);
 window.bbTrack?.('contact_submit',{has_email:Boolean(email),has_subject:Boolean(subject)});
});
})();