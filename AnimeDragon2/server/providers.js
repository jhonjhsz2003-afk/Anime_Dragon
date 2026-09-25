// Catalogs are never imported from these addons: the anime gate runs first.
export function providers(env) {
  return [
    {id:'primary',name:'FenixFlix · PT-BR',url:env.STREMIO_MANIFEST_URL||'https://fenixflix.fenixhub.online/manifest.json'},
    {id:'nagare',name:'Nexio Nagare · anime',url:env.NAGARE_MANIFEST_URL||'https://nagare.nexioapp.org/manifest.json'},
    {id:'animepahe',name:'AnimePahe · anime',url:env.ANIMEPAHE_MANIFEST_URL||'https://stremio-animepahe.tsz1da2a.workers.dev/manifest.json'}
  ].filter(p=>p.url!=='disabled');
}
