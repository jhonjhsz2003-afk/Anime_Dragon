import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import {demoItems,demoUpcomingItems,demoResponse} from '../server/demo.js';

const dateAt=days=>new Date(Date.now()+days*86400000).toISOString().slice(0,10);
const anime=(id,extra={})=>({id,name:`Anime ${id}`,genre_ids:[16,10759],origin_country:['JP'],adult:false,first_air_date:dateAt(-30),vote_average:8,...extra});
const home=token=>worker.fetch(new Request('https://catalog.test/api/catalog/home'),{TMDB_API_KEY:token},{});

test('home separates ranked, popular and future discoveries, limits details and reuses its cache',async t=>{
  const calls=[];
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);calls.push(u);assert.equal(u.hostname,'api.themoviedb.org');
    if(u.pathname.startsWith('/3/tv/')){
      const id=Number(u.pathname.split('/').at(-1));
      return Response.json(anime(id,{last_episode_to_air:{air_date:id===1?dateAt(-1):id===2?dateAt(0):dateAt(1),season_number:1,episode_number:4}}));
    }
    assert.equal(u.pathname,'/3/discover/tv');
    const params=u.searchParams;
    assert.equal(params.get('with_genres'),'16');assert.equal(params.get('with_origin_country'),'JP');assert.equal(params.get('include_adult'),'false');
    let results;
    if(params.get('sort_by')==='vote_average.desc'){
      assert.equal(params.get('vote_count.gte'),'100');results=[anime(77,{vote_average:9.3})];
    }else if(params.get('sort_by')==='first_air_date.asc'){
      assert.equal(params.get('first_air_date.gte'),dateAt(1));assert.equal(params.get('first_air_date.lte'),dateAt(180));
      results=[anime(99,{first_air_date:dateAt(1)}),anime(201,{first_air_date:dateAt(0)}),anime(202,{first_air_date:dateAt(181)}),anime(203,{first_air_date:''})];
    }else if(params.get('air_date.gte')===dateAt(-7)){
      results=Array.from({length:20},(_,i)=>anime(i+1));
    }else if(params.get('sort_by')==='popularity.desc'&&!params.has('air_date.gte')){
      results=[anime(88)];
    }else results=[anime(1)];
    return Response.json({results,page:1,total_pages:1});
  });
  const response=await home('home-distinct-fixture'),data=await response.json();
  assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/public, max-age=60, s-maxage=300/);
  assert.deepEqual(data.top.map(p=>p.id),[77]);assert.deepEqual(data.popular.map(p=>p.id),[88]);assert.deepEqual(data.upcoming.map(p=>p.id),[99]);
  assert.deepEqual(data.trending.map(p=>p.id),[1]);assert.deepEqual(data.anime,data.trending);
  assert.deepEqual(data.updated.map(p=>p.id),[2,1]);assert.equal(data.featured[0].id,2);
  assert.equal(calls.filter(u=>u.pathname==='/3/discover/tv').length,6);
  assert.equal(calls.filter(u=>u.pathname.startsWith('/3/tv/')).length,12);
  assert.equal(calls.length,18);
  for(const item of [...data.updated,...data.upcoming]){
    assert.equal(item.available,undefined);assert.equal(item.dubbed,undefined);assert.equal(item.uploaded_at,undefined);
  }
  assert.equal((await home('home-distinct-fixture')).status,200);assert.equal(calls.length,18);
});

test('an unavailable optional rail stays empty without relabeling trending titles',async t=>{
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url),params=u.searchParams;
    if(params.get('sort_by')==='vote_average.desc'||params.get('sort_by')==='first_air_date.asc'||params.get('air_date.gte')===dateAt(-7))return new Response('',{status:503});
    return Response.json({results:[anime(1)],page:1,total_pages:1});
  });
  const response=await home('home-partial-fixture'),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.trending.length,1);
  assert.deepEqual(data.top,[]);assert.deepEqual(data.upcoming,[]);assert.deepEqual(data.updated,[]);
});

test('local illustrative fixtures keep future premieres distinct and episode dates coherent',async t=>{
  t.mock.method(globalThis,'fetch',url=>Promise.resolve(demoResponse(url)));
  const response=await home('home-local-fixture'),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.updated.length,demoItems.length);assert.equal(data.upcoming.length,demoUpcomingItems.length);
  assert.equal(data.top.length,demoItems.length);
  const airedIds=new Set(data.updated.map(p=>p.id));
  for(const item of data.upcoming){
    assert.equal(airedIds.has(item.id),false);assert.match(item.poster_path,/^\/assets\/demo\//);
    assert.ok(item.first_air_date>dateAt(0));assert.equal(item.last_episode_to_air,null);assert.equal(item.number_of_episodes,0);
  }
  for(const item of demoItems){
    const {episodes}=await demoResponse(`https://api.themoviedb.org/3/tv/${item.id}/season/1`).json();
    assert.equal(episodes[0].air_date,item.first_air_date);
    assert.equal(episodes[item.last_episode_to_air.episode_number-1].air_date,item.last_episode_to_air.air_date);
    if(item.next_episode_to_air)assert.equal(episodes[item.next_episode_to_air.episode_number-1].air_date,item.next_episode_to_air.air_date);
  }
});
