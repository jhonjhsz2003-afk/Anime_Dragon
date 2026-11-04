import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredCaptionLocale,subtitleLanguages,chooseCaption} from '../web/js/caption-language.js';
import {disposeMedia} from '../web/js/media-lifecycle.js';
import worker from '../worker.js';
test('regional caption matching prefers Brazil or Portugal without selecting an unrelated language',()=>{
 const tracks=[{src:'brazil',language:'pob'},{src:'portugal',language:'por'},{src:'english',language:'eng'}];
 assert.equal(chooseCaption(tracks,'pt-BR').src,'brazil');assert.equal(chooseCaption(tracks,'pt-PT').src,'portugal');
 assert.equal(chooseCaption(tracks,'en-US').src,'english');assert.equal(chooseCaption(tracks,'ja-JP'),undefined);
 assert.equal(chooseCaption(tracks,'pt-BR',new Set(['brazil'])).src,'portugal');
});
test('browser locales and regional provider language codes are normalized and bounded',()=>{
 assert.equal(preferredCaptionLocale(['invalid','es-AR','en-US']),'es-AR');
 assert.deepEqual(subtitleLanguages('pt-PT'),['por','pob','eng']);assert.deepEqual(subtitleLanguages('es-MX'),['spa','eng']);
 assert.deepEqual(subtitleLanguages('zh-Hant-TW'),['zht','chi','eng']);
 assert.deepEqual(subtitleLanguages('https://evil.test'),['pob','por','eng']);
});
test('API de legendas não solicita antigos provedores externos',async t=>{
 let requests=0;
 t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('não deve consultar provedores de legendas')});
 const response=await worker.fetch(new Request('https://anime.test/api/subtitles?id=127532&season=1&episode=1&locale=es-MX'),{TMDB_API_KEY:'regional-test-key'},{});
 const data=await response.json();assert.equal(response.status,200);assert.deepEqual(data.subtitles,[]);assert.equal(requests,0);
});
test('leaving always mutes, pauses, detaches HLS and clears media even if the engine throws',()=>{
 const calls=[];const video={muted:false,autoplay:true,srcObject:{},pause(){calls.push('pause');},removeAttribute(name){calls.push('remove '+name);},querySelectorAll(){return [{remove(){calls.push('track removed');}}];},load(){calls.push('load');}};
 disposeMedia(video,{stopLoad(){throw Error('broken engine');},detachMedia(){calls.push('detach');},destroy(){calls.push('destroy');}});
 assert.equal(video.muted,true);assert.equal(video.autoplay,false);assert.equal(video.srcObject,null);
 assert.deepEqual(calls,['pause','detach','destroy','remove src','track removed','load']);
});
