import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {schema} from '../server/database.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ui=read('../web/js/app.js');
const css=read('../web/css/dragon-v24.css');
const community=read('../server/community.js');

test('v25: brilho RGB nas letras, sem fogo atras da marca',()=>{
 assert.match(ui,/brand-rgb-glow/);
 assert.match(css,/@keyframes brand-rgb-shimmer/);
 assert.doesNotMatch(css,/brand-blue-flare/);
 assert.match(css,/content:none!important/);
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
test('v25: ranking conta dias ativos únicos, nunca botões de assistido',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT,avatar_url TEXT);CREATE TABLE leaderboard_optin(user_id TEXT PRIMARY KEY,joined_at TEXT);CREATE TABLE leaderboard_daily_activity(user_id TEXT,day TEXT,created_at TEXT,PRIMARY KEY(user_id,day));CREATE TABLE episode_progress(user_id TEXT,anime_id INTEGER,season INTEGER,episode INTEGER,watched INTEGER);');
 for(const id of ['1','2','3','4','5'])db.prepare('INSERT INTO users VALUES(?,?,?)').run(id,`Ota${id}`,'/assets/avatar-default.svg');
 for(const id of ['1','2','3','5'])db.prepare('INSERT INTO leaderboard_optin VALUES(?,?)').run(id,'2026-10-12T00:00:00Z');
 for(const [id,count] of [['1',3],['2',1],['4',6],['5',2]])for(let ep=1;ep<=count;ep++)db.prepare('INSERT INTO episode_progress VALUES(?,10,1,?,1)').run(id,ep);
 for(const [id,days] of [['1',['2026-10-11','2026-10-12']],['2',['2026-10-12']],['4',['2026-10-09','2026-10-10','2026-10-11','2026-10-12']],['5',['2026-10-12']]])for(const day of days)db.prepare('INSERT INTO leaderboard_daily_activity VALUES(?,?,?)').run(id,day,day+'T23:00:00Z');
 const query=community.match(/SELECT u\.id,u\.username name,u\.avatar_url avatar,COUNT\(d\.day\) active_days[\s\S]*?LIMIT 4/);
 assert.ok(query,'SQL do novo ranking não encontrado');
 const ranked=db.prepare(query[0]).all('2026-10-01');
 // O usuario 4 marcou muitos episodios e tem mais dias, mas nao participa.
 assert.deepEqual(ranked.map(r=>[r.id,r.active_days]),[['1',2],['2',1],['5',1]]);
 assert.match(community,/active>=480000/);
 assert.match(community,/gap<45000/);
 assert.match(community,/gap>110000/);
 assert.doesNotMatch(query[0],/episode_progress/);
 db.close();
});
