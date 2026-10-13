import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceLoader,isEmbedMoviesEmbed,isAnimeFireStream} from '../web/js/sources.js';
const embed=(n=1)=>({available:true,streams:[{url:`https://myembed.biz/serie/30984/1/${n}`,kind:'embed',type:'text/html',name:'EmbedMovies'}]});
test('interface consulta fonte automática e mantém a seleção de episódio',async()=>{
 const paths=[],updates=[];
 const load=createSourceLoader(async path=>{paths.push(path);return embed(2)});
 assert.deepEqual((await load.prepare()).map(p=>p.id),['animefire','embedmovies']);
 const result=await load(30984,1,2,{onUpdate:r=>updates.push(r)});
 assert.equal(result.available,true);assert.equal(result.providers.length,2);assert.equal(result.providers[1].name,'EmbedMovies');
 assert.equal(paths.length,1);assert.match(paths[0],/provider=auto/);
 assert.equal(result.streams[0].url,'https://myembed.biz/serie/30984/1/2');assert.equal(updates.length,1);
});
test('requisições simultâneas compartilham cache e fresh força atualização',async()=>{
 let now=1,calls=0;const load=createSourceLoader(async()=>embed(++calls),()=>now);
 await Promise.all([load(1,1,2),load(1,1,2)]);assert.equal(calls,1);
 await load(1,1,2);assert.equal(calls,1);
 await load(1,1,2,{fresh:true});assert.equal(calls,2);
 now+=121000;await load(1,1,2);assert.equal(calls,3);
});
test('rejeita origens não permitidas, URLs adulteradas e vídeos diretos',async()=>{
 const load=createSourceLoader(async()=>({streams:[
  {url:'https://myembed.biz/serie/30984/1/1',kind:'embed'},
  {url:'https://myembed.biz/serie/30984/1/1',kind:'embed'},
  {url:'https://evil.example/serie/30984/1/1',kind:'embed'},
  {url:'https://myembed.biz/serie/30984/1/1?redirect=evil',kind:'embed'},
  {url:'https://cdn.example.com/ep.mp4',kind:'direct'}
 ]}));
 const result=await load(30984,1,1);assert.equal(result.streams.length,1);
 assert.equal(isEmbedMoviesEmbed({kind:'embed',url:'https://myembed.biz/serie/30984/1/1'}),true);
});
