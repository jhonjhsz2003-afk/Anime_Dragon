import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const {parseHTML}=await import(process.env.ANIMEDRAGON_DOM_MODULE||'linkedom');
const source=readFileSync(new URL('../web/js/app.js',import.meta.url),'utf8');
const detailCode=source.slice(source.indexOf('let detailHeaderObserver='),source.indexOf('async function openPlayer('));
const keyboardCode=source.split(/\r?\n/).find(line=>line.startsWith("document.addEventListener('keydown'"));
const item={id:7,title:'História de teste',overview:'Uma história para explorar.',first_air_date:'2026-01-01',number_of_episodes:1500,backdrop_path:'/back.jpg',genres:[],seasons:[{season_number:1,episode_count:1500}]};
const episodes=Array.from({length:1500},(_,index)=>({episode_number:index+1,name:`Aventura ${index+1}`,air_date:'2026-01-01',still_path:'/episode.jpg',runtime:24}));
function setup({anime=item,entries=episodes,apiOverride}={}){
 const {window,document}=parseHTML('<html><body><div id="app"><header class="site-header"><a href="#home">Início</a></header><main class="main"><button id="original-focus">Abrir anime</button></main></div><div id="modal-root"></div></body></html>');
 let focused=null;Object.defineProperty(document,'activeElement',{get:()=>focused});window.HTMLElement.prototype.focus=function(){focused=this};
 const state={details:null,episodes:[],watched:[],history:[],prefs:{economy:false}},calls=[];
 const playback=async()=>({});playback.prepare=async()=>({});
 const context=vm.createContext({document,navigator:{connection:{}},state,Date,Intl,console,setTimeout,clearTimeout,loadPlayback:playback,modalVersion:0,seasonVersion:0,discussionController:null,watchController:null,detailTrail:[],focusBeforeModal:null,
  $:(selector,root=document)=>root.querySelector(selector),$$:(selector,root=document)=>[...root.querySelectorAll(selector)],
  esc:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
  img:(path,size)=>`https://image.tmdb.org/t/p/${size}${path}`,icon:()=>'<svg aria-hidden="true"></svg>',year:p=>p.first_air_date?.slice(0,4)||'—',rating:()=>8,
  empty:(title,text='',buttons='')=>`<div class="empty">${title} ${text} ${buttons}</div>`,remember(){},bindCards(){},bindDetailTabs(){},mountCommunity(){},loadSimilar(){},enrichDetails(){},shareAnime(){},openPlayer:episode=>calls.push({play:episode}),toggleWatched(){},
  api:async path=>{calls.push({path});const override=apiOverride?.(path);if(override!==undefined)return override;return path.includes('/season/')?{season:{episodes:entries}}:{item:anime};}
 });
 vm.runInContext(detailCode,context);vm.runInContext(keyboardCode,context);
 return {document,window,state,calls,run:code=>vm.runInContext(code,context)};
}
test('detail page keeps navigation active, while the player isolates the app and closing restores focus',async()=>{
 const t=setup();t.document.querySelector('#original-focus').focus();await t.run('openDetails(7)');
 assert.equal(t.document.querySelector('#app').inert,false);assert.equal(t.document.querySelector('.main').inert,true);assert.equal(t.document.querySelector('.site-header').inert,undefined);
 assert.equal(t.document.querySelector('.detail-modal').getAttribute('role'),'region');assert.equal(t.document.querySelector('.detail-modal').hasAttribute('aria-modal'),false);
 t.run('setModal(`<h2 id="detail-title">Player</h2>`,true)');assert.equal(t.document.querySelector('#app').inert,true);assert.equal(t.document.querySelector('.watch-modal').getAttribute('aria-modal'),'true');
 t.run('closeModal()');assert.equal(t.document.querySelector('#app').inert,false);assert.equal(t.document.querySelector('.main').inert,false);assert.equal(t.document.activeElement.id,'original-focus');
});
test('one populated season hides the season selector, without losing specials',async()=>{
 const t=setup({anime:{...item,seasons:[{season_number:1,episode_count:1500},{season_number:2,episode_count:0}]}});await t.run('openDetails(7)');assert.equal(t.document.querySelector('#season-select'),null);assert.equal(t.document.querySelector('.season-controls'),null);
 const special=setup({anime:{...item,seasons:[{season_number:0,episode_count:2},{season_number:1,episode_count:1500}]}});await special.run('openDetails(7)');assert.equal(special.document.querySelector('#season-select'),null);assert.equal(special.document.querySelectorAll('[data-season-choice]').length,2);
 await special.document.querySelector('[data-season-choice="0"]').onclick();assert.equal(special.state.season,0);assert.equal(special.document.querySelector('[data-season-choice="0"]').getAttribute('aria-pressed'),'true');
});
test('large seasons render in bounded batches and search finds episodes outside those batches',async()=>{
 const t=setup();await t.run('openDetails(7)');assert.equal(t.document.querySelectorAll('[data-episode]').length,40);assert.match(t.document.querySelector('.episode-count').textContent,/1500/);
 const image=t.document.querySelector('.episode-preview img');assert.match(image.src,/\/w500\//);assert.match(image.getAttribute('srcset'),/w300.*w780/);assert.equal(image.getAttribute('loading'),'lazy');
 t.document.querySelector('#episodes-more').onclick();assert.equal(t.document.querySelectorAll('[data-episode]').length,80);assert.equal(t.document.activeElement.dataset.episode,'41');
 t.document.querySelector('#episode-search').value='EP.1499';t.run('renderEpisodes()');assert.equal(t.document.querySelectorAll('[data-episode]').length,1);assert.equal(t.document.querySelector('[data-episode]').dataset.episode,'1499');assert.equal(t.document.querySelector('#episodes-more'),null);
 t.document.querySelector('#episode-search').value='';t.run('renderEpisodes()');assert.equal(t.document.querySelectorAll('[data-episode]').length,40);
 t.document.querySelector('#episode-order').onclick({currentTarget:t.document.querySelector('#episode-order')});assert.equal(t.document.querySelector('[data-episode]').dataset.episode,'1500');assert.equal(t.document.querySelector('#episode-order').getAttribute('aria-pressed'),'true');
});
test('late season responses cannot replace the latest selected season',async()=>{
 let resolveOld;const t=setup({anime:{...item,seasons:[{season_number:1,episode_count:1},{season_number:2,episode_count:1}]},entries:[episodes[0]],apiOverride:path=>path.endsWith('/season/2')?new Promise(resolve=>resolveOld=resolve):undefined});await t.run('openDetails(7)');assert.ok(t.document.querySelector('#season-select'));
 const pending=t.run('loadSeason(7,2)');await t.run('loadSeason(7,1)');resolveOld({season:{episodes:[{...episodes[0],episode_number:500}]}});await pending;
 assert.equal(t.state.season,1);assert.equal(t.document.querySelector('[data-episode]').dataset.episode,'1');
});
test('continue action respects saved progress and never plays unaired episodes',async()=>{
 const t=setup({entries:[...episodes.slice(0,3),{...episodes[3],air_date:'2999-01-01'}]});t.state.history=[{id:7,season:1,episode:2}];await t.run('openDetails(7)');assert.match(t.document.querySelector('#detail-watch').textContent,/Continuar.*EP\.2/);t.document.querySelector('#detail-watch').onclick();assert.deepEqual(t.calls.at(-1),{play:2});
 t.state.watched=[{season:1,episode:2}];t.run('renderEpisodes()');assert.match(t.document.querySelector('#detail-watch').textContent,/EP\.1/);assert.equal(t.document.querySelector('[data-episode="4"]').disabled,true);assert.equal(t.document.querySelector('[data-watched="4"]').disabled,true);
 const toggle=t.document.querySelector('[data-watched="2"]');toggle.focus();t.run('renderEpisodes()');assert.equal(t.document.activeElement.dataset.watched,'2');assert.notEqual(t.document.activeElement,toggle);
});
test('an open account dialog owns Escape until it closes',async()=>{
 const t=setup({entries:[episodes[0]]});await t.run('openDetails(7)');t.document.body.insertAdjacentHTML('beforeend','<dialog class="account-dialog" open></dialog>');
 let event=new t.window.Event('keydown',{bubbles:true,cancelable:true});event.key='Escape';t.document.dispatchEvent(event);assert.ok(t.document.querySelector('.detail-modal'));assert.equal(event.defaultPrevented,false);
 t.document.querySelector('.account-dialog').remove();event=new t.window.Event('keydown',{bubbles:true,cancelable:true});event.key='Escape';t.document.dispatchEvent(event);assert.equal(t.document.querySelector('.detail-modal'),null);
});
