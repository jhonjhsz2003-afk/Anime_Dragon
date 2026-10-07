import { streamMime } from './server/addon.js';
import {createCache} from './server/cache.js';
import {withinCatalogBudget} from './server/catalog-budget.js';
import {daysSince,currentCatalogItem,mergeCatalogItems,rankDiverseCatalog} from './server/catalog-policy.js';
import {getReleases,releaseToday} from './server/releases.js';
import {providers} from './server/providers.js';
import {addonMetadata,addonSubtitles} from './server/services.js';
import {compatibleSources,videoRelay} from './server/hls.js';
import {media} from './server/media.js';
import { community } from './server/community.js';
import { addonPlayback,providerFailureReason } from './server/addon.js';
import { auth, cleanupSessions } from './server/auth.js';

const BASE = 'https://api.themoviedb.org/3';
const GENRES = new Set(['10759', '35', '18', '10765', '9648', '10762']);
const THEMES = {
  isekai:['isekai'], magic:['magic'], 'light-novel':['based on light novel','based on a light novel'],
  romance:['romance'], school:['school life','high school'], 'slice-of-life':['slice of life'],
  mecha:['mecha'], sports:['sports'], supernatural:['supernatural'], manga:['based on manga'],
  samurai:['samurai'], shounen:['shounen','shonen'], 'sci-fi':['science fiction']
};
const keywordCache=new Map();
const catalogCache=createCache(240);
const anilistCache=createCache(12);
const CATALOG_VERSION='13.0-current-diverse';
const SORTS = new Set(['popularity.desc', 'vote_average.desc', 'first_air_date.desc']);
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
});
export function isAnime(x) {
  return x && x.adult !== true && (!x.media_type || x.media_type === 'tv') &&
    (x.genre_ids || x.genres?.map(g => g.id) || []).includes(16) && (x.origin_country || []).includes('JP');
}
export const normalize = x => ({
  id: x.id, media_type: 'tv', title: x.name || x.title || 'Sem título', original_title: x.original_name || '', overview: x.overview || '',
  poster_path: x.poster_path || null, backdrop_path: x.backdrop_path || null,
  vote_average: Number(x.vote_average || 0), first_air_date: x.first_air_date || '',
  genres: x.genres || [], status: x.status || '', number_of_episodes: x.number_of_episodes || 0,
  seasons: (x.seasons || []).filter(s => s.episode_count > 0).sort((a,b) => a.season_number - b.season_number),
  next_episode_to_air: x.next_episode_to_air || null,
  last_episode_to_air: x.last_episode_to_air || null
});
const fail = (status, message) => Object.assign(new Error(message), {status});
const pageNumber = value => Math.min(500, Math.max(1, Math.trunc(Number(value)) || 1));
const dayAt=(base,days)=>new Date(base.getTime()+days*86400000).toISOString().slice(0,10);
const seasonalStart=base=>{
  const month=base.getUTCMonth(),startMonth=Math.floor(month/3)*3;
  return new Date(Date.UTC(base.getUTCFullYear(),startMonth,1)).toISOString().slice(0,10);
};
const currentEnough=currentCatalogItem;
const uniqueById=mergeCatalogItems;
const ageDays=(item,base)=>daysSince(item?.first_air_date,base);
const rankFresh=rankDiverseCatalog;
const catalogItem=x=>({...normalize(x),genre_ids:x.genre_ids||x.genres?.map(g=>g.id)||[],popularity:Number(x.popularity)||0,vote_count:Number(x.vote_count)||0});

const titleKey=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const seasonName=base=>['WINTER','SPRING','SUMMER','FALL'][Math.floor(base.getUTCMonth()/3)];
async function anilistPulse(base){
  const season=seasonName(base),seasonYear=base.getUTCFullYear(),key=`${season}:${seasonYear}`;
  return anilistCache.get(key,900000,async()=>{
    const query=`query($season:MediaSeason,$seasonYear:Int){Page(page:1,perPage:50){media(type:ANIME,season:$season,seasonYear:$seasonYear,isAdult:false,sort:[TRENDING_DESC,POPULARITY_DESC]){title{romaji english native}trending popularity averageScore genres}}}`;
    const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:{season,seasonYear}}),signal:AbortSignal.timeout(2500)});
    if(!response.ok)throw fail(502,'Não foi possível consultar as tendências atuais.');
    const payload=await response.json(),rows=payload?.data?.Page?.media||[],map=new Map();
    rows.forEach((row,index)=>{const signal=Math.max(.15,1-index/Math.max(1,rows.length)),genres=(Array.isArray(row.genres)?row.genres:[]).filter(g=>typeof g==='string');for(const name of [row.title?.romaji,row.title?.english,row.title?.native]){const key=titleKey(name);if(key&&!map.has(key))map.set(key,{signal,genres});}});
    return map;
  });
}
function withExternalTrend(items,pulse){
  if(!(pulse instanceof Map)||!pulse.size)return items;
  return items.map(item=>{if(!item)return item;const matches=[titleKey(item.title),titleKey(item.original_title)].filter(Boolean).map(key=>pulse.get(key)).filter(Boolean);const signal=Math.max(0,...matches.map(row=>row.signal||0)),genres=[...new Set(matches.flatMap(row=>row.genres||[]))];return signal?{...item,external_trending:signal,curation_genres:genres}:item;});
}

