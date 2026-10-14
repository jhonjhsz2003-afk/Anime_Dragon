import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {dragonRouter,dragonFileId,dragonBase,verifyDragonStickers} from '../server/dragongif.js';
import {localAvatar,localAvatarMarker,localSticker} from '../server/local-avatar.js';
import {profileIdentity,validateIdentity} from '../server/profile-identity.js';
import {searchDragonMedia,localAvatarSrc,filterLocalMedia} from '../web/js/local-media.js';
const ID='dg_'+('a'.repeat(32)),SID='dg_'+('b'.repeat(32)),FILE='/api/dragongif/file/'+ID,SFILE='/api/dragongif/file/'+SID;
const base='https://dragongif-api.example.workers.dev';
const hit=[];
const env={DRAGONGIF_PUBLIC_URL:base};
const _fetch=globalThis.fetch;
before(()=>{globalThis.fetch=async (url,options)=>{assert.equal(options?.redirect,'error');hit.push(url);const uri=new URL(url);if(uri.pathname.endsWith('/stats'))return Response.json({ok:true,gifs:12,stickers:8,total:20});if(uri.pathname.endsWith('/media/'+ID))return Response.json({ok:true,item:{id:ID,kind:'gifs',url:base+'/media/gifs/image.gif'}});if(uri.pathname.endsWith('/media/'+SID))return Response.json({ok:true,item:{id:SID,kind:'stickers',url:base+'/media/stickers/star.webp'}});if(uri.pathname.endsWith('/media'))return Response.json({ok:true,hasMore:true,items:[{id:ID,kind:'gifs',title:'Anime',url:base+'/media/gifs/image.gif'},{id:SID,kind:'stickers',title:'Estrela',url:base+'/media/stickers/star.webp'}]});return Response.json({ok:false,error:'não encontrado'},{status:404});};});
after(()=>{globalThis.fetch=_fetch;});
test('IDs DragonGIF têm formato seguro e os avatars guardam enquadramento',()=>{assert.equal(dragonFileId(FILE),ID);assert.equal(dragonFileId('https://outside.com/api/dragongif/file/'+ID),null);assert.equal(dragonFileId(FILE+'?x=1'),null);assert.equal(localAvatarSrc(FILE),FILE);assert.equal(localAvatarSrc('https://bad.example/x'),null);assert.equal(localSticker(SFILE),true);assert.equal(localSticker(FILE),true);assert.ok(localAvatarMarker(FILE,{x:50,y:20,zoom:145}).startsWith(FILE));assert.deepEqual(localAvatar(FILE+'?x=50&y=20&zoom=145').frame,{x:50,y:20,zoom:145});});
test('rota compatível de busca redireciona navegador à API pública (sem Worker->Worker)',async()=>{
 const res=await dragonRouter(new Request('https://site.example/api/dragongif/search?type=stickers&q=anime&page=2&limit=30'),env);
 assert.equal(res.status,302);
 const location=new URL(res.headers.get('location'));
 assert.equal(location.origin,base);assert.equal(location.pathname,'/api/v1/media');
 assert.equal(location.searchParams.get('type'),'stickers');assert.equal(location.searchParams.get('page'),'2');
});
test('redirecionamento só utiliza mídia pública cadastrada no serviço configurado',async()=>{const result=await dragonRouter(new Request('https://site.example'+FILE),env);assert.equal(result.status,302);assert.equal(result.headers.get('location'),base+'/media/gifs/image.gif');});
test('apenas stickers reais cadastrados são salvos, máximo seis e sem repetição',async()=>{await verifyDragonStickers(env,[{id:SFILE}]);await assert.rejects(()=>verifyDragonStickers(env,[{id:FILE}]),/sticker/);const cur={profile_cover:'aurora',profile_frame:'stardust',profile_title:'Teste',profile_stickers:'[]'};let identity=validateIdentity({cover:'aurora',frame:'stardust',title:'Meu universo',stickers:[{id:SFILE,x:22,y:51,size:17}]},cur);assert.equal(identity.stickers[0].id,SFILE);assert.throws(()=>validateIdentity({stickers:Array.from({length:7},(_,i)=>({id:'/api/dragongif/file/dg_'+String(i).padStart(32,'0'),x:20,y:30,size:17}))},cur),/seis/);assert.throws(()=>validateIdentity({stickers:[{id:'https://any.com/x',x:20,y:30,size:17}]},cur),/inválido/);});
test('cliente filtra URL estranha, traduz tipos e pesquisa diretamente pelo navegador',async()=>{
 const media='https://dragongif-api.jhonjhszgame2003.workers.dev/media/stickers/sakura.webp';
 const result=await searchDragonMedia({query:'sakura',kind:'sticker',page:3,limit:20,fetcher:async (url,options)=>{
   assert.match(url,/api\/v1\/media\?/);assert.match(url,/type=stickers/);assert.match(url,/page=3/);
   assert.equal(options.mode,'cors');
   return Response.json({ok:true,items:[{id:SID,kind:'stickers',url:media,title:'Sakura'},{id:'dg_'+('c'.repeat(32)),kind:'stickers',url:'https://bad.example/e.webp'}],hasMore:false});
 }});
 assert.equal(result.items.length,1);assert.equal(result.items[0].url,media);
 assert.equal(result.items[0].kind,'sticker');
 assert.equal(result.hasMore,false);assert.equal(filterLocalMedia(result.items,{query:'sakura',kind:'sticker'}).length,1);
 await assert.rejects(()=>searchDragonMedia({fetcher:async()=>Response.json({ok:false,error:'Sem conexão'},{status:503})}),/Sem conexão/);
});
test('a URL da API nunca aceita host inseguro ou vazio',()=>{assert.throws(()=>dragonBase({DRAGONGIF_PUBLIC_URL:'http://localhost:80'}),/inválido/);assert.throws(()=>dragonBase({}),/Configure/);});

test('Cloudflare usa API pública HTTPS sem Service Binding obrigatório',async()=>{
 const fs=await import('node:fs/promises');
 const url=new URL('../wrangler.toml',import.meta.url);
 const cfg=await fs.readFile(url,'utf8');
 assert.doesNotMatch(cfg,/\[\[services\]\]/);
 assert.doesNotMatch(cfg,/global_fetch_strictly_public/);
 assert.match(cfg,/DRAGONGIF_PUBLIC_URL\s*=\s*"https:\/\/dragongif-api\.jhonjhszgame2003\.workers\.dev"/);
 assert.match(cfg,/DRAGONGIF_PUBLIC_URL/);
});
