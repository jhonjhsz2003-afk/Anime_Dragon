import test from 'node:test';
import assert from 'node:assert/strict';
import {dragonMediaUrl,dragonRouter,DRAGONGIF_ORIGIN} from '../server/dragongif.js';
import {localAvatar,localAvatarMarker,localSticker} from '../server/local-avatar.js';
import {validateIdentity} from '../server/profile-identity.js';
import {localAvatarSrc,isDragonMediaUrl,searchDragonMedia,dragonStats} from '../web/js/local-media.js';
import {contentSecurityPolicy} from '../server/media-policy.js';
import {readFileSync} from 'node:fs';
const origin=DRAGONGIF_ORIGIN;
const gif=origin+'/media/gifs/Naruto%20Shippuden/goku.gif';
const sticker=origin+'/media/stickers/Naruto/sakura.webp';
const id='dg_'+('a'.repeat(32));

test('somente dominio DragonGIF e arquivos de mídia sob o tipo correto',()=>{
 assert.equal(dragonMediaUrl(gif,'gifs'),true);
 assert.equal(dragonMediaUrl(sticker,'stickers'),true);
 assert.equal(dragonMediaUrl(gif,'stickers'),false);
 assert.equal(dragonMediaUrl('https://outro.site/media/gifs/x.gif','gifs'),false);
 assert.equal(dragonMediaUrl(origin+'/media/gifs/%2e%2e/admin.html','gifs'),false);
 assert.equal(dragonMediaUrl(origin+'/media/gifs/a%2Fb.gif','gifs'),false);
 assert.equal(dragonMediaUrl(origin+'/media/gifs/a.gif?param=foo','gifs'),false);
 assert.equal(isDragonMediaUrl(gif,'gifs'),true);
 assert.equal(isDragonMediaUrl(sticker,'gifs'),false);
 assert.equal(localAvatarSrc(gif+'?x=40&y=50&zoom=150'),gif);
});

test('perfil mantém avatar GIF remoto e seis stickers remotos',()=>{
 assert.equal(localSticker(sticker),true);
 assert.equal(localSticker(gif),false);
 const avatar=localAvatarMarker(gif,{x:10,y:80,zoom:180});
 assert.deepEqual(localAvatar(avatar),{path:gif,frame:{x:10,y:80,zoom:180}});
 const v={profile_stickers:'[]',profile_cover:'aurora',profile_frame:'stardust'};
 const stickers=Array.from({length:6},(_,n)=>({id:origin+`/media/stickers/test/${n}.webp`,x:20+n*10,y:50,size:17}));
 assert.equal(validateIdentity({stickers},v).stickers.length,6);
 assert.throws(()=>validateIdentity({stickers:[{id:gif,x:50,y:50,size:17}]},v),/inválido/);
 assert.throws(()=>validateIdentity({stickers:[...stickers,stickers[0]]},v),/seis/);
});

test('pesquisa direta retorna somente mídias do domínio e elimina ids repetidos',async()=>{
 const result=await searchDragonMedia({kind:'sticker',query:'naruto',fetcher:async(url,opts)=>{
  assert.equal(opts.mode,'cors');assert.equal(opts.credentials,'omit');
  assert.equal(new URL(url).hostname,'dragongif-api.jhonjhszgame2003.workers.dev');
  return Response.json({ok:true,hasMore:false,items:[{id,kind:'stickers',url:sticker,title:'Sakura'}, {id,kind:'stickers',url:sticker,title:'Sakura repetida'}, {id:'dg_'+('b'.repeat(32)),kind:'gifs',url:'https://outro.site/a.gif'}]});
 }});
 assert.equal(result.items.length,1);assert.equal(result.items[0].kind,'sticker');assert.equal(result.items[0].url,sticker);
});

test('estatísticas e URLs auxiliares são consultadas pelo navegador',async()=>{
 const env={DRAGONGIF_PUBLIC_URL:origin};
 const res=await dragonRouter(new Request('https://site.test/api/dragongif/status'),env);
 assert.equal(res.status,302);assert.equal(res.headers.get('location'),origin+'/api/v1/stats');
 const stats=await dragonStats({fetcher:async(url)=>{assert.equal(url,origin+'/api/v1/stats');return Response.json({ok:true,gifs:2,stickers:3,total:5});}});
 assert.equal(stats.total,5);
 assert.match(contentSecurityPolicy(),/connect-src 'self' https:\/\/dragongif-api\.jhonjhszgame2003\.workers\.dev/);
 const staticHeaders=readFileSync(new URL('../web/_headers',import.meta.url),'utf8');
 assert.match(staticHeaders,/connect-src 'self' https:\/\/dragongif-api\.jhonjhszgame2003\.workers\.dev/);
});
