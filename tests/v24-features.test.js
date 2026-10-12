import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {schema} from '../server/database.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../web/js/app.js');
const css=read('../web/css/dragon-v24.css');
const community=read('../server/community.js');

test('v24: marca azul-fogo tem tratamento de movimento reduzido',()=>{
 assert.match(ui,/brand-bluefire/);
 assert.match(css,/@keyframes brand-blue-flame/);
 assert.match(css,/@keyframes brand-blue-flare/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/html\.reduce-motion/);
});
test('v24: histórico salva episódio aberto sem simular minutos do iframe',()=>{
 assert.match(ui,/rememberEpisodeOpened\(p,season,episode\);/);
 assert.match(ui,/sourceKind:'embed'/);
 assert.match(ui,/sourceKind:'direct'/);
 assert.match(ui,/p\.sourceKind==='direct'/);
 assert.match(ui,/data-season="\$\{p\.season\}" data-episode="\$\{p\.episode\}"/);
 assert.match(ui,/refreshContinueSection\(\);/);
});
test('v24: ranking é voluntário e mantém coroas diferentes no topo',()=>{
 assert.ok(schema.some(sql=>sql.includes('leaderboard_optin')));
 assert.match(ui,/data-ranking-toggle/);
 assert.match(ui,/participate:checkbox\.checked/);
 assert.match(ui,/i===0\?'👑':i===1\?'♛'/);
 assert.match(community,/u\.pathname==='\/api\/community\/leaderboard'/);
});
test('v24: consulta mostra somente participantes com episódios marcados como assistidos',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT,avatar_url TEXT);CREATE TABLE leaderboard_optin(user_id TEXT PRIMARY KEY,joined_at TEXT);CREATE TABLE episode_progress(user_id TEXT,anime_id INTEGER,season INTEGER,episode INTEGER,watched INTEGER);');
 for(const id of ['1','2','3','4','5'])db.prepare('INSERT INTO users VALUES(?,?,?)').run(id,`Ota${id}`,'/assets/avatar-default.svg');
 for(const id of ['1','2','3','5'])db.prepare('INSERT INTO leaderboard_optin VALUES(?,?)').run(id,'2026-10-12T00:00:00Z');
 for(const [id,count] of [['1',3],['2',1],['4',6],['5',2]])for(let ep=1;ep<=count;ep++)db.prepare('INSERT INTO episode_progress VALUES(?,10,1,?,1)').run(id,ep);
 db.prepare('INSERT INTO episode_progress VALUES(?,10,1,99,0)').run('1');
 const query=community.match(/SELECT u\.id,u\.username name,u\.avatar_url avatar,COUNT\(ep\.anime_id\) episodes[\s\S]*?LIMIT 4/);
 assert.ok(query,'SQL do ranking não encontrado');
 const ranked=db.prepare(query[0]).all();
 assert.deepEqual(ranked.map(r=>[r.id,r.episodes]),[['1',3],['5',2],['2',1]]);
 db.close();
});
