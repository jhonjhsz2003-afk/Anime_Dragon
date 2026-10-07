import {sourcePriority} from './playback-watchdog.js?v=14.0.0';
// Cache only short-lived source metadata. Video bytes are never prefetched.
function expiresAtMs(source){
  const direct=Number(source?.expiresAt);if(Number.isFinite(direct)&&direct>0)return direct;
  try{const u=new URL(source?.url||'','https://animedragon.invalid');for(const key of ['expires','expire','exp']){const n=Number(u.searchParams.get(key));if(Number.isFinite(n)&&n>0)return n>1e12?n:n*1000;}}catch{}
  return null;
}
function resultTtl(data,now){
  if(!data?.available)return 2500;
  const expiries=(data.streams?.length?data.streams:data.url?[data]:[]).map(expiresAtMs).filter(Boolean);
  if(!expiries.length)return 120000;
  return Math.max(1000,Math.min(45000,Math.min(...expiries)-now-45000));
}
export function createSourceLoader(request,now=Date.now,{schedule=setTimeout,cancel=clearTimeout}={}) {
  const cache=new Map(),pending=new Map();let providerList=null,providerUntil=0,providerPending=null;
  async function providers(){
    if(providerList&&providerUntil>now())return providerList;
    if(!providerPending)providerPending=request('/api/playback/providers').then(data=>{providerList=Array.isArray(data.providers)?data.providers:[{id:'primary',name:'Fonte principal'}];providerUntil=now()+300000;return providerList;}).finally(()=>{providerPending=null;});return providerPending;
  }
  async function source(path,fresh,signal){
    if(signal?.aborted)throw signal.reason;
    if(!fresh&&cache.get(path)?.until>now())return cache.get(path).data;
    const key=path+(fresh?'&fresh=1':'');
    let entry=pending.get(key);
    if(!entry){
      const controller=new AbortController();entry={controller,users:new Set(),task:null};
      entry.task=request(key,{signal:controller.signal}).then(data=>{if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(path,{data,until:now()+resultTtl(data,now())});return data;}).finally(()=>{if(pending.get(key)===entry)pending.delete(key);});
      pending.set(key,entry);
    }
    const user={};entry.users.add(user);
    return new Promise((resolve,reject)=>{
      let live=true;
      const release=()=>{if(!live)return;live=false;signal?.removeEventListener('abort',aborted);entry.users.delete(user);if(!entry.users.size){if(pending.get(key)===entry)pending.delete(key);entry.controller.abort();}};
      const aborted=()=>{release();reject(signal.reason);};
      signal?.addEventListener('abort',aborted,{once:true});
      entry.task.then(data=>{if(!live)return;release();resolve(data);},error=>{if(!live)return;release();reject(error);});
    });
  }
  const load=async function load(id,season,episode,{fresh=false,onUpdate=()=>{},signal,timeoutMs=12000}={}) {
    let initialTimer=null,published=false;
    const deadline=new AbortController(),timeout=schedule(()=>deadline.abort(Object.assign(new Error('O provedor não respondeu dentro do prazo.'),{name:'TimeoutError'})),Math.max(1,Math.min(12000,timeoutMs)));
    const current=signal?AbortSignal.any([signal,deadline.signal]):deadline.signal;
    try{
    if(current.aborted)throw current.reason;
    const list=(await providers()).filter(p=>p.role!=='external'),results=new Map();
    if(current.aborted)throw current.reason;
    const snapshot=()=>{
      const unique=new Map(),external=new Map();
      for(const p of list){
        for(const s of results.get(p.id)?.streams||[]){const key=sourceKey(s);if(key&&!unique.has(key))unique.set(key,{...s,key,name:`${p.name} · ${s.name||'Fonte'}`});}
        for(const s of results.get(p.id)?.externalStreams||[]){if(/^[a-f0-9]{40}$/i.test(s.infoHash||'')){const key=s.infoHash.toLowerCase()+':'+(s.fileIdx??null);if(!external.has(key))external.set(key,{...s,key,name:`${p.name} · ${s.name||'Torrent'}`});}}
      }
      const streams=[...unique.values()].sort((a,b)=>sourcePriority(b)-sourcePriority(a));
      return {ok:true,available:!!streams.length,streams,externalStreams:[...external.values()],complete:results.size===list.length,pending:list.filter(p=>!results.has(p.id)).map(p=>p.name),providers:list.map(p=>({name:p.name,complete:results.has(p.id),available:!!results.get(p.id)?.available,reason:results.get(p.id)?.reason||''})),reason:'Nenhuma fonte reproduzível respondeu para este episódio. Tente atualizar as fontes mais tarde.'};
    };
    function publish(){
      if(current.aborted)return;
      const result=snapshot();
      // Give concurrently loading HLS/MP4 a short head start over opaque containers.
      if(!published&&!result.complete&&result.streams.length&&sourcePriority(result.streams[0])<2){
        if(initialTimer===null)initialTimer=schedule(()=>{initialTimer=null;published=true;onUpdate(snapshot());},250);
        return;
      }
      if(result.streams.length||result.complete){cancel(initialTimer);initialTimer=null;published=true;}
      onUpdate(result);
    }
    await Promise.all(list.map(async p=>{
      let result;try{result=await source(`/api/playback?id=${id}&season=${season}&episode=${episode}&provider=${encodeURIComponent(p.id)}`,fresh,current);}
      catch(error){if(current.aborted)throw current.reason;result={available:false,reason:'Provedor temporariamente indisponível.'};}
      results.set(p.id,{...result,streams:result.streams?.length?result.streams:result.url?[result]:[]});publish();
    }));return snapshot();
    }finally{cancel(initialTimer);cancel(timeout);}
  };
  load.prepare=providers;return load;
}
export function sourceKey(source){
 try{const u=new URL(source.url,'https://animedragon.invalid');if(u.pathname==='/api/video'&&u.searchParams.has('url'))return new URL(u.searchParams.get('url')).href.split('#')[0];u.hash='';return u.href;}catch{return '';}
}
