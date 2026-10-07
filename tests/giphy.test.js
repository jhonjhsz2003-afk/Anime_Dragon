import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker.js';
import {giphyAvatar,giphyMarker,giphyConfig,storedAvatarFrame} from '../server/giphy-avatar.js';
import {giphyRequest,giphyMedia,giphyId,createGiphyClient,giphyPage,mountGiphy,observeGiphyAvatars} from '../web/js/giphy.js';

const KEY='giphy-test-public-key';
function fixture(t){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 const DB={sqlite,prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}};
 const env={DB,GIPHY_API_KEY:KEY,TMDB_API_KEY:'giphy-public-profile-fixture'};
 const call=(path,{body,cookie,origin='https://giphy.test',environment=env}={})=>worker.fetch(new Request('https://giphy.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),environment,{});
 const register=async name=>{const response=await call('/api/auth/register',{body:{name,email:`${name}@example.test`,password:'giphy-fixture-password-123'}});assert.equal(response.status,200);return {cookie:response.headers.get('Set-Cookie').split(';')[0],user:(await response.json()).user}};
 return {sqlite,DB,env,call,register};
}

test('GIPHY searches keep the exact query and request official endpoints without enhancement',()=>{
 const query='Naruto Shippuden  vs Sasuke',address=new URL(giphyRequest(KEY,{query,offset:24}));
 assert.equal(address.origin,'https://api.giphy.com');assert.equal(address.pathname,'/v1/gifs/search');assert.equal(address.searchParams.get('q'),query);
 assert.deepEqual([...address.searchParams.keys()],['api_key','limit','offset','rating','q','lang']);assert.equal(address.searchParams.get('rating'),'pg-13');assert.equal(address.searchParams.get('limit'),'24');assert.equal(address.searchParams.get('offset'),'24');
 const trending=new URL(giphyRequest(KEY,{trending:true,query:'ignored',offset:9000}));assert.equal(trending.pathname,'/v1/gifs/trending');assert.equal(trending.searchParams.has('q'),false);assert.equal(trending.searchParams.get('offset'),'499');
 assert.equal(new URL(giphyRequest(KEY,{id:'abcXYZ123'})).pathname,'/v1/gifs/abcXYZ123');assert.throws(()=>giphyRequest(KEY,{id:'../search'}),/inválido/);
});

test('GIPHY client reads directly without credentials or retaining search results or rewritten media URLs',async()=>{
 const calls=[],mediaURL='https://media2.giphy.com/media/abcXYZ123/giphy.gif?cid=test&rid=giphy.gif&ct=g';let reads=0;
 const client=createGiphyClient({fetcher:async(url,options)=>{calls.push({url,options});if(url==='/api/giphy/config')return Response.json({configured:true,apiKey:KEY});return Response.json({data:[{id:'abcXYZ123',images:{original:{url:mediaURL}},read:++reads}],meta:{status:200}});}});
 const abort=new AbortController(),first=await client.read({query:'One Piece'},abort.signal),second=await client.read({query:'One Piece'},abort.signal);
 assert.equal(calls.filter(call=>call.url==='/api/giphy/config').length,1);assert.equal(reads,2,'each search reaches GIPHY instead of retaining a result cache');
 for(const {url,options}of calls.slice(1)){assert.equal(new URL(url).origin,'https://api.giphy.com');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.signal,abort.signal);assert.equal(options.headers,undefined);}
 assert.equal(first.data[0].images.original.url,mediaURL);assert.equal(second.data[0].read,2);assert.equal(giphyMedia(mediaURL),mediaURL);
 assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.cache,'no-store');
});

