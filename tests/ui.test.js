import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {livingDragon,bindDragon} from '../web/js/dragon.js';
import {createCatalogCache,createIntentPreloader} from '../web/js/navigation.js';
import {createSourceLoader} from '../web/js/sources.js';
import {bindLiveSearch,rankSearchResults} from '../web/js/live-search.js';
const {parseHTML}=await import(process.env.ANIMEDRAGON_DOM_MODULE||'linkedom');
const fixture={id:1,title:'Anime & teste',overview:'Uma aventura de teste',media_type:'tv',poster_path:'/poster.jpg',backdrop_path:'/back.jpg',first_air_date:'2026-01-01',vote_average:8.5,genres:[],number_of_episodes:2,seasons:[{season_number:1,episode_count:2}]};
function setup({saved=false}={}){
 const {window,document}=parseHTML('<html><head></head><body><div id="app"></div><div id="modal-root"></div><div id="toast-root"></div></body></html>');
 window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.scrollBy=function(){};
 const memory=new Map(),calls=[],location={hash:'#home',origin:'https://anime.test',pathname:'/'};
 let focused=null;
 Object.defineProperty(document,'activeElement',{get:()=>focused});
 window.HTMLElement.prototype.focus=function(){focused=this};
 const context=vm.createContext({createCatalogCache,createIntentPreloader,createSourceLoader,bindLiveSearch,rankSearchResults,console,window,document,location,history:{replaceState(_state,_title,hash){location.hash=hash}},navigator:{language:'pt-BR',languages:['pt-BR'],connection:{}},URLSearchParams,AbortSignal,Date,Intl,Map,HTMLImageElement:window.HTMLImageElement,matchMedia:()=>({matches:true}),livingDragon,bindDragon:()=>bindDragon(document),requestAnimationFrame:cb=>cb(),setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},fetch:async(path,options={})=>{
  calls.push({path,options});
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
 let code=readFileSync(new URL('../web/js/app.js',import.meta.url),'utf8').replace(/^import.*\r?\n/gm,'').replace(/^applyPrefs\(\);loadPersonal\(\);render\(\);\r?$/m,'').replace(/^api\('\/api\/auth\/me'\).*\r?$/m,'');
 vm.runInContext(code,context);context.fixture=fixture;vm.runInContext('state.home={trending:[fixture,{...fixture,id:2,title:"Segundo anime"}],recent:[fixture],top:[fixture]};remember(state.home.trending);',context);
 return {context,document,calls,run:s=>vm.runInContext(s,context)};
}
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
test('home binds overlay arrows and switches the featured anime',async()=>{const t=setup();await t.run('render()');assert.equal(t.document.querySelectorAll('.catalog-rail .rail-arrow').length,6);assert.equal(t.document.querySelector('.hero h1').textContent,'Anime & teste');t.document.querySelector('[data-hero-step="1"]').onclick();assert.equal(t.document.querySelector('.hero h1').textContent,'Segundo anime');});
test('registration shows celestial dragon and submits real API request',async()=>{const t=setup();await t.run("location.hash='#cadastro';render()");assert.ok(t.document.querySelector('.celestial-dragon .celestial-art'));assert.equal(t.document.querySelectorAll('[data-avatar]').length,0);assert.equal(t.document.querySelector('.auth-dragon'),null);t.document.querySelector('#auth-name').value='Testador';t.document.querySelector('#auth-email').value='test@example.com';t.document.querySelector('#auth-password').value='uma-senha-longa-123';t.document.querySelector('#auth-confirm').value='uma-senha-longa-123';const form=t.document.querySelector('#auth-form');await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(t.run('state.user.id'),'u1');assert.ok(t.calls.some(x=>x.path==='/api/auth/register'&&x.options.method==='POST'));});
test('details binds episode previews, recommendations and community controls',async()=>{const t=setup();await t.run('openDetails(1)');await settle();assert.ok(t.document.querySelector('.detail-backdrop img'));assert.equal(t.document.querySelectorAll('[data-episode]').length,2);assert.ok(t.document.querySelector('.episode-preview img'));assert.equal(t.document.querySelectorAll('.similar-grid .card').length,1);assert.equal(t.document.querySelectorAll('[data-reaction]').length,2);assert.ok(t.document.querySelector('.comment-login'));});

test('detail window has a persistent return control that closes and restores the page',async()=>{const t=setup();await t.run('render();openDetails(1)');await settle();assert.ok(t.document.querySelector('.modal-navigation #modal-back'));assert.equal(t.document.querySelector('#mclose'),null);assert.equal(t.document.querySelector('#back-episodes'),null);t.document.querySelector('#modal-back').onclick();assert.equal(t.document.querySelector('.modal'),null);assert.equal(t.document.querySelector('#app').inert,false);});

test('internal page return falls back to home on a direct link',async()=>{const t=setup();await t.run("location.hash='#library';render()");assert.ok(t.document.querySelector('#page-back'));t.document.querySelector('#page-back').onclick();assert.equal(t.run('location.hash'),'#home');});

test('header menu and search expose their state and restore focus on closing',async()=>{
 const t=setup();await t.run('render()');
 const header=t.document.querySelector('.site-header'),menu=t.document.querySelector('#mobile-menu-toggle'),search=t.document.querySelector('#header-search-toggle');
 menu.onclick();assert.equal(menu.getAttribute('aria-expanded'),'true');assert.equal(header.classList.contains('menu-open'),true);
 search.onclick();assert.equal(search.getAttribute('aria-expanded'),'true');assert.equal(header.classList.contains('search-open'),true);
 assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(t.document.activeElement.id,'global-search');
 t.document.querySelector('#header-search-close').onclick();assert.equal(search.getAttribute('aria-expanded'),'false');assert.equal(t.document.activeElement,search);
 menu.onclick();search.onclick();header.onkeydown({key:'Escape'});
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
