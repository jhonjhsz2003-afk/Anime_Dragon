import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import {providers} from '../server/providers.js';
import {episodeEmbedUrl,embedMoviesPlayback} from '../server/embedmovies.js';
import {contentSecurityPolicy} from '../server/media-policy.js';
const anime={id:30984,name:'Anime teste',genres:[{id:16}],origin_country:['JP'],seasons:[{season_number:1,episode_count:12}]};

test('adaptador retorna iframe sem solicitar streams a terceiros',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',()=>{calls++;throw Error('não solicitar')});
 const r=embedMoviesPlayback(anime,1,3);
 assert.equal(r.providerId,'embedmovies');assert.equal(r.available,true);
 assert.deepEqual(r.streams.map(x=>x.url),['https://myembed.biz/serie/30984/1/3']);
 assert.match(r.notice,/não garante/);assert.equal(calls,0);
});
test('URL valida temporada e episódio; rejeita ids inválidos',()=>{
 assert.equal(episodeEmbedUrl(30984,1,2),'https://myembed.biz/serie/30984/1/2');
 for(const args of [['xx',1,2],[0,1,2],[1,-2,1],[1,1,0],[1,1,99999],[1,1,'2/3'],[1,NaN,1]])assert.equal(episodeEmbedUrl(...args),null);
 assert.equal(embedMoviesPlayback({id:'abc'},1,1).available,false);
});
test('CSP permite somente embed oficial, mantendo scripts e downloads externos bloqueados',()=>{
 const p=contentSecurityPolicy();assert.match(p,/frame-src https:\/\/myembed\.biz/);
 assert.match(p,/object-src 'none'/);assert.match(p,/script-src-attr 'none'/);
 assert.ok(!p.includes('frame-src https: '));
 assert.deepEqual(providers().map(x=>x.id),['embedmovies']);
});
test('worker preserva CSP e informa versão atualizada',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('<html>ok</html>',{headers:{'content-type':'text/html'}})}};
 const doc=await worker.fetch(new Request('https://anime.test/'),env,{});
 assert.equal(doc.headers.get('Content-Security-Policy'),contentSecurityPolicy());
 const health=await(await worker.fetch(new Request('https://anime.test/api/health'),env,{})).json();
 assert.equal(health.version,'28.0.0');
 const p=await(await worker.fetch(new Request('https://anime.test/api/playback/providers'),env,{})).json();
 assert.deepEqual(p.providers.map(x=>x.id),['embedmovies']);
});
test('worker integra episódios só do TMDB usando o ID correto',async t=>{
 t.mock.method(globalThis,'fetch',async input=>{
  const u=new URL(input);assert.equal(u.hostname,'api.themoviedb.org');
  return Response.json(anime);
 });
 const env={TMDB_API_KEY:'teste'};
 const response=await worker.fetch(new Request('https://anime.test/api/playback?id=30984&season=1&episode=3'),env,{});
 assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.embed.url,'https://myembed.biz/serie/30984/1/3');
 assert.equal(body.available,true);
 const invalid=await worker.fetch(new Request('https://anime.test/api/playback?id=30984&season=1&episode=3&provider=outro'),env,{});
 assert.equal(invalid.status,400);
});
