import { auth, cleanupSessions } from './server/auth.js';

const BASE = 'https://api.themoviedb.org/3';
const GENRES = new Set(['10759', '35', '18', '10765', '9648', '10762']);
const SORTS = new Set(['popularity.desc', 'vote_average.desc', 'first_air_date.desc']);
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
});
export function isAnime(x) {
  return x && x.adult !== true && (!x.media_type || x.media_type === 'tv') &&
    (x.genre_ids || x.genres?.map(g => g.id) || []).includes(16) && (x.origin_country || []).includes('JP');
}
export const normalize = x => ({
  id: x.id, media_type: 'tv', title: x.name || x.title || 'Sem título', overview: x.overview || '',
  poster_path: x.poster_path || null, backdrop_path: x.backdrop_path || null,
  vote_average: Number(x.vote_average || 0), first_air_date: x.first_air_date || '',
  genres: x.genres || [], status: x.status || '', number_of_episodes: x.number_of_episodes || 0,
  seasons: (x.seasons || []).filter(s => s.episode_count > 0).sort((a,b) => a.season_number - b.season_number),
  next_episode_to_air: x.next_episode_to_air || null
});
const fail = (status, message) => Object.assign(new Error(message), {status});
const pageNumber = value => Math.min(500, Math.max(1, Math.trunc(Number(value)) || 1));

async function tmdb(path, params, env) {
  if (!env.TMDB_API_KEY) throw fail(503, 'O catálogo está temporariamente indisponível. Tente novamente mais tarde.');
  const url = new URL(BASE + path);
  for (const [k,v] of Object.entries({language: 'pt-BR', ...params})) url.searchParams.set(k, v);
  const headers = {Accept: 'application/json'};
  if (env.TMDB_API_KEY.includes('.')) headers.Authorization = `Bearer ${env.TMDB_API_KEY}`;
  else url.searchParams.set('api_key', env.TMDB_API_KEY);
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(12000), cf: {cacheTtl: 900, cacheEverything: true}});
  if (!response.ok) throw fail(response.status === 429 ? 429 : 502, response.status === 429 ? 'Muitas consultas. Aguarde um momento e tente novamente.' : 'Não foi possível consultar o catálogo agora.');
  return response.json();
}
async function discover(env, params = {}) {
  const d = await tmdb('/discover/tv', {...params, include_adult: 'false', with_origin_country: 'JP', with_genres: params.with_genres ? `16,${params.with_genres}` : '16'}, env);
  return {results: (d.results || []).filter(isAnime).map(normalize), page: d.page, totalPages: Math.min(d.total_pages || 0, 500)};
}
async function animeDetail(id, env) {
  const d = await tmdb(`/tv/${id}`, {}, env);
  if (!isAnime(d)) throw fail(404, 'Este título não faz parte do catálogo de animes.');
  return d;
}
async function catalog(request, env) {
  const url = new URL(request.url), p = url.pathname.replace('/api/tmdb/', '/api/catalog/');
  if (p === '/api/catalog/home') {
    const [popular, top, recent] = await Promise.all([
      discover(env, {sort_by: 'popularity.desc'}),
      discover(env, {sort_by: 'vote_average.desc', 'vote_count.gte': '100'}),
      discover(env, {sort_by: 'first_air_date.desc', 'vote_count.gte': '5', 'first_air_date.lte': new Date().toISOString().slice(0,10)})
    ]);
    return {ok:true, trending:popular.results, anime:popular.results, top:top.results, recent:recent.results};
  }
  if (p === '/api/catalog/discover') {
    if (url.searchParams.get('type') === 'movie') throw fail(404, 'O catálogo contém somente animes em série.');
    const sort = url.searchParams.get('sort'), genre = url.searchParams.get('genre');
    return {ok:true, ...await discover(env, {sort_by:SORTS.has(sort)?sort:'popularity.desc', page:pageNumber(url.searchParams.get('page')),
      ...(GENRES.has(genre)?{with_genres:genre}:{}), ...(sort==='vote_average.desc'?{'vote_count.gte':'100'}:{}),
      ...(sort==='first_air_date.desc'?{'first_air_date.lte':new Date().toISOString().slice(0,10),'vote_count.gte':'5'}:{})})};
  }
  if (p === '/api/catalog/search') {
    const q = url.searchParams.get('q')?.trim().slice(0,120);
    if (!q) return {ok:true, results:[], page:1, totalPages:0};
    const d = await tmdb('/search/tv', {query:q, include_adult:'false', page:pageNumber(url.searchParams.get('page'))}, env);
    return {ok:true, results:(d.results || []).filter(isAnime).map(normalize), page:d.page, totalPages:Math.min(d.total_pages || 0,500)};
  }
  const detail = p.match(/^\/api\/catalog\/tv\/(\d+)$/);
  if (detail) return {ok:true, item:normalize(await animeDetail(detail[1],env))};
  const season = p.match(/^\/api\/catalog\/tv\/(\d+)\/season\/(\d+)$/);
  if (season) {
    const parent = await animeDetail(season[1],env);
    if (!parent.seasons?.some(s=>s.season_number===Number(season[2]))) throw fail(404,'Temporada não encontrada.');
    const data = await tmdb(`/tv/${season[1]}/season/${season[2]}`, {}, env);
    return {ok:true, season:{name:data.name, episodes:(data.episodes || []).sort((a,b)=>a.episode_number-b.episode_number).map(e=>({id:e.id, name:e.name, episode_number:e.episode_number, air_date:e.air_date, runtime:e.runtime}))}};
  }
  throw fail(404, 'Página não encontrada.');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (url.pathname.startsWith('/api/auth/')) return await auth(request,env);
      if (request.method !== 'GET') return json({ok:false,error:'Método não permitido.'},405,{Allow:'GET'});
      if (url.pathname === '/api/health') return json({ok:true,service:'AnimeDragon',version:'7.0.0'});
      if (url.pathname === '/api/playback') {
        const id=url.searchParams.get('id'), s=url.searchParams.get('season'), ep=url.searchParams.get('episode');
        if (![id,s,ep].every(x=>/^\d+$/.test(x || ''))) throw fail(400,'Episódio inválido.');
        await animeDetail(id,env);
        const response=await env.ASSETS.fetch(new Request(new URL('/video-sources.json',url)));
        const sources=response.ok?await response.json().catch(()=>({})):{};
        const source=sources[`${id}/${s}/${ep}`];
        if (!source || !/^https:\/\//.test(source.url || '')) return json({ok:true,available:false});
        return json({ok:true,available:true,url:source.url,type:source.type || 'video/mp4',subtitles:(source.subtitles || []).filter(t=>/^https:\/\//.test(t.src || ''))});
      }
      if (!/^\/api\/(catalog|tmdb)\//.test(url.pathname)) throw fail(404,'Página não encontrada.');
      const cache=globalThis.caches?.default;
      const key=new Request(url.toString(),{method:'GET'});
      const hit=cache?await cache.match(key):null;
      if (hit) return hit;
      const data=await catalog(request,env);
      const response=json(data,200,{'Cache-Control':'public, max-age=120, s-maxage=900'});
      if (cache) ctx.waitUntil(cache.put(key,response.clone()));
      return response;
    } catch(e) {
      return json({ok:false,error:e.status?e.message:'Serviço temporariamente indisponível. Tente novamente.'},e.status || 503);
    }
  },
  async scheduled(controller,env,ctx) { if(env.DB) ctx.waitUntil(cleanupSessions(env)); }
};
