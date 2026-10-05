// Verified TMDB 127532 / IMDb tt21209876 ordering. Only apply while TMDB
// presents the two parts as one 25-episode season; never guess by title.
export function episodeCoordinates(anime,id,season,episode){
 if(Number(anime.id)===127532&&id==='tt21209876'&&season===1&&episode>=13&&episode<=25&&anime.seasons?.some(s=>s.season_number===1&&s.episode_count===25)&&!anime.seasons?.some(s=>s.season_number===2&&s.episode_count>0))return {season:2,episode:episode-12};
 return {season,episode};
}

// Only accept an unambiguous first-season match: exact title and premiere date.
export function verifiedAnimeMatch(anime,candidates,season,episode){
 if(season!==1||!Number.isInteger(episode)||episode<1)return null;
 const clean=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const names=[anime.name,anime.original_name,anime.title].filter(Boolean).map(clean);
 const date=Date.parse(anime.first_air_date);if(!Number.isFinite(date))return null;
 const matches=candidates.filter(m=>/^anilist:\d+$/.test(m.id||'')&&m.type==='anime'&&Number(m.episodes)>=episode&&
   /Format: TV(?: \||$)/.test(m.description||'')&&Math.abs(Date.parse(m.released)-date)<=2*86400000&&
   [m.name,m.englishName,m.altName].filter(Boolean).some(n=>names.includes(clean(n))));
 return matches.length===1?matches[0]:null;
}
export function verifiedMappedEpisode(mapped,anime,season,episode){
 if(!mapped?.episodes)return null;
 const guard=mapped.seasonCounts;
 if(guard&&Object.entries(guard).some(([n,count])=>Number(anime.seasons?.find(s=>s.season_number===Number(n))?.episode_count||0)!==count))return null;
 return mapped.episodes[`${season}/${episode}`]||null;
}
