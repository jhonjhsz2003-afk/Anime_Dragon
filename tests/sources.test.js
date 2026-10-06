import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceLoader} from '../web/js/sources.js';
const stream=url=>({available:true,streams:[{url,type:'video/mp4',name:'HD'}]});
test('first source arrives before a slow provider; alternatives merge without duplicate URLs',async()=>{
  let release;const slow=new Promise(r=>release=r),updates=[];
  const load=createSourceLoader(async path=>path.endsWith('/providers')?{providers:[{id:'fast',name:'Rápido'},{id:'slow',name:'Lento'}]}:path.includes('provider=slow')?slow:stream('https://video.test/one.mp4'));
  const task=load(1,1,1,{onUpdate:r=>updates.push(r)});
  await new Promise(r=>setImmediate(r));assert.equal(updates.length,1);assert.equal(updates[0].complete,false);assert.equal(updates[0].streams.length,1);
  release({available:true,streams:[...stream('https://video.test/one.mp4').streams,...stream('https://video.test/two.mp4').streams]});
  const result=await task;assert.equal(result.complete,true);assert.equal(result.streams.length,2);
});
test('prefetch reuses results, concurrent calls dedupe, expiry and refresh fetch new URLs',async()=>{
  let now=1,calls=0;const load=createSourceLoader(async path=>{if(path.endsWith('/providers'))return {providers:[{id:'fast',name:'Rápido'}]};calls++;return stream(`https://video.test/${calls}.mp4`);},()=>now);
  await Promise.all([load(1,1,2),load(1,1,2)]);assert.equal(calls,1);
  await load(1,1,2);assert.equal(calls,1);
  await load(1,1,2,{fresh:true});assert.equal(calls,2);
  now+=121000;await load(1,1,2);assert.equal(calls,3);
});
test('failed provider does not discard sources from healthy provider',async()=>{
  const load=createSourceLoader(async path=>{if(path.endsWith('/providers'))return {providers:[{id:'bad',name:'Falha'},{id:'good',name:'OK'}]};if(path.includes('provider=bad'))throw Error('offline');return stream('https://video.test/ok.mp4');});
  const result=await load(1,1,1);assert.equal(result.available,true);assert.equal(result.complete,true);assert.equal(result.providers[0].available,false);
});
test('browser playback never waits for an external torrent-only service',async()=>{
 const calls=[];const load=createSourceLoader(async path=>{calls.push(path);if(path.endsWith('/providers'))return {providers:[{id:'video',name:'Vídeo',role:'stream'},{id:'torrent',name:'Externo',role:'external'}]};assert.ok(!path.includes('provider=torrent'));return stream('https://video.test/ok.mp4');});
 await load.prepare();const result=await load(1,1,1);assert.equal(result.available,true);assert.equal(result.complete,true);assert.equal(calls.length,2);
});

test('an opaque source gives a concurrently arriving browser-compatible source priority',async()=>{
 let finish,run;const updates=[];
 const load=createSourceLoader(async path=>path.endsWith('/providers')?{providers:[{id:'opaque',name:'Unknown'},{id:'hls',name:'HLS'}]}:path.includes('provider=hls')?new Promise(r=>finish=r):{available:true,streams:[{url:'https://video.test/opaque'}]},Date.now,{schedule:fn=>{run=fn;return 1;},cancel:()=>{run=null;}});
 const task=load(1,1,1,{onUpdate:r=>updates.push(r)});await new Promise(r=>setImmediate(r));
 assert.equal(updates.length,0);assert.ok(run);
 finish({available:true,streams:[{url:'https://video.test/index.m3u8',type:'application/vnd.apple.mpegurl'}]});
 await task;assert.equal(updates.at(-1).streams[0].type,'application/vnd.apple.mpegurl');assert.equal(run,null);
});
test('opaque sources remain available after the short grace period if another provider is slow',async()=>{
 let finish,run;const updates=[];
 const load=createSourceLoader(async path=>path.endsWith('/providers')?{providers:[{id:'opaque',name:'Unknown'},{id:'slow',name:'Slow'}]}:path.includes('provider=slow')?new Promise(r=>finish=r):{available:true,streams:[{url:'https://video.test/opaque'}]},Date.now,{schedule:fn=>{run=fn;return 1;},cancel(){}});
 const task=load(1,1,1,{onUpdate:r=>updates.push(r)});await new Promise(r=>setImmediate(r));run();
 assert.equal(updates[0].streams.length,1);assert.equal(updates[0].complete,false);finish({available:false});await task;
});

test('signed source metadata is refreshed before its URL expires',async()=>{
 let now=1_800_000_000_000,calls=0;
 const load=createSourceLoader(async path=>{if(path.endsWith('/providers'))return {providers:[{id:'fast',name:'Rápido'}]};calls++;return {available:true,streams:[{url:`https://video.test/${calls}.m3u8?expires=${Math.floor((now+60000)/1000)}`,type:'application/vnd.apple.mpegurl',expiresAt:now+60000}]};},()=>now);
 await load(1,1,3);assert.equal(calls,1);
 now+=10000;await load(1,1,3);assert.equal(calls,1);
 now+=6000;await load(1,1,3);assert.equal(calls,2);
});
