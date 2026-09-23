// Protocol adapter. Only verified anime IDs from the catalog are sent to the addon.
const DEFAULT_MANIFEST='https://fenixflix.fenixhub.online/manifest.json';
let memo, lastFailure;
const fail=message=>Object.assign(new Error(message),{status:502});
export function publicHttps(value) {
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|0\.)/i.test(u.hostname)&&!u.hostname.endsWith('.local')}catch{return false}
}
async function read(url) {
 const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000)});
 if(!r.ok)throw fail('O provedor de episódios está indisponível. Tente novamente em instantes.');
 const d=await r.json().catch(()=>null);if(!d)throw fail('O provedor retornou uma resposta inválida.');return d;
}
async function manifest(env) {
 const url=env.STREMIO_MANIFEST_URL||DEFAULT_MANIFEST;
 if(!publicHttps(url))throw fail('A configuração do provedor é inválida.');
 if(memo?.url===url&&memo.until>Date.now())return memo.data;
 if(lastFailure?.url===url&&lastFailure.until>Date.now())throw lastFailure.error;
 let data;try{data=await read(url)}catch(error){lastFailure={url,until:Date.now()+30000,error};throw error;} if(!Array.isArray(data.resources))throw fail('O manifesto do provedor não é compatível.');
 const m={data,base:url.replace(/\/manifest\.json(?:\?.*)?$/,'')};
 if(m.base===url)throw fail('O endereço do manifesto precisa terminar em /manifest.json.');
 memo={url,data:m,until:Date.now()+600000};return m;
}
function capability(m,name,id) {
 const resource=m.resources.find(r=>(typeof r==='string'?r:r.name)===name);if(!resource)return false;
 const types=resource.types||m.types||[];if(!types.includes('series'))return false;
 const prefixes=resource.idPrefixes||m.idPrefixes;
 return !prefixes?.length||prefixes.some(prefix=>id.startsWith(prefix));
}
async function identity(anime,env,origin) {
 const m=await manifest(env);
 const response=await env.ASSETS.fetch(new Request(new URL('/addon-mappings.json',origin)));
 const mappings=response.ok?await response.json().catch(()=>({})):{};
 const mapped=mappings[String(anime.id)];
 const id=typeof mapped?.id==='string'?mapped.id:anime.external_ids?.imdb_id;
 if(!id||id.length>200)return {m,id:null,mapped:null};
 return {m,id,mapped};
}
export async function addonEpisodes(anime,env,origin) {
 const {m,id}=await identity(anime,env,origin);
 if(!id||!capability(m.data,'meta',id))return null;
 const data=await read(`${m.base}/meta/series/${encodeURIComponent(id)}.json`);
 const meta=data.meta;
 if(!meta||meta.id!==id)return null;
 const videos=(meta.videos||[]).filter(v=>typeof v.id==='string'&&Number.isInteger(v.season)&&v.season>=0&&Number.isInteger(v.episode)&&v.episode>0);
 return videos.map(v=>({id:v.id,episode_number:v.episode,season_number:v.season,name:v.title||`Episódio ${v.episode}`,air_date:v.released?.slice(0,10)||'',thumbnail:publicHttps(v.thumbnail)?v.thumbnail:null,overview:typeof v.overview==='string'?v.overview:'',runtime:null}));
}
export async function addonPlayback(anime,season,episode,env,origin) {
 const {m,id,mapped}=await identity(anime,env,origin);
 if(!id)return {ok:true,available:false,reason:'Este anime ainda não tem uma correspondência confirmada no provedor.'};
 let videoId=mapped?.episodes?.[`${season}/${episode}`];
 if(!videoId&&capability(m.data,'meta',id)) {
   const data=await read(`${m.base}/meta/series/${encodeURIComponent(id)}.json`);
   if(data.meta?.id===id)videoId=data.meta.videos?.find(v=>v.season===season&&v.episode===episode)?.id;
   if(!videoId)return {ok:true,available:false,reason:'Este episódio não foi encontrado no provedor.'};
 }
 if(!videoId&&/^tt\d+$/.test(id))videoId=`${id}:${season}:${episode}`;
 if(!videoId||!capability(m.data,'stream',videoId))return {ok:true,available:false,reason:'O provedor não oferece este episódio no formato esperado.'};
 const data=await read(`${m.base}/stream/series/${encodeURIComponent(videoId)}.json`);
 const streams=(data.streams||[]).filter(s=>publicHttps(s.url)&&!s.behaviorHints?.proxyHeaders).slice(0,12).map((s,i)=>({
   url:s.url,name:String(s.name||`Fonte ${i+1}`).slice(0,80),title:String(s.description||s.title||'').slice(0,180),
   type:/\.m3u8(?:\?|$)/i.test(s.url)?'application/vnd.apple.mpegurl':/\.webm(?:\?|$)/i.test(s.url)?'video/webm':'video/mp4',
   subtitles:(s.subtitles||[]).filter(t=>publicHttps(t.url)).map(t=>({src:t.url,language:t.lang||'pt',label:t.lang||'Legenda'}))
 }));
 return {ok:true,available:streams.length>0,streams,...(streams[0]||{}),reason:streams.length?'':'Nenhuma fonte HTTPS compatível com este navegador foi encontrada.'};
}
