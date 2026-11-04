import {withinCatalogBudget} from './catalog-budget.js';

const TIME_ZONE='America/Sao_Paulo';
const priority={series:0,season:1,episode:2};
export function releaseToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
}
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const upcoming=(value,today)=>validDate(value)&&value>today;
const positive=value=>Number.isSafeInteger(Number(value))&&Number(value)>0;
const seasonNumber=value=>value!==null&&value!==undefined&&Number.isSafeInteger(Number(value))&&Number(value)>=0;

// Every entry represents an announced future event. A series' old premiere
// date cannot be repurposed as the date of a new season or episode.
export function releaseEvents(item,{normalize=x=>x,today=releaseToday()}={}){
 if(!item||!positive(item.id)||item.adult===true||item.media_type==='movie')return [];
 const anime=normalize(item),events=[],last=item.last_episode_to_air,lastIsAired=last&&validDate(last.air_date)&&last.air_date<=today;
 const seasons=(item.seasons||[]).filter(s=>positive(s.season_number)&&upcoming(s.air_date,today)&&!(lastIsAired&&positive(last.season_number)&&Number(last.season_number)>=Number(s.season_number))),next=item.next_episode_to_air;
 const alreadyAired=next&&lastIsAired&&((Number(next.season_number)===Number(last.season_number)&&positive(last.episode_number)&&Number(next.episode_number)<=Number(last.episode_number))||(positive(next.season_number)&&Number(last.season_number)>Number(next.season_number)));
 const nextIsFuture=next&&!alreadyAired&&upcoming(next.air_date,today)&&seasonNumber(next.season_number)&&positive(next.episode_number);
 const add=(kind,date,season=null,episode=null,name='')=>events.push({key:`${item.id}:${kind}:${season??'unknown'}:${episode??'unknown'}:${date}`,kind,air_date:date,season_number:season,episode_number:episode,episode_name:String(name||''),anime});
 if(upcoming(item.first_air_date,today)&&!lastIsAired){
  const firstSeason=seasons.find(s=>s.air_date===item.first_air_date),firstEpisode=nextIsFuture&&next.air_date===item.first_air_date&&Number(next.episode_number)===1?next:null;
  add('series',item.first_air_date,firstEpisode?Number(firstEpisode.season_number):firstSeason?Number(firstSeason.season_number):null,firstEpisode?1:null,firstEpisode?.name);
 }
 for(const season of seasons){
  const number=Number(season.season_number),firstEpisode=nextIsFuture&&Number(next.season_number)===number&&Number(next.episode_number)===1&&next.air_date===season.air_date?next:null;
  if(number===1&&events.some(event=>event.kind==='series'&&event.air_date===season.air_date))continue;
  add('season',season.air_date,number,firstEpisode?1:null,firstEpisode?.name||season.name);
 }
 if(nextIsFuture){
  const season=Number(next.season_number),episode=Number(next.episode_number);
  const premiere=episode===1&&events.find(event=>event.air_date===next.air_date&&(event.kind==='series'||event.kind==='season'&&event.season_number===season));
  if(!premiere)add('episode',next.air_date,season,episode,next.name);
 }
 return events;
}

export function sortReleaseEvents(items){
 const unique=new Map();for(const item of items)if(item?.key&&!unique.has(item.key))unique.set(item.key,item);
 return [...unique.values()].sort((a,b)=>a.air_date.localeCompare(b.air_date)||priority[a.kind]-priority[b.kind]||String(a.anime.title||a.anime.name||'').localeCompare(String(b.anime.title||b.anime.name||''),'pt-BR')||Number(a.anime.id)-Number(b.anime.id));
}

