import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {localAvatar,localAvatarMarker,localSticker,storedAvatarFrame} from '../server/local-avatar.js';
import {localGifPaths,localStickerPaths} from '../server/local-media-index.js';
import {localAvatarSrc,filterLocalMedia,localGalleryPage,loadLocalCatalog} from '../web/js/local-media.js';
import {validateIdentity} from '../server/profile-identity.js';
const gif='/assets/profile-media/GIFs/anime-teste.gif';
const sticker='/assets/profile-media/Stickers/sakura.webp';

test('builds a local searchable catalog from nested folders and skips duplicates',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'animedragon-index-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const path=join(dir,'web/assets/profile-media');
 await mkdir(join(path,'GIFs/Naruto'),{recursive:true});await mkdir(join(path,'Stickers'),{recursive:true});
 const sample=Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=','base64');
 await writeFile(join(path,'GIFs/Naruto/Foi Bem.gif'),sample);
 await writeFile(join(path,'GIFs/Naruto/duplicado.gif'),sample);
 await writeFile(join(path,'Stickers/Sakura.webp'),Buffer.from('diferente'));
 execFileSync(process.execPath,[resolve('scripts/build-profile-media.mjs')],{cwd:dir});
 const catalog=JSON.parse(await readFile(join(path,'catalog.json'),'utf8'));
 assert.equal(catalog.items.length,2);
 assert.ok(catalog.items.some(x=>x.kind==='gif'&&x.title.includes('Naruto')));
 assert.ok(catalog.items.some(x=>x.kind==='sticker'&&x.url.endsWith('Sakura.webp')));
 const source=await readFile(join(dir,'server/local-media-index.js'),'utf8');
 assert.match(source,/localGifPaths/);assert.match(source,/localStickerPaths/);
});

test('local GIF selection validates the catalog index and exact framing',()=>{
 localGifPaths.add(gif);
 try{
  const marker=localAvatarMarker(gif,{x:12.5,y:77.5,zoom:180});
  assert.equal(marker,gif+'?x=12.5&y=77.5&zoom=180');
  assert.deepEqual(localAvatar(marker),{path:gif,frame:{x:12.5,y:77.5,zoom:180}});
  assert.deepEqual(storedAvatarFrame({avatar_url:marker}),{x:12.5,y:77.5,zoom:180});
  assert.equal(localAvatarSrc(marker),gif);
  for(const bad of ['https://example.com/x.gif','/assets/profile-media/GIFs/../secret.gif',gif+'?x=-1&y=50&zoom=100','/assets/profile-media/GIFs/other.gif'])assert.equal(localAvatar(bad),null);
 }finally{localGifPaths.delete(gif)}
});

test('only indexed stickers can be placed, 4 at most, with no duplicates',()=>{
 const files=Array.from({length:5},(_,i)=>`/assets/profile-media/Stickers/element-${i}.gif`);
 files.forEach(x=>localStickerPaths.add(x));
 try{
  const base={profile_stickers:'[]',profile_cover:'aurora',profile_frame:'stardust'};
  const items=files.slice(0,4).map((id,i)=>({id,x:10+i*10,y:60,size:17}));
  assert.deepEqual(validateIdentity({cover:'aurora',frame:'stardust',title:'Meu mundo',stickers:items},base).stickers,items);
  assert.equal(localSticker(files[0]),true);
  assert.throws(()=>validateIdentity({title:'Meu mundo',stickers:files.map(id=>({id,x:50,y:50,size:17}))},base),/quatro/);
  assert.throws(()=>validateIdentity({title:'Meu mundo',stickers:[items[0],items[0]]},base),/repetido/);
  assert.throws(()=>validateIdentity({title:'Meu mundo',stickers:[{id:'https://site.falso/sticker.gif',x:50,y:50,size:17}]},base),/inválido/);
 }finally{files.forEach(x=>localStickerPaths.delete(x))}
});

test('DragonGIF client search filters locally and requests a paginated remote catalog',async()=>{
 const items=[{kind:'gif',url:gif,title:'Dragão do Naruto'},{kind:'sticker',url:sticker,title:'Sakura rosa'}];
 assert.deepEqual(filterLocalMedia(items,{query:'dragao',kind:'gif'}),[items[0]]);
 assert.deepEqual(filterLocalMedia(items,{query:'Sakura',kind:'sticker'}),[items[1]]);
 assert.equal(filterLocalMedia(items,{query:'abc',kind:'all'}).length,0);
 assert.match(localGalleryPage(),/DRAGONGIF/);
 const remote=[{id:'dg_'+('a'.repeat(32)),kind:'gifs',url:'https://dragongif-api.jhonjhszgame2003.workers.dev/media/gifs/naruto.gif',title:'Dragão'}];
 const original=await loadLocalCatalog({refresh:true,fetcher:async (url)=>{assert.match(url,/api\/v1\/media/);return Response.json({ok:true,items:remote,hasMore:false})}});
 assert.deepEqual(original,remote.map(x=>({...x,kind:'gif',tags:[]})));
});

test('local avatar is visible on shared profile with crop and without any external API',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {default:worker}=await import('../worker.js');
 const sqlite=new DatabaseSync(':memory:');
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const st of statements)result.push(await st.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const env={DB,AUTH_SECRET:'anime-local-test-secret-1234567890'};
 const request=(path,{body,cookie}={})=>worker.fetch(new Request('https://anime.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://anime.test','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,{});
 localGifPaths.add(gif);
 try{
  const r=await request('/api/auth/register',{body:{name:'Anime Local',email:'local-avatar@example.test',password:'senha-segura-123456'}});
  assert.equal(r.status,200);const user=(await r.json()).user,cookie=r.headers.get('Set-Cookie');
  const selected=await request('/api/profile/avatar/local?x=25&y=75&zoom=180',{body:{path:gif},cookie});
  assert.equal(selected.status,200);assert.equal((await selected.json()).avatar,gif+'?x=25&y=75&zoom=180');
  const me=(await (await request('/api/auth/me',{cookie})).json()).user;
  assert.equal(me.avatar,gif+'?x=25&y=75&zoom=180');
  assert.deepEqual(me.avatarFrame,{x:25,y:75,zoom:180});
  const publicProfile=(await(await request('/api/community/profile/'+user.id)).json()).profile;
  assert.equal(publicProfile.avatar,me.avatar);assert.deepEqual(publicProfile.avatarFrame,me.avatarFrame);
  const crop=await request('/api/profile/avatar/crop?x=10&y=10&zoom=200',{cookie,body:{}});
  assert.equal(crop.status,200);assert.equal((await crop.json()).avatar,gif+'?x=10&y=10&zoom=200');
  const invalid=await request('/api/profile/avatar/local',{cookie,body:{path:'https://attacker.test/evil.gif'}});
  assert.equal(invalid.status,400);
 }finally{localGifPaths.delete(gif);sqlite.close()}
});