test('unconfigured GIPHY is graceful, exposes no other credentials and can be configured on retry',async()=>{
 const env={GIPHY_API_KEY:'  '+KEY+'  ',TMDB_API_KEY:'tmdb-secret-fixture',AUTH_SECRET:'auth-secret-fixture',OTHER_SECRET:'unrelated-secret-fixture'};
 const configured=giphyConfig(env);assert.deepEqual(Object.keys(configured).sort(),['apiKey','configured','ok','rating']);assert.equal(configured.apiKey,KEY);
 const response=await worker.fetch(new Request('https://giphy.test/api/giphy/config'),env,{});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');const body=await response.text();for(const value of [env.TMDB_API_KEY,env.AUTH_SECRET,env.OTHER_SECRET])assert.equal(body.includes(value),false);
 assert.deepEqual(giphyConfig({GIPHY_API_KEY:'   '}),{ok:true,configured:false,apiKey:null,rating:'pg-13'});
 let configuredNow=false,reads=0;const client=createGiphyClient({fetcher:async url=>{if(url==='/api/giphy/config')return Response.json({configured:configuredNow,apiKey:configuredNow?KEY:null});reads++;return Response.json({data:[],meta:{status:200}});}});
 await assert.rejects(client.read(),/ainda não foi ativada/);assert.equal(reads,0);configuredNow=true;await client.read();assert.equal(reads,1);
});

test('GIPHY markers store only an ID and bounded framing, rejecting external URLs and malformed values',()=>{
 const marker=giphyMarker('abcXYZ123',{x:0,y:100,zoom:250});assert.equal(marker,'giphy:abcXYZ123?x=0&y=100&zoom=250');assert.deepEqual(giphyAvatar(marker),{id:'abcXYZ123',frame:{x:0,y:100,zoom:250}});assert.equal(giphyId(marker),'abcXYZ123');
 assert.deepEqual(giphyAvatar('giphy:abcXYZ123').frame,{x:50,y:50,zoom:100});assert.deepEqual(storedAvatarFrame({avatar_url:marker,avatar_x:50}),{x:0,y:100,zoom:250});
 for(const value of ['https://media.giphy.com/media/abc/giphy.gif','giphy:../abc','giphy:abc?x=101&y=50&zoom=100','giphy:abc?x=50&y=-1&zoom=100','giphy:abc?x=50&y=50&zoom=99','giphy:abc?x=50&y=50&zoom=301','giphy:abc?x=NaN&y=50&zoom=100','giphy:abc?x=50&y=50&zoom=100&url=evil'])assert.equal(giphyAvatar(value),null,value);
 for(const url of ['http://media.giphy.com/abc.gif','https://giphy.com.evil.test/abc.gif','https://evil.test/?url=https://giphy.com/abc.gif','data:image/gif;base64,R0lG','javascript:alert(1)','https://user:password@media.giphy.com/abc.gif','https://media.giphy.com:8443/abc.gif'])assert.equal(giphyMedia(url),null,url);
});

