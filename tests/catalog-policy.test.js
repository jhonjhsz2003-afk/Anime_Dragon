import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import {catalogScore,currentCatalogItem,rankDiverseCatalog,mergeCatalogItems,currentBroadcast} from '../server/catalog-policy.js';
const now=new Date('2026-10-07T18:00:00Z');
const item=(id,extra={})=>({id,title:'Anime '+id,first_air_date:'2026-09-01',vote_average:8,vote_count:500,popularity:100,genre_ids:[16,10759],...extra});

test('weekly hype and a recent episode can outrank a brand-new low-confidence premiere',()=>{
  const returning=item(1,{first_air_date:'1999-01-01',last_episode_to_air:{air_date:'2026-10-06'},weekly_trending:.9});
  const premiere=item(2,{first_air_date:'2026-10-07',vote_average:10,vote_count:1,popularity:1});
  assert.ok(catalogScore(returning,now)>catalogScore(premiere,now));
  assert.equal(currentCatalogItem(returning,now),true);
  assert.equal(currentCatalogItem(item(3,{first_air_date:'1999-01-01'}),now),false);
  assert.equal(currentCatalogItem(item(4,{first_air_date:'2027-01-01',weekly_trending:1}),now),false);
  assert.equal(currentCatalogItem(item(5,{first_air_date:'1999-01-01',last_episode_to_air:{air_date:'2027-01-01'}}),now),false);
});

test('recent broadcast provenance admits a returning series before detail enrichment but rejects old reruns',()=>{
  const returning=item(91,{first_air_date:'2001-01-01',current_airing:true,current_airing_since:'2026-09-02',current_airing_until:'2026-10-07'});
  assert.equal(currentCatalogItem(returning,now),true);assert.equal(currentBroadcast(returning,now),true);
  assert.equal(currentCatalogItem({...returning,current_airing_since:'2026-07-01'},now),false);
  assert.equal(currentCatalogItem({...returning,status:'Ended',last_episode_to_air:{air_date:'2005-01-01'}},now),false);
  assert.equal(currentCatalogItem({...returning,last_episode_to_air:{air_date:'2026-10-08'}},now),false);
  assert.equal(currentCatalogItem({...returning,status:'Ended',last_episode_to_air:{air_date:'2026-09-30'}},now),true);
});

test('similarly strong recommendations mix genres while romance remains available',()=>{
  const romance=[1,2,3,4,5].map(id=>item(id,{curation_genres:['Romance','Drama']}));
  const action=item(6,{curation_genres:['Action','Adventure'],popularity:90});
  const mystery=item(7,{curation_genres:['Mystery'],popularity:80});
  const comedy=item(8,{curation_genres:['Comedy'],popularity:80});
  const chosen=rankDiverseCatalog([...romance,action,mystery,comedy],now,6);
  assert.equal(chosen[0].id,1);
  assert.ok(chosen.some(p=>p.id===6));assert.ok(chosen.some(p=>p.id===7));assert.ok(chosen.some(p=>p.id===8));
  assert.ok(chosen.some(p=>p.curation_genres.includes('Romance')));
  assert.equal(new Set(chosen.map(p=>p.id)).size,chosen.length);
});

test('reliable audience ratings outrank a perfect single vote and duplicate rows preserve live signals',()=>{
  const known=item(1,{vote_average:8.4,vote_count:2000}),unknown=item(2,{vote_average:10,vote_count:1});
  assert.ok(catalogScore(known,now,{quality:true})>catalogScore(unknown,now,{quality:true}));
  const [merged]=mergeCatalogItems([item(1,{weekly_trending:1,last_episode_to_air:{air_date:'2026-10-07'}}),item(1,{last_episode_to_air:null,popularity:0,curation_genres:['Romance']})]);
  assert.equal(merged.weekly_trending,1);assert.equal(merged.popularity,100);
  assert.equal(merged.last_episode_to_air.air_date,'2026-10-07');assert.deepEqual(merged.curation_genres,['Romance']);
});

test('the weekly endpoint is real, anime-only and excludes future premieres before curating home',async t=>{
  const today=new Date().toISOString().slice(0,10),requests=[];
  const valid={id:871,name:'Em alta',first_air_date:'2001-01-01',genre_ids:[16,10759],origin_country:['JP'],vote_average:8.4,vote_count:500,popularity:100};
  const fresh={...valid,id:872,name:'Atual',first_air_date:today};
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);requests.push(u);
    if(u.hostname==='graphql.anilist.co')return Response.json({data:{Page:{media:[]}}});
    if(u.pathname==='/3/trending/tv/week')return Response.json({results:[valid,{...valid,id:1,genre_ids:[18]},{...valid,id:2,origin_country:['US']},{...valid,id:3,adult:true},{...valid,id:4,media_type:'movie'},{...valid,id:5,first_air_date:'2099-01-01'}]});
    if(u.pathname.startsWith('/3/tv/'))return Response.json({...fresh,last_episode_to_air:{air_date:today}});
    return Response.json({results:[fresh]});
  });
  const response=await worker.fetch(new Request('https://policy.test/api/catalog/home'),{TMDB_API_KEY:'weekly-policy-test'},{}),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.featured[0].id,871);assert.equal(data.trendingSource,'tmdb_week');
  assert.ok(requests.some(u=>u.pathname==='/3/trending/tv/week'));
  for(const rail of [data.featured,data.trending,data.popular])assert.ok(rail.every(p=>[871,872].includes(p.id)));
});

test('popular browsing uses current episode dates while the premiere sort uses first-air dates',async t=>{
  const requests=[];
  t.mock.method(globalThis,'fetch',async url=>{requests.push(new URL(url));return Response.json({results:[],page:1,total_pages:1});});
  const env={TMDB_API_KEY:'browse-returning-policy-test'};
  await worker.fetch(new Request('https://policy.test/api/catalog/discover?sort=popularity.desc'),env,{});
  assert.ok(requests.at(-1).searchParams.has('air_date.gte'));assert.equal(requests.at(-1).searchParams.has('first_air_date.gte'),false);
  await worker.fetch(new Request('https://policy.test/api/catalog/discover?sort=first_air_date.desc'),env,{});
  assert.ok(requests.at(-1).searchParams.has('first_air_date.gte'));assert.equal(requests.at(-1).searchParams.has('air_date.gte'),false);
});

test('a new season of an older show can join the home without waiting for its detail request',async t=>{
  const today=new Date().toISOString().slice(0,10);
  const returning={id:9988,name:'Série retornando',first_air_date:'2000-01-01',genre_ids:[16,10759],origin_country:['JP'],vote_average:8,vote_count:1000,popularity:200};
  t.mock.method(globalThis,'fetch',async url=>{
    const u=new URL(url);
    if(u.hostname==='graphql.anilist.co')return Response.json({data:{Page:{media:[]}}});
    if(u.pathname==='/3/trending/tv/week')return Response.json({results:[]});
    if(u.pathname.startsWith('/3/tv/'))return new Response('',{status:503});
    if(u.searchParams.has('air_date.gte'))return Response.json({results:[returning]});
    return Response.json({results:[]});
  });
  const response=await worker.fetch(new Request('https://policy.test/api/catalog/home'),{TMDB_API_KEY:'returning-unenriched-policy-test'},{}),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.featured[0].id,returning.id);
  assert.equal(data.featured[0].current_airing,true);assert.equal(data.featured[0].current_airing_until,today);
  assert.deepEqual(data.updated,[]);assert.equal(data.featured[0].last_episode_to_air,null);
});
