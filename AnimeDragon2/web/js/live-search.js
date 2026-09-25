export function createLiveSearch(request,show,{delay=180,schedule=setTimeout,cancel=clearTimeout}={}){
 let timer,controller,revision=0,query='',closed=false;const cache=new Map();
 async function run(version){
   if(closed||version!==revision||!query)return;
   const text=query;controller=new AbortController();
   show({query:text,loading:true,results:[]});
   try{
     const cached=cache.get(text),data=cached?.until>Date.now()?cached.data:await request(text,controller.signal);
     if(closed||version!==revision)return;
     if(cache.size>=20)cache.delete(cache.keys().next().value);cache.set(text,{data,until:Date.now()+60000});
     show({query:text,loading:false,results:data.results||[]});
   }catch(error){if(!closed&&version===revision&&error.name!=='AbortError')show({query:text,error:true,results:[]});}
 }
 return {change(value){query=String(value).trim().slice(0,120);++revision;cancel(timer);controller?.abort();if(!query){show({query:'',results:[]});return;}const version=revision;timer=schedule(()=>run(version),delay);},dismiss(){++revision;cancel(timer);controller?.abort();show({query:'',results:[]});},destroy(){closed=true;++revision;cancel(timer);controller?.abort();}};
}

export function bindLiveSearch(form,{request,choose,image,escape}){
 const input=form.querySelector('input'),panel=form.querySelector('.search-suggestions');let items=[],index=-1,composing=false;
 const close=()=>{panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');index=-1;};
 function show(state){
   items=state.results;index=-1;input.removeAttribute('aria-activedescendant');
   if(!state.query||!form.contains(document.activeElement)){close();return;}
   panel.hidden=false;input.setAttribute('aria-expanded','true');
   const e=escape;
   panel.innerHTML=state.loading?'<p role="status">Buscando animes…</p>':state.error?'<p role="status">Não foi possível buscar agora. Pressione Enter para tentar novamente.</p>':items.length?items.slice(0,8).map((item,n)=>`<button type="button" role="option" id="search-option-${n}" aria-selected="false" data-suggestion="${n}"><img src="${e(image(item))}" alt="" width="42" height="63"><span><b>${e(item.title)}</b><small>${e((item.first_air_date||item.release_date||'').slice(0,4))}</small></span></button>`).join(''):'<p role="status">Nenhum anime encontrado. Continue digitando.</p>';
 }
 const engine=createLiveSearch(request,show);
 const select=n=>{const item=items[n];if(item){engine.dismiss();choose(item);}};
 input.oninput=event=>{if(!composing&&!event.isComposing)engine.change(input.value);};
 input.oncompositionstart=()=>{composing=true;};input.oncompositionend=()=>{composing=false;engine.change(input.value);};
 input.onfocus=()=>{if(input.value.trim())engine.change(input.value);};
 input.onkeydown=event=>{
   if(event.key==='Escape'){engine.dismiss();return;}
   const options=[...panel.querySelectorAll('[data-suggestion]')];
   if((event.key==='ArrowDown'||event.key==='ArrowUp')&&!panel.hidden&&options.length){event.preventDefault();index=(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options.forEach((option,n)=>option.setAttribute('aria-selected',String(n===index)));input.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});}
   if(event.key==='Enter'&&!panel.hidden&&index>=0){event.preventDefault();select(index);}
 };
 panel.onpointerdown=event=>{if(event.target.closest('[data-suggestion]'))event.preventDefault();};
 panel.onclick=event=>{const button=event.target.closest('[data-suggestion]');if(button)select(Number(button.dataset.suggestion));};
 form.onfocusout=event=>{if(!form.contains(event.relatedTarget))engine.dismiss();};
 return {dismiss:engine.dismiss,destroy(){engine.destroy();close();}};
}
