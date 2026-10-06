import test from 'node:test';
import assert from 'node:assert/strict';
import {addonEpisodes,addonPlayback,publicHttps} from '../server/addon.js';
const anime={id:123,external_ids:{imdb_id:'tt123'}};
const env={STREMIO_MANIFEST_URL:'https://addon.test/manifest.json',ASSETS:{fetch:async()=>Response.json({})}};
let streams=[{url:'https://media.example.org/episode.m3u8',name:'HD',subtitles:[{url:'https://media.example.org/pt.vtt',lang:'pt'}]},{infoHash:'abc'},{url:'http://insecure.example.org/e.mp4'},{url:'https://media.example.org/proxy',behaviorHints:{proxyHeaders:{request:{Referer:'x'}}}}];
const calls=[];
globalThis.fetch=async url=>{const u=new URL(url);calls.push(u);if(u.pathname.endsWith('/manifest.json'))return Response.json({resources:['meta','stream'],types:['series'],idPrefixes:['tt']});if(u.pathname.includes('/meta/'))return Response.json({meta:{id:'tt123',videos:[{id:'tt123:3:2',season:3,episode:2,title:'Segundo episódio',released:'2026-09-01',thumbnail:'https://images.example.org/e2.jpg'}]}});if(u.pathname.includes('/stream/'))return Response.json({streams});throw Error('Unexpected request')};
test('addon metadata preserves provider episode IDs and real season numbers',async()=>{const data=await addonEpisodes(anime,env,'https://anime.test');assert.equal(data[0].id,'tt123:3:2');assert.equal(data[0].season_number,3);assert.equal(data[0].episode_number,2);assert.match(data[0].thumbnail,/e2.jpg/)});
test('playback resolves exact episode and offers only browser-compatible HTTPS sources',async()=>{const d=await addonPlayback(anime,3,2,env,'https://anime.test');assert.equal(d.available,true);assert.equal(d.streams.length,1);assert.equal(d.type,'application/vnd.apple.mpegurl');assert.equal(d.subtitles[0].language,'pt');assert.ok(calls.at(-1).pathname.includes('tt123%3A3%3A2'))});
test('missing provider episode does not silently play another episode',async()=>{const d=await addonPlayback(anime,2,1,env,'https://anime.test');assert.equal(d.available,false)});
test('unknown anime identity remains unavailable instead of a title-based guess',async()=>{const d=await addonPlayback({id:444},1,1,env,'https://anime.test');assert.equal(d.available,false)});
test('source filtering rejects private, malformed and credential-bearing URLs',()=>{for(const url of ['http://example.org/a','https://localhost/a','https://127.0.0.1/a','https://10.0.1.2/a','https://user:password@example.org/a','javascript:alert(1)'])assert.equal(publicHttps(url),false);assert.equal(publicHttps('https://media.example.org/a.mp4'),true)});

test('expired signed video URLs are renewed before they reach the browser',async t=>{
 const env2={STREMIO_MANIFEST_URL:'https://refresh-addon.test/manifest.json',ASSETS:{fetch:async()=>Response.json({})}},anime2={id:999,external_ids:{imdb_id:'tt999'}};
 let streamReads=0,refreshSeen=false;
 t.mock.method(globalThis,'fetch',async url=>{const u=new URL(url);
  if(u.pathname.endsWith('/manifest.json'))return Response.json({resources:['meta','stream'],types:['series'],idPrefixes:['tt']});
  if(u.pathname.includes('/meta/'))return Response.json({meta:{id:'tt999',videos:[{id:'tt999:1:1',season:1,episode:1}]}});
  if(u.pathname.includes('/stream/')){streamReads++;refreshSeen ||= u.searchParams.has('_ad_refresh');const expires=Math.floor(Date.now()/1000)+(streamReads===1?-60:600);return Response.json({streams:[{url:`https://watch.example.org/episode.m3u8?expires=${expires}`,name:'HD'}]});}
  throw Error('Unexpected request');
 });
 const data=await addonPlayback(anime2,1,1,env2,'https://anime.test');
 assert.equal(streamReads,2);assert.equal(refreshSeen,true);assert.equal(data.available,true);assert.ok(data.streams[0].expiresAt>Date.now()+45000);
});


