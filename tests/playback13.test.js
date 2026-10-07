import test from 'node:test';
import assert from 'node:assert/strict';
import {probePrimarySource,providerFailureReason,publicHttps} from '../server/addon.js';
const origin='https://anime.test',gateway='https://fenixbot.squareweb.app/stream/123';
const mp4=Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]);

test('verified opaque Fenix MP4 uses bounded GET instead of unsupported HEAD and needs no native media CORS',async t=>{
 t.mock.method(globalThis,'fetch',async(_url,options)=>{assert.equal(options.method,'GET');assert.equal(options.headers.get('Range'),'bytes=0-1023');return new Response(mp4,{status:206,headers:{'Content-Type':'video/mp4'}});});
 const result=await probePrimarySource({url:gateway},origin);assert.equal(result.ok,true);assert.equal(result.type,'video/mp4');
});

test('opaque Matroska is identified for low-priority native fallback while mislabeled HTML is rejected',async t=>{
 const mkv=t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array([0x1a,0x45,0xdf,0xa3]),{headers:{'Content-Type':'video/x-matroska'}}));
 assert.deepEqual(await probePrimarySource({url:gateway},origin),{ok:true,type:'video/x-matroska'});mkv.mock.restore();
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>upstream unavailable</html>',{headers:{'Content-Type':'video/mp4'}}));
 const result=await probePrimarySource({url:gateway},origin);assert.equal(result.ok,false);assert.match(result.reason,/página de erro/);
});

test('HLS signature split across chunks is recognized while missing CORS remains an explicit rejection',async t=>{
 const url='https://media.test/episode.m3u8';
 t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({start(controller){for(const part of ['#EX','TM3U\n','#EXT-X-VERSION:7\n'])controller.enqueue(new TextEncoder().encode(part));controller.close();}}),{headers:{'Content-Type':'application/octet-stream','Access-Control-Allow-Origin':'*'}}));
 assert.deepEqual(await probePrimarySource({url},origin),{ok:true,type:'application/vnd.apple.mpegurl'});
 const mock=t.mock.method(globalThis,'fetch',async()=>new Response('#EXTM3U\n#EXT-X-VERSION:7\n'));assert.match((await probePrimarySource({url},origin)).reason,/CORS/);mock.mock.restore();
});

test('opaque probing is limited to verified provider gateways and arbitrary public URL ports are rejected',async t=>{
 t.mock.method(globalThis,'fetch',()=>{throw new Error('must not probe an arbitrary gateway');});assert.deepEqual(await probePrimarySource({url:'https://unverified.test/stream/123'},origin),{ok:true,type:''});assert.equal(publicHttps('https://video.test:8443/stream/123'),false);
});

test('provider diagnostics distinguish HTTP outage from timeout without exposing error text or configured secrets',()=>{
 assert.match(providerFailureReason({upstreamStatus:402}),/HTTP 402/);assert.match(providerFailureReason({upstreamStatus:502}),/HTTP 502/);assert.match(providerFailureReason({name:'TimeoutError'}),/prazo/);assert.ok(!providerFailureReason(new Error('https://secret.test/private-key')).includes('secret'));
});
