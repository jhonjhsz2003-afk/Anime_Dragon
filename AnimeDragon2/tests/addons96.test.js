import test from 'node:test';
import assert from 'node:assert/strict';
import {addons,providers} from '../server/providers.js';
import {addonPlayback,readAddon} from '../server/addon.js';
import {addonMetadata,addonSubtitles,normalizeSubtitles,addonStatus} from '../server/services.js';
import {toVtt,mergeCaptions} from '../web/js/captions.js';
import {startMedia} from '../web/js/player.js';
import {createSourceLoader} from '../web/js/sources.js';
import worker from '../worker.js';
import {episodeCoordinates} from '../server/episode-identity.js';
const anime={id:999,external_ids:{imdb_id:'tt999'},genres:[{id:16}],origin_country:['JP']};
test('Solo Leveling part two maps to IMDb season two only for the confirmed catalog layout',()=>{
 const a={id:127532,seasons:[{season_number:1,episode_count:25}]};
 assert.deepEqual(episodeCoordinates(a,'tt21209876',1,13),{season:2,episode:1});assert.deepEqual(episodeCoordinates(a,'tt21209876',1,25),{season:2,episode:13});
 assert.deepEqual(episodeCoordinates({...a,seasons:[{season_number:1,episode_count:12},{season_number:2,episode_count:13}]},'tt21209876',2,1),{season:2,episode:1});
 assert.deepEqual(episodeCoordinates(a,'ttDifferent',1,13),{season:1,episode:13});
});

