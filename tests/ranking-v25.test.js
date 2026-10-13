import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';
// Somente respostas simuladas de metadados nos testes; nenhuma chamada externa.
globalThis.fetch=async url=>Response.json({id:Number(new URL(url).pathname.split('/').at(-1)),name:'Anime',genres:[{id:16}],origin_country:['JP'],seasons:[{season_number:1,episode_count:100}]});

function database(){
 const sqlite=new DatabaseSync(':memory:');
 return {sqlite,prepare(sql){let args=[];return {bind(...params){args=params;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};},async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const st of statements)out.push(await st.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
function make(){
 const env={DB:database(),TMDB_API_KEY:'test'};
 const request=async(path,data=null,cookie='',origin='https://test.local')=>{
  const opts={method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}};
  if(data)opts.body=JSON.stringify(data);
  return worker.fetch(new Request('https://test.local'+path,opts),env,{});
 };
 return {env,request};
}
const path='/api/community/leaderboard';

test('v25: anti-fraude ignora episódios marcados e exige presença espaçada no servidor',async()=>{
 const {env,request}=make();
 const register=await request('/api/auth/register',{name:'Otakux',email:'otakux@example.com',password:'test-password-only-123',avatar:'/assets/avatars/avatar-2-animated.svg'});
 assert.equal(register.status,200);const cookie=register.headers.get('Set-Cookie'),user=(await register.json()).user;
 assert.equal((await request(path+'/activity',{action:'start',animeId:22,season:1,episode:1})).status,401);
 await request('/api/community/22',{action:'progress',season:1,episode:1,watched:true},cookie);
 let ranking=await(await request(path)).json();assert.deepEqual(ranking.leaders,[],'marcação manual não ganha pontos');
 const opted=await request(path,{participate:true},cookie);assert.equal(opted.status,200);
 const init=await(await request(path+'/activity',{action:'start',animeId:22,season:1,episode:1},cookie)).json();
 assert.ok(init.token&&init.participating);
 const immediate=await(await request(path+'/activity',{action:'pulse',token:init.token},cookie)).json();
 assert.equal(immediate.credited,false);
 assert.equal((await request(path+'/activity',{action:'pulse',token:'not-a-token'},cookie)).status,400);
 assert.equal((await request(path+'/activity',{action:'start',animeId:22,season:1,episode:1},cookie,'https://evil.test')).status,403);
 const session=env.DB.sqlite.prepare('SELECT active_ms FROM leaderboard_sessions WHERE user_id=?');
 assert.equal(session.get(user.id).active_ms,0);
 for(let index=0;index<9;index++){
  env.DB.sqlite.prepare('UPDATE leaderboard_sessions SET last_ping_at=?,started_at=? WHERE user_id=?')
   .run(Date.now()-60000,Date.now()-12*60000,user.id);
  const beat=await request(path+'/activity',{action:'pulse',token:init.token},cookie);
  assert.equal(beat.status,200);
 }
 ranking=await(await request(path)).json();
 assert.equal(ranking.leaders.length,1);assert.equal(ranking.leaders[0].active_days,1);
 assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM leaderboard_daily_activity').get().n,1);
 // Repetições, marcações adicionais e outras fontes nunca ultrapassam 1 ponto por dia.
 for(let i=2;i<24;i++)await request('/api/community/22',{action:'progress',season:1,episode:i,watched:true},cookie);
 assert.equal((await(await request(path)).json()).leaders[0].active_days,1);
 await request(path,{participate:false},cookie);
 ranking=await(await request(path)).json();assert.deepEqual(ranking.leaders,[]);
 assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM leaderboard_daily_activity').get().n,0);
 env.DB.sqlite.close();
});
