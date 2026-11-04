import test from 'node:test';
import assert from 'node:assert/strict';
import {releasesPage,mountReleases,releaseDay} from '../web/js/releases.js';
const {parseHTML}=await import(process.env.ANIMEDRAGON_DOM_MODULE||'linkedom');
const now=()=>new Date('2026-10-07T15:00:00Z');
const event=(id,kind='episode',date='2026-10-08',extra={})=>({key:`${id}:${kind}:${date}`,kind,air_date:date,season_number:kind==='series'?null:2,episode_number:kind==='episode'?5:null,episode_name:'O próximo capítulo',anime:{id,title:`Anime ${id}`,backdrop_path:'/back.jpg'},...extra});
function setup(t,{api=async()=>({items:[event(1,'series'),event(2,'season'),event(3)],asOf:'2026-10-07',page:1,hasMore:false}),clock=now}={}){
 const {document}=parseHTML(`<html><body><div id="page-content">${releasesPage()}</div></body></html>`),calls=[],opened=[],remembered=[];
 const controller=mountReleases(document.querySelector('#page-content'),{api:async path=>{calls.push(path);return api(path);},now:clock,onOpen:entry=>opened.push(entry),remember:items=>remembered.push(...items)});t.after(()=>controller.destroy());
 return {document,controller,calls,opened,remembered};
}
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
test('public releases show only valid future dates and never invent T/EP for unknown premieres',async t=>{
 const ui=setup(t,{api:async()=>({items:[event(1,'series'),event(2),event(3,'episode','2026-10-07'),event(4,'episode','2026-10-06'),event(5,'episode','2026-02-30')],asOf:'2026-10-07',page:1,hasMore:false})});await ui.controller.ready;
 assert.equal(ui.document.querySelectorAll('[data-release-key]').length,2);assert.equal(ui.document.querySelector('input[type=password]'),null);assert.equal(ui.calls[0],'/api/catalog/releases?page=1&summary=1');
 const premiere=ui.document.querySelector('[data-release-key="1:series:2026-10-08"]');assert.match(premiere.textContent,/Primeira estreia/);assert.doesNotMatch(premiere.textContent,/T1|EP\.1|Assistir/);assert.match(premiere.textContent,/Ver anime/);
 assert.equal(ui.document.querySelector('.release-day-heading h2').textContent,'8 de outubro de 2026');assert.equal(ui.document.querySelector('.release-art img').getAttribute('loading'),'lazy');assert.match(ui.document.querySelector('.release-art img').src,/\/w500\//);
});
test('type filters stay local and the selected event opens the correct anime',async t=>{
 const ui=setup(t);await ui.controller.ready;ui.document.querySelector('[data-release-kind="season"]').onclick();assert.equal(ui.document.querySelectorAll('[data-release-key]').length,1);assert.equal(ui.calls.length,1);
 assert.equal(ui.document.querySelector('[data-release-kind="season"]').getAttribute('aria-pressed'),'true');ui.document.querySelector('[data-release-key]').onclick();assert.equal(ui.opened[0].anime.id,2);assert.equal(ui.opened[0].season_number,2);assert.equal(ui.remembered.length,3);
 ui.document.querySelector('[data-release-kind="all"]').onclick();assert.equal(ui.document.querySelectorAll('[data-release-key]').length,3);
});
test('more dates merge pages without duplicate cards and large lists render in batches',async t=>{
 let page=0;const ui=setup(t,{api:async()=>++page===1?{items:[event(1,'series','2026-10-10')],page:1,hasMore:true}:{items:[event(1,'series','2026-10-10'),event(2,'episode','2026-10-09')],page:2,hasMore:false}});await ui.controller.ready;
 ui.document.querySelector('[data-releases-more]').onclick();await settle();assert.equal(ui.calls.length,2);assert.equal(ui.document.querySelectorAll('[data-release-key]').length,2);assert.equal(ui.document.querySelector('[data-release-key]').dataset.releaseKey,'2:episode:2026-10-09');
 assert.equal(ui.document.querySelector('[data-releases-more]').hidden,true);
 const large=setup(t,{api:async()=>({items:Array.from({length:60},(_,i)=>event(i+1)),page:1,hasMore:false})});await large.controller.ready;assert.equal(large.document.querySelectorAll('[data-release-key]').length,48);large.document.querySelector('[data-releases-more]').onclick();assert.equal(large.document.querySelectorAll('[data-release-key]').length,60);assert.equal(large.calls.length,1);
});
test('failed updates allow retry without substituting already aired catalog titles',async t=>{
 let attempts=0;const ui=setup(t,{api:async()=>{if(++attempts<=2)throw Error('Sem conexão agora.');return {items:[event(1)],page:1,hasMore:false};}});await ui.controller.ready;
 assert.equal(ui.document.querySelectorAll('[data-release-key]').length,0);assert.match(ui.document.querySelector('[data-releases-status]').textContent,/Sem conexão/);assert.equal(ui.document.querySelector('[data-releases-retry]').hidden,false);
 ui.document.querySelector('[data-releases-retry]').onclick();await settle();assert.equal(ui.document.querySelectorAll('[data-release-key]').length,1);assert.equal(ui.document.querySelector('[data-releases-retry]').hidden,true);
});
test('destroyed views ignore late responses and midnight removes stale future entries',async t=>{
 let finish;const ui=setup(t,{api:()=>new Promise(resolve=>finish=resolve)});const snapshot=ui.document.querySelector('.releases-view').innerHTML;ui.controller.destroy();finish({items:[event(1)],hasMore:false});await ui.controller.ready;assert.equal(ui.document.querySelector('.releases-view').innerHTML,snapshot);
 let time=new Date('2026-10-08T02:59:00Z');assert.equal(releaseDay(time),'2026-10-07');const rollover=setup(t,{clock:()=>time});await rollover.controller.ready;const oldButton=rollover.document.querySelector('[data-release-key]');time=new Date('2026-10-08T03:00:00Z');oldButton.onclick();assert.equal(rollover.opened.length,0);rollover.document.querySelector('[data-release-kind="all"]').onclick();assert.equal(rollover.document.querySelectorAll('[data-release-key]').length,0);
});
test('titles and episode names are escaped and unsupported image URLs are not embedded',async t=>{
 const ui=setup(t,{api:async()=>({items:[event(1,'episode','2026-10-08',{episode_name:'<script>bad()</script>',anime:{id:1,title:'<img src=x onerror=bad()>',poster_path:'javascript:bad()'}})],hasMore:false})});await ui.controller.ready;
 assert.equal(ui.document.querySelector('script'),null);assert.equal(ui.document.querySelector('[onerror]'),null);assert.equal(ui.document.querySelector('.release-art img').src,'/assets/poster-placeholder.svg');assert.match(ui.document.querySelector('.release-title').textContent,/<img/);
});
test('summary cards appear while details load and stay interactive without duplicate premieres',async t=>{
 let finish;const seed=event(41,'series'),ui=setup(t,{api:path=>path.includes('summary=1')?Promise.resolve({items:[seed],summary:true,phase:'summary',page:1,hasMore:false}):new Promise(resolve=>finish=resolve)});await settle();
 assert.equal(ui.document.querySelectorAll('[data-release-key]').length,1);assert.match(ui.document.querySelector('[data-releases-status]').textContent,/Consultando detalhes/);ui.document.querySelector('[data-release-key]').onclick();assert.equal(ui.opened[0].anime.id,41);
 ui.document.querySelector('[data-release-kind="season"]').onclick();assert.equal(ui.document.querySelectorAll('[data-release-key]').length,0);
 finish({items:[{...seed,key:'41:series:1:1:2026-10-08',season_number:1,episode_number:1},event(42,'season')],partial:true,resolvedIds:[41,42],page:1,hasMore:false});await ui.controller.ready;
 assert.equal(ui.document.querySelector('[data-release-kind="season"]').getAttribute('aria-pressed'),'true');assert.equal(ui.document.querySelectorAll('[data-release-key]').length,1);ui.document.querySelector('[data-release-kind="all"]').onclick();assert.equal(ui.document.querySelectorAll('[data-release-key]').length,2);
 assert.deepEqual(ui.calls,['/api/catalog/releases?page=1&summary=1','/api/catalog/releases?page=1']);
});
test('failed enrichment retains summary cards and retry keeps them visible until authoritative replacement',async t=>{
 let attempts=0,finish;const seed=event(51,'series'),ui=setup(t,{api:async path=>{if(path.includes('summary=1'))return {items:[seed],summary:true,page:1,hasMore:false};if(++attempts===1)throw Error('Os episódios não responderam.');return new Promise(resolve=>finish=resolve);}});await ui.controller.ready;
 const first=ui.document.querySelector('[data-release-key]');assert.ok(first);assert.match(ui.document.querySelector('[data-releases-status]').textContent,/não responderam/);assert.equal(ui.document.querySelector('[data-releases-retry]').hidden,false);
 ui.document.querySelector('[data-releases-retry]').onclick();await settle();assert.equal(ui.document.querySelector('[data-release-key]'),first,'unchanged preview cards keep their image nodes and focus');
 finish({items:[event(52)],partial:true,resolvedIds:[51,52],page:1,hasMore:false});await settle();assert.equal(ui.document.querySelectorAll('[data-release-key]').length,1);assert.equal(ui.document.querySelector('[data-release-key]').dataset.releaseKey,'52:episode:2026-10-08');
});
