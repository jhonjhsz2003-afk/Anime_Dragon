import { database } from './database.js';
import { getUser, throttle } from './auth.js';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function community(request, env, validateAnime) {
 env=await database(env);
 const u=new URL(request.url), user=await getUser(request,env);
 if(u.pathname==='/api/community/collections' && request.method==='GET') {
   if(!user)throw fail(401,'Entre para acessar sua coleção.');
   const data=await env.DB.prepare('SELECT anime_id,kind FROM anime_collections WHERE user_id=? ORDER BY created_at DESC LIMIT 500').bind(user.id).all();
   return json({ok:true,items:data.results});
 }
 const match=u.pathname.match(/^\/api\/community\/(\d+)$/);
 if(!match)throw fail(404,'Página não encontrada.');
 const animeId=Number(match[1]);if(!Number.isSafeInteger(animeId)||animeId<1)throw fail(400,'Anime inválido.');
 if(request.method==='GET') {
   const after=Math.max(0,Math.trunc(Number(u.searchParams.get('offset')))||0);
   const scopeSeason=u.searchParams.get('season'),scopeEpisode=u.searchParams.get('episode');
   const scoped=/^\d+$/.test(scopeSeason||'')&&/^\d+$/.test(scopeEpisode||'');
   const where=scoped?' AND c.season=? AND c.episode=?':'';
   const args=scoped?[animeId,Number(scopeSeason),Number(scopeEpisode)]:[animeId];
   const [counts,mine,collections,comments,total]=await Promise.all([
     env.DB.prepare('SELECT COALESCE(SUM(value=1),0) likes,COALESCE(SUM(value=-1),0) dislikes FROM anime_reactions WHERE anime_id=?').bind(animeId).first(),
     user?env.DB.prepare('SELECT value FROM anime_reactions WHERE user_id=? AND anime_id=?').bind(user.id,animeId).first():null,
     user?env.DB.prepare('SELECT kind FROM anime_collections WHERE user_id=? AND anime_id=?').bind(user.id,animeId).all():{results:[]},
     env.DB.prepare(`SELECT c.*,u.username,u.avatar_url FROM anime_comments c JOIN users u ON u.id=c.user_id WHERE c.anime_id=?${where} ORDER BY c.created_at DESC,c.id DESC LIMIT 20 OFFSET ?`).bind(...args,after).all(),
     env.DB.prepare(`SELECT COUNT(*) total FROM anime_comments c WHERE c.anime_id=?${where}`).bind(...args).first()
   ]);
   return json({ok:true,...counts,reaction:mine?.value||0,collections:collections.results.map(x=>x.kind),total:total.total,offset:after,
    comments:comments.results.map(c=>({id:c.id,body:c.body,spoiler:!!c.spoiler,season:c.season,episode:c.episode,parentId:c.parent_id,createdAt:c.created_at,updatedAt:c.updated_at,name:c.username,avatar:c.avatar_url,mine:c.user_id===user?.id}))});
 }
 if(request.method!=='POST')throw fail(405,'Método não permitido.');
 if(!user)throw fail(401,'Entre na sua conta para participar.');
 if(request.headers.get('Origin')!==u.origin)throw fail(403,'Origem inválida.');
 if(!request.headers.get('Content-Type')?.includes('application/json'))throw fail(415,'Formato inválido.');
 const raw=await request.text();if(raw.length>6000)throw fail(413,'Texto muito longo.');
 let d;try{d=JSON.parse(raw)}catch{throw fail(400,'Dados inválidos.');}
 if(!d||typeof d!=='object')throw fail(400,'Dados inválidos.');
 await throttle(env,`community:${user.id}`,100);
 await validateAnime(animeId,env);
 const now=new Date().toISOString();
 if(d.action==='reaction') {
   if(![-1,0,1].includes(d.value))throw fail(400,'Reação inválida.');
   if(d.value===0)await env.DB.prepare('DELETE FROM anime_reactions WHERE user_id=? AND anime_id=?').bind(user.id,animeId).run();
   else await env.DB.prepare('INSERT INTO anime_reactions(user_id,anime_id,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,anime_id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(user.id,animeId,d.value,now).run();
 } else if(d.action==='collection') {
   if(!['favorite','watchlater'].includes(d.kind)||typeof d.enabled!=='boolean')throw fail(400,'Coleção inválida.');
   if(d.enabled)await env.DB.prepare('INSERT OR IGNORE INTO anime_collections(user_id,anime_id,kind,created_at) VALUES(?,?,?,?)').bind(user.id,animeId,d.kind,now).run();
   else await env.DB.prepare('DELETE FROM anime_collections WHERE user_id=? AND anime_id=? AND kind=?').bind(user.id,animeId,d.kind).run();
 } else if(['comment','edit'].includes(d.action)) {
   const body=String(d.body||'').trim();if(body.length<2||body.length>2000)throw fail(400,'Escreva entre 2 e 2.000 caracteres.');
   if(d.action==='edit') {
     const row=await env.DB.prepare('SELECT user_id FROM anime_comments WHERE id=? AND anime_id=?').bind(String(d.id),animeId).first();
     if(row?.user_id!==user.id)throw fail(403,'Você só pode editar seus comentários.');
     await env.DB.prepare('UPDATE anime_comments SET body=?,spoiler=?,updated_at=? WHERE id=?').bind(body,d.spoiler?1:0,now,String(d.id)).run();
   } else {
     await throttle(env,`comment:${user.id}`,12);
     let parent=null;
     if(d.parentId){parent=await env.DB.prepare('SELECT id FROM anime_comments WHERE id=? AND anime_id=?').bind(String(d.parentId),animeId).first();if(!parent)throw fail(400,'O comentário original não existe mais.');}
     const season=Number.isInteger(d.season)&&d.season>=0?d.season:null,episode=Number.isInteger(d.episode)&&d.episode>0?d.episode:null;
     await env.DB.prepare('INSERT INTO anime_comments(id,user_id,anime_id,season,episode,parent_id,body,spoiler,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,animeId,season,episode,parent?.id||null,body,d.spoiler?1:0,now,now).run();
   }
 } else if(d.action==='delete') {
   const row=await env.DB.prepare('SELECT user_id FROM anime_comments WHERE id=? AND anime_id=?').bind(String(d.id),animeId).first();
   if(row?.user_id!==user.id)throw fail(403,'Você só pode excluir seus comentários.');
   await env.DB.batch([env.DB.prepare('DELETE FROM anime_comments WHERE id=?').bind(String(d.id)),env.DB.prepare('DELETE FROM comment_reports WHERE comment_id=?').bind(String(d.id))]);
 } else if(d.action==='report') {
   const row=await env.DB.prepare('SELECT id FROM anime_comments WHERE id=? AND anime_id=?').bind(String(d.id),animeId).first();if(!row)throw fail(404,'Comentário não encontrado.');
   await env.DB.prepare('INSERT OR IGNORE INTO comment_reports(user_id,comment_id,created_at) VALUES(?,?,?)').bind(user.id,String(d.id),now).run();
 } else throw fail(400,'Ação inválida.');
 return json({ok:true});
}
