import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, {isAnime} from '../worker.js';

const anime={id:1,name:'Anime de teste',genre_ids:[16,10759],origin_country:['JP'],adult:false,media_type:'tv',vote_average:8.8,seasons:[{season_number:0,episode_count:2},{season_number:1,episode_count:35},{season_number:3,episode_count:12}]};
const bad=[{...anime,id:2,media_type:'movie'},{...anime,id:3,genre_ids:[18]},{...anime,id:4,origin_country:['US']},{...anime,id:5,adult:true}];
function database(empty=false){const db=new DatabaseSync(':memory:');if(!empty)db.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));const prepare=sql=>{let args=[];return {bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return db.prepare(sql).run(...args)}}};return {prepare,async batch(stmts){db.exec('BEGIN');try{const result=await Promise.all(stmts.map(s=>s.run()));db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};}
const env={TMDB_API_KEY:'test.read.token',AUTH_SECRET:'test-secret-only-not-for-production-12345678',DB:database(),ASSETS:{fetch:async()=>Response.json({})}};
const call=(path,options={})=>worker.fetch(new Request('https://anime.test'+path,options),env,{waitUntil:p=>p});
const post=(path,data,cookie)=>call('/api/auth/'+path,{method:'POST',headers:{Origin:'https://anime.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
const requests=[];
globalThis.fetch=async url=>{const u=new URL(url);requests.push(u);if(u.pathname.endsWith('/season/1'))return Response.json({episodes:[{episode_number:3},{episode_number:1},{episode_number:2}]});if(u.pathname.endsWith('/tv/1'))return Response.json({...anime,genres:[{id:16}]});if(u.pathname.endsWith('/tv/2'))return Response.json({...bad[1],genres:[{id:18}]});return Response.json({results:[anime,...bad],page:1,total_pages:2})};
test('anime gate rejects movies, live action, non-Japanese animation and adult content',()=>{assert.equal(isAnime(anime),true);bad.forEach(x=>assert.equal(isAnime(x),false));});
test('home uses filtered discovery in every rail',async()=>{requests.length=0;const r=await call('/api/catalog/home'),d=await r.json();assert.equal(r.status,200);for(const key of ['trending','anime','recent','top'])assert.deepEqual(d[key].map(x=>x.id),[1]);assert.equal(requests.length,2);assert.ok(requests[0].searchParams.has('air_date.gte'));assert.ok(requests[0].searchParams.has('air_date.lte'));requests.forEach(u=>{assert.equal(u.pathname,'/3/discover/tv');assert.equal(u.searchParams.get('with_genres'),'16');assert.equal(u.searchParams.get('with_origin_country'),'JP');assert.equal(u.searchParams.get('include_adult'),'false')});assert.match(r.headers.get('Cache-Control'),/public/);});
test('search never queries mixed media and filters returned results',async()=>{const d=await (await call('/api/catalog/search?q=foo')).json();assert.deepEqual(d.results.map(x=>x.id),[1]);assert.equal(requests.at(-1).pathname,'/3/search/tv');});
test('genre filtering always preserves animation and country constraints',async()=>{await call('/api/catalog/discover?genre=35&sort=vote_average.desc&page=-9');const u=requests.at(-1);assert.equal(u.searchParams.get('with_genres'),'16,35');assert.equal(u.searchParams.get('page'),'1');assert.equal(u.searchParams.get('vote_count.gte'),'100');});
test('isekai resolves an exact keyword and keeps the anime-only discovery constraints',async t=>{const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous});const queries=[];globalThis.fetch=async url=>{const u=new URL(url);queries.push(u);if(u.pathname==='/3/search/keyword')return Response.json({results:[{id:999,name:'not isekai'},{id:1234,name:'isekai'}]});return Response.json({results:[anime,...bad],page:1,total_pages:1})};const r=await call('/api/catalog/discover?genre=isekai');assert.equal(r.status,200);assert.deepEqual((await r.json()).results.map(p=>p.id),[1]);assert.equal(queries[0].searchParams.get('query'),'isekai');assert.equal(queries[1].searchParams.get('with_keywords'),'1234');assert.equal(queries[1].searchParams.get('with_genres'),'16');assert.equal(queries[1].searchParams.get('with_origin_country'),'JP');await call('/api/catalog/discover?genre=isekai');assert.equal(queries.filter(u=>u.pathname==='/3/search/keyword').length,1)});
test('missing theme metadata returns an empty result instead of unrelated anime',async t=>{const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous});const paths=[];globalThis.fetch=async url=>{paths.push(new URL(url).pathname);return Response.json({results:[]})};const data=await (await call('/api/catalog/discover?genre=magic')).json();assert.deepEqual(data.results,[]);assert.equal(data.totalPages,0);assert.deepEqual(paths,['/3/search/keyword'])});
test('light novel category supports the alternate exact keyword name',async t=>{const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous});const queries=[];globalThis.fetch=async url=>{const u=new URL(url);queries.push(u);if(u.pathname==='/3/search/keyword')return Response.json({results:u.searchParams.get('query')==='based on a light novel'?[{id:5678,name:'based on a light novel'}]:[]});return Response.json({results:[anime],page:1,total_pages:1})};assert.equal((await call('/api/catalog/discover?genre=light-novel')).status,200);assert.equal(queries.at(-1).searchParams.get('with_keywords'),'5678')});
test('unknown categories are rejected instead of silently showing all titles',async()=>{assert.equal((await call('/api/catalog/discover?genre=nonexistent')).status,400)});
test('legacy film routes and non-anime details are blocked',async()=>{for(const path of ['/api/tmdb/movie/1','/api/catalog/discover?type=movie','/api/catalog/tv/2','/api/catalog/tv/2/season/1'])assert.equal((await call(path)).status,404);});
test('real season numbers are preserved and episodes sorted numerically',async()=>{const d=await (await call('/api/catalog/tv/1')).json();assert.deepEqual(d.item.seasons.map(s=>s.season_number),[0,1,3]);const s=await (await call('/api/catalog/tv/1/season/1')).json();assert.deepEqual(s.season.episodes.map(e=>e.episode_number),[1,2,3]);assert.equal((await call('/api/catalog/tv/1/season/2')).status,404);});
test('unconfigured source has a truthful unavailable response',async()=>{const r=await call('/api/playback?id=1&season=1&episode=1');assert.equal(r.status,502);assert.equal((await r.json()).ok,false);assert.equal(r.headers.get('Cache-Control'),'no-store');});
test('auth requires same-origin POST and valid configuration',async()=>{const r=await call('/api/auth/register',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);const r2=await worker.fetch(new Request('https://anime.test/api/auth/me'),{},{waitUntil(){}});assert.equal(r2.status,503);});
test('real account lifecycle: create, profile, logout, wrong password, login and revoke session',async()=>{
 const data={name:'Explorador',email:'EXPLORADOR@example.com',password:'uma-senha-longa-123',avatar:'/assets/avatars/avatar-3.svg'};
 const r=await post('register',data);assert.equal(r.status,200);const d=await r.json();assert.equal(d.user.email,'explorador@example.com');assert.equal(d.user.password_hash,undefined);const cookie=r.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.equal(r.headers.get('Cache-Control'),'no-store');
 const me=await (await call('/api/auth/me',{headers:{Cookie:cookie}})).json();assert.equal(me.user.name,'Explorador');
 const dbUser=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(d.user.id).first();assert.ok(dbUser.password_hash.startsWith('v1$'));assert.notEqual(dbUser.password_hash,data.password);
 const profile=await post('profile',{name:'Ninja',bio:'Olá',avatar:'https://real-person.test/photo.jpg'},cookie);assert.equal((await profile.json()).user.avatar,'/assets/avatars/avatar-3.svg');
 await post('logout',{},cookie);assert.equal((await (await call('/api/auth/me',{headers:{Cookie:cookie}})).json()).user,null);
 assert.equal((await post('login',{email:data.email,password:'errada'})).status,401);
 const login=await post('login',data);assert.equal(login.status,200);assert.ok(login.headers.get('Set-Cookie'));
 assert.equal((await post('register',data)).status,409);
 assert.equal((await post('profile',{name:'Teste'})).status,401);
});
test('auth rate limiting rejects repeated attempts',async()=>{let last;for(let i=0;i<12;i++)last=await post('login',{email:'blocked@example.com',password:'wrong'});assert.equal(last.status,429);});


