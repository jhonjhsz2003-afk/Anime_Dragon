import { database } from './database.js';

import { getUser, throttle } from './auth.js';
import {identityColumns,identityJoin,profileIdentity} from './profile-identity.js';
import {storedAvatarFrame} from './giphy-avatar.js';

const fail=(status,message)=>Object.assign(new Error(message),{status});

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});

const commentFields=`c.*,u.username,u.avatar_url,pm.x avatar_x,pm.y avatar_y,pm.zoom avatar_zoom,
 COALESCE((SELECT name_color FROM user_appearance WHERE user_id=u.id),'ice') name_color,
 (SELECT COALESCE(SUM(value),0) FROM comment_reactions WHERE comment_id=c.id) comment_score,
 (SELECT COUNT(*) FROM comment_reactions WHERE comment_id=c.id AND value=1) likes,
 (SELECT COUNT(*) FROM comment_reactions WHERE comment_id=c.id AND value=-1) dislikes,
 (SELECT value FROM comment_reactions WHERE comment_id=c.id AND user_id=?) reaction,
 (SELECT COUNT(*) FROM anime_comments child WHERE child.parent_id=c.id AND child.anime_id=c.anime_id) reply_count`;
const commentJoins='anime_comments c JOIN users u ON u.id=c.user_id LEFT JOIN profile_media pm ON pm.user_id=u.id';
function publicComment(c,user){
 // Empty bodies are deletion placeholders. Published comments require 2+ characters,
 // so existing databases need no new column or rewritten discussion records.
 const deleted=c.body==='';
 return {id:c.id,userId:deleted?null:String(c.user_id),nameColor:deleted?'ice':c.name_color,
  likes:deleted?0:c.likes,dislikes:deleted?0:c.dislikes,reaction:deleted?0:c.reaction||0,
  body:deleted?'Comentário excluído.':c.body,spoiler:!deleted&&!!c.spoiler,season:c.season,episode:c.episode,
  parentId:c.parent_id,replyCount:c.reply_count||0,deleted,createdAt:c.created_at,updatedAt:c.updated_at,
  name:deleted?'Comentário excluído':c.username,avatar:deleted?'/assets/avatar-default.svg':c.avatar_url,
  avatarFrame:deleted?{x:50,y:50,zoom:100}:storedAvatarFrame(c),
  mine:!deleted&&String(c.user_id)===user?.id};
}

