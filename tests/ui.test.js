import {createHeaderScroll} from '../web/js/header-scroll.js';
import {releasesPage,mountReleases,releaseDay} from '../web/js/releases.js';
import {giphyPage,mountGiphy,createGiphyClient,giphyId} from '../web/js/giphy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createAccountDialog} from '../web/js/account-dialog.js';
import {createCatalogCache,createIntentPreloader} from '../web/js/navigation.js';
import {createSourceLoader} from '../web/js/sources.js';
import {bindLiveSearch,rankSearchResults} from '../web/js/live-search.js';
import {createAuthSession} from '../web/js/auth-session.js';
import {mountDiscussion} from '../web/js/discussion.js';
import {preferredCaptionLocale} from '../web/js/caption-language.js';
const {parseHTML}=await import(process.env.ANIMEDRAGON_DOM_MODULE||'linkedom');
const fixture={id:1,title:'Anime & teste',overview:'Uma aventura de teste',media_type:'tv',poster_path:'/poster.jpg',backdrop_path:'/back.jpg',first_air_date:'2026-01-01',vote_average:8.5,genres:[],number_of_episodes:2,seasons:[{season_number:1,episode_count:2}]};
function browserHistoryFixture(window,location){
 const entries=[{url:'about:blank',state:null},{url:location.hash,state:null}];let index=1,backCalls=0;
 const move=url=>{const address=new URL(url,'https://anime.test/');location.href=address.href;location.hash=address.hash;};move(entries[index].url);
 return {get state(){return entries[index].state;},get length(){return entries.length;},get backCalls(){return backCalls;},
  replaceState(state,_title,url=location.href){entries[index]={state,url};move(url);},
  pushState(state,_title,url=location.href){entries.splice(index+1);entries.push({state,url});index++;move(url);},
  back(){backCalls++;if(index===0)return;index--;move(entries[index].url);const event=new window.Event('popstate');event.state=entries[index].state;window.dispatchEvent(event);}
 };
}
function setup({saved=false,sessionUser=null,fetchOverride,preferences,initialHash='#home',nativeHistory=false}={}){
 const {window,document}=parseHTML('<html><head></head><body><div id="app"></div><div id="modal-root"></div><div id="toast-root"></div></body></html>');
 window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.scrollBy=function(){};
 const memory=new Map(),calls=[],player={destroyed:0,options:null},location={hash:initialHash,origin:'https://anime.test',pathname:'/'};
 const testHistory=nativeHistory?browserHistoryFixture(window,location):{replaceState(_state,_title,hash){location.hash=hash}};
 if(preferences)memory.set('ad_preferences',JSON.stringify(preferences));
 let focused=null;
 Object.defineProperty(document,'activeElement',{get:()=>focused});
 window.HTMLElement.prototype.focus=function(){focused=this};
 window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');this.querySelector('input')?.focus()};
 window.HTMLElement.prototype.close=function(){this.removeAttribute('open')};
 const context=vm.createContext({giphyPage,mountGiphy,giphyId,createGiphyClient:options=>createGiphyClient({fetcher:(...args)=>context.fetch(...args),...options}),observeGiphyAvatars:()=>({refresh(){},destroy(){}}),releasesPage,mountReleases,releaseDay,createHeaderScroll,createAuthSession,createAccountDialog,mountDiscussion,preferredCaptionLocale,mountWatchPlayer:(host,options)=>{player.options=options;host.innerHTML='<video data-fixture-player></video>';return {destroy(){player.destroyed++;}};},AbortController,createCatalogCache,createIntentPreloader,createSourceLoader,bindLiveSearch,rankSearchResults,console,window,document,location,history:testHistory,navigator:{language:'pt-BR',languages:['pt-BR'],connection:{}},URLSearchParams,AbortSignal,Date,Intl,Map,HTMLImageElement:window.HTMLImageElement,matchMedia:()=>({matches:true}),requestAnimationFrame:cb=>cb(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},fetch:async(path,options={})=>{
  calls.push({path,options});
  const overridden=fetchOverride?.(path,options);if(overridden!==undefined)return overridden;
  if(path==='/api/giphy/config')return Response.json({ok:true,configured:true,apiKey:'fixture-public-giphy-key'});
  if(path.startsWith('https://api.giphy.com/'))return Response.json({data:[{id:'fixtureAnimeGIF',title:'Anime em movimento',images:{fixed_width:{url:'https://media.giphy.com/media/fixtureAnimeGIF/200.gif'},fixed_width_still:{url:'https://media.giphy.com/media/fixtureAnimeGIF/200_s.gif'},original:{url:'https://media.giphy.com/media/fixtureAnimeGIF/giphy.gif'}}}],pagination:{count:1,total_count:1},meta:{status:200}});
  if(path==='/api/auth/me')return Response.json({ok:true,user:sessionUser});
  if(path.includes('/api/community/')){
   if(options.method==='POST'){
    const payload=JSON.parse(options.body);
    if(payload.action==='collection'&&payload.kind==='watchlater')saved=payload.enabled;
   }
   return Response.json({ok:true,likes:0,dislikes:0,reaction:0,collections:saved?['watchlater']:[],comments:[],total:0,progress:[],items:saved?[{anime_id:1,kind:'watchlater'}]:[]});
  }
  if(path.includes('/api/catalog/search'))return Response.json({ok:true,results:[{...fixture,id:3,title:'Outra aventura'},fixture],page:1,totalPages:2});
  if(path.includes('/recommendations'))return Response.json({ok:true,results:[{...fixture,id:2,title:'Anime parecido'}]});
  if(path.includes('/season/'))return Response.json({ok:true,season:{episodes:[{episode_number:1,name:'Começo',still_path:'/ep.jpg',air_date:'2026-01-01'},{episode_number:2,name:'Continuação',air_date:'2026-01-02'}]}});
  if(path.includes('/api/catalog/tv/'))return Response.json({ok:true,item:fixture});
  if(path.includes('/api/auth/register'))return Response.json({ok:true,user:{id:'u1',name:'Testador',email:'test@example.com',avatar:'/assets/avatars/avatar-1.svg'}});
  return Response.json({ok:true});
 }});
 // Remove startup calls only; later function declarations are needed by details.
 let code=readFileSync(new URL('../web/js/app.js',import.meta.url),'utf8').replace(/^import.*\r?\n/gm,'').replace(/^applyPrefs\(\);loadPersonal\(\);render\(\);\r?$/m,'').replace(/^authSession.start\(\);\r?$/m,'');
 vm.runInContext(code,context);context.fixture=fixture;vm.runInContext('state.home={trending:[fixture,{...fixture,id:2,title:"Segundo anime"}],recent:[fixture],top:[fixture]};remember(state.home.trending);',context);
 return {context,document,calls,player,history:testHistory,location,run:s=>vm.runInContext(s,context)};
}
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
test('home binds overlay arrows and switches the featured anime',async()=>{const t=setup();await t.run('render()');assert.equal(t.document.querySelectorAll('.catalog-rail .rail-arrow').length,6);assert.equal(t.document.querySelector('.hero h1').textContent,'Anime & teste');t.document.querySelector('[data-hero-step="1"]').onclick();assert.equal(t.document.querySelector('.hero h1').textContent,'Segundo anime');});
test('registration uses a compact blue flame dialog and submits a real API request',async()=>{
 const t=setup();await t.run("location.hash='#cadastro';render()");
 assert.ok(t.document.querySelector('.account-dialog[open] .blue-fire'));assert.equal(t.document.querySelector('.auth-shell'),null);assert.ok(t.document.querySelector('.site-header'));assert.equal(t.run('location.hash'),'#home');
 t.document.querySelector('#account-name').value='Testador';t.document.querySelector('#account-email').value='test@example.com';t.document.querySelector('#account-password').value='uma-senha-longa-123';t.document.querySelector('#account-confirm').value='uma-senha-longa-123';
 const form=t.document.querySelector('#account-form');await form.onsubmit({preventDefault(){},currentTarget:form});
 assert.equal(t.run('state.user.id'),'u1');assert.ok(t.calls.some(x=>x.path==='/api/auth/register'&&x.options.method==='POST'));assert.equal(t.document.querySelector('.account-dialog'),null);t.run('authSession.destroy()');
});

