import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createOpeningTimes,exactOpeningEpisode,validatedOpening} from '../server/opening-times.js';

const snapshot=JSON.parse(await readFile(new URL('../web/opening-mappings.json',import.meta.url),'utf8'));
const anime=(id,count,season=1)=>({id,seasons:[{season_number:season,episode_count:count}]});
const row=(start=50,end=140,length=1435.08,skipType='op')=>({skipType,interval:{startTime:start,endTime:end},episodeLength:length});
const result=(...results)=>({found:true,results});
const mockAssets=data=>({ASSETS:{fetch:async request=>{assert.equal(new URL(request.url).pathname,'/opening-mappings.json');return Response.json(data);}}});

test('published snapshot preserves exact MAL episode numbering across split cours and different titles',()=>{
 assert.equal(snapshot.schema,1);assert.equal(snapshot.sourceSchema,'3.0.3');assert.equal(Object.keys(snapshot.mappings).length,6418);
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,anime(127532,25),1,12),{malId:52299,episode:12});
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,anime(127532,25),1,13),{malId:58567,episode:1});
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,anime(207468,23),1,13),{malId:59177,episode:1});
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,anime(95479,59),1,25),{malId:51009,episode:1});
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,anime(95479,59),1,48),{malId:57658,episode:1});
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,anime(120155,12),1,1),{malId:48415,episode:1});
});

test('closed mapping fails when TMDB season ordering/count changes; seasons are never guessed',()=>{
 for(const [item,s,e]of [[anime(127532,12),1,1],[anime(127532,25),2,1],[anime(127532,25),1,26],[anime(127532,25),1,0],[anime(0,25),1,1],[{id:127532},1,1]])assert.equal(exactOpeningEpisode(snapshot.mappings,item,s,e),null);
 const changed={id:127532,seasons:[{season_number:1,episode_count:12},{season_number:2,episode_count:13}]};
 assert.equal(exactOpeningEpisode(snapshot.mappings,changed,1,1),null);
 assert.deepEqual(exactOpeningEpisode(snapshot.mappings,changed,2,1),{malId:58567,episode:1},'a separately published season2 mapping is usable only with its matching13episode count');
});

test('explicit open ranges and disjoint target segments are precise; bundled and conflicting mappings are rejected',()=>{
 const entry=relations=>({'tmdb_show:9:s2':relations});
 assert.deepEqual(exactOpeningEpisode(entry({'mal:123':{'1-':'13-'}}),anime(9,40,2),2,30),{malId:123,episode:42});
 assert.deepEqual(exactOpeningEpisode(entry({'mal:123':{'1-6':'1-3,8-10'}}),anime(9,6,2),2,4),{malId:123,episode:8});
 for(const targets of [
  {'mal:123':{'1-6':'1-3|2'}},
  {'mal:123':{'1-6':'1-12|-2'}},
  {'mal:123':{'1-6':'1-6'},'mal:456':{'1-6':'1-6'}},
  {'mal:123':{'1-6':'1-6','3':null}},
  {'mal:123':{'1-6':'1-'}},
  {'mal:123':{'1-6':'1-5'}}
 ])assert.equal(exactOpeningEpisode(entry(targets),anime(9,6,2),2,3),null);
});

test('only actual opening intervals matching the current edit within one second are usable',()=>{
 assert.deepEqual(validatedOpening(result(row(191.727,282.077)),1435.08),{start:191.727,end:282.077,episodeLength:1435.08});
 assert.ok(validatedOpening(result(row()),1436.08));
 assert.equal(validatedOpening(result(row()),1436.081),null);
 assert.equal(validatedOpening(result(row(737.7,827.7,1432.9)),1420),null,'another provider edit is not offset/scaled');
 for(const payload of [result(row(-1,100)),result(row(140,50)),result(row(50,1500)),result(row(50,51)),result(row(0,1435)),result(row(50,140,1435.08,'ed')),result(row(50,140,1435.08,'mixed-op')),result(row('50',140)),result(row(50,Infinity)),{found:false,results:[row()]},result()])assert.equal(validatedOpening(payload,1435.08),null);
 assert.equal(validatedOpening(result(row()),NaN),null);
});

