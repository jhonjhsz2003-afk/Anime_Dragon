// Canonical anime IDs are checked before any addon resource is queried.
const subsenseConfig=encodeURIComponent(JSON.stringify({languages:['pob','por','eng'],maxSubtitles:5,keepAss:false}));
export function addons(env) {
  return [
    {id:'primary',name:'FenixFlix · PT-BR',role:'stream',url:env.STREMIO_MANIFEST_URL||'https://fenixflix.fenixhub.online/manifest.json'},
    {id:'nagare',name:'Nexio Nagare · anime',role:'stream',url:env.NAGARE_MANIFEST_URL||'https://nagare.nexioapp.org/manifest.json'},
    {id:'animepahe',name:'AnimePahe · anime',role:'stream',url:env.ANIMEPAHE_MANIFEST_URL||'https://stremio-animepahe.tsz1da2a.workers.dev/manifest.json'},
    {id:'animesbr',name:'Animes BR',role:'stream',url:env.ANIMESBR_MANIFEST_URL||'https://animes-br-self.vercel.app/manifest.json'},
    {id:'piratebay',name:'ThePirateBay+',role:'external',url:env.TPB_MANIFEST_URL||'https://thepiratebay-plus.strem.fun/manifest.json'},
    {id:'subsense',name:'SubSense',role:'subtitles',url:env.SUBSENSE_MANIFEST_URL||`https://subsense.nepiraw.com/${subsenseConfig}/manifest.json`},
    {id:'aiometadata',name:'AIO Metadata',role:'metadata',configured:!!env.AIOMETADATA_MANIFEST_URL,url:env.AIOMETADATA_MANIFEST_URL||'https://aiometadata.elfhosted.com/stremio/manifest.json'}
  ].filter(p=>p.url!=='disabled');
}
export const providers=env=>addons(env).filter(p=>p.role==='stream'||p.role==='external');
