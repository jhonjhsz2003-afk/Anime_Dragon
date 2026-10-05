import {captionLocale,subtitleLanguages} from '../web/js/caption-language.js';
import {addons} from './providers.js';
import {manifest,capability,readAddon,publicHttps} from './addon.js';
import {episodeCoordinates} from './episode-identity.js';
const unavailable=reason=>({ok:true,available:false,reason});
const imdb=anime=>/^tt\d+$/.test(anime.external_ids?.imdb_id||'')?anime.external_ids.imdb_id:null;

export async function addonStatus(env){
 return Promise.all(addons(env).map(async p=>{
   const base={id:p.id,name:p.name,role:p.role};
   if(p.configured===false)return {...base,status:'configuration_required',message:'O responsável pelo site precisa conectar um manifesto configurado.'};
   try{const m=await manifest({STREMIO_MANIFEST_URL:p.url});
     const resource=p.role==='metadata'?'meta':p.role==='external'?'stream':p.role;
     if(!m.data.resources.some(r=>(typeof r==='string'?r:r.name)===resource))return {...base,status:'incompatible',message:'O serviço não anuncia a função esperada.'};
     return {...base,status:'ready',message:p.role==='external'?'Respondeu. Torrents exigem um aplicativo compatível.':'Serviço respondeu. A disponibilidade varia por episódio.'};
   }catch{return {...base,status:'unavailable',message:'O serviço não respondeu ou precisa de configuração. As outras fontes continuam disponíveis.'};}
 }));
}

export async function addonMetadata(anime,env){
 const p=addons(env).find(p=>p.id==='aiometadata'),id=imdb(anime);
 if(!p?.configured||!id)return unavailable('Metadados extras ainda não configurados para este anime.');
 try{
   const m=await manifest({STREMIO_MANIFEST_URL:p.url});
   if(!capability(m.data,'meta',id))return unavailable('Identificador não aceito pelo serviço.');
   const d=await readAddon(`${m.base}/meta/series/${encodeURIComponent(id)}.json`,300000);
   if(d.meta?.id!==id)return unavailable('O serviço não confirmou a identidade deste anime.');
   return {ok:true,available:true,description:typeof d.meta.description==='string'?d.meta.description.slice(0,6000):'',cast:(Array.isArray(d.meta.cast)?d.meta.cast:[]).filter(x=>typeof x==='string').slice(0,12),provider:p.name};
 }catch{return unavailable('Metadados extras temporariamente indisponíveis.');}
}

export function normalizeSubtitles(rows){
 const languages={pob:'pt-BR',pb:'pt-BR',por:'pt',eng:'en',jpn:'ja'};
 const unique=new Map();
 for(const t of Array.isArray(rows)?rows:[]){
   if(!publicHttps(t.url))continue;
   const url=new URL(t.url);url.hash='';if(unique.has(url.href))continue;
   const language=languages[t.lang]||captionLocale(t.lang)||'und';
   const name=language==='pt-BR'?'Português (Brasil)':language==='pt'?'Português':language==='en'?'English':language;
   unique.set(url.href,{src:url.href,language,label:`${name} · ${String(t.label||t.source||'SubSense').slice(0,180)}`});
 }
 return [...unique.values()].sort((a,b)=>subtitleRank(a.language)-subtitleRank(b.language)).slice(0,30);
}
const subtitleRank=lang=>lang==='pt-BR'?0:lang==='pt'?1:lang==='en'?2:3;
export async function addonSubtitles(anime,season,episode,env,locale='pt-BR'){
 const p=addons(env).find(p=>p.role==='subtitles'),id=imdb(anime);
 if(!p||!id)return {...unavailable('Não há correspondência confirmada para buscar legendas.'),subtitles:[]};
 try{
   const target=episodeCoordinates(anime,id,season,episode);
   const config=encodeURIComponent(JSON.stringify({languages:subtitleLanguages(locale),maxSubtitles:5,keepAss:false}));
   const subtitleUrl=env.SUBSENSE_MANIFEST_URL||`https://subsense.nepiraw.com/${config}/manifest.json`;
   const m=await manifest({STREMIO_MANIFEST_URL:subtitleUrl}),videoId=`${id}:${target.season}:${target.episode}`;
   if(!capability(m.data,'subtitles',videoId))return {...unavailable('O serviço não aceita o identificador deste episódio.'),subtitles:[]};
   const d=await readAddon(`${m.base}/subtitles/series/${encodeURIComponent(videoId)}.json`,300000);
   const subtitles=normalizeSubtitles(d.subtitles);
   return {ok:true,available:!!subtitles.length,subtitles,reason:subtitles.length?'':'Nenhuma legenda encontrada para este episódio.'};
 }catch{return {...unavailable('O serviço de legendas está indisponível. O vídeo pode continuar.'),subtitles:[]};}
}