test('opening, switching and closing account access preserves the current anime and route',async()=>{
 const t=setup();await t.run('render();openDetails(1)');await settle();const detail=t.document.querySelector('.detail-modal'),before=t.run('location.hash');
 t.run("nav('entrar')");assert.ok(t.document.querySelector('.account-dialog[open]'));assert.equal(t.document.querySelector('.detail-modal'),detail);assert.equal(t.run('location.hash'),before);
 t.document.querySelector('#account-email').value='remember@example.com';t.document.querySelector('[data-account-tab="register"]').onclick();assert.equal(t.document.querySelector('#account-email').value,'remember@example.com');assert.ok(t.document.querySelector('#account-confirm'));
 t.document.querySelector('.account-close').onclick();assert.equal(t.document.querySelector('.account-dialog'),null);assert.equal(t.document.querySelector('.detail-modal'),detail);t.run('closeModal();authSession.destroy()');
});

test('custom display names remain text and profile fields accept short and multi-codepoint names',async()=>{
 const user={id:'u1',name:'꧁🔥 <img id="injected-name" src=x> ꧂',email:'custom@example.test',avatar:'/assets/avatar-default.svg',bio:''};
 const t=setup();t.context.confirmedUser=user;t.run("authSession.accept(confirmedUser);location.hash='#profile';render()");await settle();
 assert.equal(t.document.querySelector('#injected-name'),null);assert.equal(t.document.querySelector('.profile-cover h2').textContent,user.name);
 const input=t.document.querySelector('#pf-name');assert.equal(input.value,user.name);assert.equal(input.getAttribute('minlength'),'1');assert.equal(input.getAttribute('maxlength'),'1024');
 assert.match(t.document.querySelector('#pf-name-help').textContent,/80 caracteres visíveis/);t.run('authSession.destroy()');
});

