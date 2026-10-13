import {sourcePriority} from './playback-watchdog.js?v=16.0.0';

const PROVIDERS=[{id:'animefire',name:'AnimeFire',role:'stream'},{id:'embedmovies',name:'EmbedMovies',role:'stream'}];
export function isEmbedMoviesEmbed(source){
  try{
    const u=new URL(source?.url||'');
    return source?.kind==='embed' && u.protocol==='https:' && u.hostname==='myembed.biz' &&
      !u.username && !u.password && !u.port && !u.hash && !u.search &&
      /^\/serie\/[1-9]\d{0,9}\/(?:0|[1-9]\d{0,3})\/[1-9]\d{0,4}$/.test(u.pathname) &&
      Number(u.pathname.split('/')[3])<=1000 && Number(u.pathname.split('/')[4])<=10000;
  }catch{return false;}
}

/** URLs HLS diretas: somente origem contratada, sem redirecionamentos arbitrários. */
export function isAnimeFireStream(source){
 try{
  const url=new URL(source?.url||'');
  return source?.kind==='direct' && source?.providerId==='animefire' &&
   source?.type==='application/vnd.apple.mpegurl' && ['dublado','legendado'].includes(source?.audio) &&
   url.protocol==='https:' && url.hostname==='akumast.net' && !url.username && !url.password && !url.port &&
   url.pathname.startsWith('/i/') && url.pathname.length<400;
 }catch{return false;}
}
export function sourceKey(source){return isEmbedMoviesEmbed(source)||isAnimeFireStream(source)?source.url:'';}
function resultTtl(data){return data?.available?120000:2500;}
export function createSourceLoader(request,now=Date.now,{schedule=setTimeout,cancel=clearTimeout}={}){
  const cache=new Map(),pending=new Map();
  async function source(path,fresh,signal){
    if(signal?.aborted)throw signal.reason;
    if(!fresh&&cache.get(path)?.until>now())return cache.get(path).data;
    const key=path+(fresh?'&fresh=1':'');
    let entry=pending.get(key);
    if(!entry){
      const controller=new AbortController();entry={controller,users:new Set(),task:null};
      entry.task=request(key,{signal:controller.signal}).then(data=>{
        if(cache.size>=40)cache.delete(cache.keys().next().value);
        cache.set(path,{data,until:now()+resultTtl(data)});return data;
      }).finally(()=>{if(pending.get(key)===entry)pending.delete(key);});
      pending.set(key,entry);
    }
    const user={};entry.users.add(user);
    return new Promise((resolve,reject)=>{
      let active=true;
      const release=()=>{if(!active)return;active=false;signal?.removeEventListener('abort',aborted);entry.users.delete(user);if(!entry.users.size){if(pending.get(key)===entry)pending.delete(key);entry.controller.abort();}};
      const aborted=()=>{release();reject(signal.reason);};
      signal?.addEventListener('abort',aborted,{once:true});
      entry.task.then(data=>{if(!active)return;release();resolve(data);},error=>{if(!active)return;release();reject(error);});
    });
  }
  const load=async(id,season,episode,{fresh=false,onUpdate=()=>{},signal,timeoutMs=18000}={})=>{
    const deadline=new AbortController();
    const timer=schedule(()=>deadline.abort(Object.assign(new Error('A busca de fontes não respondeu dentro do prazo.'),{name:'TimeoutError'})),Math.max(1,Math.min(18000,timeoutMs)));
    const current=signal?AbortSignal.any([signal,deadline.signal]):deadline.signal;
    try{
      if(current.aborted)throw current.reason;
      const result=await source(`/api/playback?id=${encodeURIComponent(id)}&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}&provider=auto`,fresh,current);
      const candidates=result.streams?.length?result.streams:result.embed?[result.embed]:[];
      const unique=new Map();
      for(const item of candidates){if(!isEmbedMoviesEmbed(item)&&!isAnimeFireStream(item))continue;const key=sourceKey(item);if(key&&!unique.has(key))unique.set(key,{...item,key});}
      const streams=[...unique.values()].sort((a,b)=>{
        const score=x=>x.providerId==='animefire'?(x.audio==='dublado'?30:20):10;
        return score(b)-score(a)||sourcePriority(b)-sourcePriority(a);
      });
      const response={ok:true,available:!!streams.length,streams,externalStreams:[],complete:true,pending:[],
        providers:PROVIDERS.map(p=>({name:p.name,complete:true,available:streams.some(s=>s.providerId===p.id||p.id==='embedmovies'&&isEmbedMoviesEmbed(s)),reason:p.id==='animefire'?result.animefireReason||'':''})),
        reason:streams.length?'':result.reason||'Não foi possível preparar uma fonte de vídeo.'};
      if(!current.aborted)onUpdate(response);
      return response;
    }finally{cancel(timer);}
  };
  load.prepare=async()=>PROVIDERS;
  return load;
}
