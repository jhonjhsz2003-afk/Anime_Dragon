import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, {isAnime} from '../worker.js';

const anime={id:1,name:'Anime de teste',genre_ids:[16,10759],origin_country:['JP'],adult:false,media_type:'tv',vote_average:8.8,seasons:[{season_number:0,episode_count:2},{season_number:1,episode_count:35},{season_number:3,episode_count:12}]};
const bad=[{...anime,id:2,media_type:'movie'},{...anime,id:3,genre_ids:[18]},{...anime,id:4,origin_country:['US']},{...anime,id:5,adult:true}];
function database(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));const prepare=sql=>{let args=[];return {bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async run(){return db.prepare(sql).run(...args)}}};return {prepare,async batch(stmts){db.exec('BEGIN');try{const result=await Promise.all(stmts.map(s=>s.run()));db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};}
const env={TMDB_API_KEY:'test.read.token',AUTH_SECRET:'test-secret-only-not-for-production-12345678',DB:database(),ASSETS:{fetch:async()=>Response.json({})}};
const call=(path,options={})=>worker.fetch(new Request('https://anime.test'+path,options),env,{waitUntil:p=>p});
const post=(path,data,cookie)=>call('/api/auth/'+path,{method:'POST',headers:{Origin:'https://anime.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
const requests=[];
globalThis.fetch=async url=>{const u=new URL(url);requests.push(u);if(u.pathname.endsWith('/season/1'))return Response.json({episodes:[{episode_number:3},{episode_number:1},{episode_number:2}]});if(u.pathname.endsWith('/tv/1'))return Response.json({...anime,genres:[{id:16}]});if(u.pathname.endsWith('/tv/2'))return Response.json({...bad[1],genres:[{id:18}]});return Response.json({results:[anime,...bad],page:1,total_pages:2})};
test('anime gate rejects movies, live action, non-Japanese animation and adult content',()=>{assert.equal(isAnime(anime),true);bad.forEach(x=>assert.equal(isAnime(x),false));});
test('home uses filtered discovery in every rail',async()=>{requests.length=0;const r=await call('/api/catalog/home'),d=await r.json();assert.equal(r.status,200);for(const key of ['trending','anime','recent','top'])assert.deepEqual(d[key].map(x=>x.id),[1]);assert.equal(requests.length,3);requests.forEach(u=>{assert.equal(u.pathname,'/3/discover/tv');assert.equal(u.searchParams.get('with_genres'),'16');assert.equal(u.searchParams.get('with_origin_country'),'JP');assert.equal(u.searchParams.get('include_adult'),'false')});assert.match(r.headers.get('Cache-Control'),/public/);});
test('search never queries mixed media and filters returned results',async()=>{const d=await (await call('/api/catalog/search?q=foo')).json();assert.deepEqual(d.results.map(x=>x.id),[1]);assert.equal(requests.at(-1).pathname,'/3/search/tv');});
test('genre filtering always preserves animation and country constraints',async()=>{await call('/api/catalog/discover?genre=35&sort=vote_average.desc&page=-9');const u=requests.at(-1);assert.equal(u.searchParams.get('with_genres'),'16,35');assert.equal(u.searchParams.get('page'),'1');assert.equal(u.searchParams.get('vote_count.gte'),'100');});
test('legacy film routes and non-anime details are blocked',async()=>{for(const path of ['/api/tmdb/movie/1','/api/catalog/discover?type=movie','/api/catalog/tv/2','/api/catalog/tv/2/season/1'])assert.equal((await call(path)).status,404);});
test('real season numbers are preserved and episodes sorted numerically',async()=>{const d=await (await call('/api/catalog/tv/1')).json();assert.deepEqual(d.item.seasons.map(s=>s.season_number),[0,1,3]);const s=await (await call('/api/catalog/tv/1/season/1')).json();assert.deepEqual(s.season.episodes.map(e=>e.episode_number),[1,2,3]);assert.equal((await call('/api/catalog/tv/1/season/2')).status,404);});
test('unconfigured source has a truthful unavailable response',async()=>{const r=await call('/api/playback?id=1&season=1&episode=1');assert.deepEqual(await r.json(),{ok:true,available:false});assert.equal(r.headers.get('Cache-Control'),'no-store');});
test('auth requires same-origin POST and valid configuration',async()=>{const r=await call('/api/auth/register',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);const r2=await worker.fetch(new Request('https://anime.test/api/auth/me'),{},{waitUntil(){}});assert.equal(r2.status,503);});
test('real account lifecycle: create, profile, logout, wrong password, login and revoke session',async()=>{
 const data={name:'Explorador',email:'EXPLORADOR@example.com',password:'uma-senha-longa-123',avatar:'/assets/avatars/avatar-3.svg'};
 const r=await post('register',data);assert.equal(r.status,200);const d=await r.json();assert.equal(d.user.email,'explorador@example.com');assert.equal(d.user.password_hash,undefined);const cookie=r.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.equal(r.headers.get('Cache-Control'),'no-store');
 const me=await (await call('/api/auth/me',{headers:{Cookie:cookie}})).json();assert.equal(me.user.name,'Explorador');
 const dbUser=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(d.user.id).first();assert.ok(dbUser.password_hash.startsWith('v1$'));assert.notEqual(dbUser.password_hash,data.password);
 const profile=await post('profile',{name:'Ninja',bio:'Olá',avatar:'https://real-person.test/photo.jpg'},cookie);assert.equal((await profile.json()).user.avatar,'/assets/avatars/avatar-1.svg');
 await post('logout',{},cookie);assert.equal((await (await call('/api/auth/me',{headers:{Cookie:cookie}})).json()).user,null);
 assert.equal((await post('login',{email:data.email,password:'errada'})).status,401);
 const login=await post('login',data);assert.equal(login.status,200);assert.ok(login.headers.get('Set-Cookie'));
 assert.equal((await post('register',data)).status,409);
 assert.equal((await post('profile',{name:'Teste'})).status,401);
});
test('auth rate limiting rejects repeated attempts',async()=>{let last;for(let i=0;i<12;i++)last=await post('login',{email:'blocked@example.com',password:'wrong'});assert.equal(last.status,429);});
