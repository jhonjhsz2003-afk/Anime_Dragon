/** Adaptador de catálogo e reprodução por API do proprietário. Não contorna autenticação,
 * CORS, políticas do CDN nem restrições de direitos. Falhas retornam indisponibilidade. */
const API = 'https://api.animefire.one';
const MEDIA_HOST = 'akumast.net';
const timeoutMs = 3000;
const cache = new Map();
const normalized = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{6,32}$/.test(id);
export function animefireEnabled(env){return String(env?.ANIMEFIRE_ENABLED||'').toLowerCase()==='true';}
function cacheGet(key,ttl,load){
 const now=Date.now(),hit=cache.get(key);
 if(hit&&hit.until>now)return hit.value;
 const value=Promise.resolve().then(load).catch(error=>{cache.delete(key);throw error;});
 if(cache.size>200)cache.delete(cache.keys().next().value);
 cache.set(key,{value,until:now+ttl});return value;
}
async function requestAPI(path,params={},env={}){
 const url=new URL(path,API);url.searchParams.set('v','3');
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
 const headers={Accept:'application/json'};
 if(env.ANIMEFIRE_API_TOKEN)headers.Authorization=`Bearer ${env.ANIMEFIRE_API_TOKEN}`;
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(timeoutMs)});
 if(!response.ok)throw new Error(`API AnimeFire retornou ${response.status}`);
 if(!/application\/json|\+json/i.test(response.headers.get('content-type')||'application/json'))throw new Error('Resposta inesperada da API');
 return response.json();
}
function titleValues(x){return [x?.title,x?.name,x?.original_title,x?.original_name,...Object.values(x?.titles||{})].filter(v=>typeof v==='string'&&v.trim());}
/** Somente correspondência exata, para não misturar anime principal, remake e filme. */
export function matchAnime(results,tmdb){
 if(!Array.isArray(results)||!tmdb)return null;
 const names=new Set(titleValues(tmdb).map(normalized).filter(Boolean));
 const candidates=results.filter(row=>validId(row?.id)&&titleValues(row).some(value=>names.has(normalized(value))));
 if(!candidates.length)return null;
 const premiered=String(tmdb.first_air_date||'').slice(0,4);
 const yearMatches=premiered?candidates.filter(row=>{
   const year=String(row.published_at||'').slice(0,4);
   return year&&Math.abs(Number(year)-Number(premiered))<=1;
 }):[];
 if(yearMatches.length===1)return yearMatches[0];
 if(yearMatches.length>1)return null;
 // Descartar anos conflitantes, mas permitir fontes sem ano cadastrado.
 const unyearned=candidates.filter(row=>!String(row.published_at||'').slice(0,4));
 if(premiered)return unyearned.length===1?unyearned[0]:null;
 return candidates.length===1?candidates[0]:null;
}
export async function findAnime(tmdb,env={}){
 const title=titleValues(tmdb)[0];if(!title)return null;
 const candidates=[];
 for(const label of [...new Set(titleValues(tmdb))].slice(0,3)){
  const data=await cacheGet(`search:${normalized(label)}`,15*60_000,()=>requestAPI('/animes/pesquisar',{q:label},env));
  for(const x of data?.data||[])if(!candidates.some(y=>y.id===x.id))candidates.push(x);
  const match=matchAnime(candidates,tmdb);if(match)return match;
 }
 return null;
}
export function findEpisode(catalog,season,episode){
 if(catalog?.data?.format&&catalog.data.format!=='tv')return null;
 return (catalog?.data?.episodes||[]).find(x=>Number(x.season)===season&&Number(x.number)===episode&&validId(x.id))||null;
}
export function safeHls(url,env={}){
 try{
  const parsed=new URL(url);const hosts=new Set([MEDIA_HOST,...String(env.ANIMEFIRE_MEDIA_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>/^[a-z0-9.-]+$/.test(x))]);
  return parsed.protocol==='https:'&&hosts.has(parsed.hostname)&&!parsed.username&&!parsed.password&&parsed.port===''&&parsed.pathname.length<400 ? parsed.toString():null;
 }catch{return null;}
}
export function convertStreams(payload,env={}){
 const options=Array.isArray(payload?.data?.streams)?payload.data.streams:[];
 const known=new Set(),result=[];
 for(const audio of ['dublado','legendado'])for(const stream of options){
  if(stream?.is_offline===true||stream?.audio!==audio)continue;
  const url=safeHls(stream.url,env);if(!url||known.has(url))continue;
  known.add(url);
  const chapters=Array.isArray(stream.chapters)?stream.chapters.filter(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start&&c.end<21600).map(c=>({type:String(c.type||''),start:c.start,end:c.end})):[];
  result.push({kind:'direct',providerId:'animefire',url,type:'application/vnd.apple.mpegurl',audio,name:`AnimeFire · ${audio==='dublado'?'Dublado':'Legendado'}`,chapters});
 }
 return result;
}
export async function animefirePlayback(anime,season,episode,env={}){
 if(!animefireEnabled(env))return {available:false,streams:[],reason:'Integração AnimeFire desativada.'};
 try{
  const match=await findAnime(anime,env);
  if(!match)return {available:false,streams:[],reason:'Nenhuma correspondência exata encontrada na API AnimeFire.'};
  const show=await cacheGet(`anime:${match.id}`,5*60_000,()=>requestAPI(`/anime/${match.id}`,{},env));
  if(show?.data?.hero?.id&&show.data.hero.id!==match.id)return {available:false,streams:[],reason:'A API retornou um anime diferente do pesquisado.'};
  if(show?.data?.format!=='tv')return {available:false,streams:[],reason:'O resultado não é uma série.'};
  const row=findEpisode(show,season,episode);
  if(!row)return {available:false,streams:[],reason:'Temporada ou episódio não cadastrado na API AnimeFire.'};
  const details=await cacheGet(`episode:${row.id}`,90_000,()=>requestAPI(`/episode/${row.id}`,{},env));
  if(details?.data?.anime?.id&&details.data.anime.id!==match.id)return {available:false,streams:[],reason:'Fonte de outro anime; reprodução cancelada.'};
  if(details?.data?.id!==row.id)return {available:false,streams:[],reason:'A API retornou um episódio diferente do solicitado.'};
  const streams=convertStreams(details,env);
  return {available:streams.length>0,streams,provider:'AnimeFire',providerId:'animefire',animefireAnimeId:match.id,animefireEpisodeId:row.id,
   reason:streams.length?'':'Nenhuma fonte HLS autorizada ou compatível foi encontrada.'};
 }catch{return {available:false,streams:[],provider:'AnimeFire',providerId:'animefire',reason:'A API AnimeFire não respondeu ou não permitiu acesso; tentando alternativa.'};}
}
