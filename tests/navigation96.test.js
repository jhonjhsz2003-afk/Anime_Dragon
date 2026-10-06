import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogCache,createIntentPreloader} from '../web/js/navigation.js';
test('public navigation cache survives reload and expires, without persisting account or video data',()=>{
 let saved='',time=100;const storage={getItem:()=>saved,setItem:(_,v)=>saved=v},c=createCatalogCache(storage,()=>time);
 c.put('/api/catalog/discover?genre=isekai',{ok:true,results:[{id:1}]},200);
 for(const path of ['/api/auth/me','/api/community/profile/private','/api/playback?id=1','/api/addons/metadata?id=1'])c.put(path,{ok:true,secret:'private'},300);
 const restored=createCatalogCache(storage,()=>time);assert.equal(restored.get('/api/catalog/discover?genre=isekai').data.results[0].id,1);assert.ok(!saved.includes('private'));time=201;assert.equal(restored.get('/api/catalog/discover?genre=isekai'),null);
});
test('storage corruption and quota errors cannot stop navigation',()=>{
 const c=createCatalogCache({getItem:()=>'{invalid',setItem:()=>{throw Error('Quota');}});
 c.put('/api/catalog/home',{ok:true,results:[]},Date.now()+1000);assert.equal(c.get('/api/catalog/home').data.ok,true);
});
test('intent preparation dedupes, limits concurrency to two and ignores sensitive routes',async()=>{
 const resolvers=[],calls=[];const warm=createIntentPreloader(path=>{calls.push(path);return new Promise(r=>resolvers.push(r));});
 const a=warm('/api/catalog/tv/1'),duplicate=warm('/api/catalog/tv/1'),b=warm('/api/catalog/tv/2');
 assert.equal(await warm('/api/catalog/tv/3'),null);assert.equal(await warm('/api/auth/me'),null);assert.equal(calls.length,2);
 resolvers.forEach(r=>r({ok:true}));await Promise.all([a,duplicate,b]);await warm('/api/catalog/tv/1');assert.equal(calls.length,2);
});