test('profile appearance previews instantly and submits selected choices to the server',async()=>{
 let submitted;const user={id:'u1',name:'Testador',email:'test@example.com',avatar:'/assets/avatar-default.svg',bio:''};
 const t=setup({fetchOverride:(path,options)=>{if(path==='/api/auth/profile'){submitted=JSON.parse(options.body);return Response.json({ok:true,user:{...user,identity:submitted.identity}});}}});t.context.confirmedUser=user;t.run("authSession.accept(confirmedUser);location.hash='#profile';render()");await settle();
 t.document.querySelector('[data-identity-cover="nebula"]').onclick();t.document.querySelector('[data-identity-frame="halo"]').onclick();const title=t.document.querySelector('#profile-title');title.value='Guardião das madrugadas';title.oninput();
 assert.ok(t.document.querySelector('.profile-cover.identity-cover-nebula.identity-ring-halo'));assert.equal(t.document.querySelector('#identity-title-preview').textContent,title.value);
 await t.document.querySelector('#profile-form').onsubmit({preventDefault(){}});assert.deepEqual(submitted.identity,{cover:'nebula',frame:'halo',title:'Guardião das madrugadas'});assert.equal(t.run('state.user.identity.cover'),'nebula');t.run('authSession.destroy()');
});
test('details binds episode previews, recommendations and community controls',async()=>{const t=setup();await t.run('openDetails(1)');await settle();assert.ok(t.document.querySelector('.detail-hero-art'));assert.equal(t.document.querySelectorAll('[data-episode]').length,2);assert.ok(t.document.querySelector('.episode-preview img'));assert.equal(t.document.querySelectorAll('.similar-grid .card').length,1);assert.equal(t.document.querySelectorAll('[data-reaction]').length,2);assert.ok(t.document.querySelector('.comment-guest'));assert.equal(t.document.querySelector('#detail-watch').disabled,false);});

test('details mount one masthead return control and hide the duplicate only after it is available',async()=>{const t=setup();await t.run('render();openDetails(1)');await settle();const back=t.document.querySelector('.masthead #header-detail-back');assert.ok(back);assert.equal(t.document.querySelectorAll('#header-detail-back').length,1);assert.equal(t.document.querySelector('.detail-modal .modal-navigation').hidden,true);assert.equal(t.document.querySelector('#mclose'),null);back.onclick();assert.equal(t.document.querySelector('.modal'),null);assert.equal(t.document.querySelector('#header-detail-back'),null);assert.equal(t.document.querySelector('#app').inert,false);});

test('internal page return falls back to home on a direct link',async()=>{const t=setup();await t.run("location.hash='#library';render()");assert.ok(t.document.querySelector('#page-back'));t.document.querySelector('#page-back').onclick();assert.equal(t.run('location.hash'),'#home');});

test('header menu and search expose their state and restore focus on closing',async()=>{
 const t=setup();await t.run('render()');
 const header=t.document.querySelector('.site-header'),menu=t.document.querySelector('#mobile-menu-toggle'),search=t.document.querySelector('#header-search-toggle');
 menu.onclick();assert.equal(menu.getAttribute('aria-expanded'),'true');assert.equal(header.classList.contains('menu-open'),true);
 search.onclick();assert.equal(search.getAttribute('aria-expanded'),'true');assert.equal(header.classList.contains('search-open'),true);
 assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(t.document.activeElement.id,'global-search');
 t.document.querySelector('#header-search-close').onclick();assert.equal(search.getAttribute('aria-expanded'),'false');assert.equal(t.document.activeElement,search);
 search.onclick();menu.onclick();assert.equal(header.classList.contains('search-open'),false);assert.equal(menu.getAttribute('aria-expanded'),'true');header.onkeydown({key:'Escape'});
 assert.equal(header.classList.contains('menu-open'),false);assert.equal(header.classList.contains('search-open'),false);
 assert.equal(search.getAttribute('aria-expanded'),'false');assert.equal(t.document.activeElement,search);
});

