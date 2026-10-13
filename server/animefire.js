/** Integração da API do proprietário, sem bypass de CORS, autenticação ou direitos.
 * Falhas de metadados são explicitadas; reprodução HLS depende do CDN. */
const API = 'https://api.animefire.one';
const MEDIA_HOST = 'akumast.net';
const timeoutMs = 4500;
const cache = new Map();
const normalized = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{6,32}$/.test(id);
export function animefireEnabled(env) { return String(env?.ANIMEFIRE_ENABLED || '').toLowerCase() === 'true'; }
function cacheGet(key, ttl, load) {
  const now = Date.now(), hit = cache.get(key);
  if (hit && hit.until > now) return hit.value;
  const value = Promise.resolve().then(load).catch(error => { cache.delete(key); throw error; });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(key, { value, until: now + ttl });
  return value;
}
async function requestAPI(path, params = {}, env = {}) {
  const url = new URL(path, API);
  url.searchParams.set('v', '3');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const headers = { Accept: 'application/json' };
  if (env.ANIMEFIRE_API_TOKEN) headers.Authorization = `Bearer ${env.ANIMEFIRE_API_TOKEN}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw Object.assign(new Error(`AnimeFire HTTP ${response.status}`), { code: 'UPSTREAM_HTTP' });
  if (!/application\/json|\+json/i.test(response.headers.get('content-type') || 'application/json'))
    throw Object.assign(new Error('Resposta não JSON'), { code: 'UPSTREAM_FORMAT' });
  return response.json();
}
function titleValues(x) {
  const core = [x?.title, x?.name, x?.original_title, x?.original_name, ...Object.values(x?.titles || {})];
  const translations = (x?.translations?.translations || [])
    .filter(t => ['pt', 'en', 'ja'].includes(t?.iso_639_1))
    .map(t => t?.data?.name);
  const alternate = (x?.alternative_titles?.results || [])
    .filter(t => ['BR', 'US', 'JP'].includes(t?.iso_3166_1))
    .map(t => t?.title);
  const seen = new Set();
  return [...core, ...translations, ...alternate].filter(v => {
    if (typeof v !== 'string' || !v.trim()) return false;
    const key = normalized(v);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
/** Evita filmes e remakes com o mesmo nome: só combina títulos exatos + ano compatível. */
export function matchAnime(results, tmdb) {
  if (!Array.isArray(results) || !tmdb) return null;
  const names = new Set(titleValues(tmdb).map(normalized));
  const candidates = results.filter(row => validId(row?.id) && titleValues(row).some(v => names.has(normalized(v))));
  if (!candidates.length) return null;
  const premiered = Number(String(tmdb.first_air_date || '').slice(0, 4));
  if (premiered > 1900) {
    const matched = candidates.filter(row => {
      const year = Number(String(row.published_at || '').slice(0, 4));
      return year > 1900 && Math.abs(year - premiered) <= 2;
    });
    if (matched.length === 1) return matched[0];
    if (matched.length > 1) return null;
    const undated = candidates.filter(row => !row.published_at);
    return undated.length === 1 ? undated[0] : null;
  }
  return candidates.length === 1 ? candidates[0] : null;
}
function addCandidates(to, response) {
  if (!Array.isArray(response?.data)) return;
  for (const item of response.data) {
    if (validId(item?.id) && !to.some(row => row.id === item.id)) to.push(item);
  }
}
/** Busca nome principal, aliases autorizados do TMDB e até duas páginas por pesquisa.
 * Não usa correspondência vaga: resultados ambíguos continuam indisponíveis. */
export async function findAnime(tmdb, env = {}) {
  const labels = titleValues(tmdb).slice(0, 5);
  if (!labels.length) return null;
  const candidates = [];
  const search = label => cacheGet(`search:${normalized(label)}`, 5 * 60_000,
    () => requestAPI('/animes/pesquisar', { q: label }, env));
  const primary = await search(labels[0]);
  addCandidates(candidates, primary);
  let match = matchAnime(candidates, tmdb);
  if (match) return match;
  // Consultar páginas extras e aliases em paralelo, com limite de trabalho por episódio.
  const tasks = [];
  const lastPage = Number(primary?.meta?.last_page) || 1;
  for (let page = 2; page <= Math.min(2, lastPage); page++) {
    tasks.push(cacheGet(`search:${normalized(labels[0])}:page:${page}`, 5 * 60_000,
      () => requestAPI('/animes/pesquisar', { q: labels[0], page }, env)));
  }
  for (const label of labels.slice(1, 4)) tasks.push(search(label));
  if (tasks.length) {
    const results = await Promise.allSettled(tasks);
    for (const response of results) if (response.status === 'fulfilled') addCandidates(candidates, response.value);
  }
  match = matchAnime(candidates, tmdb);
  return match;
}
export function findEpisode(catalog, season, episode) {
  if (catalog?.data?.format && catalog.data.format !== 'tv') return null;
  return (catalog?.data?.episodes || []).find(x => Number(x.season) === season && Number(x.number) === episode && validId(x.id)) || null;
}
export function safeHls(url, env = {}) {
  try {
    const parsed = new URL(url);
    const hosts = new Set([MEDIA_HOST, ...String(env.ANIMEFIRE_MEDIA_HOSTS || '').split(',').map(x => x.trim().toLowerCase()).filter(x => /^[a-z0-9.-]+$/.test(x))]);
    return parsed.protocol === 'https:' && hosts.has(parsed.hostname) && !parsed.username && !parsed.password && parsed.port === '' && parsed.pathname.length < 400 ? parsed.toString() : null;
  } catch { return null; }
}
export function convertStreams(payload, env = {}) {
  const options = Array.isArray(payload?.data?.streams) ? payload.data.streams : [];
  const known = new Set(), result = [];
  for (const audio of ['dublado', 'legendado']) for (const stream of options) {
    if (stream?.is_offline === true || stream?.audio !== audio) continue;
    const url = safeHls(stream.url, env);
    if (!url || known.has(url)) continue;
    known.add(url);
    const chapters = Array.isArray(stream.chapters) ? stream.chapters.filter(c => Number.isFinite(c.start) && Number.isFinite(c.end) && c.start >= 0 && c.end > c.start && c.end < 21600).map(c => ({ type: String(c.type || ''), start: c.start, end: c.end })) : [];
    result.push({ kind: 'direct', providerId: 'animefire', url, type: 'application/vnd.apple.mpegurl', audio, name: `AnimeFire · ${audio === 'dublado' ? 'Dublado' : 'Legendado'}`, chapters });
  }
  return result;
}
function unavailable(reasonCode, reason) { return { available: false, streams: [], provider: 'AnimeFire', providerId: 'animefire', reasonCode, reason }; }
export async function animefirePlayback(anime, season, episode, env = {}) {
  if (!animefireEnabled(env)) return unavailable('DISABLED', 'Integração AnimeFire desativada.');
  try {
    const match = await findAnime(anime, env);
    if (!match) return unavailable('MATCH_NOT_FOUND', 'Nenhum anime correspondente foi identificado com segurança pelo título e ano.');
    const show = await cacheGet(`anime:${match.id}`, 5 * 60_000, () => requestAPI(`/anime/${match.id}`, {}, env));
    if (show?.data?.hero?.id && show.data.hero.id !== match.id) return unavailable('TITLE_MISMATCH', 'A API retornou outro anime; reprodução cancelada.');
    if (show?.data?.format !== 'tv') return unavailable('NOT_TV', 'O resultado não é uma série de anime.');
    const row = findEpisode(show, season, episode);
    if (!row) return unavailable('EPISODE_NOT_FOUND', 'Este episódio ou esta temporada não está cadastrado com a mesma numeração na API AnimeFire.');
    const details = await cacheGet(`episode:${row.id}`, 90_000, () => requestAPI(`/episode/${row.id}`, {}, env));
    if (details?.data?.anime?.id && details.data.anime.id !== match.id) return unavailable('EPISODE_MISMATCH', 'A API retornou fonte de outro anime; reprodução cancelada.');
    if (details?.data?.id !== row.id) return unavailable('EPISODE_MISMATCH', 'A API retornou outro episódio; reprodução cancelada.');
    const streams = convertStreams(details, env);
    return { available: streams.length > 0, streams, provider: 'AnimeFire', providerId: 'animefire', animefireAnimeId: match.id, animefireEpisodeId: row.id,
      reasonCode: streams.length ? 'OK' : 'NO_COMPATIBLE_STREAM', reason: streams.length ? '' : 'Nenhuma fonte HLS disponível em uma origem permitida.' };
  } catch (error) {
    const reasonCode = error?.name === 'TimeoutError' ? 'API_TIMEOUT' : error?.code || 'API_ERROR';
    return unavailable(reasonCode, 'A API AnimeFire não respondeu a esta consulta; tentando alternativa.');
  }
}
