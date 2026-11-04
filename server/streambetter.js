/** Incorporação pública documentada pelo StreamBetter (sem download de streams). */
export const STREAMBETTER_PROVIDER_ID = 'streambetter';
export const STREAMBETTER_NAME = 'StreamBetter';
export const STREAMBETTER_HOST = 'streambetter.lat';

/** AnimeDragon continua sendo só animes; usa ID de séries/animes do TMDB. */
export function episodeEmbedUrl(tmdbId, season, episode) {
  for (const value of [tmdbId, season, episode]) {
    if (!Number.isSafeInteger(Number(value)) || !/^\d{1,10}$/.test(String(value))) return null;
  }
  const id=Number(tmdbId), s=Number(season), e=Number(episode);
  if(id<=0 || s>1000 || e<=0 || e>10000)return null;
  return `https://${STREAMBETTER_HOST}/serie/${id}/${s}/${e}`;
}

/** URL preparada não é prova de que a obra está disponível no serviço. */
export function streamBetterPlayback(anime,season,episode) {
  const url=episodeEmbedUrl(anime?.id,season,episode);
  if(!url)return {ok:true,available:false,streams:[],provider:STREAMBETTER_NAME,providerId:STREAMBETTER_PROVIDER_ID,
    reason:'Identificador do anime, temporada ou episódio inválido.'};
  const embed={kind:'embed',url,type:'text/html',name:'StreamBetter · episódio',providerId:STREAMBETTER_PROVIDER_ID};
  return {ok:true,available:true,streams:[embed],embed,provider:STREAMBETTER_NAME,providerId:STREAMBETTER_PROVIDER_ID,
    notice:'Incorporação gratuita via iframe. A presença da URL não garante que o episódio exista. A disponibilidade, os controles e eventuais anúncios são responsabilidade do provedor.'};
}
