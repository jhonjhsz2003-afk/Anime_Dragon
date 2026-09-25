// Verified TMDB 127532 / IMDb tt21209876 ordering. Only apply while TMDB
// presents the two parts as one 25-episode season; never guess by title.
export function episodeCoordinates(anime,id,season,episode){
 if(Number(anime.id)===127532&&id==='tt21209876'&&season===1&&episode>=13&&episode<=25&&anime.seasons?.some(s=>s.season_number===1&&s.episode_count===25)&&!anime.seasons?.some(s=>s.season_number===2&&s.episode_count>0))return {season:2,episode:episode-12};
 return {season,episode};
}
