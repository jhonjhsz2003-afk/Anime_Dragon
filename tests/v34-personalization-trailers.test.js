import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateIdentity,profileIdentity} from '../server/profile-identity.js';
import {localStickerPaths} from '../server/local-media-index.js';
import {contentSecurityPolicy} from '../server/media-policy.js';
import worker from '../worker.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v34: six repetitions are valid and size values survive serialization',()=>{
 const id='/assets/profile-media/Stickers/v34-repeat.webp';localStickerPaths.add(id);
 try{
  const items=Array.from({length:6},(_,i)=>({id,x:12+i*14,y:40,size:10+i*3}));
  const base={profile_cover:'aurora',profile_frame:'stardust',profile_title:'Personagem',profile_stickers:'[]'};
  const result=validateIdentity({cover:'aurora',frame:'stardust',title:'Personagem',stickers:items},base);
  assert.deepEqual(result.stickers,items);
  assert.deepEqual(profileIdentity({...base,profile_stickers:JSON.stringify({stickers:result.stickers,bioStyle:'ice'})}).stickers,items);
  assert.throws(()=>validateIdentity({title:'Personagem',stickers:[...items,items[0]]},base),/seis/);
 }finally{localStickerPaths.delete(id)}
});
test('v34: editor replaces a sticker without saving first and keeps current tab',()=>{
 const js=read('web/js/app.js');
 assert.match(js,/id="sticker-replace"/);
 assert.match(js,/profileStickers\[selected\]=\{\.\.\.profileStickers\[selected\],id\}/);
 assert.doesNotMatch(js,/if\(profileStickers\.some\(s=>s\.id===id\)\)/);
 assert.match(js,/button\.disabled=false;toast\('Perfil salvo!/);
 assert.doesNotMatch(js,/toast\('Perfil salvo![^\n]*render\(\)/);
 assert.doesNotMatch(js,/Nome exibido no perfil:/);
 const css=read('web/css/refinements-v34.css');
 assert.match(css,/\.profile-cover-stickers \.cover-sticker \{max-width:none!important/);
 assert.match(css,/\.header-username \.name-letters/);
});
test('v34: official muted videos are allowed only from the specific YouTube embed host',()=>{
 const csp=contentSecurityPolicy();
 assert.match(csp,/frame-src https:\/\/myembed\.biz https:\/\/www\.youtube-nocookie\.com/);
 assert.match(read('web/js/app.js'),/youtube-nocookie\.com\/embed/);
 assert.match(read('web/js/app.js'),/mute=1/);
 assert.match(read('web/js/app.js'),/state\.prefs\.economy/);
 assert.match(read('web/js/app.js'),/trailerPreviewCache/);
 assert.match(read('worker.js'),/tv\/\$\{videos\[1\]\}\/videos/);
});
test('v34: TMDB videos API only selects genuine YouTube trailers for anime',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{
  const path=new URL(url).pathname;
  if(path==='/3/tv/73223')return Response.json({id:73223,name:'Teste',adult:false,genres:[{id:16}],origin_country:['JP']});
  if(path==='/3/tv/73223/videos')return Response.json({results:[
   {site:'External',key:'AaBbCcDdE11',type:'Trailer'},
   {site:'YouTube',key:'bad$',type:'Trailer'},
   {site:'YouTube',key:'AaBbCcDdE11',type:'Trailer',official:true,name:'Oficial'}
  ]});
  return Response.json({results:[]});
 };
 try{
  const env={TMDB_API_KEY:'integration.test.token'};
  const res=await worker.fetch(new Request('https://anime.test/api/catalog/tv/73223/videos'),env,{});
  assert.equal(res.status,200);
  const data=await res.json();assert.equal(data.trailer.key,'AaBbCcDdE11');
 }finally{globalThis.fetch=original}
});