test('typing uses live search, ranks matching titles and keeps the search field mounted',async()=>{
 const t=setup();await t.run('render()');t.document.querySelector('#header-search-toggle').onclick();
 const input=t.document.querySelector('#global-search');input.value='Anime';input.oninput({isComposing:false});
 assert.equal(t.run('location.hash'),'#search?q=Anime');assert.equal(t.document.querySelector('#live-search-results').getAttribute('aria-busy'),'true');
 await new Promise(resolve=>setTimeout(resolve,220));await settle();
 assert.equal(t.document.querySelector('#global-search'),input);assert.equal(t.document.activeElement,input);
 assert.equal(t.document.querySelector('#live-search-results').getAttribute('aria-busy'),'false');
 assert.equal(t.document.querySelector('.search-catalog .card-title').textContent,'Anime & teste');
 assert.equal(t.document.querySelectorAll('.search-catalog .card').length,2);
 assert.equal(t.document.querySelector('.search-more').getAttribute('href'),'#search?q=Anime&page=2');
 assert.ok(t.calls.some(({path})=>path==='/api/catalog/search?q=Anime'));
 t.run('searchController.destroy()');
});

test('a restored account replaces the loading header and opens home from the login route',async()=>{
 const user={id:'persistent-user',name:'Usuário persistente',avatar:'/assets/avatars/avatar-1.svg'};
 const t=setup({sessionUser:user});
 await t.run('render()');assert.ok(t.document.querySelector('.account-restoring'));assert.equal(t.document.querySelector('.login-link'),null);
 await t.run("authSession.restore({force:true})");assert.ok(t.document.querySelector('.profile-chip'));assert.equal(t.document.querySelector('.profile-chip b').textContent,user.name);assert.equal(t.document.querySelector('.account-restoring'),null);
 t.run("location.hash='#entrar'");await t.run("authSession.restore({force:true})");assert.equal(t.run('location.hash').replace(/^#/,''),'home');
 t.run('authSession.destroy()');
});

test('session revalidation updates the account without closing an open anime',async()=>{
 const user={id:'persistent-user',name:'Persistente',avatar:'/assets/avatars/avatar-1.svg'},t=setup({sessionUser:user});
 await t.run('render();openDetails(1)');await settle();const modal=t.document.querySelector('.detail-modal');
 await t.run('authSession.restore({force:true})');await settle();assert.equal(t.document.querySelector('.detail-modal'),modal);assert.equal(t.document.querySelector('#detail-title').textContent,fixture.title);assert.ok(t.document.querySelector('.comment-composer'));
 t.run('authSession.destroy()');
});

test('account restoration and anonymous revalidation keep the active player mounted',async()=>{
 const user={id:'persistent-user',name:'Persistente',avatar:'/assets/avatars/avatar-1.svg'},t=setup({sessionUser:user});
 await t.run('render();openDetails(1)');await settle();await t.run('openPlayer(1)');await settle();
 const video=t.document.querySelector('[data-fixture-player]'),modal=t.document.querySelector('.watch-modal');
 assert.ok(video);assert.ok(modal);
 await t.run('authSession.restore({force:true})');await settle();
 assert.equal(t.document.querySelector('[data-fixture-player]'),video);assert.equal(t.document.querySelector('.watch-modal'),modal);assert.equal(t.player.destroyed,0);
 t.run('authSession.clear()');await settle();
 assert.equal(t.document.querySelector('[data-fixture-player]'),video);assert.equal(t.player.destroyed,0);assert.equal(t.run('state.user'),null);
 t.run('authSession.destroy();closeModal()');assert.equal(t.player.destroyed,1);
});

test('a late profile or privacy response cannot restore an explicitly logged-out account',async()=>{
 for(const endpoint of ['/api/auth/profile','/api/auth/privacy']){
  let finish;
  const user={id:'u1',name:'Testador',email:'test@example.com',avatar:'/assets/avatars/avatar-1.svg',visibility:'private'};
  const t=setup({fetchOverride:path=>path===endpoint?new Promise(resolve=>finish=resolve):undefined});t.context.confirmedUser=user;
  t.run("authSession.accept(confirmedUser);location.hash='#profile'");await t.run('render()');await settle();
  const form=t.document.querySelector(endpoint.endsWith('privacy')?'#privacy-form':'#profile-form');
  const saving=form.onsubmit({preventDefault(){},currentTarget:form});await settle();assert.equal(typeof finish,'function');
  await t.document.querySelector('.header-account [data-logout]').onclick();assert.equal(t.run('state.user'),null);
  finish(Response.json({ok:true,user:{...user,name:'Nome atualizado',visibility:'public'}}));await saving;await settle();
  assert.equal(t.run('state.user'),null,`${endpoint} must not restore the logged-out user`);assert.equal(t.document.querySelector('.profile-chip'),null);
  t.run('authSession.destroy()');
 }
});

test('a confirmed avatar update invalidates an older account restoration',async()=>{
 let finish;
 const user={id:'u1',name:'Testador',email:'test@example.com',avatar:'/assets/avatars/avatar-1.svg'},oldUser={...user};
 const updatedAvatar='/api/avatar/u1?v=updated';
 const t=setup({fetchOverride:path=>path==='/api/auth/me'?new Promise(resolve=>finish=resolve):path.startsWith('/api/profile/avatar/crop?')?Response.json({ok:true,avatar:updatedAvatar,avatarFrame:{x:50,y:50,zoom:120}}):undefined});
 t.context.confirmedUser=user;t.run("authSession.accept(confirmedUser);location.hash='#profile'");await t.run('render()');await settle();
 const restoring=t.run('authSession.restore({force:true})');await settle();assert.equal(typeof finish,'function');
 await t.document.querySelector('#save-photo').onclick();assert.equal(t.run('state.avatar'),updatedAvatar);
 finish(Response.json({ok:true,user:oldUser}));await restoring;
 assert.equal(t.run('state.avatar'),updatedAvatar);assert.equal(t.document.querySelector('.profile-chip img').getAttribute('src'),updatedAvatar);
 t.run('authSession.destroy()');
});

test('detail tabs support arrows, Home and End while exposing only the selected panel',async()=>{
 const t=setup();await t.run('openDetails(1)');await settle();
 const tabs=[...t.document.querySelectorAll('.detail-tabs [role="tab"]')];
 const check=index=>tabs.forEach((tab,i)=>{
  assert.equal(tab.getAttribute('aria-selected'),String(i===index));
  assert.equal(t.document.getElementById(tab.getAttribute('aria-controls')).hidden,i!==index);
 });
 const key=(tab,value)=>{let prevented=false;tab.onkeydown({key:value,preventDefault(){prevented=true}});assert.equal(prevented,true);};
 check(0);tabs[1].onclick();check(1);
 key(tabs[1],'ArrowRight');check(2);assert.equal(t.document.activeElement,tabs[2]);
 key(tabs[2],'ArrowRight');check(0);assert.equal(t.document.activeElement,tabs[0]);
 key(tabs[0],'ArrowLeft');check(2);
 key(tabs[2],'Home');check(0);
 key(tabs[0],'End');check(2);
 // Linkedom's tabIndex getter maps zero to -1; the rendered attributes are authoritative.
 assert.equal(tabs[2].getAttribute('tabindex'),'0');assert.equal(tabs[0].getAttribute('tabindex'),'-1');
});

test('saving in details updates the hero and persists its state through rendering and removal',async()=>{
 const t=setup();t.run("state.user={id:'u1',name:'Testador'}");await t.run('render();openDetails(1)');await settle();
 await t.document.querySelector('[data-community-kind="watchlater"]').onclick();await settle();
 const heroSaved=t.document.querySelector('.hero [data-list]');assert.equal(heroSaved.textContent,'✓ Salvo');assert.equal(heroSaved.getAttribute('aria-pressed'),'true');
 assert.equal(t.document.querySelector('[data-community-kind="watchlater"]').getAttribute('aria-pressed'),'true');assert.equal(t.run('state.list.length'),1);
 t.document.querySelector('#modal-back').onclick();await t.run('render()');
 assert.equal(t.document.querySelector('.hero [data-list]').textContent,'✓ Salvo');
 await t.document.querySelector('.hero [data-list]').onclick();
 assert.equal(t.document.querySelector('.hero [data-list]').getAttribute('aria-pressed'),'false');assert.equal(t.document.querySelector('.hero [data-list]').textContent,'＋ Minha lista');
 assert.equal(t.run('state.list.length'),0);
 const mutations=t.calls.filter(({path,options})=>path==='/api/community/1'&&options.method==='POST').map(({options})=>JSON.parse(options.body));
 assert.deepEqual(mutations,[{action:'collection',kind:'watchlater',enabled:true},{action:'collection',kind:'watchlater',enabled:false}]);
});


test('Lançamentos opens its public future agenda and never requests the aired discover listing',async()=>{
 const event={key:'1:episode:2:3:2099-01-02',kind:'episode',air_date:'2099-01-02',season_number:2,episode_number:3,anime:fixture};
 const t=setup({fetchOverride:path=>path.startsWith('/api/catalog/releases')?Response.json({ok:true,items:path.includes('summary=1')?[]:[event],...(path.includes('summary=1')?{summary:true,phase:'summary'}:{}),asOf:'2026-10-07',page:1,hasMore:false}):undefined});
 await t.run("location.hash='#releases';render()");await settle();
 assert.equal(t.document.querySelector('.top-nav a[aria-current="page"]').getAttribute('href'),'#releases');
 assert.ok(t.document.querySelector('time[datetime="2099-01-02"]'));
 assert.equal(t.document.querySelector('.release-episode').textContent,'EP.3');
 assert.ok(t.calls.some(call=>call.path==='/api/catalog/releases?page=1'));
 assert.equal(t.calls.some(call=>call.path.startsWith('/api/catalog/discover')),false);
 t.run('releasesController.destroy();authSession.destroy()');
});

test('announced anime with no episodes keeps watch disabled and does not fetch a nonexistent season',async()=>{
 const announced={...fixture,id:90,first_air_date:'2099-01-02',seasons:[],number_of_episodes:0};
 const t=setup({fetchOverride:path=>path==='/api/catalog/tv/90'?Response.json({ok:true,item:announced}):undefined});
 await t.run('openDetails(90)');await settle();
 assert.equal(t.document.querySelector('#detail-watch').disabled,true);
 assert.equal(t.document.querySelector('#detail-watch').textContent,'Estreia em breve');
 assert.ok(t.document.querySelector('#episodes').textContent.includes('ainda vai estrear'));
 assert.equal(t.calls.some(call=>call.path.includes('/tv/90/season/')),false);
 t.run('closeModal();authSession.destroy()');
});

test('leaving the release page discards its late response instead of rewriting the next page',async()=>{
 let finish;
 const pending=new Promise(resolve=>finish=resolve);
 const t=setup({fetchOverride:path=>path.startsWith('/api/catalog/releases')?pending:path.startsWith('/api/catalog/discover')?Response.json({ok:true,results:[fixture],page:1,totalPages:1}):undefined});
 await t.run("location.hash='#releases';render()");
 await t.run("location.hash='#anime';render()");await settle();
 finish(Response.json({ok:true,items:[],page:1,hasMore:false}));await settle();
 assert.equal(t.document.querySelector('.releases-view'),null);
 assert.ok(t.document.querySelector('#catalog-results .catalog-grid'));
 t.run('authSession.destroy()');
});

test('episode-only labels retain the selected season in updated cards, resume history and the personal agenda',async()=>{
 const twoSeasons={...fixture,seasons:[{season_number:1,episode_count:2},{season_number:2,episode_count:2}]};
 const t=setup({fetchOverride:path=>path==='/api/catalog/tv/1'?Response.json({ok:true,item:twoSeasons}):undefined});
 t.context.recentItem={...fixture,last_episode_to_air:{season_number:2,episode_number:3,air_date:'2026-01-01'}};t.context.resumeItem={...fixture,season:2,episode:3,progress:140,duration:1200};
 t.run('state.home.updated=[recentItem];state.history=[resumeItem]');await t.run('render()');
 const updated=t.document.querySelector('#updated [data-id]');assert.equal(updated.dataset.season,'2');assert.equal(updated.querySelector('.release-tag').textContent,'EP.3');
 assert.match(t.document.querySelector('.continue-card small').textContent,/^EP\.3/);assert.doesNotMatch(t.document.querySelector('.continue-card small').textContent,/\bT2\b/);assert.equal(t.document.querySelector('.continue-rail').getAttribute('tabindex'),'0');
 await updated.onclick();await settle();assert.equal(t.run('state.season'),2);assert.ok(t.calls.some(call=>call.path==='/api/catalog/tv/1/season/2'));assert.doesNotMatch(t.document.querySelector('#detail-watch').textContent,/\bT2\b/);
 t.context.agendaItem={...fixture,next_episode_to_air:{season_number:2,episode_number:4,air_date:'2099-01-02'}};t.run('closeModal();document.querySelector("#page-content").innerHTML=calendarItems([agendaItem]);');
 const agenda=t.document.querySelector('.schedule-card');assert.equal(agenda.dataset.season,'2');assert.match(agenda.textContent,/EP\.4/);assert.doesNotMatch(agenda.textContent,/\bT2\b/);t.run('authSession.destroy()');
});

test('opening and collapsing header search keeps the anime and measures its entire occupied height',async()=>{
 const t=setup();await t.run('render()');const header=t.document.querySelector('.site-header'),search=t.document.querySelector('#header-search-toggle');
 header.getBoundingClientRect=()=>({height:header.classList.contains('header-compact')?56:68,bottom:header.classList.contains('header-compact')?56:68});
 t.document.querySelector('.masthead').getBoundingClientRect=header.getBoundingClientRect;
 t.document.querySelector('#header-search').getBoundingClientRect=()=>({bottom:header.classList.contains('search-open')?(header.classList.contains('header-compact')?132:144):0});
 await t.run('openDetails(1)');await settle();const modal=t.document.querySelector('.detail-modal');assert.equal(t.document.documentElement.style.getPropertyValue('--header-actual-offset'),'68px');
 search.onclick();assert.equal(t.document.querySelector('.detail-modal'),modal);assert.equal(t.document.documentElement.style.getPropertyValue('--header-actual-offset'),'144px');assert.equal(typeof t.document.querySelector('.masthead #header-detail-back').onclick,'function');assert.equal(t.document.querySelector('.detail-modal .modal-navigation').hidden,true);
 header.classList.add('header-compact');t.run('syncHeaderOffset()');assert.equal(t.document.documentElement.style.getPropertyValue('--header-actual-offset'),'132px');
 const event=new t.document.defaultView.Event('keydown',{bubbles:true,cancelable:true});event.key='Escape';header.onkeydown(event);t.document.dispatchEvent(event);
 assert.equal(event.defaultPrevented,true);assert.equal(t.document.querySelector('.detail-modal'),modal);assert.equal(t.document.documentElement.style.getPropertyValue('--header-actual-offset'),'56px');
 t.document.querySelector('#header-detail-back').onclick();assert.equal(t.document.querySelector('.detail-modal'),null);t.run('authSession.destroy()');
});

test('the caption update turns legacy auto-on off once while preserving a later explicit opt-in',async()=>{
 const t=setup({preferences:{motion:true,economy:true,autoCaptions:true}});assert.equal(t.run('state.prefs.autoCaptions'),false);assert.equal(t.run('state.prefs.economy'),true);assert.equal(t.run('state.prefs.captionPreferenceVersion'),1);
 await t.run('openDetails(1)');await t.run('openPlayer(1)');assert.equal(t.player.options.autoCaptions,false);
 await t.run("location.hash='#settings';render()");const setting=t.document.querySelector('[data-pref="autoCaptions"]');assert.equal(setting.getAttribute('aria-checked'),'false');setting.onclick();assert.equal(setting.getAttribute('aria-checked'),'true');
 const saved=t.run("JSON.parse(localStorage.getItem('ad_preferences'))");const next=setup({preferences:saved});assert.equal(next.run('state.prefs.autoCaptions'),true);assert.equal(next.run('state.prefs.captionPreferenceVersion'),1);t.run('authSession.destroy();closeModal()');next.run('authSession.destroy()');
});

test('caller cancellation reaches fetch without cancelling or removing another shared playback request',async()=>{
 const requests=[];const t=setup({fetchOverride:(path,options)=>path==='/api/playback?abort-test'?new Promise((resolve,reject)=>{requests.push({resolve,signal:options.signal});options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});}):undefined});
 t.context.caller=new AbortController();const shared=t.run("api('/api/playback?abort-test')"),cancelled=t.run("api('/api/playback?abort-test',{signal:caller.signal})");assert.equal(requests.length,2);
 const rejection=assert.rejects(cancelled,error=>error.name==='AbortError');t.context.caller.abort();await rejection;assert.equal(requests[0].signal.aborted,false);
 const again=t.run("api('/api/playback?abort-test')");assert.equal(requests.length,2);requests[0].resolve(Response.json({ok:true,available:false}));await Promise.all([shared,again]);
 assert.equal(t.run('pending.size'),0);t.run('authSession.destroy()');
});