export async function community(request, env, validateAnime) {

 env=await database(env);

 const u=new URL(request.url), user=await getUser(request,env);

 const profileMatch=u.pathname.match(/^\/api\/community\/profile\/([a-zA-Z0-9-]{1,80})$/);

 if(profileMatch){

   if(request.method!=='GET')throw fail(405,'Método não permitido.');

   const target=await env.DB.prepare(`SELECT users.id,users.username,users.avatar_url,users.bio,COALESCE(user_appearance.name_color,'ice') name_color,COALESCE(profile_privacy.visibility,'private') visibility,${identityColumns},pm.x avatar_x,pm.y avatar_y,pm.zoom avatar_zoom FROM users LEFT JOIN profile_privacy ON profile_privacy.user_id=users.id LEFT JOIN user_appearance ON user_appearance.user_id=users.id ${identityJoin} LEFT JOIN profile_media pm ON pm.user_id=users.id WHERE users.id=?`).bind(profileMatch[1]).first();

   if(!target)throw fail(404,'Perfil não encontrado.');

   target.id=String(target.id);
   const owner=user?.id===target.id;

   const profile={id:target.id,name:target.username,avatar:target.avatar_url,visibility:target.visibility,nameColor:target.name_color,identity:profileIdentity(target),avatarFrame:storedAvatarFrame(target)};

   if(!owner&&target.visibility!=='public')return json({ok:true,private:true,owner:false,profile});

   const [items,activity,progress]=await Promise.all([

     env.DB.prepare('SELECT anime_id,kind FROM anime_library WHERE user_id=? ORDER BY created_at DESC LIMIT 500').bind(target.id).all(),

     env.DB.prepare('SELECT anime_id,season,episode,updated_at FROM playback_activity WHERE user_id=? ORDER BY updated_at DESC LIMIT 50').bind(target.id).all(),

     env.DB.prepare('SELECT anime_id,COUNT(*) episodes FROM episode_progress WHERE user_id=? AND watched=1 GROUP BY anime_id').bind(target.id).all()

   ]);

   return json({ok:true,private:false,owner,profile:{...profile,bio:target.bio||''},items:items.results,activity:activity.results,progress:progress.results});

 }

 if(u.pathname==='/api/community/collections' && request.method==='GET') {

   if(!user)throw fail(401,'Entre para acessar sua coleção.');

   const data=await env.DB.prepare('SELECT anime_id,kind FROM anime_library WHERE user_id=? ORDER BY created_at DESC LIMIT 500').bind(user.id).all();

   return json({ok:true,items:data.results});

 }

 const match=u.pathname.match(/^\/api\/community\/(\d+)$/);

 if(!match)throw fail(404,'Página não encontrada.');

 const animeId=Number(match[1]);if(!Number.isSafeInteger(animeId)||animeId<1)throw fail(400,'Anime inválido.');

 if(request.method==='GET') {

   const value=Number(u.searchParams.get('offset'));
   const after=Number.isSafeInteger(value)&&value>0?value:0;
   const limit=20, parentId=u.searchParams.get('parent'), threaded=u.searchParams.get('view')==='threads';

   const scopeSeason=u.searchParams.get('season'),scopeEpisode=u.searchParams.get('episode');

   const scoped=/^\d+$/.test(scopeSeason||'')&&/^\d+$/.test(scopeEpisode||'');

   const scopeWhere=scoped?' AND c.season=? AND c.episode=?':'';
   const scopeArgs=scoped?[animeId,Number(scopeSeason),Number(scopeEpisode)]:[animeId];
   let parent=null;
   if(parentId!==null){
     parent=await env.DB.prepare('SELECT c.id,c.user_id,c.parent_id,c.season,c.episode,c.body,u.username FROM anime_comments c JOIN users u ON u.id=c.user_id WHERE c.id=? AND c.anime_id=?').bind(parentId,animeId).first();
     if(!parent)throw fail(404,'O comentário original não existe mais.');
     if(scoped&&(parent.season!==Number(scopeSeason)||parent.episode!==Number(scopeEpisode)))throw fail(400,'O comentário pertence a outro episódio.');
   }
   const roots=" AND (c.parent_id IS NULL OR NOT EXISTS(SELECT 1 FROM anime_comments parent WHERE parent.id=c.parent_id AND parent.anime_id=c.anime_id))";
   // Older replies did not inherit episode scope. The validated parent's identity
   // is sufficient to find those existing replies without silently hiding them.
   const where=parent?' AND c.parent_id=?':scopeWhere+(threaded?roots:" AND c.body<>''");
   const args=parent?[animeId,parent.id]:scopeArgs;
   const order=u.searchParams.get('sort')||(parent?'oldest':'recent');
   const sorting=order==='popular'?'comment_score DESC,c.created_at DESC,c.id DESC':order==='oldest'?'c.created_at ASC,c.id ASC':'c.created_at DESC,c.id DESC';

   const [counts,mine,collections,comments,total,progress]=await Promise.all([

     env.DB.prepare('SELECT COALESCE(SUM(value=1),0) likes,COALESCE(SUM(value=-1),0) dislikes FROM anime_reactions WHERE anime_id=?').bind(animeId).first(),

     user?env.DB.prepare('SELECT value FROM anime_reactions WHERE user_id=? AND anime_id=?').bind(user.id,animeId).first():null,

     user?env.DB.prepare('SELECT kind FROM anime_library WHERE user_id=? AND anime_id=?').bind(user.id,animeId).all():{results:[]},

     env.DB.prepare(`SELECT ${commentFields} FROM ${commentJoins} WHERE c.anime_id=?${where} ORDER BY ${sorting} LIMIT ? OFFSET ?`).bind(user?.id||'',...args,limit,after).all(),

     env.DB.prepare(`SELECT COUNT(*) total FROM anime_comments c WHERE c.anime_id=?${where}`).bind(...args).first(),

     user?env.DB.prepare('SELECT season,episode FROM episode_progress WHERE user_id=? AND anime_id=? AND watched=1').bind(user.id,animeId).all():{results:[]}

   ]);

   const totalComments=await env.DB.prepare(`SELECT COUNT(*) total FROM anime_comments c WHERE c.anime_id=?${scopeWhere} AND c.body<>''`).bind(...scopeArgs).first();
   const hasMore=after+comments.results.length<total.total;
   return json({ok:true,progress:progress.results,...counts,reaction:mine?.value||0,collections:collections.results.map(x=>x.kind),
    total:total.total,totalComments:totalComments.total,offset:after,limit,hasMore,nextOffset:hasMore?after+comments.results.length:null,
    view:parent?'replies':threaded?'threads':'comments',parent:parent?{id:parent.id,parentId:parent.parent_id,name:parent.body===''?'Comentário excluído':parent.username,deleted:parent.body==='',season:parent.season,episode:parent.episode}:null,
    comments:comments.results.map(c=>publicComment(c,user))});

 }

 if(request.method!=='POST')throw fail(405,'Método não permitido.');

 if(!user)throw fail(401,'Entre na sua conta para participar.');

 if(request.headers.get('Origin')!==u.origin)throw fail(403,'Origem inválida.');

 if(!request.headers.get('Content-Type')?.includes('application/json'))throw fail(415,'Formato inválido.');

 const raw=await request.text();if(raw.length>6000)throw fail(413,'Texto muito longo.');

 let d;try{d=JSON.parse(raw)}catch{throw fail(400,'Dados inválidos.');}

 if(!d||typeof d!=='object'||Array.isArray(d))throw fail(400,'Dados inválidos.');

 await throttle(env,`community:${user.id}`,100);

 await validateAnime(animeId,env);

 const now=new Date().toISOString();

 if(d.action==='reaction') {

   if(![-1,0,1].includes(d.value))throw fail(400,'Reação inválida.');

   if(d.value===0)await env.DB.prepare('DELETE FROM anime_reactions WHERE user_id=? AND anime_id=?').bind(user.id,animeId).run();

   else await env.DB.prepare('INSERT INTO anime_reactions(user_id,anime_id,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,anime_id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(user.id,animeId,d.value,now).run();

 } else if(d.action==='collection') {

   if(!['favorite','watchlater','watching','completed','paused','dropped'].includes(d.kind)||typeof d.enabled!=='boolean')throw fail(400,'Coleção inválida.');

   if(d.enabled){

     const changes=[];

     if(['watching','completed','paused','dropped'].includes(d.kind))changes.push(env.DB.prepare("DELETE FROM anime_library WHERE user_id=? AND anime_id=? AND kind IN ('watching','completed','paused','dropped')").bind(user.id,animeId));

     changes.push(env.DB.prepare('INSERT OR IGNORE INTO anime_library(user_id,anime_id,kind,created_at) VALUES(?,?,?,?)').bind(user.id,animeId,d.kind,now));

     await env.DB.batch(changes);

   }

   else await env.DB.prepare('DELETE FROM anime_library WHERE user_id=? AND anime_id=? AND kind=?').bind(user.id,animeId,d.kind).run();

 } else if(d.action==='commentReaction') {

   if(![-1,0,1].includes(d.value))throw fail(400,'Reação inválida.');

   const row=await env.DB.prepare("SELECT id FROM anime_comments WHERE id=? AND anime_id=? AND body<>''").bind(String(d.id),animeId).first();

   if(!row)throw fail(404,'Comentário não encontrado.');

   if(d.value===0)await env.DB.prepare('DELETE FROM comment_reactions WHERE user_id=? AND comment_id=?').bind(user.id,row.id).run();

   else await env.DB.prepare('INSERT INTO comment_reactions VALUES(?,?,?) ON CONFLICT(user_id,comment_id) DO UPDATE SET value=excluded.value').bind(user.id,row.id,d.value).run();

 } else if(d.action==='activity') {

   if(!Number.isInteger(d.season)||d.season<0||d.season>1000||!Number.isInteger(d.episode)||d.episode<1||d.episode>100000)throw fail(400,'Episódio inválido.');

   await env.DB.prepare('INSERT INTO playback_activity VALUES(?,?,?,?,?) ON CONFLICT(user_id,anime_id) DO UPDATE SET season=excluded.season,episode=excluded.episode,updated_at=excluded.updated_at').bind(user.id,animeId,d.season,d.episode,now).run();

 } else if(d.action==='progress') {

   if(!Number.isInteger(d.season)||d.season<0||d.season>1000||!Number.isInteger(d.episode)||d.episode<1||d.episode>100000||typeof d.watched!=='boolean')throw fail(400,'Episódio inválido.');

   if(d.watched)await env.DB.prepare('INSERT INTO episode_progress VALUES(?,?,?,?,1,?) ON CONFLICT(user_id,anime_id,season,episode) DO UPDATE SET watched=1,updated_at=excluded.updated_at').bind(user.id,animeId,d.season,d.episode,now).run();

   else await env.DB.prepare('DELETE FROM episode_progress WHERE user_id=? AND anime_id=? AND season=? AND episode=?').bind(user.id,animeId,d.season,d.episode).run();

 } else if(['comment','edit'].includes(d.action)) {

   const body=String(d.body||'').trim();if(body.length<2||body.length>2000)throw fail(400,'Escreva entre 2 e 2.000 caracteres.');

   const normalize=text=>text.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();

   const normalized=normalize(body);

   const oldComments=await env.DB.prepare('SELECT id,body FROM anime_comments WHERE user_id=? AND anime_id=?').bind(user.id,animeId).all();

   if(oldComments.results.some(c=>(d.action!=='edit'||c.id!==String(d.id||''))&&normalize(c.body)===normalized))throw fail(409,'Você já publicou este comentário neste anime. Edite o original para acrescentar algo.');

   const fingerprint=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized)))].map(x=>x.toString(16).padStart(2,'0')).join('');

   const reserve=id=>env.DB.prepare('INSERT INTO comment_keys VALUES(?,?,?,?)').bind(user.id,animeId,fingerprint,id);

   const commit=async statements=>{try{await env.DB.batch(statements)}catch(e){if(String(e.message).includes('UNIQUE'))throw fail(409,'Este comentário já foi publicado.');throw e;}};

   if(d.action==='edit') {

     const row=await env.DB.prepare("SELECT user_id FROM anime_comments WHERE id=? AND anime_id=? AND body<>''").bind(String(d.id),animeId).first();

     if(String(row?.user_id)!==user.id)throw fail(403,'Você só pode editar seus comentários.');

     await commit([env.DB.prepare('DELETE FROM comment_keys WHERE comment_id=?').bind(String(d.id)),reserve(String(d.id)),env.DB.prepare('UPDATE anime_comments SET body=?,spoiler=?,updated_at=? WHERE id=?').bind(body,d.spoiler?1:0,now,String(d.id))]);

   } else {

     await throttle(env,`comment:${user.id}`,12);

     let parent=null;

     if(d.parentId){parent=await env.DB.prepare('SELECT id,season,episode FROM anime_comments WHERE id=? AND anime_id=?').bind(String(d.parentId),animeId).first();if(!parent)throw fail(400,'O comentário original não existe mais.');}

     // A reply always belongs to its parent's debate, even when the client omits
     // the episode or sends a conflicting one. This keeps it discoverable there.
     const season=parent?parent.season:Number.isInteger(d.season)&&d.season>=0?d.season:null,
      episode=parent?parent.episode:Number.isInteger(d.episode)&&d.episode>0?d.episode:null;

     const commentId=crypto.randomUUID();

     await commit([reserve(commentId),env.DB.prepare('INSERT INTO anime_comments(id,user_id,anime_id,season,episode,parent_id,body,spoiler,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(commentId,user.id,animeId,season,episode,parent?.id||null,body,d.spoiler?1:0,now,now)]);

     return json({ok:true,id:commentId,parentId:parent?.id||null,season,episode});

   }

 } else if(d.action==='delete') {

   const row=await env.DB.prepare("SELECT user_id,parent_id FROM anime_comments WHERE id=? AND anime_id=? AND body<>''").bind(String(d.id),animeId).first();

   if(String(row?.user_id)!==user.id)throw fail(403,'Você só pode excluir seus comentários.');

   await env.DB.batch([
    env.DB.prepare('DELETE FROM comment_reactions WHERE comment_id=?').bind(String(d.id)),
    env.DB.prepare('DELETE FROM comment_keys WHERE comment_id=?').bind(String(d.id)),
    env.DB.prepare("UPDATE anime_comments SET body='',spoiler=0,updated_at=? WHERE id=?").bind(now,String(d.id)),
    // Keep the node when other people have replied; its original text is erased.
    env.DB.prepare("DELETE FROM anime_comments WHERE id=? AND NOT EXISTS(SELECT 1 FROM anime_comments child WHERE child.parent_id=?)").bind(String(d.id),String(d.id)),
   env.DB.prepare('DELETE FROM comment_reports WHERE comment_id=?').bind(String(d.id))
   ]);

   // Once the last reply is removed, discard empty deletion placeholders up the
   // same ancestry chain. Other people's live conversations are never removed.
   let ancestor=row.parent_id;const visited=new Set();
   while(ancestor&&!visited.has(ancestor)){
    visited.add(ancestor);
    const node=await env.DB.prepare("SELECT parent_id FROM anime_comments WHERE id=? AND anime_id=? AND body=''").bind(ancestor,animeId).first();
    if(!node)break;
    const result=await env.DB.prepare("DELETE FROM anime_comments WHERE id=? AND body='' AND NOT EXISTS(SELECT 1 FROM anime_comments child WHERE child.parent_id=?)").bind(ancestor,ancestor).run();
    if((result.meta?.changes??result.changes??0)!==1)break;
    ancestor=node.parent_id;
   }

 } else if(d.action==='report') {

   const row=await env.DB.prepare("SELECT id FROM anime_comments WHERE id=? AND anime_id=? AND body<>''").bind(String(d.id),animeId).first();if(!row)throw fail(404,'Comentário não encontrado.');

   await env.DB.prepare('INSERT OR IGNORE INTO comment_reports(user_id,comment_id,created_at) VALUES(?,?,?)').bind(user.id,String(d.id),now).run();

 } else throw fail(400,'Ação inválida.');

 return json({ok:true});

}