async function siteTrending(env,base){
  if(!env.DB)return [];
  try{
    const since=dayAt(base,-30)+'T00:00:00.000Z';
    const data=await env.DB.prepare(`SELECT anime_id,COUNT(*) viewers,MAX(updated_at) last_seen
      FROM playback_activity WHERE updated_at>=? GROUP BY anime_id
      ORDER BY viewers DESC,last_seen DESC LIMIT 12`).bind(since).all();
    const rows=data?.results||[],details=await Promise.all(rows.map(row=>animeDetail(row.anime_id,env).then(catalogItem).catch(()=>null)));
    return details.filter(Boolean).map(item=>{
      const row=rows.find(x=>Number(x.anime_id)===Number(item.id));
      return {...item,site_viewers:Number(row?.viewers||0),highlight_reason:'Mais assistido no AnimeDragon'};
    });
  }catch{return [];}
}

async function tmdb(path, params, env) {
  if (!env.TMDB_API_KEY) throw fail(503, 'O catálogo está temporariamente indisponível. Tente novamente mais tarde.');
  const url = new URL(BASE + path);
  for (const [k,v] of Object.entries({language: 'pt-BR', ...params})) url.searchParams.set(k, v);
  const headers = {Accept: 'application/json'};
  if (env.TMDB_API_KEY.includes('.')) headers.Authorization = `Bearer ${env.TMDB_API_KEY}`;
  else url.searchParams.set('api_key', env.TMDB_API_KEY);
  return catalogCache.get(`${env.TMDB_API_KEY}:${url}`,300000,async()=>{
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(7000), cf: {cacheTtl: 300, cacheEverything: true}});
  if (!response.ok) throw fail(response.status === 429 ? 429 : 502, response.status === 429 ? 'Muitas consultas. Aguarde um momento e tente novamente.' : 'Não foi possível consultar o catálogo agora.');
  return response.json();
  });
}
async function discover(env, params = {}) {
  const d = await tmdb('/discover/tv', {...params, include_adult: 'false', with_origin_country: 'JP', with_genres: params.with_genres ? `16,${params.with_genres}` : '16'}, env);
  const now=new Date(),since=daysSince(params['air_date.gte'],now),until=daysSince(params['air_date.lte'],now),broadcast=since>=0&&since<=35&&until>=0&&until<=since;
  return {results: (d.results || []).filter(isAnime).map(item=>({...catalogItem(item),...(broadcast?{current_airing:true,current_airing_since:params['air_date.gte'],current_airing_until:params['air_date.lte']}:{})})), page: d.page, totalPages: Math.min(d.total_pages || 0, 500)};
}
async function weeklyTrending(env){
  const data=await tmdb('/trending/tv/week',{},env);
  return {results:(data.results||[]).map((item,index)=>({item,index})).filter(({item})=>isAnime(item)).map(({item,index})=>({...catalogItem(item),weekly_trending:Math.max(.1,1-index/Math.max(1,(data.results||[]).length)),weekly_trending_rank:index+1,highlight_reason:'Em alta nesta semana'}))};
}
async function themeKeyword(theme,env) {
  const cached=keywordCache.get(theme);if(cached&&cached.until>Date.now())return cached.id;
  const aliases=THEMES[theme];if(!aliases)return null;
  for(const query of aliases){
    const result=await tmdb('/search/keyword',{query,language:'en-US'},env);
    const match=(result.results||[]).find(k=>Number.isSafeInteger(k.id)&&aliases.includes(String(k.name).toLowerCase()));
    if(match){keywordCache.set(theme,{id:match.id,until:Date.now()+86400000});return match.id;}
  }
  return null;
}
async function animeDetail(id, env) {
  const d = await tmdb(`/tv/${id}`, {append_to_response:'external_ids'}, env);
  if (!isAnime(d)) throw fail(404, 'Este título não faz parte do catálogo de animes.');
  return d;
}
async function catalog(request, env, ctx) {
  const url = new URL(request.url), p = url.pathname.replace('/api/tmdb/', '/api/catalog/');
  if(p==='/api/catalog/releases')return getReleases({discover:params=>discover(env,params),detail:id=>animeDetail(id,env),normalize,page:pageNumber(url.searchParams.get('page')),waitUntil:ctx?.waitUntil?task=>ctx.waitUntil(task):undefined});
  if (p === '/api/catalog/home') {
    const today=new Date(),todayDate=dayAt(today,0),weekDate=dayAt(today,-7),tomorrowDate=dayAt(today,1),upcomingEnd=dayAt(today,180);
    const recentDate=dayAt(today,-180),popularDate=dayAt(today,-365),activeDate=dayAt(today,-35);
    // An old first premiere does not mean an old episode. Weekly interest and
    // current broadcasts can surface returning shows without a fixed title list.
    const currentTask=discover(env,{sort_by:'popularity.desc','air_date.gte':activeDate,'air_date.lte':todayDate,'first_air_date.lte':todayDate});
    const recentTask=discover(env,{sort_by:'popularity.desc','first_air_date.gte':recentDate,'first_air_date.lte':todayDate});
    const airingTask=discover(env,{sort_by:'popularity.desc','air_date.gte':weekDate,'air_date.lte':todayDate}).catch(()=>({results:[]}));
    const weeklyTask=weeklyTrending(env);
    const varietyTask=Promise.all(['10759','10765','9648'].map(genre=>discover(env,{sort_by:'popularity.desc',with_genres:genre,'air_date.gte':activeDate,'air_date.lte':todayDate,'first_air_date.lte':todayDate}).catch(()=>({results:[]})))).then(rails=>rails.flatMap(rail=>rail.results));
    const siteTask=siteTrending(env,today),pulseTask=anilistPulse(today).catch(()=>new Map());
    const detailsTask=airingTask.then(airing=>Promise.all(uniqueById(airing.results).slice(0,12).map(item=>animeDetail(item.id,env).then(catalogItem).catch(()=>null))));
    const background=ctx?.waitUntil?task=>ctx.waitUntil(task):null;
    const optional=(task,fallback)=>withinCatalogBudget(task,2500,fallback,background);
    const emptyRail={results:[]},emptyDetails=[],emptySite=[],emptyVariety=[];
    const [current,recent,ranked,popular,next,details,site,pulse,weekly,variety]=await Promise.all([
      currentTask,recentTask,
      optional(discover(env,{sort_by:'vote_average.desc','vote_count.gte':'100','first_air_date.gte':popularDate,'first_air_date.lte':todayDate}),emptyRail),
      optional(discover(env,{sort_by:'popularity.desc','air_date.gte':recentDate,'air_date.lte':todayDate,'first_air_date.lte':todayDate}),emptyRail),
      optional(discover(env,{sort_by:'first_air_date.asc','first_air_date.gte':tomorrowDate,'first_air_date.lte':upcomingEnd}),emptyRail),
      optional(detailsTask,emptyDetails),
      optional(siteTask,emptySite),
      optional(pulseTask,new Map()),
      optional(weeklyTask,emptyRail),
      optional(varietyTask,emptyVariety)
    ]);
    const currentMarked=withExternalTrend(current.results.filter(item=>currentEnough(item,today)),pulse).map(item=>({...item,highlight_reason:item.external_trending?'Em alta na temporada':'Popular agora'}));
    const recentMarked=withExternalTrend(recent.results.filter(item=>ageDays(item,today)>=0&&ageDays(item,today)<=180),pulse).map(item=>({...item,highlight_reason:item.external_trending?'Em alta na temporada':'Lançamento recente'}));
    const updated=withExternalTrend(details,pulse).filter(item=>item?.last_episode_to_air?.air_date>=weekDate&&item.last_episode_to_air.air_date<=todayDate)
      .sort((a,b)=>b.last_episode_to_air.air_date.localeCompare(a.last_episode_to_air.air_date))
      .map(item=>({...item,highlight_reason:'Novo episódio'}));
    const siteFresh=withExternalTrend(site,pulse).filter(item=>currentEnough(item,today));
    const popularMarked=withExternalTrend([...popular.results,...variety],pulse).filter(item=>currentEnough(item,today)).map(item=>({...item,highlight_reason:item.external_trending?'Em alta na temporada':'Popular agora'}));
    const weeklyMarked=withExternalTrend(weekly.results,pulse).filter(item=>currentEnough(item,today));
    const rankedFresh=withExternalTrend(ranked.results,pulse).filter(item=>currentEnough(item,today,365));
    const candidates=uniqueById([...currentMarked,...recentMarked,...popularMarked,...siteFresh,...updated,...weeklyMarked]);
    const featured=rankFresh(candidates,today,6);
    const trending=rankFresh(candidates,today,20);
    const top=rankFresh([...rankedFresh,...updated.filter(item=>item.vote_count>=100)],today,20,{quality:true});
    const popularFresh=rankFresh([...siteFresh,...popularMarked,...updated,...weeklyMarked],today,20);
    const recentSorted=uniqueById(recentMarked).sort((a,b)=>(b.first_air_date||'').localeCompare(a.first_air_date||'')).slice(0,20);
    const upcoming=uniqueById(next.results.filter(item=>item.first_air_date>=tomorrowDate&&item.first_air_date<=upcomingEnd)).sort((a,b)=>a.first_air_date.localeCompare(b.first_air_date)).slice(0,20);
    const partial=[ranked,popular,next,weekly].includes(emptyRail)||details===emptyDetails||site===emptySite||variety===emptyVariety;
    return {ok:true,catalogVersion:CATALOG_VERSION,trending,anime:trending,featured,updated,top,popular:popularFresh,upcoming,recent:recentSorted,trendingSource:weeklyMarked.length?'tmdb_week':'current_catalog',updatedAt:new Date().toISOString(),...(partial?{partial:true}:{})};
  }
  if (p === '/api/catalog/discover') {
    if (url.searchParams.get('type') === 'movie') throw fail(404, 'O catálogo contém somente animes em série.');
    const sort = url.searchParams.get('sort'), genre = url.searchParams.get('genre');
    let keyword=null;
    if(Object.hasOwn(THEMES,genre)){
      keyword=await themeKeyword(genre,env);
      if(!keyword)return {ok:true,results:[],page:pageNumber(url.searchParams.get('page')),totalPages:0};
    }else if(genre&&!GENRES.has(genre))throw fail(400,'Gênero não encontrado.');
    const today=new Date(),todayDate=dayAt(today,0),freshDate=dayAt(today,-365),selectedSort=SORTS.has(sort)?sort:'popularity.desc';
    return {ok:true, ...await discover(env, {sort_by:selectedSort, page:pageNumber(url.searchParams.get('page')),
      ...(keyword?{with_keywords:String(keyword)}:{}),
      ...(GENRES.has(genre)?{with_genres:genre}:{}),
      // Current broadcasts include new seasons of titles whose first premiere
      // was years ago. Only the explicit "new premieres" sort uses that date.
      'first_air_date.lte':todayDate,
      ...(selectedSort==='first_air_date.desc'?{'first_air_date.gte':freshDate}:{'air_date.gte':freshDate,'air_date.lte':todayDate}),
      ...(selectedSort==='vote_average.desc'?{'vote_count.gte':'100'}:{}),
      ...(selectedSort==='first_air_date.desc'?{'vote_count.gte':'5'}:{})})};
  }
  if (p === '/api/catalog/search') {
    const q = url.searchParams.get('q')?.trim().slice(0,120);
    if (!q) return {ok:true, results:[], page:1, totalPages:0};
    const d = await tmdb('/search/tv', {query:q, include_adult:'false', page:pageNumber(url.searchParams.get('page'))}, env);
    return {ok:true, results:(d.results || []).filter(isAnime).map(normalize), page:d.page, totalPages:Math.min(d.total_pages || 0,500)};
  }
  const similar=p.match(/^\/api\/catalog\/tv\/(\d+)\/recommendations$/);
  if(similar){await animeDetail(similar[1],env);const d=await tmdb(`/tv/${similar[1]}/recommendations`,{},env);return {ok:true,results:(d.results||[]).filter(isAnime).map(normalize)}}
  const detail = p.match(/^\/api\/catalog\/tv\/(\d+)$/);
  if (detail) {
    const raw=await animeDetail(detail[1],env), item=normalize(raw);
    return {ok:true,item};
  }
  const season = p.match(/^\/api\/catalog\/tv\/(\d+)\/season\/(\d+)$/);
  if (season) {
    const parent = await animeDetail(season[1],env);
    if (!parent.seasons?.some(s=>s.season_number===Number(season[2]))) throw fail(404,'Temporada não encontrada.');
    const data = await tmdb(`/tv/${season[1]}/season/${season[2]}`, {}, env);
    return {ok:true, season:{name:data.name, episodes:(data.episodes || []).sort((a,b)=>a.episode_number-b.episode_number).map(e=>({id:e.id, name:e.name, episode_number:e.episode_number, air_date:e.air_date, runtime:e.runtime,still_path:e.still_path||null,overview:e.overview||''}))}};
  }
  throw fail(404, 'Página não encontrada.');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if(url.pathname==='/api/video')return await videoRelay(request,env);
      if (url.pathname.startsWith('/api/avatar/')||url.pathname.startsWith('/api/profile/avatar'))return await media(request,env);
      if (url.pathname.startsWith('/api/community/')) return await community(request,env,animeDetail);
      if (url.pathname.startsWith('/api/auth/')) return await auth(request,env);
      if (request.method !== 'GET') return json({ok:false,error:'Método não permitido.'},405,{Allow:'GET'});
      if (url.pathname === '/api/health') return json({ok:true,service:'AnimeDragon',version:'13.0.0',catalogVersion:CATALOG_VERSION});
      if (url.pathname === '/api/addons/metadata') {
        const id=url.searchParams.get('id');if(!/^\d{1,10}$/.test(id||''))throw fail(400,'Anime inválido.');
        return json(await addonMetadata(await animeDetail(id,env),env));
      }
      if (url.pathname === '/api/subtitles') {
        const id=url.searchParams.get('id'),s=url.searchParams.get('season'),ep=url.searchParams.get('episode');
        if(!/^\d{1,10}$/.test(id||'')||!/^\d{1,4}$/.test(s||'')||!/^\d{1,4}$/.test(ep||'')||Number(ep)<1)throw fail(400,'Episódio inválido.');
        return json(await addonSubtitles(await animeDetail(id,env),Number(s),Number(ep),env,url.searchParams.get('locale')||'pt-BR'));
      }
      if (url.pathname === '/api/playback/providers') return json({ok:true,providers:providers(env).map(({id,name,role})=>({id,name,role}))});
      if (url.pathname === '/api/playback') {
        const id=url.searchParams.get('id'), s=url.searchParams.get('season'), ep=url.searchParams.get('episode');
        if (![id,s,ep].every(x=>/^\d+$/.test(x || ''))) throw fail(400,'Episódio inválido.');
        const anime=await animeDetail(id,env);
        const response=await env.ASSETS.fetch(new Request(new URL('/video-sources.json',url)));
        const sources=response.ok?await response.json().catch(()=>({})):{};
        const source=sources[`${id}/${s}/${ep}`];
        if (!source || !/^https:\/\//.test(source.url || '')) {
          const provider=providers(env).find(p=>p.id===(url.searchParams.get('provider')||'primary'));
          if(!provider)throw fail(400,'Provedor não encontrado.');
          try{return json({...await compatibleSources(await addonPlayback(anime,Number(s),Number(ep),{...env,STREMIO_MANIFEST_URL:provider.url,PROVIDER_ID:provider.id},url.origin,url.searchParams.get('fresh')==='1'),env),provider:provider.name});}
          catch(error){return json({ok:true,available:false,provider:provider.name,reason:providerFailureReason(error)});}
        }
        return json({ok:true,available:true,url:source.url,type:source.type || streamMime(source.url),subtitles:(source.subtitles || []).filter(t=>/^https:\/\//.test(t.src || ''))});
      }
      if (!/^\/api\/(catalog|tmdb)\//.test(url.pathname)) throw fail(404,'Página não encontrada.');
      const cache=globalThis.caches?.default;
      const cacheUrl=new URL(url);cacheUrl.searchParams.set('_catalogVersion',CATALOG_VERSION);
      if(/\/api\/(catalog|tmdb)\/releases$/.test(url.pathname))cacheUrl.searchParams.set('_releaseDay',releaseToday());
      const key=new Request(cacheUrl.toString(),{method:'GET'});
      const hit=cache?await cache.match(key):null;
      if (hit) return hit;
      const data=await catalog(request,env,ctx);
      const homeRequest=url.pathname==='/api/catalog/home'||url.pathname==='/api/tmdb/home';
      const response=json(data,200,{'Cache-Control':data.partial?'public, max-age=15, s-maxage=15':homeRequest?'public, max-age=30, s-maxage=120':'public, max-age=60, s-maxage=300'});
      if (cache) ctx.waitUntil(cache.put(key,response.clone()));
      return response;
    } catch(e) {
      return json({ok:false,error:e.status?e.message:'Serviço temporariamente indisponível. Tente novamente.'},e.status || 503);
    }
  },
  async scheduled(controller,env,ctx) { if(env.DB) ctx.waitUntil(cleanupSessions(env)); }
};
