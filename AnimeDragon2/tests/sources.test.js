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
  now+=21000;await load(1,1,2);assert.equal(calls,3);
});
test('failed provider does not discard sources from healthy provider',async()=>{
  const load=createSourceLoader(async path=>{if(path.endsWith('/providers'))return {providers:[{id:'bad',name:'Falha'},{id:'good',name:'OK'}]};if(path.includes('provider=bad'))throw Error('offline');return stream('https://video.test/ok.mp4');});
  const result=await load(1,1,1);assert.equal(result.available,true);assert.equal(result.complete,true);assert.equal(result.providers[0].available,false);
});
