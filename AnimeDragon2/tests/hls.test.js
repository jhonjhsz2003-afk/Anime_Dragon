import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedMedia,compatibleSources,videoRelay,rewritePlaylist} from '../server/hls.js';
const env={AUTH_SECRET:'local-test-secret-only-not-production-123456789'};
const original='https://embedplayer2.xyz/cdn/hls/test/master.m3u8';
async function signed(){return (await compatibleSources({available:true,streams:[{url:original,name:'Teste'}]},env)).streams[0].url;}
test('HLS relay rejects arbitrary hosts, private IPs, ports and paths',()=>{
  for(const url of ['https://127.0.0.1/hls/a','https://embedplayer2.xyz.evil.test/hls/a','https://embedplayer2.xyz:8443/hls/a','http://embedplayer2.xyz/hls/a','https://user:pass@embedplayer2.xyz/hls/a','https://embedplayer2.xyz/admin','https://plosia6.xyz/account'])assert.equal(allowedMedia(url),false);
  assert.equal(allowedMedia(original),true);assert.equal(allowedMedia('https://plosia6.xyz/p/segment'),true);
});
test('signed HLS playlist rewrites variants, subtitles and keys to the same site',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,URI="/hls/audio"\n#EXT-X-KEY:METHOD=AES-128,URI="/hls/key"\n/hls/variant\n',{headers:{'Content-Type':'application/x-mpegURL'}}));
  const url=await signed();const response=await videoRelay(new Request('https://anime.test'+url),env),body=await response.text();
  assert.match(body,/#EXTM3U/);assert.equal((body.match(/\/api\/video\?/g)||[]).length,3);assert.match(response.headers.get('Content-Type'),/mpegurl/);
});
test('forged and expired tickets cannot fetch any upstream resource',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',()=>{calls++;throw Error('must not fetch')});
  const url=new URL('https://anime.test'+await signed());url.searchParams.set('ticket','1790000000.'+'0'.repeat(64));
  await assert.rejects(videoRelay(new Request(url),env),e=>e.status===403);assert.equal(calls,0);
});
test('video byte ranges stream through; viewer cookies and authorization never reach CDN',async t=>{
  t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.headers.get('Range'),'bytes=1-2');assert.equal(options.headers.get('Cookie'),null);assert.equal(options.headers.get('Authorization'),null);return new Response(new Uint8Array([2,3]),{status:206,headers:{'Content-Type':'video/mp2t','Content-Range':'bytes 1-2/4'}});});
  const response=await videoRelay(new Request('https://anime.test'+await signed(),{headers:{Range:'bytes=1-2',Cookie:'session=private',Authorization:'Bearer private'}}),env);
  assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 1-2/4');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[2,3]);
});
test('CDN errors, HTML and redirects outside approved media hosts fail closed',async t=>{
  const url='https://anime.test'+await signed();
  for(const response of [new Response('bad',{status:500}),new Response('<html>',{headers:{'Content-Type':'text/html'}}),new Response(null,{status:302,headers:{Location:'https://localhost/private'}})]){
    const mock=t.mock.method(globalThis,'fetch',async()=>response);await assert.rejects(videoRelay(new Request(url),env),e=>e.status===502);mock.mock.restore();
  }
  assert.throws(()=>rewritePlaylist('#EXTM3U\nhttps://internal.local/key',original,'ticket'));
});
test('large playlists cannot consume unbounded memory',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('#EXTM3U\n'+'a'.repeat(1000001),{headers:{'Content-Type':'application/x-mpegURL'}}));
  await assert.rejects(videoRelay(new Request('https://anime.test'+await signed()),env),e=>e.status===502);
});
test('Nagare JPEG-labelled HLS is recognized even when its signature is split across chunks',async t=>{
  const raw='https://imgcdn44.dpopdrop89.store/cdn/test';
  const source=(await compatibleSources({streams:[{url:raw,name:'Nagare'}]},env)).streams[0];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(options.headers.get('Referer'),'https://play2.echovideo.ru/');
    return new Response(new ReadableStream({start(c){for(const text of ['#EX','TM3U\n','/cdn/child\n'])c.enqueue(new TextEncoder().encode(text));c.close();}}),{headers:{'Content-Type':'image/jpeg'}});
  });
  const response=await videoRelay(new Request('https://anime.test'+source.url),env);
  assert.match(response.headers.get('Content-Type'),/mpegurl/);assert.match(await response.text(),/\/api\/video\?/);
});
