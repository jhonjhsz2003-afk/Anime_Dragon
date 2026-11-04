import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';

async function setup(t){
 t.mock.method(globalThis,'fetch',async input=>Response.json({id:Number(new URL(input).pathname.split('/').at(-1)),name:'Anime',genres:[{id:16}],origin_country:['JP']}));
 const sqlite=new DatabaseSync(':memory:');
 t.after(()=>sqlite.close());
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const env={DB,TMDB_API_KEY:'community-threads-test'};
 const call=(path,body,cookie)=>worker.fetch(new Request('https://comments.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://comments.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{});
 const register=async name=>{const response=await call('/api/auth/register',{name,email:name+'@example.test',password:'threads-test-password-123'});assert.equal(response.status,200);return response.headers.get('Set-Cookie');};
 const alice=await register('Alice'),bob=await register('Bob');
 const send=(body,cookie=alice,id=1)=>call('/api/community/'+id,body,cookie);
 const read=async(query='',cookie=alice,id=1)=>(await call('/api/community/'+id+query,null,cookie)).json();
 const comment=async(body,extra={},cookie=alice)=>{const response=await send({action:'comment',body,...extra},cookie);assert.equal(response.status,200);return (await response.json()).id;};
 return {sqlite,call,send,read,comment,alice,bob};
}

test('thread pages contain twenty roots and replies remain attached across root pages',async t=>{
 const site=await setup(t),created='2026-01-01T00:00:00Z';
 // Populate existing data directly to exercise a page boundary without rate limits.
 const user=site.sqlite.prepare("SELECT id FROM users WHERE username='Alice'").get().id;
 const insert=site.sqlite.prepare('INSERT INTO anime_comments VALUES(?,?,?,?,?,?,?,?,?,?)');
 for(let n=0;n<22;n++)insert.run('root-'+String(n).padStart(2,'0'),user,1,null,null,null,'Raiz '+n,0,created,created);
 for(let n=0;n<23;n++)insert.run('reply-'+String(n).padStart(2,'0'),user,1,null,null,'root-21','Resposta '+n,0,created,created);
 const first=await site.read('?view=threads');
 assert.equal(first.total,22);assert.equal(first.totalComments,45);assert.equal(first.comments.length,20);assert.equal(first.nextOffset,20);assert.equal(first.hasMore,true);
 assert.equal(first.comments[0].id,'root-21');assert.equal(first.comments[0].replyCount,23);
 const second=await site.read('?view=threads&offset=20');assert.equal(second.comments.length,2);assert.equal(second.hasMore,false);assert.equal(second.nextOffset,null);
 assert.equal(new Set([...first.comments,...second.comments].map(c=>c.id)).size,22);
 const replies=await site.read('?parent=root-21');assert.equal(replies.total,23);assert.equal(replies.comments.length,20);assert.equal(replies.comments[0].id,'reply-00');assert.equal(replies.parent.name,'Alice');
 const tail=await site.read('?parent=root-21&offset=20');assert.equal(tail.comments.length,3);assert.equal(tail.hasMore,false);
 const legacy=await site.read();assert.equal(legacy.total,45);assert.equal(legacy.comments.length,20);
 const oldest=await site.read('?view=threads&sort=oldest');assert.equal(oldest.comments[0].id,'root-00');
});

test('nested replies inherit the parent episode, preserve spoilers, and expose child counts',async t=>{
 const site=await setup(t),root=await site.comment('Teoria do episódio',{season:1,episode:2});
 const reply=await site.comment('Minha resposta',{parentId:root,season:9,episode:99,spoiler:true},site.bob);
 const nested=await site.comment('Uma resposta à resposta',{parentId:reply});
 const roots=await site.read('?view=threads&season=1&episode=2');assert.equal(roots.comments.length,1);assert.equal(roots.comments[0].replyCount,1);
 const replies=await site.read('?parent='+root+'&season=1&episode=2');assert.equal(replies.comments[0].id,reply);assert.equal(replies.comments[0].season,1);assert.equal(replies.comments[0].episode,2);assert.equal(replies.comments[0].spoiler,true);assert.equal(replies.comments[0].replyCount,1);
 assert.equal((await site.read('?parent='+reply)).comments[0].id,nested);
 assert.equal((await site.call('/api/community/1?parent='+root+'&season=1&episode=3')).status,400);
 assert.equal((await site.call('/api/community/2?parent='+root)).status,404);
 assert.equal((await site.send({action:'comment',body:'Pai de outro anime',parentId:root},site.alice,2)).status,400);
 assert.equal((await site.send({action:'comment',body:'Convidado responde',parentId:root},null)).status,401);
 // Existing reply rows written by previous versions stay discoverable in scope.
 site.sqlite.prepare('UPDATE anime_comments SET season=NULL,episode=NULL WHERE id=?').run(reply);
 assert.equal((await site.read('?parent='+root+'&season=1&episode=2')).comments[0].id,reply);
});

test('deleting a parent erases its author and text while preserving descendants',async t=>{
 const site=await setup(t),root=await site.comment('Texto original que deve desaparecer',{spoiler:true});
 const reply=await site.comment('Resposta preservada',{parentId:root},site.bob),nested=await site.comment('Outra resposta preservada',{parentId:reply});
 await site.send({action:'commentReaction',id:root,value:1},site.bob);
 assert.equal((await site.send({action:'delete',id:root},site.bob)).status,403);
 assert.equal((await site.send({action:'delete',id:root})).status,200);
 const roots=await site.read('?view=threads'),placeholder=roots.comments[0];
 assert.equal(roots.total,1);assert.equal(roots.totalComments,2);assert.equal(placeholder.id,root);assert.equal(placeholder.deleted,true);assert.equal(placeholder.userId,null);assert.equal(placeholder.mine,false);assert.equal(placeholder.body,'Comentário excluído.');assert.equal(placeholder.spoiler,false);assert.equal(placeholder.likes,0);assert.equal(placeholder.replyCount,1);
 assert.equal(site.sqlite.prepare('SELECT body FROM anime_comments WHERE id=?').get(root).body,'');
 assert.equal((await site.read('?parent='+root)).comments[0].id,reply);assert.equal((await site.read('?parent='+reply)).comments[0].id,nested);
 const legacy=await site.read();assert.equal(legacy.total,2);assert.equal(legacy.comments.some(c=>c.id===root),false);
 assert.equal((await site.send({action:'edit',id:root,body:'Ressuscitar comentário'})).status,403);
 assert.equal((await site.send({action:'commentReaction',id:root,value:1})).status,404);
 assert.equal((await site.send({action:'report',id:root})).status,404);
 assert.equal((await site.send({action:'delete',id:nested})).status,200);assert.equal(site.sqlite.prepare('SELECT id FROM anime_comments WHERE id=?').get(nested),undefined);
 assert.equal((await site.send({action:'delete',id:reply},site.bob)).status,200);
 assert.equal((await site.read('?view=threads')).total,0);assert.equal(site.sqlite.prepare('SELECT id FROM anime_comments WHERE id=?').get(root),undefined);
});

test('reply editing, vote toggles, and popular roots keep the existing author rules',async t=>{
 const site=await setup(t),root=await site.comment('Primeira raiz'),second=await site.comment('Segunda raiz'),reply=await site.comment('Texto de resposta',{parentId:root},site.bob);
 assert.equal((await site.send({action:'edit',id:reply,body:'Editar outra pessoa'})).status,403);
 assert.equal((await site.send({action:'edit',id:reply,body:'Resposta corrigida',spoiler:true},site.bob)).status,200);
 await site.send({action:'commentReaction',id:reply,value:1});await site.send({action:'commentReaction',id:reply,value:-1});
 let data=await site.read('?parent='+root);assert.equal(data.comments[0].body,'Resposta corrigida');assert.equal(data.comments[0].spoiler,true);assert.equal(data.comments[0].likes,0);assert.equal(data.comments[0].dislikes,1);
 await site.send({action:'commentReaction',id:reply,value:0});data=await site.read('?parent='+root);assert.equal(data.comments[0].dislikes,0);
 await site.send({action:'commentReaction',id:root,value:1},site.bob);assert.equal((await site.read('?view=threads&sort=popular')).comments[0].id,root);
 assert.equal((await site.read('?view=threads')).comments.some(c=>c.id===second),true);
});