test('the public GIF route uses the real gallery and reads provider results without opening the anime catalog',async testContext=>{
 const t=setup();testContext.after(()=>t.run('giphyController?.destroy();authSession.destroy()'));
 await t.run("location.hash='#gifs';render()");await settle();
 assert.ok(t.document.querySelector('.giphy-page'));assert.equal(t.document.querySelectorAll('[data-gif-select]').length,1);assert.ok(t.document.querySelector('.giphy-attribution img'));assert.equal(t.document.querySelector('.account-dialog'),null);
 assert.ok(t.document.querySelector('.header-more a[href="#gifs"]'));assert.ok(t.calls.some(call=>call.path==='/api/giphy/config'));
 const provider=t.calls.find(call=>call.path.startsWith('https://api.giphy.com/'));assert.equal(new URL(provider.path).searchParams.get('q'),'anime');assert.equal(provider.options.credentials,'omit');assert.equal(provider.options.cache,'no-store');
 assert.equal(t.calls.some(call=>call.path.startsWith('/api/catalog/discover')),false);
});

test('leaving the GIF gallery aborts its request and a late provider response cannot replace the anime page',async testContext=>{
 let finish,providerSignal;const pending=new Promise(resolve=>finish=resolve);
 const t=setup({fetchOverride:(path,options)=>{if(path.startsWith('https://api.giphy.com/')){providerSignal=options.signal;return pending;}if(path.startsWith('/api/catalog/discover'))return Response.json({ok:true,results:[fixture],page:1,totalPages:1});}});testContext.after(()=>t.run('giphyController?.destroy();authSession.destroy()'));
 await t.run("location.hash='#gifs';render()");await settle();assert.ok(providerSignal);assert.equal(providerSignal.aborted,false);
 await t.run("location.hash='#anime';render()");await settle();assert.equal(providerSignal.aborted,true);assert.equal(t.run('giphyController'),null);const animePage=t.document.querySelector('#page-content').innerHTML;
 finish(Response.json({data:[{id:'lateGIF',title:'Resposta antiga',images:{fixed_width:{url:'https://media.giphy.com/media/lateGIF/200.gif'}}}],pagination:{count:1,total_count:1},meta:{status:200}}));await settle();
 assert.equal(t.document.querySelector('.giphy-page'),null);assert.equal(t.document.querySelector('#page-content').innerHTML,animePage);assert.ok(t.document.querySelector('#catalog-results .catalog-grid'));
});

