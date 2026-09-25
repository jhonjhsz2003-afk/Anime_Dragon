// Cache only short-lived source metadata. Video bytes are never prefetched.
export function createSourceLoader(request,now=Date.now) {
  const cache=new Map(),pending=new Map();let providerList=null,providerUntil=0;
  async function providers(){
    if(providerList&&providerUntil>now())return providerList;
    const data=await request('/api/playback/providers');providerList=Array.isArray(data.providers)?data.providers:[{id:'primary',name:'Fonte principal'}];providerUntil=now()+300000;return providerList;
  }
  async function source(path,fresh){
    if(!fresh&&cache.get(path)?.until>now())return cache.get(path).data;
    const key=path+(fresh?'&fresh=1':'');
    if(pending.has(key))return pending.get(key);
    const task=request(key).then(data=>{if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(path,{data,until:now()+(data.available?20000:3000)});return data;}).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  }
  return async function load(id,season,episode,{fresh=false,onUpdate=()=>{}}={}) {
    const list=await providers(),results=new Map();
    const snapshot=()=>{
      const unique=new Map();
      for(const p of list)for(const s of results.get(p.id)?.streams||[]){if(!unique.has(s.url))unique.set(s.url,{...s,name:`${p.name} · ${s.name||'Fonte'}`});}
      const streams=[...unique.values()].sort((a,b)=>rank(b)-rank(a));
      return {ok:true,available:!!streams.length,streams,complete:results.size===list.length,pending:list.filter(p=>!results.has(p.id)).map(p=>p.name),providers:list.map(p=>({name:p.name,available:!!results.get(p.id)?.available,reason:results.get(p.id)?.reason||''})),reason:'Nenhuma fonte reproduzível respondeu para este episódio. Tente atualizar as fontes mais tarde.'};
    };
    await Promise.all(list.map(async p=>{
      let result;try{result=await source(`/api/playback?id=${id}&season=${season}&episode=${episode}&provider=${encodeURIComponent(p.id)}`,fresh);}
      catch{result={available:false,reason:'Provedor temporariamente indisponível.'};}
      results.set(p.id,{...result,streams:result.streams?.length?result.streams:result.url?[result]:[]});onUpdate(snapshot());
    }));return snapshot();
  };
}
function rank(s){return /mpegurl|mp4|webm/i.test(s.type||'')?2:/matroska|hevc|h\.265/i.test(`${s.type} ${s.name} ${s.title}`)?0:1;}