test('saving a GIPHY avatar requires the session and same-origin request, persists ID/framing and never fetches media',async t=>{
 const f=fixture(t),a=await f.register('AlphaGIF'),b=await f.register('BravoGIF'),network=[];
 t.mock.method(globalThis,'fetch',async url=>{const address=new URL(url);network.push(address);assert.equal(address.hostname,'api.themoviedb.org');return Response.json({id:730001,name:'Anime de teste',genres:[{id:16}],origin_country:['JP'],seasons:[{season_number:1,episode_count:12}]});});
 const path='/api/profile/avatar/giphy?x=20&y=75&zoom=160',options={body:{id:'abcXYZ123'},cookie:a.cookie};
 assert.equal((await f.call(path,{body:options.body})).status,401);assert.equal((await f.call(path,{...options,origin:'https://other.test'})).status,403);
 assert.equal((await f.call(path,{...options,environment:{...f.env,DB:{...f.DB},GIPHY_API_KEY:''}})).status,503);assert.equal((await f.call(path,{...options,body:{id:'https://evil.test/abc.gif'}})).status,400);
 const saved=await f.call(path,options);assert.equal(saved.status,200);const data=await saved.json();assert.equal(data.avatar,'giphy:abcXYZ123?x=20&y=75&zoom=160');assert.deepEqual(data.avatarFrame,{x:20,y:75,zoom:160});assert.equal(network.length,0);
 assert.equal(f.sqlite.prepare('SELECT avatar_url FROM users WHERE id=?').get(a.user.id).avatar_url,data.avatar);assert.equal(f.sqlite.prepare('SELECT COUNT(*) count FROM profile_media').get().count,0);
 assert.equal((await(await f.call('/api/auth/me',{cookie:b.cookie})).json()).user.avatar,b.user.avatar);
 const restarted={...f.env,DB:{...f.DB}},me=(await(await f.call('/api/auth/me',{cookie:a.cookie,environment:restarted})).json()).user;assert.equal(me.avatar,data.avatar);assert.deepEqual(me.avatarFrame,data.avatarFrame);
 const login=await f.call('/api/auth/login',{body:{email:'AlphaGIF@example.test',password:'giphy-fixture-password-123'}});assert.equal(login.status,200);assert.equal((await login.json()).user.avatar,data.avatar);
 await f.call('/api/auth/profile',{cookie:a.cookie,body:{name:'AlphaGIF',bio:'Avatar mantido'}});assert.equal((await(await f.call('/api/auth/me',{cookie:a.cookie})).json()).user.avatar,data.avatar);
 await f.call('/api/auth/privacy',{cookie:a.cookie,body:{visibility:'public'}});const profile=(await(await f.call('/api/community/profile/'+a.user.id)).json()).profile;assert.equal(profile.avatar,data.avatar);assert.deepEqual(profile.avatarFrame,data.avatarFrame);
 assert.equal((await f.call('/api/community/730001',{cookie:a.cookie,body:{action:'comment',body:'Meu avatar está animado'}})).status,200);const comment=(await(await f.call('/api/community/730001')).json()).comments[0];assert.equal(comment.avatar,data.avatar);assert.deepEqual(comment.avatarFrame,data.avatarFrame);assert.equal(network.length,1);
 const crop=await f.call('/api/profile/avatar/crop?x=50&y=15&zoom=200',{cookie:a.cookie,body:{}});assert.equal(crop.status,200);assert.deepEqual((await crop.json()).avatarFrame,{x:50,y:15,zoom:200});assert.match(f.sqlite.prepare('SELECT avatar_url FROM users WHERE id=?').get(a.user.id).avatar_url,/x=50&y=15&zoom=200$/);
 await f.call('/api/profile/avatar/reset',{cookie:a.cookie,body:{}});assert.equal((await(await f.call('/api/auth/me',{cookie:a.cookie})).json()).user.avatar,'/assets/avatar-default.svg');
});

test('GIPHY avatar save rejects malformed JSON objects and whitespace-only configuration',async t=>{
 const f=fixture(t),owner=await f.register('ValidacaoGIF'),path='/api/profile/avatar/giphy';
 for(const body of [null,[],{},42,'abc'])assert.equal((await f.call(path,{cookie:owner.cookie,body})).status,400,String(body));
 assert.equal((await f.call(path,{cookie:owner.cookie,body:{id:'abcXYZ123'},environment:{...f.env,DB:{...f.DB},GIPHY_API_KEY:'   '}})).status,503);
});