test('a direct shared anime returns from player and related details to home without leaving the site',async testContext=>{
 const t=setup({nativeHistory:true,initialHash:'#home?anime=1',fetchOverride:path=>path==='/api/catalog/tv/2'?Response.json({ok:true,item:{...fixture,id:2,title:'Relacionado'}}):undefined});testContext.after(()=>t.run('closeModal();authSession.destroy()'));
 await t.run('render()');await settle();assert.equal(t.history.state.adDirectDetail,true);assert.equal(t.history.length,2);assert.ok(t.document.querySelector('#header-detail-back'));
 await t.run('openDetails(1)');assert.equal(t.history.state.adDirectDetail,true);assert.equal(t.history.length,2);
 await t.run('openPlayer(1)');assert.equal(t.history.state.adDirectDetail,undefined);assert.equal(t.document.querySelector('#header-detail-back'),null);assert.ok(t.document.querySelector('.watch-modal .modal-navigation'));
 t.player.options.onClose();await settle();assert.equal(t.history.backCalls,1);assert.equal(t.history.state.adDirectDetail,true);assert.ok(t.document.querySelector('.detail-modal'));
 await t.run('openDetails(2)');assert.equal(t.history.state.adDirectDetail,undefined);t.document.querySelector('#header-detail-back').onclick();await settle();assert.equal(t.history.backCalls,2);assert.equal(t.history.state.adDirectDetail,true);
 t.document.querySelector('#header-detail-back').onclick();await settle();assert.equal(t.history.backCalls,2);assert.equal(t.location.hash,'#home');assert.equal(t.location.href,'https://anime.test/#home');assert.equal(t.history.state.adDirectDetail,undefined);assert.equal(t.history.state.adOverlay,null);assert.equal(t.document.querySelector('.detail-modal'),null);
});

test('a normal anime opened from search still goes back to search and restores the triggering card focus',async testContext=>{
 const t=setup({nativeHistory:true,initialHash:'#search?q=Anime'});testContext.after(()=>t.run('closeModal();authSession.destroy()'));
 await t.run('render()');await settle();const card=t.document.querySelector('#catalog-results [data-id="1"]');card.focus();await card.onclick();await settle();assert.equal(t.history.state.adDirectDetail,undefined);assert.ok(t.document.querySelector('.detail-modal'));
 t.document.querySelector('#header-detail-back').onclick();await settle();assert.equal(t.history.backCalls,1);assert.equal(t.location.hash,'#search?q=Anime');assert.equal(t.document.querySelector('.detail-modal'),null);assert.equal(t.document.activeElement,card);
});
