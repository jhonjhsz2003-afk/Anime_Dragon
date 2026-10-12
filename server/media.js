import {database} from './database.js';
import {getUser,throttle} from './auth.js';
import {giphyAvatar,giphyMarker} from './giphy-avatar.js';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
export const MAX_AVATAR_BYTES=1900000;
// Keep a margin below D1's 2 MB row limit; binary avoids base64 expansion.
export function avatarBytes(data){return typeof data==='string'?Uint8Array.from(atob(data),c=>c.charCodeAt(0)):new Uint8Array(data);}
export function imageType(bytes){
 const ascii=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
 if(bytes.length<24)return null;
 if(['GIF87a','GIF89a'].includes(ascii(0,6))&&bytes[bytes.length-1]===0x3b)return 'image/gif';
 if(bytes[0]===0x89&&ascii(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.at(-2)===255&&bytes.at(-1)===217)return 'image/jpeg';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
 return null;
}
export async function media(request,env){
 env=await database(env);const url=new URL(request.url);
 const read=url.pathname.match(/^\/api\/avatar\/([a-zA-Z0-9-]{1,80})$/);
 if(read){
   if(request.method!=='GET')throw fail(405,'Método não permitido.');
   const row=await env.DB.prepare('SELECT mime,data FROM profile_media WHERE user_id=?').bind(read[1]).first();
   if(!row)throw fail(404,'Foto não encontrada.');
   return new Response(avatarBytes(row.data),{headers:{'Content-Type':row.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; sandbox",'Cross-Origin-Resource-Policy':'same-origin'}});
 }
 if(!['/api/profile/avatar','/api/profile/avatar/crop','/api/profile/avatar/reset','/api/profile/avatar/giphy'].includes(url.pathname))throw fail(404,'Página não encontrada.');
 if(request.method!=='POST')throw fail(405,'Método não permitido.');
 const user=await getUser(request,env);if(!user)throw fail(401,'Entre para alterar sua foto.');
 if(request.headers.get('Origin')!==url.origin)throw fail(403,'Origem inválida.');
 await throttle(env,'avatar:'+user.id,30);
 if(url.pathname.endsWith('/reset')){
   await env.DB.batch([env.DB.prepare('DELETE FROM profile_media WHERE user_id=?').bind(user.id),env.DB.prepare('UPDATE users SET avatar_url=?,updated_at=? WHERE id=?').bind('/assets/avatar-default.svg',new Date().toISOString(),user.id)]);
   return json({ok:true,avatar:'/assets/avatar-default.svg',avatarFrame:{x:50,y:50,zoom:100}});
 }
 const x=Number(url.searchParams.get('x')??50),y=Number(url.searchParams.get('y')??50),zoom=Number(url.searchParams.get('zoom')??100);
 if(![x,y,zoom].every(Number.isFinite)||x<0||x>100||y<0||y>100||zoom<100||zoom>300)throw fail(400,'Ajuste de imagem inválido.');
 if(url.pathname.endsWith('/giphy')){
   if(!String(env.GIPHY_API_KEY||'').trim())throw fail(503,'A galeria de GIFs ainda não foi ativada.');
   if(Number(request.headers.get('Content-Length'))>512)throw fail(413,'Escolha um GIF da galeria.');
   const reader=request.body?.getReader();if(!reader)throw fail(400,'Escolha um GIF da galeria.');const chunks=[];let length=0;
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>512){await reader.cancel();throw fail(413,'Escolha um GIF da galeria.')}chunks.push(value)}
   const bytes=new Uint8Array(length);let cursor=0;for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.length}const text=new TextDecoder().decode(bytes);
   let data;try{data=JSON.parse(text)}catch{throw fail(400,'Escolha um GIF da galeria.')}
   if(!data||typeof data!=='object'||Array.isArray(data))throw fail(400,'GIF inválido.');
   const avatar=giphyMarker(data.id,{x,y,zoom});if(!avatar)throw fail(400,'GIF inválido.');
   await env.DB.batch([env.DB.prepare('DELETE FROM profile_media WHERE user_id=?').bind(user.id),env.DB.prepare('UPDATE users SET avatar_url=?,updated_at=? WHERE id=?').bind(avatar,new Date().toISOString(),user.id)]);
   return json({ok:true,avatar,avatarFrame:{x,y,zoom}});
 }
 if(url.pathname.endsWith('/crop')){
   const selected=giphyAvatar(user.avatar_url);
   if(selected){const avatar=giphyMarker(selected.id,{x,y,zoom});await env.DB.prepare('UPDATE users SET avatar_url=?,updated_at=? WHERE id=?').bind(avatar,new Date().toISOString(),user.id).run();return json({ok:true,avatar,avatarFrame:{x,y,zoom}})}
   const row=await env.DB.prepare('SELECT user_id FROM profile_media WHERE user_id=?').bind(user.id).first();if(!row)throw fail(404,'Envie uma foto antes de ajustar.');
   await env.DB.prepare('UPDATE profile_media SET x=?,y=?,zoom=? WHERE user_id=?').bind(x,y,zoom,user.id).run();
   return json({ok:true,avatar:user.avatar_url,avatarFrame:{x,y,zoom}});
 }
 if(Number(request.headers.get('Content-Length'))>MAX_AVATAR_BYTES)throw fail(413,'Escolha uma imagem de até 1,9 MB.');
 // Bound the stream even when Content-Length is missing or incorrect.
 const reader=request.body?.getReader();if(!reader)throw fail(400,'Escolha uma imagem.');
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_AVATAR_BYTES){await reader.cancel();throw fail(413,'Escolha uma imagem de até 1,9 MB.');}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 const mime=imageType(bytes);if(!mime)throw fail(415,'Envie uma foto JPG, PNG, WebP ou GIF válido.');
 const version=crypto.randomUUID(),avatar='/api/avatar/'+user.id+'?v='+version;
 await env.DB.batch([env.DB.prepare('INSERT INTO profile_media(user_id,mime,data,x,y,zoom) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET mime=excluded.mime,data=excluded.data,x=excluded.x,y=excluded.y,zoom=excluded.zoom').bind(user.id,mime,bytes,x,y,zoom),env.DB.prepare('UPDATE users SET avatar_url=?,updated_at=? WHERE id=?').bind(avatar,new Date().toISOString(),user.id)]);
 return json({ok:true,avatar,avatarFrame:{x,y,zoom}});
}
