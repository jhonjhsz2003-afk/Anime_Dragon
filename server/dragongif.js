/** AnimeDragon -> DragonGIF public HTTPS API, inclusive entre contas Cloudflare. */
export const DRAGONGIF_ORIGIN='https://dragongif-api.jhonjhszgame2003.workers.dev';
/** URLs sob o nosso próprio catálogo estático; nenhum host arbitrário é aceito. */
export function dragonMediaUrl(value,kind){
 if(typeof value!=='string'||value.length>1000||!value.startsWith(DRAGONGIF_ORIGIN+'/media/'))return false;
 let u;try{u=new URL(value)}catch{return false}
 if(u.origin!==DRAGONGIF_ORIGIN||u.href!==value||u.search||u.hash||u.username||u.password)return false;
 const match=/^\/media\/(gifs|stickers)\/(.+)$/i.exec(u.pathname);
 if(!match||(kind&&match[1]!==kind))return false;
 const parts=match[2].split('/');
 if(parts.some(x=>!x||/%(?:2f|5c|00)/i.test(x)))return false;
 try{if(parts.some(x=>{const d=decodeURIComponent(x);return d==='.'||d==='..'||/[\\\x00-\x1f]/.test(d)}))return false}catch{return false}
 return /\.(gif|webp|png|apng|avif)$/i.test(u.pathname);
}
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
 try{resp=await fetch(endpoint,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(9000)});}
 catch{throw err(503,'Conexão Worker→DragonGIF falhou. Confirme se o DragonGIF está publicado e se o AnimeDragon usa global_fetch_strictly_public no wrangler.toml.');}
 const data=await resp.json().catch(()=>null);
 if(!resp.ok||!data?.ok)throw err(resp.status===404?404:resp.status===429?429:503,data?.error||`DragonGIF retornou HTTP ${resp.status} sem JSON válido. Verifique o acesso Worker→Worker e a compatibilidade global_fetch_strictly_public.`);
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
  // 302: o navegador acessa diretamente a API, sem fetch Worker->Worker.
  const type=url.searchParams.get('type')||'all';if(!['all','gifs','stickers'].includes(type))throw err(400,'Tipo inválido.');
  const q=(url.searchParams.get('q')||'').slice(0,100),page=Math.min(10000,Math.max(1,parseInt(url.searchParams.get('page'),10)||1)),limit=Math.min(100,Math.max(1,parseInt(url.searchParams.get('limit'),10)||36));
  return Response.redirect(dragonBase(env)+'/api/v1/media?'+new URLSearchParams({type,q,page:String(page),limit:String(limit)}),302);
 }
 if(url.pathname==='/api/dragongif/status'){
  return Response.redirect(dragonBase(env)+'/api/v1/stats',302);
 }
 throw err(404,'Rota DragonGIF não encontrada.');
}
