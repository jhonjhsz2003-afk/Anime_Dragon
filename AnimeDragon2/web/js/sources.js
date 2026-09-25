import {sourcePriority} from './playback-watchdog.js?v=9.6.1';
// Cache only short-lived source metadata. Video bytes are never prefetched.
export function createSourceLoader(request,now=Date.now) {
  const cache=new Map(),pending=new Map();let providerList=null,providerUntil=0,providerPending=null;
  async function providers(){
    if(providerList&&providerUntil>now())return providerList;
    if(!providerPending)providerPending=request('/api/playback/providers').then(data=>{providerList=Array.isArray(data.providers)?data.providers:[{id:'primary',name:'Fonte principal'}];providerUntil=now()+300000;return providerList;}).finally(()=>{providerPending=null;});return providerPending;
  }
  async function source(path,fresh){
    if(!fresh&&cache.get(path)?.until>now())return cache.get(path).data;
    const key=path+(fresh?'&fresh=1':'');
    if(pending.has(key))return pending.get(key);
    const task=request(key).then(data=>{if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(path,{data,until:now()+(data.available?20000:3000)});return data;}).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  }
  const load=async function load(id,season,episode,{fresh=false,onUpdate=()=>{}}={}) {
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
    await Promise.all(list.map(async p=>{
      let result;try{result=await source(`/api/playback?id=${id}&season=${season}&episode=${episode}&provider=${encodeURIComponent(p.id)}`,fresh);}
      catch{result={available:false,reason:'Provedor temporariamente indisponível.'};}
      results.set(p.id,{...result,streams:result.streams?.length?result.streams:result.url?[result]:[]});onUpdate(snapshot());
    }));return snapshot();
  };
  load.prepare=providers;return load;
}
export function sourceKey(source){
 try{const u=new URL(source.url,'https://animedragon.invalid');if(u.pathname==='/api/video'&&u.searchParams.has('url'))return new URL(u.searchParams.get('url')).href.split('#')[0];u.hash='';return u.href;}catch{return '';}
}
