const aliases={pob:'pt-BR',pb:'pt-BR',por:'pt-PT',eng:'en',spa:'es',fre:'fr',fra:'fr',ger:'de',deu:'de',ita:'it',jpn:'ja',kor:'ko',chi:'zh',zho:'zh',zht:'zh-TW',rus:'ru',ara:'ar',dut:'nl',nld:'nl',pol:'pl',tur:'tr',ukr:'uk',hin:'hi',ind:'id',tha:'th',vie:'vi'};
const codes={pt:'por',en:'eng',es:'spa',fr:'fre',de:'ger',it:'ita',ja:'jpn',ko:'kor',zh:'chi',ru:'rus',ar:'ara',nl:'dut',pl:'pol',tr:'tur',uk:'ukr',hi:'hin',id:'ind',th:'tha',vi:'vie'};
export function captionLocale(value){
 const raw=String(value||'').trim().replace(/_/g,'-');
 const mapped=aliases[raw.toLowerCase()]||raw;
 try{const locale=Intl.getCanonicalLocales(mapped)[0];return codes[locale?.split('-')[0]]?locale:null;}catch{return null;}
}
export function preferredCaptionLocale(languages){
 for(const language of Array.isArray(languages)?languages:[languages]){const locale=captionLocale(language);if(locale)return locale;}
 return 'pt-BR';
}
export function subtitleLanguages(locale){
 const normalized=captionLocale(locale)||'pt-BR',base=normalized.split('-')[0];
 if(base==='pt')return normalized.toLowerCase()==='pt-br'?['pob','por','eng']:['por','pob','eng'];
 if(base==='zh')return /(?:TW|HK|Hant)/i.test(normalized)?['zht','chi','eng']:['chi','zht','eng'];
 return [...new Set([codes[base],'eng'])];
}
export function chooseCaption(tracks,locale,tried=new Set()){
 const wanted=captionLocale(locale)||'pt-BR',base=wanted.split('-')[0];
 return tracks.map((track,index)=>{const lang=captionLocale(track.language);return {track,index,score:lang===wanted?0:lang?.split('-')[0]===base?1:99};})
 .filter(x=>x.score<99&&!tried.has(x.track.src)).sort((a,b)=>a.score-b.score||a.index-b.index)[0]?.track;
}