test('anime-type Stremio resources are accepted as playback providers',async t=>{
 const env3={STREMIO_MANIFEST_URL:'https://anime-type.test/manifest.json',ASSETS:{fetch:async()=>Response.json({})}},anime3={id:321,external_ids:{imdb_id:'tt321'}};
 t.mock.method(globalThis,'fetch',async url=>{const u=new URL(url);
  if(u.pathname.endsWith('/manifest.json'))return Response.json({resources:[{name:'meta',types:['anime'],idPrefixes:['tt']},{name:'stream',types:['anime'],idPrefixes:['tt']}],types:['anime']});
  if(u.pathname.includes('/meta/anime/'))return Response.json({meta:{id:'tt321',videos:[{id:'tt321:1:1',season:1,episode:1}]}});
  if(u.pathname.includes('/stream/anime/'))return Response.json({streams:[{url:'https://media.example.org/anime.m3u8?expires='+Math.floor(Date.now()/1000+600),name:'Anime HLS'}]});
  throw Error('Unexpected request '+u.pathname);
 });
 const data=await addonPlayback(anime3,1,1,env3,'https://anime.test');assert.equal(data.available,true);assert.match(data.url,/anime\.m3u8/);
});

test('provider that keeps returning expired signed links is never exposed to the browser',async t=>{
 const env4={STREMIO_MANIFEST_URL:'https://stale-addon.test/manifest.json',ASSETS:{fetch:async()=>Response.json({})}},anime4={id:654,external_ids:{imdb_id:'tt654'}};
 t.mock.method(globalThis,'fetch',async url=>{const u=new URL(url);
  if(u.pathname.endsWith('/manifest.json'))return Response.json({resources:['meta','stream'],types:['series'],idPrefixes:['tt']});
  if(u.pathname.includes('/meta/'))return Response.json({meta:{id:'tt654',videos:[{id:'tt654:1:1',season:1,episode:1}]}});
  if(u.pathname.includes('/stream/'))return Response.json({streams:[{url:'https://watch.example.org/stale.m3u8?expires='+Math.floor(Date.now()/1000-600),name:'Stale'}]});
  throw Error('Unexpected request');
 });
 const data=await addonPlayback(anime4,1,1,env4,'https://anime.test',true);assert.equal(data.available,false);assert.equal(data.streams.length,0);assert.match(data.reason,/expirados/);
});


test('primary HLS rejected with HTTP 403 is discarded before the browser sees it',async t=>{
 const env5={STREMIO_MANIFEST_URL:'https://primary-probe.test/manifest.json',PROVIDER_ID:'primary',ASSETS:{fetch:async()=>Response.json({})}},anime5={id:777,external_ids:{imdb_id:'tt777'}};
 t.mock.method(globalThis,'fetch',async (url,options={})=>{const u=new URL(url);
  if(u.hostname==='primary-probe.test'&&u.pathname.endsWith('/manifest.json'))return Response.json({resources:['meta','stream'],types:['series'],idPrefixes:['tt']});
  if(u.hostname==='primary-probe.test'&&u.pathname.includes('/meta/'))return Response.json({meta:{id:'tt777',videos:[{id:'tt777:1:1',season:1,episode:1}]}});
  if(u.hostname==='primary-probe.test'&&u.pathname.includes('/stream/'))return Response.json({streams:[{url:'https://blocked-video.test/episode.m3u8',name:'1080p'}]});
  if(u.hostname==='blocked-video.test')return new Response('Forbidden',{status:403,headers:{'Content-Type':'text/plain'}});
  throw Error('Unexpected request '+u.href);
 });
 const data=await addonPlayback(anime5,1,1,env5,'https://anime.test',true);
 assert.equal(data.available,false);assert.equal(data.streams.length,0);assert.match(data.reason,/HTTP 403/);
});

test('primary HLS with valid CORS and manifest signature remains browser-playable',async t=>{
 const env6={STREMIO_MANIFEST_URL:'https://primary-ready.test/manifest.json',PROVIDER_ID:'primary',ASSETS:{fetch:async()=>Response.json({})}},anime6={id:778,external_ids:{imdb_id:'tt778'}};
 t.mock.method(globalThis,'fetch',async (url,options={})=>{const u=new URL(url);
  if(u.hostname==='primary-ready.test'&&u.pathname.endsWith('/manifest.json'))return Response.json({resources:['meta','stream'],types:['series'],idPrefixes:['tt']});
  if(u.hostname==='primary-ready.test'&&u.pathname.includes('/meta/'))return Response.json({meta:{id:'tt778',videos:[{id:'tt778:1:1',season:1,episode:1}]}});
  if(u.hostname==='primary-ready.test'&&u.pathname.includes('/stream/'))return Response.json({streams:[{url:'https://ready-video.test/episode.m3u8',name:'1080p'}]});
  if(u.hostname==='ready-video.test')return new Response('#EXTM3U\n#EXT-X-VERSION:3\n',{status:200,headers:{'Content-Type':'application/vnd.apple.mpegurl','Access-Control-Allow-Origin':'https://anime.test'}});
  throw Error('Unexpected request '+u.href);
 });
 const data=await addonPlayback(anime6,1,1,env6,'https://anime.test',true);
 assert.equal(data.available,true);assert.equal(data.streams.length,1);assert.equal(data.type,'application/vnd.apple.mpegurl');
});