test('fresh D1 bootstraps accounts without manual schema or AUTH_SECRET',async()=>{
 const fresh={DB:database(true)};
 const options={method:'POST',headers:{Origin:'https://anime.test','Content-Type':'application/json'},body:JSON.stringify({name:'Novo usuário',email:'novo@example.com',password:'uma-senha-longa-123'})};
 const created=await worker.fetch(new Request('https://anime.test/api/auth/register',options),fresh,{});assert.equal(created.status,200);
 const row=await fresh.DB.prepare("SELECT value FROM app_config WHERE key='installation_key'").first();assert.equal(row.value.length,64);
 const response=await worker.fetch(new Request('https://anime.test/api/auth/login',options),fresh,{});assert.equal(response.status,200);
});

test('community persists reactions, separate collections and author-owned comments',async()=>{
 const clean={...env,DB:database(true)};
 const invoke=(path,body,cookie)=>worker.fetch(new Request('https://anime.test'+path,body?{method:'POST',headers:{Origin:'https://anime.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}:{headers:cookie?{Cookie:cookie}:{}}),clean,{});
 const register=async(name,email)=>(await invoke('/api/auth/register',{name,email,password:'senha-bem-longa-123'})).headers.get('Set-Cookie');
 const a=await register('Pessoa A','a@example.com'),b=await register('Pessoa B','b@example.com');assert.ok(a&&b);
 const send=(data,cookie=a)=>invoke('/api/community/1',data,cookie);
 const read=async(cookie=a,suffix='')=>(await invoke('/api/community/1'+suffix,null,cookie)).json();
 assert.equal((await send({action:'reaction',value:1},null)).status,401);
 await send({action:'reaction',value:1});await send({action:'reaction',value:1});assert.equal((await read()).likes,1);
 await send({action:'reaction',value:-1});assert.equal((await read()).likes,0);assert.equal((await read()).dislikes,1);
 await send({action:'collection',kind:'favorite',enabled:true});await send({action:'collection',kind:'watchlater',enabled:true});
 assert.deepEqual((await read()).collections.sort(),['favorite','watchlater']);assert.deepEqual((await read(b)).collections,[]);
 await send({action:'collection',kind:'favorite',enabled:false});assert.deepEqual((await read()).collections,['watchlater']);
 await send({action:'comment',body:'Gostei deste episódio!',spoiler:true,season:1,episode:2});let data=await read();assert.equal(data.total,1);const id=data.comments[0].id;assert.equal(data.comments[0].mine,true);assert.equal(data.comments[0].spoiler,true);
 assert.equal((await send({action:'edit',id,body:'Outra pessoa alterou'},b)).status,403);
 assert.equal((await send({action:'delete',id},b)).status,403);
 await send({action:'edit',id,body:'Minha opinião atualizada',spoiler:false});assert.equal((await read()).comments[0].body,'Minha opinião atualizada');
 await send({action:'comment',body:'Concordo com você',parentId:id},b);assert.equal((await read()).total,2);
 assert.equal((await read(a,'?season=1&episode=2')).total,1);assert.equal((await read(a,'?season=1&episode=3')).total,0);
 await send({action:'report',id},b);await send({action:'report',id},b);const reports=await clean.DB.prepare('SELECT COUNT(*) n FROM comment_reports').first();assert.equal(reports.n,1);
 await send({action:'delete',id});assert.equal((await read()).total,1);
 const c=await (await invoke('/api/community/collections',null,a)).json();assert.equal(c.items[0].kind,'watchlater');
});
