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
test('public subtitle API forwards the requested region into the provider configuration',async t=>{
 let requested=false;
 t.mock.method(globalThis,'fetch',async url=>{
  const u=new URL(url);
  if(u.hostname==='api.themoviedb.org')return Response.json({id:127532,name:'Solo Leveling',genres:[{id:16}],origin_country:['JP'],adult:false,external_ids:{imdb_id:'tt21209876'}});
  const config=JSON.parse(decodeURIComponent(u.pathname.split('/')[1]));assert.deepEqual(config.languages,['spa','eng']);requested=true;
  if(u.pathname.endsWith('manifest.json'))return Response.json({types:['series'],resources:['subtitles'],idPrefixes:['tt']});
  return Response.json({subtitles:[{url:'https://captions.example/es.srt',lang:'spa'}]});
 });
 const response=await worker.fetch(new Request('https://anime.test/api/subtitles?id=127532&season=1&episode=1&locale=es-MX'),{TMDB_API_KEY:'regional-test-key'},{});
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.subtitles?.[0]?.language,'es');assert.equal(requested,true);
});
test('leaving always mutes, pauses, detaches HLS and clears media even if the engine throws',()=>{
 const calls=[];const video={muted:false,autoplay:true,srcObject:{},pause(){calls.push('pause');},removeAttribute(name){calls.push('remove '+name);},querySelectorAll(){return [{remove(){calls.push('track removed');}}];},load(){calls.push('load');}};
 disposeMedia(video,{stopLoad(){throw Error('broken engine');},detachMedia(){calls.push('detach');},destroy(){calls.push('destroy');}});
 assert.equal(video.muted,true);assert.equal(video.autoplay,false);assert.equal(video.srcObject,null);
 assert.deepEqual(calls,['pause','detach','destroy','remove src','track removed','load']);
});
