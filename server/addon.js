// Protocol adapter. Only verified anime IDs from the catalog are sent to the addon.
import {createCache} from './cache.js';
import {canRelaySource} from './hls.js';
import {episodeCoordinates,verifiedAnimeMatch,verifiedMappedEpisode} from './episode-identity.js';
const DEFAULT_MANIFEST='https://fenixflix.fenixhub.online/manifest.json';
const metadata=createCache(160), playback=createCache(160);
const fail=message=>Object.assign(new Error(message),{status:502});
export function publicHttps(value) {
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|0\.)/i.test(u.hostname)&&!u.hostname.endsWith('.local')}catch{return false}
}
const failures=new Map();
function signedExpiry(value){
 try{
  const u=new URL(value);
  for(const key of ['expires','expire','exp']){
   const raw=u.searchParams.get(key);if(!raw)continue;
   const n=Number(raw);if(!Number.isFinite(n))continue;
   const ms=n>1e12?n:n*1000;if(ms>0)return ms;
  }
 }catch{}
 return null;
}
function usableStreamUrl(value,skewMs=45000){const expiry=signedExpiry(value);return publicHttps(value)&&(!expiry||expiry>Date.now()+skewMs);}

async function probePrimaryHls(source,origin){
 const type=streamMime(source?.url);
 if(!/mpegurl/i.test(type)||canRelaySource(source))return {ok:true};
 try{
  const headers=new Headers({Accept:'application/vnd.apple.mpegurl, application/x-mpegURL, */*',Origin:origin});
  const response=await fetch(source.url,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(3500)});
  if(!response.ok){await response.body?.cancel();return {ok:false,reason:`A fonte HLS foi recusada pelo servidor (HTTP ${response.status}).`};}
  const allow=response.headers.get('Access-Control-Allow-Origin')||'';
  if(!(allow==='*'||allow===origin)){await response.body?.cancel();return {ok:false,reason:'A fonte HLS não permite reprodução web neste domínio (CORS ausente).'};}
  const reader=response.body?.getReader?.();
  if(!reader)return {ok:false,reason:'A fonte HLS não retornou dados de vídeo.'};
  const first=await reader.read();
  if(first.done){await reader.cancel().catch(()=>{});return {ok:false,reason:'A fonte HLS retornou uma resposta vazia.'};}
  const prefix=new TextDecoder().decode(first.value.subarray(0,32));
  await reader.cancel().catch(()=>{});
  if(!prefix.trimStart().startsWith('#EXTM3U'))return {ok:false,reason:'A fonte anunciada como HLS não retornou um manifesto HLS válido.'};
  return {ok:true};
 }catch(error){
  return {ok:false,reason:error?.name==='TimeoutError'?'A fonte HLS não respondeu a tempo no teste de reprodução web.':'Não foi possível validar esta fonte HLS para o navegador.'};
 }
}
export async function readAddon(url,ttl=600000,fresh=false) {
 const previous=failures.get(url);if(previous&&previous.until>Date.now())throw previous.error;
 return metadata.get(url,ttl,async()=>{
 try{
 const requestUrl=new URL(url);
 if(fresh&&/\/(stream|subtitles)\//.test(requestUrl.pathname))requestUrl.searchParams.set('_ad_refresh',`${Date.now()}-${crypto.randomUUID().slice(0,8)}`);
 const r=await fetch(requestUrl,{headers:{Accept:'application/json',...(fresh?{'Cache-Control':'no-cache, no-store','Pragma':'no-cache'}:{})},signal:AbortSignal.timeout(/\/(stream|subtitles)\//.test(url)?10000:3000),...(fresh?{cf:{cacheTtl:0,cacheEverything:false}}:{})});
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
export function resourceType(m,name,id) {
 const resource=m.resources.find(r=>(typeof r==='string'?r:r.name)===name);if(!resource)return null;
 const types=resource.types||m.types||[],prefixes=resource.idPrefixes||m.idPrefixes;
 if(prefixes?.length&&!prefixes.some(prefix=>id.startsWith(prefix)))return null;
 if(types.includes('series'))return 'series';
 if(types.includes('anime'))return 'anime';
 return null;
}
export function capability(m,name,id) {return !!resourceType(m,name,id);}
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
 const metaType=id&&resourceType(m.data,'meta',id);if(!id||!metaType)return null;
 const data=await read(`${m.base}/meta/${metaType}/${encodeURIComponent(id)}.json`);
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
 let videoId=verifiedMappedEpisode(mapped,anime,season,episode);
 // Nagare's anime catalog uses AniList IDs; IMDb IDs frequently return no streams.
 if(!videoId&&env.PROVIDER_ID==='nagare'&&season===1&&m.data.catalogs?.some(c=>c.type==='anime'&&c.id==='nexio_search')){
   const query=String(anime.name||anime.original_name||'').slice(0,150);
   try{const catalog=await read(`${m.base}/catalog/anime/nexio_search/search=${encodeURIComponent(query)}.json`,3600000);
     const match=verifiedAnimeMatch(anime,catalog.metas||[],season,episode);
     if(match){const meta=await read(`${m.base}/meta/anime/${encodeURIComponent(match.id)}.json`,3600000);
       if(meta.meta?.id===match.id)videoId=meta.meta.videos?.find(v=>v.season===1&&v.episode===episode)?.id;}
   }catch{}
 }
 if(mapped?.seasonCounts&&!videoId)return {ok:true,available:false,reason:'A ordem dos episódios mudou; a correspondência precisa ser revisada.'};
 const metaType=resourceType(m.data,'meta',id);
 if(!videoId&&metaType) {
   const data=await read(`${m.base}/meta/${metaType}/${encodeURIComponent(id)}.json`,60000,fresh);
   if(data.meta?.id===id)videoId=data.meta.videos?.find(v=>v.season===target.season&&v.episode===target.episode)?.id;
   if(!videoId)return {ok:true,available:false,reason:'Este episódio não foi encontrado no provedor.'};
 }
 if(!videoId&&/^tt\d+$/.test(id))videoId=`${id}:${target.season}:${target.episode}`;
 const streamType=videoId&&resourceType(m.data,'stream',videoId);
 if(!videoId||!streamType)return {ok:true,available:false,reason:'O provedor não oferece este episódio no formato esperado.'};
 const streamEndpoint=`${m.base}/stream/${streamType}/${encodeURIComponent(videoId)}.json`;
 let data=await read(streamEndpoint,10000,fresh),raw=Array.isArray(data.streams)?data.streams:[];
 // Signed video links from FenixFlix and similar addons are disposable. If an
 // addon/edge cache hands us only expired links, force one uncached metadata
 // refresh before exposing anything to the browser.
 if(raw.some(s=>publicHttps(s.url))&&!raw.some(s=>usableStreamUrl(s.url))){
   for(let attempt=0;attempt<(fresh?1:2)&&!raw.some(s=>usableStreamUrl(s.url));attempt++){
     data=await read(streamEndpoint,0,true);raw=Array.isArray(data.streams)?data.streams:[];
   }
 }
 const externalStreams=[...new Map(raw.filter(s=>/^[a-f0-9]{40}$/i.test(s.infoHash||'')&&(s.fileIdx==null||Number.isInteger(s.fileIdx)&&s.fileIdx>=0)).map(s=>{
   const infoHash=s.infoHash.toLowerCase(),fileIdx=s.fileIdx??null,key=infoHash+':'+fileIdx;
   return [key,{key,infoHash,fileIdx,name:String(s.name||'Torrent').slice(0,80),title:String(s.description||s.title||'').slice(0,180),magnet:`magnet:?xt=urn:btih:${infoHash}${fileIdx!==null?'&so='+fileIdx:''}`}];
 })).values()].slice(0,12);
 const candidates=[...new Map(raw.filter(s=>usableStreamUrl(s.url)&&(!s.behaviorHints?.proxyHeaders||canRelaySource(s))).map(s=>[s.url,s])).values()].slice(0,12);
 const rejected=[];const checked=[];
 for(const source of candidates){
   const type=streamMime(source.url);
   if(source.behaviorHints?.notWebReady&&!type&&!canRelaySource(source)){rejected.push('O addon marcou esta fonte como não pronta para navegador.');continue;}
   if(env.PROVIDER_ID==='primary'&&/mpegurl/i.test(type)&&!canRelaySource(source)){
     const probe=await probePrimaryHls(source,origin);if(!probe.ok){rejected.push(probe.reason);continue;}
   }
   checked.push(source);
 }
 const streams=checked.map((s,i)=>({
   url:s.url,name:String(s.name||`Fonte ${i+1}`).slice(0,80),title:String(s.description||s.title||'').slice(0,180),
   type:streamMime(s.url),expiresAt:signedExpiry(s.url),
   subtitles:(Array.isArray(s.subtitles)?s.subtitles:[]).filter(t=>publicHttps(t.url)).map(t=>({src:t.url,language:t.lang||'pt',label:t.label||t.lang||'Legenda'}))
 }));
 const unavailableReason=rejected[0]||(raw.some(s=>publicHttps(s.url)&&signedExpiry(s.url)&&signedExpiry(s.url)<=Date.now()+45000)?'O provedor devolveu links de vídeo expirados. O AnimeDragon tentou renová-los automaticamente.':externalStreams.length?'Torrents encontrados. Abra em um aplicativo compatível; estas fontes não reproduzem diretamente no navegador.':raw.some(s=>s.behaviorHints?.proxyHeaders)?'Esta fonte exige um aplicativo ou servidor de vídeo compatível; não oferece reprodução direta neste navegador.':'Nenhuma fonte HTTPS direta foi encontrada para este episódio.');
 return {ok:true,available:streams.length>0,streams,externalStreams,...(streams[0]||{}),reason:streams.length?'':unavailableReason};
}

// An opaque provider URL is not evidence of an MP4 container.
export function streamMime(url) {
 try {const path=new URL(url).pathname.toLowerCase();return path.endsWith('.m3u8')?'application/vnd.apple.mpegurl':path.endsWith('.webm')?'video/webm':path.endsWith('.mp4')?'video/mp4':path.endsWith('.mkv')?'video/x-matroska':'';} catch {return '';}
}
