import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaybackRecovery} from '../web/js/playback-watchdog.js';
import {createSourceLoader} from '../web/js/sources.js';
import {toVtt} from '../web/js/captions.js';
import {addonPlayback,readAddon} from '../server/addon.js';
import {providers} from '../server/providers.js';
const settle=async()=>{for(let n=0;n<4;n++)await new Promise(resolve=>setImmediate(resolve));};
function clock(){let now=0,seq=0;const jobs=new Map();return {now:()=>now,schedule(fn,ms){jobs.set(++seq,{fn,at:now+ms});return seq;},cancel:id=>jobs.delete(id),advance(ms){const end=now+ms;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;}};}

test('zero-source and playback failures share three bounded retries and duplicate events do not enqueue extra attempts',async()=>{
 const time=clock(),attempts=[],final=[];const recovery=createPlaybackRecovery({onAttempt:row=>attempts.push(row),onExhausted:row=>final.push(row)},time);
 recovery.start();await settle();assert.equal(attempts.length,1);assert.equal(attempts[0].fresh,false);
 recovery.retry('empty result');recovery.retry('duplicate empty update');time.advance(900);await settle();assert.equal(attempts.length,2);assert.equal(attempts[1].fresh,true);assert.equal(attempts[0].signal.aborted,true);
 recovery.retry('media failed');time.advance(2400);await settle();assert.equal(attempts.length,3);recovery.retry('still unavailable');assert.equal(final.length,1);time.advance(60000);await settle();assert.equal(attempts.length,3);assert.equal(recovery.state,'exhausted');
});

test('a hung episode recovery stops at 45 seconds and cancels its current request',async()=>{
 const time=clock(),attempts=[],final=[];const recovery=createPlaybackRecovery({onAttempt:row=>{attempts.push(row);return new Promise(()=>{});},onExhausted:row=>final.push(row)},time);
 recovery.start();await settle();time.advance(45000);assert.equal(final.length,1);assert.equal(attempts[0].signal.aborted,true);assert.equal(recovery.state,'exhausted');
});

test('closing before dispatch or while backing off never wakes a new network attempt',async()=>{
 const time=clock(),attempts=[];const recovery=createPlaybackRecovery({onAttempt:row=>attempts.push(row)},time);
 recovery.start();recovery.cancel();await settle();assert.equal(attempts.length,0);
 recovery.start();await settle();recovery.retry('temporary');recovery.cancel();time.advance(60000);await settle();assert.equal(attempts.length,1);assert.equal(attempts[0].signal.aborted,true);
});

test('successful playback cancels recovery deadlines and pending metadata work',async()=>{
 const time=clock(),attempts=[],final=[];const recovery=createPlaybackRecovery({onAttempt:row=>attempts.push(row),onExhausted:row=>final.push(row)},time);
 recovery.start();await settle();recovery.success();time.advance(60000);assert.equal(final.length,0);assert.equal(attempts[0].signal.aborted,true);
});

test('source requests abort when the last watching consumer closes and never publish late data',async()=>{
 const controller=new AbortController(),updates=[];let networkSignal;
 const load=createSourceLoader(async(path,options)=>{if(path.endsWith('/providers'))return {providers:[{id:'video',name:'Video'}]};networkSignal=options.signal;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));});
 const task=load(1,1,1,{signal:controller.signal,onUpdate:row=>updates.push(row)});await settle();controller.abort();await assert.rejects(task);assert.equal(networkSignal.aborted,true);assert.equal(updates.length,0);
});

test('a cancelled viewer does not cancel a shared request still needed by another viewer',async()=>{
 let finish,networkSignal;const load=createSourceLoader(async(path,options)=>{if(path.endsWith('/providers'))return {providers:[{id:'video',name:'Video'}]};networkSignal=options.signal;return new Promise(resolve=>finish=resolve);});
 const controller=new AbortController(),first=load(1,1,1,{signal:controller.signal}).catch(error=>error),second=load(1,1,1);await settle();controller.abort();await first;assert.equal(networkSignal.aborted,false);
 finish({available:true,streams:[{url:'https://video.test/episode.mp4',type:'video/mp4'}]});assert.equal((await second).available,true);
});

test('provider caption styles cannot restore black subtitle backgrounds',()=>{
 const vtt=toVtt('WEBVTT\n\nSTYLE\n::cue { background: black; color: black; }\n\n00:00.000 --> 00:02.000\n<c.bg_black>Olá <b>mundo</b></c>');assert.ok(!vtt.includes('STYLE'));assert.ok(!vtt.includes('bg_black'));assert.ok(vtt.includes('Olá <b>mundo</b>'));
});

test('a fresh stream retry bypasses transient negative caching while manifest outages stay backed off',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('temporary',{status:502}):Response.json({streams:[]}));
 const url='https://recovery14.example/stream/series/tt120155%3A1%3A1.json';await assert.rejects(readAddon(url,0,true));assert.deepEqual(await readAddon(url,0,true),{streams:[]});assert.equal(calls,2);
});

test('the verified alternative provider uses the exact catalog TMDB episode and never queries by title',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async url=>{const path=new URL(url).pathname;calls.push(path);return Response.json(path.endsWith('/manifest.json')?{resources:['stream'],types:['series','anime']}:{streams:[{url:'https://media14.example/exact.mp4',name:'AnimeWorld'}]});});
 const anime={id:120155,name:'The Greatest Demon Lord Is Reborn as a Typical Nobody',external_ids:{imdb_id:'ttOther'}};
 const result=await addonPlayback(anime,2,3,{PROVIDER_ID:'italianhttps',STREMIO_MANIFEST_URL:'https://italian14.example/manifest.json'},'https://anime.example',true);
 assert.equal(result.available,true);assert.equal(result.type,'video/mp4');assert.deepEqual(calls,['/manifest.json','/stream/series/tmdb%3A120155%3A2%3A3.json']);
 const extra=providers({}).find(p=>p.id==='italianhttps');assert.match(extra.name,/IT/);assert.ok(!providers({ITALIANHTTPS_MANIFEST_URL:'disabled'}).some(p=>p.id==='italianhttps'));
});
