import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validTrailerId,preloadYouTubeIframeAPI} from '../web/js/hero-trailers.js';
import {contentSecurityPolicy} from '../server/media-policy.js';
import worker from '../worker.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v35: carrossel troca de anime a cada 9 segundos com prévia silenciosa',()=>{
 const js=read('web/js/app.js');
 assert.match(js,/heroTimer=setInterval\([\s\S]*?9000\)/);
 assert.match(js,/trailerForAnime\(animeId\)/);
 assert.match(js,/trailerForAnime\(Number\(next.id\)\)/);
 const player=read('web/js/hero-trailers.js');
 assert.match(player,/https:\/\/www\.youtube\.com\/iframe_api/);
 assert.match(player,/mute:1,controls:0/);
 assert.match(player,/onAutoplayBlocked:.*clear\(\)/);
 assert.match(player,/onError:.*clear\(\)/);
 assert.ok(validTrailerId('abcDEF123_4'));
 assert.equal(validTrailerId('https://youtube.com/watch?v=bad'),false);
 assert.equal(validTrailerId('abcDEF1234;'),false);
});

test('v35: os botões ficam no canto do hero mesmo quando o título muda',()=>{
 const v35=read('web/css/refinements-v35.css');
 const v34=read('web/css/refinements-v34.css');
 assert.match(v35,/\.home-view \.rotating-hero \.hero-switcher\s*\{\s*position:absolute!important/);
 assert.match(v35,/inset:auto var\(--page-gutter\) 46px auto!important/);
 assert.doesNotMatch(v34,/\.hero-content,\.home-view \.rotating-hero \.hero-switcher\s*\{position:relative/);
 assert.match(v35,/@media\(max-width:760px\)/);
});

test('v35: perfil público e privado mostram apenas o nome grande, sem duplicação',()=>{
 const js=read('web/js/app.js');
 assert.doesNotMatch(js,/<span class="badge identity-title" id="identity-title-preview">/);
 assert.doesNotMatch(js,/<p class="badge identity-title">/);
 assert.doesNotMatch(js,/\$\('#identity-title-preview'\)\.textContent=/);
 assert.match(js,/<h2 class="profile-display-name">\$\{styledName\(state\.user\.name,state\.user\.nameColor\)\}/);
 assert.match(js,/<h1 class="profile-display-name">\$\{styledName\(d\.profile\.name,d\.profile\.nameColor\)\}/);
});

test('v35: CSP permite API oficial de vídeo, sem depender de chave YouTube Data API',()=>{
 const policy=contentSecurityPolicy();
 assert.match(policy,/script-src 'self' https:\/\/www\.youtube\.com/);
 assert.match(policy,/frame-src https:\/\/myembed\.biz https:\/\/www\.youtube-nocookie\.com https:\/\/www\.youtube\.com/);
 assert.match(read('web/_headers'),/https:\/\/www\.youtube\.com/);
 assert.match(read('web/index.html'),/refinements-v35\.css\?v=35\.0\.0/);
});

test('v35: trailers pt-BR retornam antes do fallback em inglês, sem links externos falsos',async t=>{
 const previous=globalThis.fetch;
 t.after(()=>{globalThis.fetch=previous});
 const requests=[];
 globalThis.fetch=async url=>{
  const u=new URL(url);requests.push(u);
  if(u.pathname==='/3/tv/9999')return Response.json({id:9999,name:'Exemplo anime',adult:false,genres:[{id:16}],origin_country:['JP'],videos:{results:[{site:'YouTube',type:'Trailer',key:'AbCdEf123_4',official:true,name:'Trailer oficial'}]}});
  throw Error('Nao deve consultar outro endpoint quando existe trailer pt-BR');
 };
 const response=await worker.fetch(new Request('https://anime.test/api/catalog/tv/9999/videos'),{TMDB_API_KEY:'test.token'},{});
 assert.equal(response.status,200);
 assert.equal((await response.json()).trailer.key,'AbCdEf123_4');
 assert.equal(requests.length,1);
 assert.equal(requests[0].searchParams.get('language'),'pt-BR');
 assert.equal(requests[0].searchParams.get('append_to_response'),'videos');
});
