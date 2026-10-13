import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import {matchAnime,findEpisode,convertStreams,safeHls,animefirePlayback} from '../server/animefire.js';
import {createSourceLoader,isAnimeFireStream} from '../web/js/sources.js';
const raw={id:30984,name:'Black Clover',original_name:'Black Clover',first_air_date:'2017-10-03',genres:[{id:16}],origin_country:['JP']};
const list={data:[{id:'lz78h__iYFA',titles:{BR:'Black Clover'},audio:'Dublado & Legendado',published_at:'2017-10-03'},
{id:'4BVUem9Rb75',titles:{BR:'Black Clover: A Espada do Rei Mago'},published_at:'2023-06-16'}]};
const anime={data:{format:'tv',episodes:[{id:'jk_lNgPXLc-',season:1,number:1},{id:'season2ID',season:2,number:1}]}};
const url=(key)=>`https://akumast.net/i/${key}/h.jpg`;
const details={data:{id:'jk_lNgPXLc-',streams:[
{audio:'legendado',is_offline:false,url:url('sub'),chapters:[{type:'Intro',start:121,end:209}]},
{audio:'dublado',is_offline:false,url:url('dub'),chapters:[{type:'Intro',start:121,end:209}]},
{audio:'dublado',is_offline:true,url:url('offline')},
{audio:'dublado',is_offline:false,url:'https://evil.example/other.m3u8'}]}};
test('busca escolhe série exata e não confunde filme, rejeita ano errado e ambiguidade',()=>{
 assert.equal(matchAnime(list.data,raw)?.id,'lz78h__iYFA');
 assert.equal(matchAnime(list.data,{...raw,first_air_date:'2026-01-01'}),null);
 assert.equal(matchAnime([...list.data,list.data[0]],{...raw,first_air_date:''}),null);
});
test('seleciona episódio pelo par temporada e número, não índice global',()=>{
 assert.equal(findEpisode(anime,1,1).id,'jk_lNgPXLc-');
 assert.equal(findEpisode(anime,2,1).id,'season2ID');
 assert.equal(findEpisode(anime,1,171),null);
});
test('retorna dublado primeiro, rejeita offline/origens externas e preserva capítulos',()=>{
 const streams=convertStreams(details);assert.equal(streams.length,2);assert.equal(streams[0].audio,'dublado');
 assert.equal(streams[1].audio,'legendado');assert.equal(streams[0].chapters[0].end,209);
 assert.equal(safeHls('http://akumast.net/i/abc/h.jpg'),null);
 assert.equal(safeHls('https://akumast.net.evil.example/i/abc/h.jpg'),null);
 assert.equal(isAnimeFireStream(streams[0]),true);
 assert.equal(isAnimeFireStream({...streams[0],url:'https://wrong.example/i/abc/h.jpg'}),false);
});
test('adaptador consulta as 3 rotas e conserva fallback quando fonte não funciona',async t=>{
 const seen=[];
 t.mock.method(globalThis,'fetch',async u=>{
  const url=new URL(u);seen.push(url.pathname);
  if(url.hostname==='api.themoviedb.org')return Response.json(raw);
  if(url.pathname==='/animes/pesquisar')return Response.json(list);
  if(url.pathname==='/anime/lz78h__iYFA')return Response.json(anime);
  if(url.pathname==='/episode/jk_lNgPXLc-')return Response.json(details);
  throw new Error('Unexpected URL');
 });
 const env={ANIMEFIRE_ENABLED:'true'};
 const direct=await animefirePlayback(raw,1,1,env);
 assert.equal(direct.streams.length,2);assert.deepEqual(seen,['/animes/pesquisar','/anime/lz78h__iYFA','/episode/jk_lNgPXLc-']);
 const missing=await animefirePlayback(raw,1,150,env);assert.equal(missing.available,false);
 const response=await worker.fetch(new Request('https://dragon.example/api/playback?id=30984&season=1&episode=1'),{
  ...env,TMDB_API_KEY:'test'
 },{});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.streams[0].audio,'dublado');
 assert.equal(body.streams.at(-1).providerId,'embedmovies');
 assert.equal(body.primaryAvailable,true);
});
test('o loader combina HLS e embed, deixando o dublado primeiro',async()=>{
 const loader=createSourceLoader(async()=>({streams:[
 {url:'https://myembed.biz/serie/30984/1/1',kind:'embed',name:'EmbedMovies'},
 ...convertStreams(details)
 ]}));
 const loaded=await loader(30984,1,1);
 assert.equal(loaded.streams.length,3);
 assert.deepEqual(loaded.streams.map(s=>s.audio||'embed'),['dublado','legendado','embed']);
});
