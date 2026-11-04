/** Incorporação pública documentada pelo EmbedMovies (sem download de streams). */
export const EMBEDMOVIES_PROVIDER_ID = 'embedmovies';
export const EMBEDMOVIES_NAME = 'EmbedMovies';
export const EMBEDMOVIES_HOST = 'myembed.biz';

/** AnimeDragon continua sendo só animes; usa ID de séries/animes do TMDB. */
export function episodeEmbedUrl(tmdbId, season, episode) {
  for (const value of [tmdbId, season, episode]) {
    if (!Number.isSafeInteger(Number(value)) || !/^\d{1,10}$/.test(String(value))) return null;
  }
  const id=Number(tmdbId), s=Number(season), e=Number(episode);
  if(id<=0 || s>1000 || e<=0 || e>10000)return null;
  return `https://${EMBEDMOVIES_HOST}/serie/${id}/${s}/${e}`;
}

/** URL preparada não é prova de que a obra está disponível no serviço. */
export function embedMoviesPlayback(anime,season,episode) {
  const url=episodeEmbedUrl(anime?.id,season,episode);
  if(!url)return {ok:true,available:false,streams:[],provider:EMBEDMOVIES_NAME,providerId:EMBEDMOVIES_PROVIDER_ID,
    reason:'Identificador do anime, temporada ou episódio inválido.'};
  const embed={kind:'embed',url,type:'text/html',name:'EmbedMovies · episódio',providerId:EMBEDMOVIES_PROVIDER_ID};
  return {ok:true,available:true,streams:[embed],embed,provider:EMBEDMOVIES_NAME,providerId:EMBEDMOVIES_PROVIDER_ID,
    notice:'Incorporação gratuita via iframe. A presença da URL não garante que o episódio exista. A disponibilidade, os controles e eventuais anúncios são responsabilidade do provedor.'};
}
