/** AnimeFire é prioritário quando habilitado; EmbedMovies é alternativa. */
export function providers(env={}){return [...(String(env.ANIMEFIRE_ENABLED||'').toLowerCase()==='true'?[{id:'animefire',name:'AnimeFire',role:'stream'}]:[]),{id:'embedmovies',name:'EmbedMovies',role:'stream'}];}