const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
async function browserFixture(t,html,{reducedMotion=true,intersectionObserver}={}){
 const {parseHTML}=await import(process.env.ANIMEDRAGON_DOM_MODULE||'linkedom'),{document,window}=parseHTML(`<html><body>${html}</body></html>`);
 for(const [key,value]of Object.entries({document,MutationObserver:window.MutationObserver,matchMedia:()=>({matches:reducedMotion}),...(intersectionObserver?{IntersectionObserver:intersectionObserver}:{})})){const original=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else delete globalThis[key]})}
 return {document,window};
}
test('avatar observer groups repeated IDs, ignores unsafe IDs and stops queued groups on destroy',async t=>{
 const {document}=await browserFixture(t,'<div id="avatars"><img data-giphy-avatar="sameID"><img data-giphy-avatar="sameID"><img data-giphy-avatar="laterID"><img data-giphy-avatar="../unsafe"></div>'),calls=[];let finish;
 const controller=observeGiphyAvatars(document.querySelector('#avatars'),{client:{read:({id},signal)=>{calls.push({id,signal});return new Promise(resolve=>finish=resolve);}}});t.after(()=>controller.destroy());await settle();
 assert.equal(calls.length,1);assert.equal(calls[0].id,'sameID');controller.destroy();assert.equal(calls[0].signal.aborted,true);
 finish({data:{images:{fixed_height:{url:'https://media.giphy.com/media/sameID/giphy.gif'}}}});await settle();assert.equal(calls.length,1,'destroy prevents later IDs from starting requests');assert.equal(document.querySelector('[data-giphy-avatar]').getAttribute('src'),null);
});
test('gallery aborts replaced searches and destroyed views ignore late results',async t=>{
 const {document,window}=await browserFixture(t,giphyPage()),host=document.querySelector('.giphy-page'),calls=[];
 const controller=mountGiphy(host,{client:{read:(options,signal)=>new Promise(resolve=>calls.push({options,signal,resolve}))}});t.after(()=>controller.destroy());await settle();assert.equal(calls.length,1);assert.equal(host.querySelector('[data-gif-motion]').textContent,'Animar GIFs');assert.equal(host.querySelector('[data-gif-motion]').getAttribute('aria-pressed'),'false');
 const input=host.querySelector('#gif-query');input.value='One Piece';host.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await settle();assert.equal(calls.length,2);assert.equal(calls[0].signal.aborted,true);assert.equal(calls[1].options.query,'One Piece');
 calls[0].resolve({data:[{id:'oldID',title:'Old',images:{original:{url:'https://media.giphy.com/old.gif'}}}],pagination:{count:1,total_count:1}});await settle();assert.equal(host.querySelectorAll('.giphy-card').length,0);
 controller.destroy();assert.equal(calls[1].signal.aborted,true);calls[1].resolve({data:[{id:'newID',title:'New',images:{original:{url:'https://media.giphy.com/new.gif'}}}],pagination:{count:1,total_count:1}});await settle();assert.equal(host.querySelectorAll('.giphy-card').length,0);
});
test('gallery videos load only near the viewport and pause without starting offscreen videos in the preview',async t=>{
 let observer;class VisibilityObserver{constructor(callback){this.callback=callback;this.targets=[];observer=this}observe(target){this.targets.push(target)}disconnect(){this.targets=[]}}
 const {document,window}=await browserFixture(t,giphyPage(),{reducedMotion:false,intersectionObserver:VisibilityObserver}),host=document.querySelector('.giphy-page'),prototype=window.HTMLElement.prototype;
 let controller;const originalPlay=prototype.play,originalPause=prototype.pause;prototype.play=function(){this.playCount=(this.playCount||0)+1;return Promise.resolve()};prototype.pause=function(){this.pauseCount=(this.pauseCount||0)+1};t.after(()=>{controller?.destroy();if(originalPlay)prototype.play=originalPlay;else delete prototype.play;if(originalPause)prototype.pause=originalPause;else delete prototype.pause});
 const gifs=['firstID','secondID'].map(id=>({id,title:id,images:{fixed_width:{mp4:`https://media.giphy.com/${id}.mp4`,url:`https://media.giphy.com/${id}.gif`},fixed_width_still:{url:`https://media.giphy.com/${id}-still.jpg`},original:{url:`https://media.giphy.com/${id}.gif`}}}));
 controller=mountGiphy(host,{client:{read:async()=>({data:gifs,pagination:{count:2,total_count:2}})}});await settle();
 const [first,second]=host.querySelectorAll('video');assert.equal(observer.targets.length,2);assert.equal(first.src,undefined);assert.equal(second.src,undefined);assert.equal(first.getAttribute('preload'),'none');
 observer.callback([{target:first,isIntersecting:true},{target:second,isIntersecting:false}]);assert.equal(first.src,gifs[0].images.fixed_width.mp4);assert.equal(first.playCount,1);assert.equal(second.src,undefined);
 const click=button=>button.dispatchEvent(new window.Event('click',{bubbles:true}));click(host.querySelector('[data-gif-motion]'));assert.ok(first.pauseCount>0);click(host.querySelector('[data-gif-motion]'));assert.equal(first.playCount,2);assert.equal(second.playCount,undefined);
 host.querySelector('dialog').showModal=function(){this.setAttribute('open','')};click(host.querySelector('[data-gif-select]'));assert.equal(second.src,undefined);assert.equal(second.playCount,undefined);
});