test('each requested addon has one role; metadata and subtitles never become video providers',()=>{
 const all=addons({});for(const id of ['primary','piratebay','aiometadata','subsense','animesbr'])assert.equal(all.filter(x=>x.id===id).length,1);
 assert.ok(providers({}).every(x=>['stream','external'].includes(x.role)));
 assert.equal(addons({}).find(x=>x.id==='aiometadata').configured,false);
 assert.ok(!providers({ANIMESBR_MANIFEST_URL:'disabled'}).some(x=>x.id==='animesbr'));
});
test('missing AIO configuration makes no network request; mismatched metadata is rejected',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async url=>{calls++;return Response.json(String(url).endsWith('manifest.json')?{resources:['meta'],types:['series'],idPrefixes:['tt']}:{meta:{id:'ttWrong',description:'Wrong anime'}});});
 assert.equal((await addonMetadata(anime,{})).available,false);assert.equal(calls,0);
 assert.equal((await addonMetadata(anime,{AIOMETADATA_MANIFEST_URL:'https://aio-test.example/config/manifest.json'})).available,false);
});
test('AIO enrichment returns text only, without replacing anime identity or episode order',async t=>{
 t.mock.method(globalThis,'fetch',async url=>Response.json(String(url).endsWith('manifest.json')?{resources:['meta'],types:['series']}:{meta:{id:'tt999',description:'Uma sinopse',cast:['Voz'],videos:[{id:'wrong'}]}}));
 const result=await addonMetadata(anime,{AIOMETADATA_MANIFEST_URL:'https://aio-valid.example/private-config/manifest.json'});
 assert.equal(result.description,'Uma sinopse');assert.deepEqual(result.cast,['Voz']);assert.equal(result.videos,undefined);assert.equal(result.id,undefined);assert.ok(!JSON.stringify(result).includes('private-config'));
});
test('SubSense uses exact episode identity, dedupes URLs and prioritizes Portuguese',async t=>{
 let requested='';t.mock.method(globalThis,'fetch',async url=>{requested=String(url);return Response.json(requested.endsWith('manifest.json')?{resources:['subtitles'],types:['series'],idPrefixes:['tt']}:{subtitles:[{url:'https://subs.example/en.srt',lang:'eng'},{url:'https://subs.example/br.srt',lang:'pob'},{url:'https://subs.example/br.srt#duplicate',lang:'pt-BR'},{url:'http://subs.example/bad',lang:'por'},{url:'https://subs.example/another.srt',lang:'pob'}]});});
 const d=await addonSubtitles(anime,2,3,{SUBSENSE_MANIFEST_URL:'https://sub-test.example/manifest.json'});
 assert.match(requested,/tt999%3A2%3A3/);assert.equal(d.subtitles.length,3);assert.equal(d.subtitles[0].language,'pt-BR');assert.equal(d.subtitles.at(-1).language,'en');
 assert.deepEqual(normalizeSubtitles({bad:true}),[]);
});
test('torrent results remain external, preserve file index and dedupe without fake video URLs',async t=>{
 const hash='a'.repeat(40);t.mock.method(globalThis,'fetch',async url=>Response.json(String(url).endsWith('manifest.json')?{resources:['stream'],types:['series'],idPrefixes:['tt']}:{streams:[{infoHash:hash,fileIdx:2},{infoHash:hash.toUpperCase(),fileIdx:2},{infoHash:hash,fileIdx:3},{infoHash:'bad'},{infoHash:hash,fileIdx:-1},{url:'https://video.example/ep.mp4'},{url:'https://video.example/ep.mp4'}]}));
 const d=await addonPlayback(anime,1,2,{STREMIO_MANIFEST_URL:'https://torrent-test.example/manifest.json',ASSETS:{fetch:async()=>Response.json({})}},'https://anime.example');
 assert.equal(d.streams.length,1);assert.equal(d.externalStreams.length,2);assert.match(d.externalStreams[0].magnet,/&so=2$/);assert.equal(d.externalStreams[0].url,undefined);
});
test('external streams dedupe across providers; signed relay URLs dedupe by underlying video',async()=>{
 const hash='b'.repeat(40),load=createSourceLoader(async path=>path.endsWith('/providers')?{providers:[{id:'a',name:'A'},{id:'b',name:'B'}]}:{available:true,streams:[{url:'/api/video?ticket='+path.at(-1)+'&url='+encodeURIComponent('https://cdn.example/ep.m3u8')}],externalStreams:[{infoHash:hash,fileIdx:0},{infoHash:hash,fileIdx:0}]});
 const d=await load(1,1,1);assert.equal(d.streams.length,1);assert.equal(d.externalStreams.length,1);
});
test('an offline provider is temporarily backed off, including fresh retries',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('Deployment disabled',{status:402});});
 for(let i=0;i<3;i++)await assert.rejects(readAddon('https://offline96.example/manifest.json',100,true));assert.equal(calls,1);
});
test('internal diagnostics never expose configured URLs, keys or provider exceptions',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('https://secret.test/my-password');});
 const d=await addonStatus({STREMIO_MANIFEST_URL:'https://secret.test/my-password/manifest.json'});
 assert.ok(d.some(p=>p.id==='primary'&&p.status==='unavailable'));assert.ok(!JSON.stringify(d).includes('my-password'));
});
test('subtitles and metadata API apply the anime gate before contacting any addon',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async url=>{calls.push(String(url));return Response.json({id:98765,genres:[{id:18}],origin_country:['US']});});
 for(const route of ['/api/subtitles?id=98765&season=1&episode=1','/api/addons/metadata?id=98765']){const r=await worker.fetch(new Request('https://test'+route),{TMDB_API_KEY:'gate96'},{});assert.equal(r.status,404);}
 assert.ok(calls.every(url=>url.startsWith('https://api.themoviedb.org/')));
});
test('SRT conversion preserves accents, turns cue timestamps into VTT and rejects HTML/ASS',()=>{
 const s=toVtt('\uFEFF1\r\n00:00:01,200 --> 00:00:04,900\r\nOlá, você!\r\n');assert.match(s,/^WEBVTT/);assert.match(s,/00:00:01\.200 --> 00:00:04\.900/);assert.match(s,/Olá, você!/);
 assert.throws(()=>toVtt('<html>provider error</html>'));assert.throws(()=>toVtt('[Script Info]\nDialogue: bad'));assert.throws(()=>toVtt('x'.repeat(2000001)));
 assert.equal(mergeCaptions([{src:'https://subs.test/a.srt'}],[{src:'https://subs.test/a.srt#repeat'},{src:'https://subs.test/b.srt'},{src:'javascript:alert(1)'}]).length,2);
});
test('autostart begins immediately and muted fallback handles browser policy without source failure',async()=>{
 const allowed={play:async()=>{}};assert.equal(await startMedia(allowed),'playing');
 let n=0;const muted={muted:false,play:async()=>{if(++n===1)throw Object.assign(Error(),{name:'NotAllowedError'});}};
 assert.equal(await startMedia(muted),'muted');assert.equal(muted.muted,true);assert.equal(n,2);
 const denied={play:async()=>{throw Object.assign(Error(),{name:'NotAllowedError'});}};assert.equal(await startMedia(denied),'blocked');
 const broken={play:async()=>{throw Object.assign(Error(),{name:'NotSupportedError'});}};await assert.rejects(startMedia(broken));
});
test('closing or switching episodes during pending play never starts a stale muted attempt',async()=>{
 let active=true,calls=0,reject;const video={play:()=>{calls++;return new Promise((_,r)=>reject=r);}};
 const p=startMedia(video,()=>active);active=false;reject(Object.assign(Error(),{name:'NotAllowedError'}));assert.equal(await p,'cancelled');assert.equal(calls,1);
});
