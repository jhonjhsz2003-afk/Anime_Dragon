import test from 'node:test';
import assert from 'node:assert/strict';
import { findAnime, animefirePlayback, matchAnime } from '../server/animefire.js';

const entry = (id, title, year) => ({id, titles:{BR:title},published_at:year});

test('v27: encontra correspondência na segunda página e preserva o termo da pesquisa', async t => {
  const title = 'Piratas Solares V27';
  const seen = [];
  t.mock.method(globalThis,'fetch', async input => {
    const u=new URL(input); seen.push(u);
    if (u.pathname !== '/animes/pesquisar') throw new Error('Rota inesperada');
    if (u.searchParams.get('q') !== title) throw new Error('A pesquisa mudou de termo');
    if (u.searchParams.get('page') === '2') return Response.json({data:[entry('segundo-0001',title,'2025-07-01')], meta:{last_page:2}});
    return Response.json({data:[entry('primeiro-01','Outra série','2025-07-01')],meta:{last_page:2}});
  });
  const found=await findAnime({name:title,first_air_date:'2025-07-01'},{});
  assert.equal(found?.id,'segundo-0001');
  assert.equal(seen.length,2);
  assert.equal(seen[1].searchParams.get('page'),'2');
  assert.equal(seen[1].searchParams.get('v'),'3');
});

test('v27: usa tradução PT-BR quando a fonte difere do título original',async t=>{
  const calls=[];
  t.mock.method(globalThis,'fetch',async input=>{
    const u=new URL(input);calls.push(u.searchParams.get('q'));
    if (u.searchParams.get('q')==='Cavaleiro Azul V27') return Response.json({data:[entry('alias-00011','Cavaleiro Azul V27','2024-01-01')]});
    return Response.json({data:[]});
  });
  const found=await findAnime({name:'Blue Knight V27',first_air_date:'2024-01-01',translations:{translations:[{iso_639_1:'pt',data:{name:'Cavaleiro Azul V27'}}]}},{});
  assert.equal(found?.id,'alias-00011');
  assert.ok(calls.includes('Cavaleiro Azul V27'));
});

test('v27: não confunde remakes com diferença grande de ano nem filmes de nome diferente',()=>{
  const results=[entry('remake-0001','Anime Sem Igual V27','2026-01-01'),entry('filme-0001','Anime Sem Igual V27: Filme','2019-01-01')];
  assert.equal(matchAnime(results,{name:'Anime Sem Igual V27',first_air_date:'2019-01-01'}),null);
});

test('v27: diagnostica quando temporada/episódio não coincide',async t=>{
  const title='Testando Episódio V27';
  t.mock.method(globalThis,'fetch',async input=>{
    const u=new URL(input);
    if(u.pathname==='/animes/pesquisar')return Response.json({data:[entry('serie-00001',title,'2026-01-01')]});
    if(u.pathname==='/anime/serie-00001')return Response.json({data:{format:'tv',hero:{id:'serie-00001'},episodes:[{id:'episodio01',season:1,number:1}]}});
    throw new Error('Rota inesperada');
  });
  const unavailable=await animefirePlayback({name:title,first_air_date:'2026-01-01'},2,7,{ANIMEFIRE_ENABLED:'true'});
  assert.equal(unavailable.available,false);
  assert.equal(unavailable.reasonCode,'EPISODE_NOT_FOUND');
  assert.match(unavailable.reason,/temporada/i);
});
