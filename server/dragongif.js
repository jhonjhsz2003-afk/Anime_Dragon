/** AnimeDragon -> DragonGIF public API via Cloudflare Service Binding. */
export const FILE_PATH = /^\/api\/dragongif\/file\/(dg_[a-f0-9]{32})$/;
const ID=/^dg_[a-f0-9]{32}$/;
const err=(status,message)=>Object.assign(new Error(message),{status});
export function dragonFileId(value){return typeof value==='string'?FILE_PATH.exec(value)?.[1]||null:null;}
export function dragonBase(env){
 const raw=String(env.DRAGONGIF_PUBLIC_URL||'').replace(/\/$/,'');
 let url;try{url=new URL(raw)}catch{throw err(503,'Configure DRAGONGIF_PUBLIC_URL no AnimeDragon com o endereço público do DragonGIF.');}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw err(503,'Endereço DragonGIF inválido. Configure uma URL pública HTTPS sem caminho.');
 return url.origin;
}
export async function dragonFetch(env,path){
 const base=dragonBase(env),endpoint=base+path;
 let resp;
 try{resp=await (env.DRAGONGIF?.fetch?env.DRAGONGIF.fetch(endpoint,{headers:{Accept:'application/json'}}):fetch(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)}));}
 catch{throw err(503,'DragonGIF indisponível. Verifique se o Worker foi publicado e se o Service Binding está configurado.');}
 const data=await resp.json().catch(()=>null);
 if(!resp.ok||!data?.ok)throw err(resp.status===404?404:resp.status===429?429:503,data?.error||'DragonGIF não respondeu corretamente.');
 return data;
}
export async function validateDragonItem(env,id,kind){
 if(!ID.test(id))throw err(400,'Arquivo DragonGIF inválido.');
 const data=await dragonFetch(env,`/api/v1/media/${id}`);
 if(data.item?.kind!==kind)throw err(400,`Este arquivo não é um ${kind==='gifs'?'GIF':'sticker'} público do DragonGIF.`);
 return data.item;
}
export async function verifyDragonStickers(env,stickers){
 const ids=[...new Set((stickers||[]).map(s=>dragonFileId(s.id)).filter(Boolean))];
 await Promise.all(ids.map(id=>validateDragonItem(env,id,'stickers')));
}
export async function dragonRouter(request,env){
 if(request.method!=='GET'&&request.method!=='HEAD')throw err(405,'Método não permitido.');
 const url=new URL(request.url),file=url.pathname.match(FILE_PATH);
 if(file){
  const data=await dragonFetch(env,`/api/v1/media/${file[1]}`);
  const item=data.item;
  const origin=dragonBase(env),src=new URL(item.url);
  if(src.origin!==origin||!src.pathname.startsWith('/media/')||src.username||src.password)throw err(502,'O DragonGIF retornou um endereço de mídia inválido.');
  return new Response(null,{status:302,headers:{Location:src.href,'Cache-Control':'public, max-age=180','X-Content-Type-Options':'nosniff'}});
 }
 if(url.pathname==='/api/dragongif/search'){
  const type=url.searchParams.get('type')||'all';if(!['all','gifs','stickers'].includes(type))throw err(400,'Tipo inválido.');
  const q=(url.searchParams.get('q')||'').slice(0,100),page=Math.min(10000,Math.max(1,parseInt(url.searchParams.get('page'),10)||1)),limit=Math.min(100,Math.max(1,parseInt(url.searchParams.get('limit'),10)||36));
  const qs=new URLSearchParams({type,q,page:String(page),limit:String(limit)});
  const result=await dragonFetch(env,'/api/v1/media?'+qs);
  const items=(Array.isArray(result.items)?result.items:[]).filter(item=>ID.test(item.id)&&['gifs','stickers'].includes(item.kind)).map(item=>({id:item.id,title:String(item.title||'Sem título').slice(0,120),kind:item.kind==='gifs'?'gif':'sticker',url:`/api/dragongif/file/${item.id}`,tags:item.tags||[]}));
  return Response.json({ok:true,items,page,limit,hasMore:!!result.hasMore,query:q,type},{headers:{'Cache-Control':'public, max-age=20','X-Content-Type-Options':'nosniff'}});
 }
 if(url.pathname==='/api/dragongif/status'){
  const result=await dragonFetch(env,'/api/v1/stats');
  return Response.json({ok:true,gifs:result.gifs||0,stickers:result.stickers||0,total:result.total||0},{headers:{'Cache-Control':'public, max-age=30'}});
 }
 throw err(404,'Rota DragonGIF não encontrada.');
}
