// Native modal stays above the current anime/player without changing its route.
export function createAccountDialog({login=true,authenticate,onClose=()=>{},document:doc=globalThis.document}={}){
 const dialog=doc.createElement('dialog');
 dialog.className='account-dialog';dialog.setAttribute('aria-labelledby','account-title');
 let busy=false,closed=false;
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const previousFocus=doc.activeElement;
 function close(){if(closed)return;closed=true;dialog.close();dialog.remove();doc.body.classList.remove('account-open');onClose();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
 function show(mode,email=''){
  login=mode;
  dialog.innerHTML=`<div class="account-card"><button type="button" class="account-close" aria-label="Fechar login">×</button><div class="blue-fire" aria-hidden="true"><i></i><i></i><i></i><span>✦</span></div><span class="account-kicker">ANIMEDRAGON</span><h2 id="account-title">${login?'Bem-vindo de volta!':'Seu próximo capítulo.'}</h2><p class="account-intro">${login?'Seu universo continua de onde você parou.':'Crie sua conta e dê vida ao seu perfil.'}</p><div class="account-tabs" role="tablist" aria-label="Acesso à conta"><button type="button" role="tab" id="account-login-tab" aria-selected="${login}" aria-controls="account-form" data-account-tab="login">Entrar</button><button type="button" role="tab" id="account-register-tab" aria-selected="${!login}" aria-controls="account-form" data-account-tab="register">Criar conta</button></div><form id="account-form" aria-labelledby="${login?'account-login-tab':'account-register-tab'}">${login?'':`<label class="account-field" for="account-name"><span>Nome de usuário</span><input id="account-name" name="name" autocomplete="nickname" minlength="3" maxlength="30" placeholder="Seu nome no universo anime" required></label>`}<label class="account-field" for="account-email"><span>E-mail</span><input id="account-email" name="email" type="email" value="${escape(email)}" autocomplete="email" maxlength="254" placeholder="voce@exemplo.com" required></label><label class="account-field" for="account-password"><span>Senha</span><span class="account-password"><input id="account-password" name="password" type="password" autocomplete="${login?'current-password':'new-password'}" minlength="${login?1:12}" maxlength="128" placeholder="${login?'Sua senha':'Pelo menos 12 caracteres'}" required><button type="button" class="account-password-toggle" aria-label="Mostrar senha" aria-pressed="false">Mostrar</button></span></label>${login?'':`<label class="account-field" for="account-confirm"><span>Confirmar senha</span><input id="account-confirm" name="confirm" type="password" autocomplete="new-password" maxlength="128" placeholder="Repita sua senha" required></label>`}<p class="account-error" id="account-error" role="alert"></p><button class="account-submit primary" type="submit">${login?'Entrar':'Criar minha conta'} <span aria-hidden="true">→</span></button></form><p class="account-persistence">Sua conta, perfil e coleção ficam salvos. Neste dispositivo, a conexão é restaurada automaticamente.</p></div>`;
  dialog.querySelector('.account-close').onclick=close;
  dialog.querySelectorAll('[data-account-tab]').forEach(button=>button.onclick=()=>{if(!busy)show(button.dataset.accountTab==='login',dialog.querySelector('#account-email').value);});
  const toggle=dialog.querySelector('.account-password-toggle'),password=dialog.querySelector('#account-password');
  toggle.onclick=()=>{const visible=password.type==='password';password.type=visible?'text':'password';toggle.textContent=visible?'Ocultar':'Mostrar';toggle.setAttribute('aria-label',`${visible?'Ocultar':'Mostrar'} senha`);toggle.setAttribute('aria-pressed',String(visible));};
  const form=dialog.querySelector('form');
  form.onsubmit=async event=>{
   event.preventDefault();if(busy)return;
   const error=dialog.querySelector('#account-error'),button=dialog.querySelector('[type="submit"]');error.textContent='';
   if(!login&&password.value!==dialog.querySelector('#account-confirm').value){error.textContent='As senhas precisam ser iguais.';dialog.querySelector('#account-confirm').focus();return;}
   const values={email:dialog.querySelector('#account-email').value,password:password.value,...(!login?{name:dialog.querySelector('#account-name').value}:{})};
   busy=true;button.disabled=true;button.textContent=login?'Entrando…':'Criando sua conta…';dialog.querySelectorAll('[data-account-tab]').forEach(tab=>tab.disabled=true);
   try{await authenticate(values,login?'login':'register');close();}
   catch(caught){if(!closed){error.textContent=caught.message||'Não foi possível conectar. Tente novamente.';button.disabled=false;button.textContent=login?'Entrar →':'Criar minha conta →';dialog.querySelectorAll('[data-account-tab]').forEach(tab=>tab.disabled=false);}}
   finally{busy=false;}
  };
 }
 show(login);doc.body.append(dialog);doc.body.classList.add('account-open');dialog.showModal();
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();}});
 return {close,show,get element(){return dialog;}};
}
