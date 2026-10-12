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
     show({query:text,loading:false,results:data.results||[],data});
   }catch(error){if(!closed&&version===revision&&error.name!=='AbortError')show({query:text,error:true,results:[]});}
 }
 return {change(value){query=String(value).trim().slice(0,120);++revision;cancel(timer);controller?.abort();if(!query){show({query:'',results:[]});return;}const version=revision;timer=schedule(()=>run(version),delay);},dismiss(){++revision;cancel(timer);controller?.abort();show({query:'',results:[]});},destroy(){closed=true;++revision;cancel(timer);controller?.abort();}};
}

export function rankSearchResults(items,query){
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
 const q=clean(query),seen=new Set();
 const score=item=>Math.min(...[item.title,item.original_title].filter(Boolean).map(value=>{const name=clean(value);return name===q?0:name.startsWith(q)?1:name.split(/\s+/).some(word=>word.startsWith(q))?2:name.includes(q)?3:4;}));
 return items.filter(item=>{if(seen.has(String(item.id)))return false;seen.add(String(item.id));return true;}).sort((a,b)=>score(a)-score(b));
}

export function bindLiveSearch(form,{request,show,change=()=>{}}){
 const input=form.querySelector('input');let composing=false;
 const engine=createLiveSearch(request,show);
 const update=()=>{change(input.value.trim());engine.change(input.value);};
 input.oninput=event=>{if(!composing&&!event.isComposing)update();};
 input.oncompositionstart=()=>{composing=true;};
 input.oncompositionend=()=>{composing=false;update();};
 form.onsubmit=event=>{event.preventDefault();update();};
 return {dismiss:engine.dismiss,destroy(){engine.destroy();}};
}
