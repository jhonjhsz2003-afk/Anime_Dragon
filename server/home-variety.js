/** Distribui recomendações entre as vitrines sem repetir o mesmo anime. */
export function diversifyHomeRails(rails, limit=20){
 const names=['updated','recent','top','popular','trending'];
 const unique={};
 for(const name of names){
  const ids=new Set();
  unique[name]=(rails[name]||[]).filter(item=>{
   const id=Number(item?.id);if(!Number.isSafeInteger(id)||id<1||ids.has(id))return false;
   ids.add(id);return true;
  });
 }
 const output=Object.fromEntries(names.map(name=>[name,[]]));
 const used=new Set();
 // Notícias da semana têm prioridade. As outras listas são alternadas para
 // impedir que uma vitrine consuma todos os animes antes da próxima.
 for(const item of unique.updated.slice(0,Math.min(limit,18))){output.updated.push(item);used.add(Number(item.id))}
 const order=['recent','top','popular','trending'];
 for(let round=0;round<limit;round++){
  let madeProgress=false;
  for(const name of order){
   if(output[name].length>=limit)continue;
   const next=unique[name].find(item=>!used.has(Number(item.id)));
   if(next){output[name].push(next);used.add(next.id);madeProgress=true}
  }
  if(!madeProgress)break;
 }
 // Catálogos pequenos não oferecem títulos exclusivos suficientes. Mantemos
 // o conteúdo das outras seções com um fallback curto, sem inventar títulos.
 for(const name of names){
  if(!unique[name].length)continue;
  for(const item of unique[name]){
   if(output[name].length>=Math.min(6,limit))break;
   if(!output[name].some(p=>Number(p.id)===Number(item.id)))output[name].push(item);
  }
 }
 return output;
}
