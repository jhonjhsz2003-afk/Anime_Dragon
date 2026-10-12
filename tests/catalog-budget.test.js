import test from 'node:test';
import assert from 'node:assert/strict';
import {withinCatalogBudget} from '../server/catalog-budget.js';
import worker from '../worker.js';

test('an optional catalog request has a time budget while late work can finish in the background',async()=>{
  let finish,background;
  const late=new Promise(resolve=>{finish=resolve;});
  const fallback={results:[]};
  assert.equal(await withinCatalogBudget(late,15,fallback,task=>{background=task;}),fallback);
  const result={results:[{id:1}]};finish(result);
  assert.equal(await background,result);
  assert.equal(await withinCatalogBudget(Promise.reject(Error('Offline')),15,fallback),fallback);
});

test('episode-date enrichment starts before an unrelated optional discovery finishes',async t=>{
  let finishRanking,detailsStarted=false;
  const ranking=new Promise(resolve=>{finishRanking=resolve;});
  const today=new Date().toISOString().slice(0,10);
  const item={id:919191,name:'Anime',genre_ids:[16],origin_country:['JP'],first_air_date:today};
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);
    if(u.pathname.startsWith('/3/tv/')){detailsStarted=true;return Response.json({...item,last_episode_to_air:{air_date:today}});}
    if(u.searchParams.get('sort_by')==='vote_average.desc')await ranking;
    return Response.json({results:[item]});
  });
  const responseTask=worker.fetch(new Request('https://catalog.test/api/catalog/home'),{TMDB_API_KEY:'parallel-rail-budget-test'},{});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(detailsStarted,true);
  finishRanking();
  const response=await responseTask,data=await response.json();
  assert.equal(response.status,200);
  assert.equal(data.featured[0].id,item.id);
  assert.equal(data.updated[0].last_episode_to_air.air_date,today);
});

test('a stalled ranking cannot block the usable home catalog or cache an empty rail for five minutes',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let finishRanking;
  const ranking=new Promise(resolve=>{finishRanking=resolve;});
  const background=[],today=new Date().toISOString().slice(0,10);
  const item={id:929292,name:'Anime',genre_ids:[16],origin_country:['JP'],first_air_date:today};
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);
    if(u.pathname.startsWith('/3/tv/'))return Response.json(item);
    if(u.searchParams.get('sort_by')==='vote_average.desc')await ranking;
    return Response.json({results:[item]});
  });
  const responseTask=worker.fetch(new Request('https://catalog.test/api/catalog/home'),{TMDB_API_KEY:'stalled-ranking-budget-test'},{waitUntil:task=>background.push(task)});
  await new Promise(resolve=>setImmediate(resolve));
  t.mock.timers.tick(2501);
  const response=await responseTask,data=await response.json();
  assert.equal(response.status,200);
  assert.equal(data.featured[0].id,item.id);
  assert.equal(data.trending[0].id,item.id);
  assert.deepEqual(data.top,[]);
  assert.equal(data.partial,true);
  assert.equal(response.headers.get('Cache-Control'),'public, max-age=15, s-maxage=15');
  finishRanking();
  await Promise.all(background);
});