test('conflicting same-duration records hide the button; duplicate records and non-openings do not interfere',()=>{
 assert.equal(validatedOpening(result(row(),row(65,155)),1435.08),null);
 assert.ok(validatedOpening(result(row(),row(),row(1000,1090,1435.08,'ed')),1435.08));
 assert.equal(validatedOpening(result(...Array.from({length:33},()=>row())),1435.08),null);
});

test('runtime queries exact MAL episode and measured duration, caches both static mappings and matching result',async()=>{
 let assetReads=0,reads=0;const env={ASSETS:{fetch:async()=>{assetReads++;return Response.json(snapshot);}}};
 const get=createOpeningTimes({fetcher:async(url,options)=>{
  reads++;assert.equal(url.origin,'https://api.aniskip.com');assert.equal(url.pathname,'/v2/skip-times/51009/1');assert.equal(url.searchParams.get('types'),'op');assert.equal(url.searchParams.get('episodeLength'),'1435.080');assert.ok(options.signal);return Response.json(result(row()));
 }});
 const input={anime:anime(95479,59),season:1,episode:25,duration:1435.08,env,origin:'https://anime.test'};
 const a=await get(input),b=await get(input);assert.deepEqual(a,b);assert.equal(a.opening.end,140);assert.equal(a.malId,51009);assert.equal(a.episode,1);assert.equal(assetReads,1);assert.equal(reads,1);
});

test('a source-duration change cannot reuse another edit or a rounded-boundary cache entry',async()=>{
 let reads=0;const get=createOpeningTimes({fetcher:async()=>{reads++;return Response.json(result(row()));}});
 const input={anime:anime(120155,12),season:1,episode:1,env:mockAssets(snapshot),origin:'https://anime.test'};
 assert.ok((await get({...input,duration:1436.0799})).opening);
 assert.equal((await get({...input,duration:1436.0804})).opening,null);
 assert.equal((await get({...input,duration:1500})).opening,null);assert.equal(reads,3);
});

test('missing/invalid mappings and invalid duration never call AniSkip',async()=>{
 const get=createOpeningTimes({fetcher:async()=>assert.fail('unexpected network call')});
 const input={anime:anime(120155,12),season:1,episode:1,duration:1435.08,env:mockAssets(snapshot),origin:'https://anime.test'};
 assert.equal((await get({...input,anime:anime(999999,12)})).opening,null);
 for(const duration of [0,Infinity,NaN,'1435',59,21601])assert.equal((await get({...input,duration})).opening,null);
 assert.equal((await get({...input,env:{}})).opening,null);
 const corrupt=createOpeningTimes({fetcher:async()=>assert.fail('unexpected network call')});
 assert.equal((await corrupt({...input,env:mockAssets({schema:99,mappings:{}})})).opening,null);
});

test('timeouts and service failures leave playback independent and are not cached as successful data',async()=>{
 let reads=0;const get=createOpeningTimes({timeoutMs:15,fetcher:async(url,{signal})=>{
  reads++;if(reads===1)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  if(reads===2)return new Response('',{status:429});return Response.json(result(row()));
 }});
 const input={anime:anime(120155,12),season:1,episode:1,duration:1435.08,env:mockAssets(snapshot),origin:'https://anime.test'};
 // AbortSignal.timeout uses an unref timer; keep the test alive until the assertion completes.
 const timer=setTimeout(()=>{},100);
 try{assert.equal((await get(input)).opening,null);assert.equal((await get(input)).opening,null);assert.ok((await get(input)).opening);assert.equal(reads,3);}finally{clearTimeout(timer);}
});

test('concurrent metadata requests are capped at eight and shared identical lookups are deduplicated',async()=>{
 const resolve=[];let reads=0;
 const get=createOpeningTimes({fetcher:async()=>{reads++;return new Promise(done=>resolve.push(()=>done(Response.json(result(row())))));}});
 const input={anime:anime(120155,12),season:1,episode:1,duration:1435.08,env:mockAssets(snapshot),origin:'https://anime.test'};
 const tasks=Array.from({length:10},(_,index)=>get({...input,duration:1435.08+index}));
 const duplicate=get(input);
 await new Promise(done=>setImmediate(done));assert.equal(reads,8);
 resolve.forEach(done=>done());const results=await Promise.all(tasks);await duplicate;
 assert.ok(results[0].opening);assert.equal(results[8].opening,null);assert.equal(results[9].opening,null);
});
