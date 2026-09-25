// Only public catalog responses survive reloads. Never retain account data,
// comments, private lists, signed playback URLs or personal manifests here.
const publicPath=path=>/^\/api\/catalog\/(?:home|discover|search|tv\/\d+(?:\/season\/\d+|\/recommendations)?)(?:\?|$)/.test(path);
export function createCatalogCache(storage,now=Date.now){
 const key='ad_public_catalog_v96',entries=new Map();
 try{const data=JSON.parse(storage?.getItem(key)||'[]');for(const [path,entry] of Array.isArray(data)?data:[]){if(publicPath(path)&&entry?.expires>now()&&entry.data?.ok===true)entries.set(path,entry);if(entries.size>=24)break;}}catch{}
 return {
  get(path){const item=entries.get(path);if(!publicPath(path)||!item||item.expires<=now())return null;return item;},
  put(path,data,expires){
   if(!publicPath(path)||data?.ok!==true)return;
   entries.delete(path);entries.set(path,{data,expires});
   while(entries.size>24)entries.delete(entries.keys().next().value);
   try{let text=JSON.stringify([...entries]);while(text.length>450000&&entries.size>1){entries.delete(entries.keys().next().value);text=JSON.stringify([...entries]);}if(text.length<=450000)storage?.setItem(key,text);}catch{}
  }
 };
}
export function createIntentPreloader(read,now=Date.now){
 const pending=new Map(),seen=new Map();
 return function warm(path){
   if(!publicPath(path)||seen.get(path)>now())return Promise.resolve(null);
   if(pending.has(path))return pending.get(path);
   if(pending.size>=2)return Promise.resolve(null);
   const task=Promise.resolve().then(()=>read(path)).then(data=>{if(seen.size>=80)seen.delete(seen.keys().next().value);seen.set(path,now()+60000);return data;}).catch(()=>null).finally(()=>pending.delete(path));
   pending.set(path,task);return task;
 };
}
