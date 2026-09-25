// Protocol adapter. Only verified anime IDs from the catalog are sent to the addon.
import {createCache} from './cache.js';
import {canRelaySource} from './hls.js';
import {episodeCoordinates} from './episode-identity.js';
const DEFAULT_MANIFEST='https://fenixflix.fenixhub.online/manifest.json';
const metadata=createCache(160), playback=createCache(160);
const fail=message=>Object.assign(new Error(message),{status:502});
export function publicHttps(value) {
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|0\.)/i.test(u.hostname)&&!u.hostname.endsWith('.local')}catch{return false}
}
const failures=new Map();
export async function readAddon(url,ttl=600000,fresh=false) {
 const previous=failures.get(url);if(previous&&previous.until>Date.now())throw previous.error;
 return metadata.get(url,ttl,async()=>{
 try{
 const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(/\/(stream|subtitles)\//.test(url)?10000:3000)});
 if(!r.ok){await r.body?.cancel();throw fail('Este serviço está temporariamente indisponível.');}
 const d=await r.json().catch(()=>null);if(!d||typeof d!=='object')throw fail('O provedor retornou uma resposta inválida.');failures.delete(url);return d;
 }catch(error){if(failures.size>=160)failures.delete(failures.keys().next().value);failures.set(url,{until:Date.now()+15000,error});throw error;}
 },fresh);
}
const read=readAddon;
export async function manifest(env) {
 const url=env.STREMIO_MANIFEST_URL||DEFAULT_MANIFEST;
 if(!publicHttps(url))throw fail('A configuração do provedor é inválida.');
 const data=await read(url);if(!Array.isArray(data.resources))throw fail('O manifesto do provedor não é compatível.');
 if(data.behaviorHints?.configurationRequired)throw fail('Este addon precisa ser configurado pelo responsável pelo site.');
 const m={data,base:url.replace(/\/manifest\.json(?:\?.*)?$/,'')};
 if(m.base===url)throw fail('O endereço do manifesto precisa terminar em /manifest.json.');
 return m;
}
export function capability(m,name,id) {
 const resource=m.resources.find(r=>(typeof r==='string'?r:r.name)===name);if(!resource)return false;
 const types=resource.types||m.types||[];if(!types.includes('series'))return false;
 const prefixes=resource.idPrefixes||m.idPrefixes;
 return !prefixes?.length||prefixes.some(prefix=>id.startsWith(prefix));
}
async function identity(anime,env,origin) {
 const m=await manifest(env);
 const response=await env.ASSETS.fetch(new Request(new URL('/addon-mappings.json',origin)));
 const mappings=response.ok?await response.json().catch(()=>({})):{};
 const entry=mappings[String(anime.id)];
 const mapped=env.PROVIDER_ID&&env.PROVIDER_ID!=='primary'?entry?.providers?.[env.PROVIDER_ID]:entry;
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
export async function addonPlayback(anime,season,episode,env,origin,fresh=false) {
 const key=[origin,env.STREMIO_MANIFEST_URL||DEFAULT_MANIFEST,env.PROVIDER_ID,anime.id,anime.external_ids?.imdb_id,season,episode].join('|');
 return playback.get(key,20000,()=>resolvePlayback(anime,season,episode,env,origin,fresh),fresh);
}
async function resolvePlayback(anime,season,episode,env,origin,fresh) {
 const {m,id,mapped}=await identity(anime,env,origin);
 if(!id)return {ok:true,available:false,reason:'Este anime ainda não tem uma correspondência confirmada no provedor.'};
 const target=episodeCoordinates(anime,id,season,episode);
 let videoId=mapped?.episodes?.[`${season}/${episode}`];
 if(!videoId&&capability(m.data,'meta',id)) {
   const data=await read(`${m.base}/meta/series/${encodeURIComponent(id)}.json`,60000,fresh);
   if(data.meta?.id===id)videoId=data.meta.videos?.find(v=>v.season===target.season&&v.episode===target.episode)?.id;
   if(!videoId)return {ok:true,available:false,reason:'Este episódio não foi encontrado no provedor.'};
 }
 if(!videoId&&/^tt\d+$/.test(id))videoId=`${id}:${target.season}:${target.episode}`;
 if(!videoId||!capability(m.data,'stream',videoId))return {ok:true,available:false,reason:'O provedor não oferece este episódio no formato esperado.'};
 const data=await read(`${m.base}/stream/series/${encodeURIComponent(videoId)}.json`,20000,fresh);
 const raw=Array.isArray(data.streams)?data.streams:[];
 const externalStreams=[...new Map(raw.filter(s=>/^[a-f0-9]{40}$/i.test(s.infoHash||'')&&(s.fileIdx==null||Number.isInteger(s.fileIdx)&&s.fileIdx>=0)).map(s=>{
   const infoHash=s.infoHash.toLowerCase(),fileIdx=s.fileIdx??null,key=infoHash+':'+fileIdx;
   return [key,{key,infoHash,fileIdx,name:String(s.name||'Torrent').slice(0,80),title:String(s.description||s.title||'').slice(0,180),magnet:`magnet:?xt=urn:btih:${infoHash}${fileIdx!==null?'&so='+fileIdx:''}`}];
 })).values()].slice(0,12);
 const streams=[...new Map(raw.filter(s=>publicHttps(s.url)&&(!s.behaviorHints?.proxyHeaders||canRelaySource(s))).map(s=>[s.url,s])).values()].slice(0,12).map((s,i)=>({
   url:s.url,name:String(s.name||`Fonte ${i+1}`).slice(0,80),title:String(s.description||s.title||'').slice(0,180),
   type:streamMime(s.url),
   subtitles:(Array.isArray(s.subtitles)?s.subtitles:[]).filter(t=>publicHttps(t.url)).map(t=>({src:t.url,language:t.lang||'pt',label:t.label||t.lang||'Legenda'}))
 }));
 return {ok:true,available:streams.length>0,streams,externalStreams,...(streams[0]||{}),reason:streams.length?'':externalStreams.length?'Torrents encontrados. Abra em um aplicativo compatível; estas fontes não reproduzem diretamente no navegador.':raw.some(s=>s.behaviorHints?.proxyHeaders)?'Esta fonte exige um aplicativo ou servidor de vídeo compatível; não oferece reprodução direta neste navegador.':'Nenhuma fonte HTTPS direta foi encontrada para este episódio.'};
}

// An opaque provider URL is not evidence of an MP4 container.
export function streamMime(url) {
 try {const path=new URL(url).pathname.toLowerCase();return path.endsWith('.m3u8')?'application/vnd.apple.mpegurl':path.endsWith('.webm')?'video/webm':path.endsWith('.mp4')?'video/mp4':path.endsWith('.mkv')?'video/x-matroska':'';} catch {return '';}
}
