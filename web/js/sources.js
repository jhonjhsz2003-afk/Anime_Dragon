import {sourcePriority} from './playback-watchdog.js?v=12.4.0';
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
  async function source(path,fresh){
    if(!fresh&&cache.get(path)?.until>now())return cache.get(path).data;
    const key=path+(fresh?'&fresh=1':'');
    if(pending.has(key))return pending.get(key);
    const task=request(key).then(data=>{if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(path,{data,until:now()+resultTtl(data,now())});return data;}).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  }
  const load=async function load(id,season,episode,{fresh=false,onUpdate=()=>{}}={}) {
    let initialTimer=null,published=false;
    const list=(await providers()).filter(p=>p.role!=='external'),results=new Map();
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
      let result;try{result=await source(`/api/playback?id=${id}&season=${season}&episode=${episode}&provider=${encodeURIComponent(p.id)}`,fresh);}
      catch{result={available:false,reason:'Provedor temporariamente indisponível.'};}
      results.set(p.id,{...result,streams:result.streams?.length?result.streams:result.url?[result]:[]});publish();
    }));cancel(initialTimer);return snapshot();
  };
  load.prepare=providers;return load;
}
export function sourceKey(source){
 try{const u=new URL(source.url,'https://animedragon.invalid');if(u.pathname==='/api/video'&&u.searchParams.has('url'))return new URL(u.searchParams.get('url')).href.split('#')[0];u.hash='';return u.href;}catch{return '';}
}
