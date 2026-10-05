import test from 'node:test';
import assert from 'node:assert/strict';
import {createCache} from '../server/cache.js';
import worker from '../worker.js';
import {addonPlayback} from '../server/addon.js';
import {readFileSync} from 'node:fs';
test('bounded cache shares in-flight requests, expires and never caches a failure',async()=>{
  let now=0,n=0;const cache=createCache(2,()=>now),read=async()=>++n;
  assert.deepEqual(await Promise.all([cache.get('a',10,read),cache.get('a',10,read)]),[1,1]);
  now=11;assert.equal(await cache.get('a',10,read),2);
  await assert.rejects(cache.get('b',10,()=>{throw Error('offline')}));assert.equal(await cache.get('b',10,read),3);
  await cache.get('c',10,read);assert.equal(await cache.get('a',10,read),5);
});
const anime=id=>({id,name:'Anime '+id,genres:[{id:16}],origin_country:['JP'],seasons:[{season_number:1,episode_count:25}],number_of_episodes:25,external_ids:{imdb_id:'tt'+id}});
test('catalog keeps all canonical episodes without waiting for any stream addon',async t=>{
  const calls=[];t.mock.method(globalThis,'fetch',async url=>{const u=new URL(url);calls.push(u);assert.equal(u.hostname,'api.themoviedb.org');return Response.json(u.pathname.includes('/season/')?{episodes:Array.from({length:25},(_,i)=>({episode_number:i+1}))}:anime(127532));});
  const env={TMDB_API_KEY:'catalog-test',ASSETS:{fetch:async()=>Response.json({})}},ctx={};
  const detail=await (await worker.fetch(new Request('https://test/api/catalog/tv/127532'),env,ctx)).json();
  assert.equal(detail.item.number_of_episodes,25);
  const result=await (await worker.fetch(new Request('https://test/api/catalog/tv/127532/season/1'),env,ctx)).json();assert.equal(result.season.episodes.length,25);assert.equal(calls.length,2);
});
test('Solo Leveling episode 13 uses the verified second-part episode 1 ID',async t=>{
  let requested;const mappings=JSON.parse(readFileSync(new URL('../web/addon-mappings.json',import.meta.url)));
  t.mock.method(globalThis,'fetch',async url=>{requested=new URL(url);return Response.json(requested.pathname.endsWith('manifest.json')?{resources:[{name:'stream',types:['series'],idPrefixes:['anilist:']}],types:['series']}:{streams:[{url:'https://video.test/13.mp4'}]});});
  const env={STREMIO_MANIFEST_URL:'https://mapping.test/manifest.json',PROVIDER_ID:'nagare',ASSETS:{fetch:async()=>Response.json(mappings)}};
  const result=await addonPlayback(anime(127532),1,13,env,'https://test');assert.equal(result.available,true);assert.match(requested.pathname,/anilist%3A176496-1\.json$/);
});
test('recent episode dates outrank popularity and future releases never enter updated rail',async t=>{
  const today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  t.mock.method(globalThis,'fetch',async url=>{const u=new URL(url);if(u.pathname.includes('/discover/'))return Response.json({results:[1,2,3].map(id=>({...anime(id),genre_ids:[16]}))});const id=Number(u.pathname.split('/').at(-1));return Response.json({...anime(id),last_episode_to_air:{air_date:id===1?yesterday:id===2?today:'2099-01-01'}});});
  const r=await worker.fetch(new Request('https://test/api/catalog/home'),{TMDB_API_KEY:'home-order-test'},{}),d=await r.json();assert.deepEqual(d.updated.map(x=>x.id),[2,1]);assert.equal(d.featured[0].id,2);assert.equal(d.featured[0].last_episode_to_air.air_date,today);
});
test('provider addresses remain private configuration and arbitrary URLs cannot be selected',async()=>{
  const r=await worker.fetch(new Request('https://test/api/playback/providers'),{STREMIO_MANIFEST_URL:'https://provider.test/secret-key/manifest.json'},{});const body=await r.text();assert.ok(!body.includes('secret-key'));assert.match(body,/nagare/);
});
