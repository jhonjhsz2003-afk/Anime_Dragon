import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker.js';
import {diversifyHomeRails} from '../server/home-variety.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v36: categories use different anime IDs across the initial recommendations when alternatives exist',()=>{
 const anime=Array.from({length:80},(_,i)=>({id:i+1,title:`Anime ${i+1}`}));
 const results=diversifyHomeRails({updated:anime.slice(0,12),top:anime.slice(0,50),recent:anime.slice(10,60),popular:anime.slice(5,70),trending:anime},10);
 const all=Object.values(results).flat().map(x=>x.id);
 assert.equal(all.length,new Set(all).size);
 assert.equal(results.updated.length,10);
 assert.ok(results.trending.length>0 && results.recent.length>0 && results.top.length>0);
});

test('v36: small catalogs retain short category results instead of inventing anime',()=>{
 const data=[{id:1,title:'Anime 1'}];
 const result=diversifyHomeRails({updated:data,top:data,featured:data,popular:data,trending:data,recent:data});
 for(const name of ['updated','top','popular','trending','recent'])assert.deepEqual(result[name],data);
});

test('v37: o banner mantém somente capas, sem sobreposição de trailer e sem duas linhas de pontos',()=>{
 const app=read('web/js/app.js');
 const css=read('web/css/refinements-v36.css');
 assert.doesNotMatch(app,/import \{mountHeroYouTubePreview/);
 assert.match(css,/\.rotating-hero \.hero-video-stage\{display:none!important/);
 assert.match(css,/\.rotating-hero \.hero-art\{opacity:1!important/);
 assert.match(css,/\.rotating-hero \.hero-dots\{[^}]*flex-wrap:nowrap!important/);
});

test('v36: modal trailer button next to share and non-destructive dialog',()=>{
 const app=read('web/js/app.js');
 assert.match(app,/id="share-anime"[\s\S]*?id="watch-anime-trailer"/);
 assert.match(app,/dialog\.showModal\(\)/);
 assert.match(app,/youtube-nocookie\.com\/embed\/\$\{id\}/);
 assert.match(app,/if\(!id\)\{toast\('Ainda não encontramos um trailer oficial/);
 assert.match(read('web/index.html'),/refinements-v36\.css\?v=36\.0\.0/);
});

test('v36: Japanese TMDB trailer used when Portuguese/English trailer missing',async t=>{
 const original=globalThis.fetch;
 t.after(()=>{globalThis.fetch=original});
 const asked=[];
 globalThis.fetch=async url=>{
  const u=new URL(url);asked.push(u);
  if(u.pathname==='/3/tv/55661')return Response.json({id:55661,name:'Anime Especial',original_name:'Anime Especial',genres:[{id:16}],origin_country:['JP'],videos:{results:[]}});
  if(u.pathname==='/3/tv/55661/videos')return Response.json({results:u.searchParams.get('language')==='ja-JP'?[{site:'YouTube',type:'Trailer',key:'abcDEF123_4',official:true,name:'Trailer JP'}]:[]});
  return Response.json({results:[]});
 };
 const res=await worker.fetch(new Request('https://anime.test/api/catalog/tv/55661/videos'),{TMDB_API_KEY:'v36-japanese.fixture.token'},{});
 assert.equal(res.status,200);
 const data=await res.json();assert.equal(data.trailer.key,'abcDEF123_4');assert.equal(data.trailer.source,'tmdb-ja-JP');
 assert.deepEqual(asked.map(u=>u.searchParams.get('language')),['pt-BR','en-US','ja-JP']);
});

test('v36: optional server-only YouTube Data API fallback returns embeddable match',async t=>{
 const original=globalThis.fetch;
 t.after(()=>{globalThis.fetch=original});
 globalThis.fetch=async url=>{
  const u=new URL(url);
  if(u.hostname==='www.googleapis.com'){
   assert.equal(u.searchParams.get('videoEmbeddable'),'true');
   assert.equal(u.searchParams.get('key'),'fake-secret-for-test');
   return Response.json({items:[{id:{kind:'youtube#video',videoId:'abcDEF123_4'},snippet:{title:'Anime Especial Official Trailer',description:''}}]});
  }
  if(u.pathname==='/3/tv/44551')return Response.json({id:44551,name:'Anime Especial',original_name:'Anime Especial',genres:[{id:16}],origin_country:['JP'],videos:{results:[]}});
  return Response.json({results:[]});
 };
 const res=await worker.fetch(new Request('https://anime.test/api/catalog/tv/44551/videos'),{TMDB_API_KEY:'v36-youtube.fixture.token',YOUTUBE_API_KEY:'fake-secret-for-test'},{});
 assert.equal(res.status,200);assert.equal((await res.json()).trailer.source,'youtube-data');
});

test('v36: health clearly reports whether optional YouTube Data search is configured, without exposing secrets',async()=>{
 const result=await worker.fetch(new Request('https://anime.test/api/health'),{TMDB_API_KEY:'secret-tmdb',YOUTUBE_API_KEY:'secret-youtube'},{});
 const data=await result.json();
 assert.equal(data.trailerSources.youtubeDataConfigured,true);assert.equal(data.trailerSources.youtubePlayer,true);
 assert.equal(JSON.stringify(data).includes('secret-youtube'),false);
});
