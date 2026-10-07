import test from 'node:test';
import assert from 'node:assert/strict';
import {getReleases,releaseEvents,releaseToday,sortReleaseEvents} from '../server/releases.js';
import worker from '../worker.js';
const now=new Date('2026-10-07T15:00:00Z'),today='2026-10-07';
const anime=(id,extra={})=>({id,name:`Anime ${id}`,media_type:'tv',adult:false,origin_country:['JP'],genres:[{id:16}],first_air_date:'2020-01-01',seasons:[],...extra});
const normalize=item=>({id:item.id,title:item.name||item.title,first_air_date:item.first_air_date,seasons:(item.seasons||[]).filter(season=>season.episode_count>0)});
test('release dates use the site calendar at midnight and reject missing or impossible dates',()=>{
 assert.equal(releaseToday(new Date('2026-10-08T02:59:59Z')),'2026-10-07');assert.equal(releaseToday(new Date('2026-10-08T03:00:00Z')),'2026-10-08');
 for(const date of [null,'','2026-02-30','2026-13-01','2026-10-07','2026-10-06'])assert.deepEqual(releaseEvents(anime(1,{first_air_date:date}),{today}),[]);
 assert.deepEqual(releaseEvents(anime(2,{status:'Planned',first_air_date:'',number_of_episodes:0}),{today}),[]);
});
test('new series, seasons and episodes keep their real dates and avoid duplicate premiere cards',()=>{
 const series=anime(1,{first_air_date:'2026-10-10',seasons:[{season_number:1,air_date:'2026-10-10',episode_count:0}],next_episode_to_air:{air_date:'2026-10-10',season_number:1,episode_number:1,name:'Primeiro capítulo'}});
 const season=anime(2,{seasons:[{season_number:1,air_date:'2020-01-01',episode_count:12},{season_number:3,air_date:'2026-10-08',episode_count:0}],last_episode_to_air:{air_date:'2025-01-01',season_number:2,episode_number:12},next_episode_to_air:{air_date:'2026-10-08',season_number:3,episode_number:1,name:'Retorno'}});
 const continuing=anime(3,{next_episode_to_air:{air_date:'2026-10-09',season_number:1,episode_number:345,name:'O próximo'}});
 const events=[series,season,continuing].flatMap(item=>releaseEvents(item,{normalize,today}));assert.equal(events.length,3);
 assert.deepEqual(sortReleaseEvents(events).map(event=>[event.kind,event.air_date,event.season_number,event.episode_number]),[['season','2026-10-08',3,1],['episode','2026-10-09',1,345],['series','2026-10-10',1,1]]);
 assert.equal(events.find(event=>event.kind==='season').anime.seasons.length,1,'a zero-episode future season still has its own announcement');
 assert.deepEqual(sortReleaseEvents([...events,...events]).map(event=>event.key),sortReleaseEvents(events).map(event=>event.key));
});
test('unknown numbers stay unknown and aired metadata cannot masquerade as a future premiere',()=>{
 const unknown=releaseEvents(anime(1,{first_air_date:'2026-10-12'}),{today});assert.equal(unknown[0].season_number,null);assert.equal(unknown[0].episode_number,null);
 const aired=anime(2,{first_air_date:'2026-10-12',seasons:[{season_number:1,air_date:'2026-10-12'}],last_episode_to_air:{season_number:1,episode_number:8,air_date:'2026-10-06'},next_episode_to_air:{season_number:1,episode_number:7,air_date:'2026-10-12'}});assert.deepEqual(releaseEvents(aired,{today}),[]);
 assert.deepEqual(releaseEvents(anime(3,{media_type:'movie',first_air_date:'2026-10-12'}),{today}),[]);
 assert.deepEqual(releaseEvents(anime(4,{adult:true,first_air_date:'2026-10-12'}),{today}),[]);
 assert.deepEqual(releaseEvents(anime(5,{next_episode_to_air:{season_number:1,episode_number:0,air_date:'2026-10-12'}}),{today}),[]);
});
test('public discovery queries only future dates, deduplicates candidates and sorts announced events',async()=>{
 const calls=[],details=new Map([[1,anime(1,{first_air_date:'2026-10-10'})],[2,anime(2,{next_episode_to_air:{season_number:2,episode_number:7,air_date:'2026-10-08'}})],[3,anime(3)]]);
 const result=await getReleases({now,page:2,normalize,discover:async params=>{calls.push(params);return {results:params['first_air_date.gte']?[details.get(1)]:[details.get(1),details.get(2),details.get(3)],totalPages:3};},detail:async id=>{calls.push(id);return details.get(id);}});
 assert.equal(result.ok,true);assert.equal(result.asOf,today);assert.equal(result.hasMore,true);assert.equal(result.page,2);assert.equal(result.partial,undefined);
 assert.deepEqual(result.items.map(event=>event.anime.id),[2,1]);assert.equal(calls.filter(call=>typeof call==='number').length,3);
 assert.ok(calls.some(call=>call['first_air_date.gte']==='2026-10-08'));assert.ok(calls.some(call=>call['air_date.gte']==='2026-10-08'));assert.ok(calls.filter(call=>typeof call==='object').every(call=>call.timezone==='America/Sao_Paulo'));
});
test('requests remain within the free Worker subrequest budget and limit concurrent detail work',async()=>{
 let queries=0,reads=0,active=0,peak=0;
 const result=await getReleases({now,normalize,discover:async params=>{queries++;return {results:Array.from({length:25},(_,i)=>anime((params['first_air_date.gte']?0:30)+i+1,{first_air_date:'2026-10-12'})),totalPages:1};},detail:async id=>{reads++;active++;peak=Math.max(peak,active);await new Promise(resolve=>setImmediate(resolve));active--;return anime(id,{first_air_date:'2026-10-12'});}});
 assert.equal(queries,2);assert.equal(reads,40);assert.equal(result.items.length,40);assert.ok(peak<=6);assert.ok(queries+reads<=50);
});
test('partial detail failures preserve confirmed future series without inventing future episodes',async()=>{
 const result=await getReleases({now,normalize,discover:async params=>({results:[anime(params['first_air_date.gte']?1:2,{first_air_date:params['first_air_date.gte']?'2026-10-12':'2020-01-01'})],totalPages:1}),detail:async()=>{throw Error('Unavailable');}});
 assert.equal(result.partial,true);assert.deepEqual(result.items.map(event=>[event.kind,event.anime.id]),[['series',1]]);
});
test('a bounded response can retain usable dates while slow details finish in the background',async()=>{
 const finish=[],background=[];
 const result=await getReleases({now,budgetMs:12,normalize,waitUntil:task=>background.push(task),discover:async()=>({results:[anime(1,{first_air_date:'2026-10-12'})],totalPages:1}),detail:()=>new Promise(resolve=>finish.push(()=>resolve(anime(1,{first_air_date:'2026-10-12'}))))});
 assert.equal(result.partial,true);assert.equal(result.items.length,1);finish.forEach(resolve=>resolve());await Promise.all(background);
});
test('complete discovery outages produce a retryable error instead of an invented calendar',async()=>{
 await assert.rejects(getReleases({now,discover:async()=>{throw Error('Offline');},detail:async()=>null}),error=>error.status===503&&/lançamentos/.test(error.message));
});
test('the public Worker route validates anime, reuses the TMDB cache and keeps future seasons with zero episodes',async t=>{
 const current=releaseToday(),dateAt=days=>new Date(Date.parse(current+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 const records=new Map([[909001,anime(909001,{first_air_date:dateAt(3)})],[909002,anime(909002,{seasons:[{season_number:2,air_date:dateAt(2),episode_count:0}]})],[909003,anime(909003,{next_episode_to_air:{air_date:dateAt(1),season_number:1,episode_number:13}})]]),calls=[];
 t.mock.method(globalThis,'fetch',async url=>{const address=new URL(url);calls.push(address);assert.equal(address.hostname,'api.themoviedb.org');if(address.pathname.includes('/discover/'))return Response.json({results:[...records.values(),{...anime(909004,{first_air_date:dateAt(1)}),genres:[{id:28}]}],page:1,total_pages:1});return Response.json(records.get(Number(address.pathname.split('/').at(-1))));});
 const env={TMDB_API_KEY:'releases-public-route-test'},request=new Request('https://catalog.test/api/catalog/releases?page=1');
 const response=await worker.fetch(request,env,{}),data=await response.json();assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/public/);assert.equal(data.asOf,current);assert.deepEqual(data.items.map(entry=>entry.kind),['episode','season','series']);assert.equal(data.items[1].season_number,2);assert.equal(data.items[1].episode_number,null);
 assert.ok(data.items.every(entry=>entry.air_date>current));assert.equal(calls.length,5);await worker.fetch(request,env,{});assert.equal(calls.length,5);
});
