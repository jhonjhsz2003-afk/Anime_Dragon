import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';
import {database} from '../server/database.js';
import {SESSION_MAX_AGE,cleanupSessions} from '../server/auth.js';

const token='a'.repeat(64),otherToken='b'.repeat(64);
const tokenHash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
function adapter(sqlite){
 const calls=[];
 return {sqlite,calls,prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){calls.push(sql);return sqlite.prepare(sql).get(...args)||null},async all(){calls.push(sql);return {results:sqlite.prepare(sql).all(...args)}},async run(){calls.push(sql);return sqlite.prepare(sql).run(...args)}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}};
}
async function fixture({legacy=false}={}){
 const sqlite=new DatabaseSync(':memory:');
 if(legacy)sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,display_name TEXT NOT NULL,avatar TEXT DEFAULT '',role TEXT NOT NULL DEFAULT 'user',blocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,last_login TEXT);
 CREATE TABLE sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,token_hash TEXT NOT NULL UNIQUE,user_id INTEGER NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
 INSERT INTO users VALUES(12,'old@example.test','old-password-kept','Pessoa antiga','','admin',0,'2025-01-01',NULL);
 INSERT INTO sessions VALUES(7,'historical-token-kept',12,'2099-01-01','2025-01-01');`);
 const DB=adapter(sqlite),env={DB},configured=await database(env);
 const invoke=(path,body,cookie,customEnv=env)=>worker.fetch(new Request('https://session.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://session.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),customEnv,{});
 const userId=legacy?12:'user-1';
 if(!legacy)sqlite.prepare('INSERT INTO users(id,username,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(userId,'Pessoa de teste','person@example.test','fixture-hash','fixture-salt','2025-01-01','2025-01-01');
 const seed=async(value,expiresAt)=>sqlite.prepare(`INSERT INTO sessions(${configured.AUTH_LAYOUT.sessionKey},user_id,expires_at,created_at) VALUES(?,?,?,?)`).run(await tokenHash(value),userId,expiresAt,'2025-01-01');
 return {sqlite,DB,env,configured,invoke,seed,userId,cookie:`ad_session=${token}`};
}

test('new login cookies persist for 30 days and restore across a server restart without returning credentials',async()=>{
 const t=await fixture(),credentials={name:'Nova pessoa',email:'new@example.test',password:'senha-longa-persistente-123'};
 const response=await t.invoke('/api/auth/register',credentials),body=await response.json(),setCookie=response.headers.get('Set-Cookie');
 assert.equal(response.status,200);assert.match(setCookie,/Max-Age=2592000/);assert.match(setCookie,/Expires=/);assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Lax/);assert.match(setCookie,/Secure/);
 const cookie=setCookie.split(';')[0],storedToken=cookie.split('=')[1];
 assert.equal(JSON.stringify(body).includes(storedToken),false);assert.equal(body.user.password_hash,undefined);
 assert.ok(Date.parse(body.session.expiresAt)>=Date.now()+(SESSION_MAX_AGE-5)*1000);
 const restarted={DB:adapter(t.sqlite)};
 const restored=await t.invoke('/api/auth/me',null,cookie,restarted),restoredBody=await restored.json();
 assert.equal(restoredBody.user.id,body.user.id);assert.equal(restoredBody.user.name,credentials.name);
 assert.equal(restored.headers.get('Cache-Control'),'no-store');assert.equal(restored.headers.get('Vary'),'Cookie');
 assert.equal(restored.headers.get('Set-Cookie'),null);
 const row=t.sqlite.prepare('SELECT id,user_id FROM sessions WHERE user_id=?').get(body.user.id);
 assert.equal(row.id,await tokenHash(storedToken));assert.notEqual(row.id,storedToken);
 assert.equal(t.sqlite.prepare("SELECT value FROM app_config WHERE key='installation_key'").get().value,t.configured.AUTH_SECRET);
});

test('a valid session in its last week renews in place while fresh sessions avoid extra writes',async()=>{
 const t=await fixture(),oldExpiry=new Date(Date.now()+2*86400000).toISOString();await t.seed(token,oldExpiry);
 const original=t.sqlite.prepare('SELECT * FROM sessions').get();t.DB.calls.length=0;
 const response=await t.invoke('/api/auth/me',null,t.cookie),body=await response.json(),row=t.sqlite.prepare('SELECT * FROM sessions').get();
 assert.equal(response.status,200);assert.equal(body.user.id,t.userId);assert.equal(row.id,original.id);assert.equal(row.created_at,original.created_at);
 assert.ok(Date.parse(row.expires_at)>=Date.now()+(SESSION_MAX_AGE-5)*1000);assert.equal(body.session.expiresAt,row.expires_at);
 assert.match(response.headers.get('Set-Cookie'),new RegExp(`^ad_session=${token};`));assert.match(response.headers.get('Set-Cookie'),/Max-Age=2592000/);
 assert.equal(JSON.stringify(body).includes(token),false);
 const again=await t.invoke('/api/auth/me',null,t.cookie);assert.equal((await again.json()).user.id,t.userId);assert.equal(again.headers.get('Set-Cookie'),null);
 assert.equal(t.DB.calls.filter(sql=>sql.startsWith('UPDATE sessions')).length,1);
 assert.equal(t.sqlite.prepare('SELECT COUNT(*) count FROM sessions').get().count,1);
});

test('expired sessions never renew and explicit logout revokes only the current device',async()=>{
 const t=await fixture();await t.seed(token,new Date(Date.now()-1000).toISOString());
 const expired=await t.invoke('/api/auth/me',null,t.cookie);assert.deepEqual(await expired.json(),{ok:true,user:null,session:null});assert.equal(expired.headers.get('Set-Cookie'),null);
 await cleanupSessions(t.env);assert.equal(t.sqlite.prepare('SELECT COUNT(*) count FROM sessions').get().count,0);
 await t.seed(token,new Date(Date.now()+100000).toISOString());await t.seed(otherToken,new Date(Date.now()+86400000).toISOString());
 const logout=await t.invoke('/api/auth/logout',{},t.cookie);assert.equal(logout.status,200);assert.match(logout.headers.get('Set-Cookie'),/Max-Age=0; Expires=Thu, 01 Jan 1970/);
 const replay=await t.invoke('/api/auth/me',null,t.cookie);assert.equal((await replay.json()).user,null);assert.equal(replay.headers.get('Set-Cookie'),null);
 assert.equal(t.sqlite.prepare('SELECT COUNT(*) count FROM sessions').get().count,1);
 assert.equal((await(await t.invoke('/api/auth/me',null,`ad_session=${otherToken}`)).json()).user.id,t.userId);
});

test('legacy numeric sessions renew without replacing ids, users, secrets or foreign keys',async()=>{
 const t=await fixture({legacy:true});await t.seed(token,new Date(Date.now()+86400000).toISOString());
 const hash=await tokenHash(token),original=t.sqlite.prepare('SELECT * FROM sessions WHERE token_hash=?').get(hash);
 const response=await t.invoke('/api/auth/me',null,t.cookie),body=await response.json(),renewed=t.sqlite.prepare('SELECT * FROM sessions WHERE token_hash=?').get(hash);
 assert.equal(body.user.id,'12');assert.equal(body.user.name,'Pessoa antiga');assert.equal(renewed.id,original.id);assert.equal(renewed.token_hash,hash);assert.equal(renewed.created_at,original.created_at);
 assert.ok(Date.parse(renewed.expires_at)>=Date.now()+(SESSION_MAX_AGE-5)*1000);
 assert.equal(t.sqlite.prepare('SELECT token_hash FROM sessions WHERE id=7').get().token_hash,'historical-token-kept');
 assert.equal(t.sqlite.prepare('SELECT password_hash,role FROM users WHERE id=12').get().password_hash,'old-password-kept');
 assert.equal(t.sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
});

test('a temporary database failure returns an error without clearing the persistent cookie',async()=>{
 const t=await fixture();await t.seed(token,new Date(Date.now()+86400000).toISOString());
 const originalPrepare=t.DB.prepare;
 t.DB.prepare=sql=>{if(sql.includes('FROM sessions JOIN users'))throw new Error('temporary D1 failure');return originalPrepare(sql)};
 const response=await t.invoke('/api/auth/me',null,t.cookie);
 assert.equal(response.status,503);assert.equal((await response.json()).ok,false);assert.equal(response.headers.get('Set-Cookie'),null);
 t.DB.prepare=originalPrepare;
 assert.equal((await(await t.invoke('/api/auth/me',null,t.cookie)).json()).user.id,t.userId);
});