// Dependencies reuse the existing anime validation, TMDB credentials, cache,
// and timeouts. At most two discovery calls and forty detail calls are started.
export async function getReleases({discover,detail,normalize=x=>x,page=1,now=new Date(),waitUntil,budgetMs=4000,summary=false}={}){
 if(typeof discover!=='function'||!summary&&typeof detail!=='function')throw new TypeError('As fontes do catálogo precisam ser fornecidas.');
 page=Math.max(1,Math.min(500,Math.trunc(Number(page))||1));
 const asOf=releaseToday(now),from=new Date(Date.parse(asOf+'T00:00:00Z')+86400000).toISOString().slice(0,10),deadline=Date.now()+Math.max(1,summary?Math.min(1800,budgetMs):budgetMs),missing={results:[],totalPages:0,missing:true};
 const background=typeof waitUntil==='function'?task=>waitUntil(task):undefined;
 const query=params=>withinCatalogBudget(Promise.resolve().then(()=>discover(params)),Math.max(1,deadline-Date.now()),missing,background);
 const premieresTask=query({page,sort_by:'first_air_date.asc','first_air_date.gte':from,include_null_first_air_dates:'false',timezone:TIME_ZONE});
 const airingTask=query({page,sort_by:'popularity.desc','air_date.gte':from,timezone:TIME_ZONE});
 if(summary){
  // A confirmed premiere needs no season/episode lookup. Do not hold its
  // first paint behind the unrelated broadcast discovery or forty details.
  let airingPreview=null;airingTask.then(result=>{airingPreview=result;});
  const premieres=await premieresTask;
  if(premieres===missing&&(!airingPreview||airingPreview===missing))throw Object.assign(new Error('Não foi possível atualizar os lançamentos. Tente novamente em instantes.'),{status:503});
  const rows=[...(premieres.results||[]).slice(0,20),...(airingPreview?.results||[]).slice(0,20)];
  const items=sortReleaseEvents(rows.flatMap(item=>releaseEvents(item,{normalize,today:asOf})).filter(event=>event.kind==='series'));
  const totalPages=Math.max(0,Math.min(500,Number(premieres.totalPages)||0),Math.min(500,Number(airingPreview?.totalPages)||0));
  return {ok:true,items,asOf,from,timeZone:TIME_ZONE,source:'TMDB',page,totalPages,hasMore:page<totalPages,summary:true,phase:'summary',complete:false,resolvedIds:[],...(premieres===missing?{partial:true}:{})};
 }
 const [premieres,airing]=await Promise.all([premieresTask,airingTask]);
 if(premieres===missing&&airing===missing)throw Object.assign(new Error('Não foi possível atualizar os lançamentos. Tente novamente em instantes.'),{status:503});
 const candidates=new Map();
 for(const item of [...(premieres.results||[]).slice(0,20),...(airing.results||[]).slice(0,20)])if(positive(item?.id)&&!candidates.has(Number(item.id)))candidates.set(Number(item.id),item);
 const rows=[...candidates.values()],details=new Map();let cursor=0,failed=0;
 const enrich=async()=>{while(cursor<rows.length&&Date.now()<deadline){const item=rows[cursor++];try{const raw=await detail(item.id);if(raw)details.set(Number(item.id),raw);else failed++;}catch{failed++;}}};
 const task=Promise.all(Array.from({length:Math.min(6,rows.length)},enrich));
 const timedOut=await withinCatalogBudget(task,Math.max(1,deadline-Date.now()),null,background)===null;
 const items=sortReleaseEvents(rows.flatMap(item=>releaseEvents(details.get(Number(item.id))||item,{normalize,today:asOf})));
 const totalPages=Math.max(0,...[premieres,airing].map(result=>Math.min(500,Math.max(0,Number(result.totalPages)||0))));
 const complete=premieres!==missing&&airing!==missing&&!timedOut&&!failed&&details.size===rows.length;
 return {ok:true,items,asOf,from,timeZone:TIME_ZONE,source:'TMDB',page,totalPages,hasMore:page<totalPages,phase:'complete',complete,resolvedIds:[...details.keys()],...(!complete?{partial:true}:{})};
}
