import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,display_name TEXT NOT NULL,avatar TEXT DEFAULT '',role TEXT NOT NULL DEFAULT 'user',blocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,last_login TEXT);
 CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT,token_hash TEXT NOT NULL UNIQUE,user_id INTEGER NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 INSERT INTO users VALUES(12,'existing@example.test','old-format-kept-intact','Pessoa antiga','old-avatar','admin',0,'2025-01-01',NULL);
 INSERT INTO sessions VALUES(7,'old-session-kept-intact',12,'2099-01-01','2025-01-01');`);
 const db={sqlite,queries:0,prepare(sql){let values=[];return {bind(...v){values=v;return this},async first(){db.queries++;return sqlite.prepare(sql).get(...values)||null},async all(){db.queries++;return {results:sqlite.prepare(sql).all(...values)}},async run(){db.queries++;return sqlite.prepare(sql).run(...values)}}},async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const env={DB:db,AUTH_SECRET:'test-installation-secret-legacy-only-123456789',TMDB_API_KEY:'test'};
 const call=(path,data,cookie)=>worker.fetch(new Request('https://legacy.test'+path,{method:data?'POST':'GET',headers:{Origin:'https://legacy.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),env,{});
 return {db,env,call,details:{name:'Novo otaku',email:'new@example.test',password:'senha-de-teste-longa-123'}};
}
test('registration and sessions support the exact legacy D1 schema while preserving rows and foreign keys',async()=>{
 const t=fixture(),r=await t.call('/api/auth/register',t.details),body=await r.json();
 assert.equal(r.status,200,JSON.stringify(body));assert.equal(body.user.id,'13');
 assert.ok(t.db.queries<=50,`registration used ${t.db.queries} queries`);
 const cookie=r.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);
 assert.equal((await(await t.call('/api/auth/me',null,cookie)).json()).user.name,t.details.name);
 const old=t.db.sqlite.prepare('SELECT * FROM users WHERE id=12').get();
 assert.equal(old.password_hash,'old-format-kept-intact');assert.equal(old.display_name,'Pessoa antiga');assert.equal(old.role,'admin');assert.equal(old.username,'Pessoa antiga');
 assert.equal(t.db.sqlite.prepare('SELECT token_hash FROM sessions WHERE id=7').get().token_hash,'old-session-kept-intact');
 assert.equal(t.db.sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
 assert.equal((await t.call('/api/auth/register',t.details)).status,409);
 assert.equal((await t.call('/api/auth/register',{...t.details,email:'other@example.test'})).status,409);
 assert.equal((await t.call('/api/auth/register',{...t.details,name:'Pessoa antiga',email:'third@example.test'})).status,409);
 const profile=await(await t.call('/api/community/profile/13',null,cookie)).json();assert.equal(profile.owner,true);assert.equal(profile.profile.id,'13');
 await t.call('/api/auth/logout',{},cookie);assert.equal((await(await t.call('/api/auth/me',null,cookie)).json()).user,null);
 assert.equal((await t.call('/api/auth/login',{...t.details,password:'errada'})).status,401);
 const login=await t.call('/api/auth/login',t.details);assert.equal(login.status,200);const fresh=login.headers.get('Set-Cookie');
 assert.equal((await t.call('/api/auth/profile',{name:'Otaku novo',bio:'Teste',nameColor:'blue'},fresh)).status,200);
 const restarted={...t.env,DB:{...t.db}};
 const me=await worker.fetch(new Request('https://legacy.test/api/auth/me',{headers:{Cookie:fresh}}),restarted,{});
 assert.equal((await me.json()).user.name,'Otaku novo');
 t.db.sqlite.prepare('UPDATE users SET blocked=1 WHERE id=13').run();
 assert.equal((await(await t.call('/api/auth/me',null,fresh)).json()).user,null);
 assert.equal((await t.call('/api/auth/login',t.details)).status,403);
});
test('legacy numeric owners retain comment editing and photo upload permissions',async()=>{
 const savedFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({id:1,name:'Anime',genres:[{id:16}],origin_country:['JP'],seasons:[]});
 try{
 const t=fixture();t.db.sqlite.exec("CREATE TABLE anime_comments(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,anime_id INTEGER NOT NULL,season INTEGER,episode INTEGER,parent_id TEXT,body TEXT NOT NULL,spoiler INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)");const r=await t.call('/api/auth/register',t.details),cookie=r.headers.get('Set-Cookie');assert.equal(r.status,200);
 const send=data=>t.call('/api/community/1',data,cookie);
 assert.equal((await send({action:'comment',body:'Um comentário único'})).status,200);
 const comment=(await(await t.call('/api/community/1',null,cookie)).json()).comments[0];assert.equal(comment.mine,true);
 assert.equal((await send({action:'edit',id:comment.id,body:'Comentário atualizado'})).status,200);
 const gif=Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),c=>c.charCodeAt(0));
 const upload=await worker.fetch(new Request('https://legacy.test/api/profile/avatar',{method:'POST',headers:{Origin:'https://legacy.test',Cookie:cookie},body:gif}),t.env,{});
 assert.equal(upload.status,200);assert.match((await upload.json()).avatar,/\/api\/avatar\/13\?/);
 }finally{globalThis.fetch=savedFetch}
});
test('duplicate historical display names remain unchanged and do not stop migration',async()=>{
 const t=fixture();t.db.sqlite.exec("INSERT INTO users(email,password_hash,display_name,created_at) VALUES('second@example.test','another-old-hash','Pessoa antiga','2025-01-01')");
 assert.equal((await t.call('/api/auth/register',t.details)).status,200);
 assert.equal(t.db.sqlite.prepare("SELECT COUNT(*) n FROM users WHERE display_name='Pessoa antiga'").get().n,2);
 assert.equal(t.db.sqlite.prepare("SELECT password_salt FROM users WHERE email='second@example.test'").get().password_salt,null);
 assert.equal((await t.call('/api/auth/login',{email:'second@example.test',password:'test-password'})).status,401);
});
