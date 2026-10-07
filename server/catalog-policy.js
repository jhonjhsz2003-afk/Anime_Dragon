// Curate live catalog data; there are no fixed title recommendations here.
const DAY=86400000;
const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const clamp=value=>Math.max(0,Math.min(1,value));
export function daysSince(date,now){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return Infinity;
  const value=Date.parse(date+'T00:00:00Z'),today=Date.parse(now.toISOString().slice(0,10)+'T00:00:00Z');
  return Number.isFinite(value)?(today-value)/DAY:Infinity;
}
export function currentBroadcast(item,now){
  if(item?.current_airing!==true)return false;
  const since=daysSince(item.current_airing_since,now),until=daysSince(item.current_airing_until,now);
  if(since<0||since>35||until<0||until>since)return false;
  const knownEpisode=daysSince(item?.last_episode_to_air?.air_date,now);
  // A concrete stale/future last-episode date overrides a broad discovery hit
  // (for example a rerun). Recent ended series can still qualify normally.
  return knownEpisode===Infinity||(knownEpisode>=0&&knownEpisode<=35);
}
export function currentCatalogItem(item,now,maxPremiereAge=365){
  const premiere=daysSince(item?.first_air_date,now),episode=daysSince(item?.last_episode_to_air?.air_date,now);
  if(premiere<0)return false;
  return premiere<=maxPremiereAge||(episode>=0&&episode<=35)||finite(item?.weekly_trending)>0||currentBroadcast(item,now);
}
export function mergeCatalogItems(items){
  const result=new Map();
  for(const item of items.filter(Boolean)){
    const id=Number(item.id);if(!Number.isSafeInteger(id)||id<1)continue;
    const previous=result.get(id);if(!previous){result.set(id,item);continue;}
    const genres=[...new Set([...(previous.genre_ids||[]),...(item.genre_ids||[]),...(previous.genres||[]).map(g=>g.id),...(item.genres||[]).map(g=>g.id)])];
    const merged={...previous,...item,genre_ids:genres};
    for(const name of ['weekly_trending','external_trending','site_viewers','popularity','vote_count'])merged[name]=Math.max(finite(previous[name]),finite(item[name]));
    merged.curation_genres=[...new Set([...(previous.curation_genres||[]),...(item.curation_genres||[])])];
    if(!merged.last_episode_to_air)merged.last_episode_to_air=previous.last_episode_to_air||null;
    result.set(id,merged);
  }
  return [...result.values()];
}
const tmdbGenre={10759:'action',10765:'fantasy',35:'comedy',18:'drama',9648:'mystery',10762:'kids'};
function genresOf(item){
  const explicit=(item.curation_genres||[]).filter(g=>typeof g==='string').map(g=>g.toLowerCase());
  return [...new Set(explicit.length?explicit:[...(item.genre_ids||[]),...(item.genres||[]).map(g=>g.id)].map(id=>tmdbGenre[id]).filter(Boolean))];
}
export function catalogScore(item,now,{quality=false}={}){
  const votes=finite(item.vote_count),rating=Math.min(10,finite(item.vote_average));
  // A handful of perfect votes must not outrank an established audience score.
  const confidence=votes/(votes+50),reliableRating=rating*confidence+7*(1-confidence);
  const premiere=daysSince(item.first_air_date,now),episode=daysSince(item.last_episode_to_air?.air_date,now);
  const newness=premiere>=0?clamp(1-premiere/180):0;
  const active=Number.isFinite(episode)&&episode>=0?clamp(1-episode/35):(currentBroadcast(item,now)?0.5:0);
  const popularity=Math.min(20,Math.log2(1+finite(item.popularity))*2.2);
  const weekly=clamp(finite(item.weekly_trending)),external=clamp(finite(item.external_trending));
  const local=Math.min(6,Math.log2(1+finite(item.site_viewers)));
  return reliableRating*(quality?8:3)+weekly*40+external*12+popularity+active*15+newness*8+local;
}
export function rankDiverseCatalog(items,now,limit=20,options={}){
  const candidates=mergeCatalogItems(items).map((item,index)=>({item,index,score:catalogScore(item,now,options),genres:genresOf(item)}));
  const selected=[],counts=new Map();
  while(candidates.length&&selected.length<limit){
    let best=0,bestScore=-Infinity;
    for(let i=0;i<candidates.length;i++){
      const row=candidates[i],repetition=row.genres.length?row.genres.reduce((n,g)=>n+(counts.get(g)||0),0)/row.genres.length:0;
      // A soft penalty adds variety among similarly strong choices. It never
      // bans romance or forces a weak, unrelated title into the catalog.
      const adjusted=row.score-Math.min(24,repetition*9);
      if(adjusted>bestScore){best=i;bestScore=adjusted;}
    }
    const [row]=candidates.splice(best,1);selected.push(row.item);
    for(const genre of row.genres)counts.set(genre,(counts.get(genre)||0)+1);
  }
  return selected;
}
