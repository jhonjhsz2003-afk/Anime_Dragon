import {createOpeningSkip} from '../web/js/opening-skip.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import {chooseCaption} from '../web/js/caption-language.js';
import {mergeCaptions} from '../web/js/captions.js';
import {disposeMedia} from '../web/js/media-lifecycle.js';
import {preferredAlternative,createPlaybackRecovery} from '../web/js/playback-watchdog.js';
import {playbackSourceLabel} from '../web/js/player.js';

const settle=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
function fixture(overrides={},externalDiscussion=false){
  const {window,document}=parseHTML(`<html><body><div id="player"></div>${externalDiscussion?'<section id="discussion" hidden></section>':''}</body></html>`);
  const calls={episodes:[],comments:[],progress:[],captions:[],revoked:[],closed:0,plays:0};
  const media=window.HTMLElement.prototype;
  Object.defineProperties(media,{
    paused:{configurable:true,get(){return this._paused!==false;}},
    currentTime:{configurable:true,get(){return this._currentTime||0;},set(value){this._currentTime=value;}},
    duration:{configurable:true,get(){return 120;}},
    textTracks:{configurable:true,get(){return this._tracks||[];}},
  });
  media.load=function(){this.currentTime=0;this.error=null;};
  media.pause=function(){this._paused=true;this.dispatchEvent(new window.Event('pause'));};
  media.play=function(){calls.plays++;this._paused=false;this.dispatchEvent(new window.Event('playing'));return Promise.resolve();};
  media.canPlayType=()=>'';media.scrollIntoView=function(){};media.focus=function(){};
  const createElement=document.createElement.bind(document);
  document.createElement=name=>{const el=createElement(name);if(name==='track')el.track={mode:'disabled'};return el;};
  let seq=0;const timers=new Map();
  const context=vm.createContext({window,document,MutationObserver:window.MutationObserver,AbortController,Blob,chooseCaption,mergeCaptions,disposeMedia,preferredAlternative,createPlaybackRecovery,createOpeningSkip,console,Date,
    URL:{createObjectURL:()=>`blob:caption-${++seq}`,revokeObjectURL:value=>calls.revoked.push(value)},
    setTimeout:(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
    createPlaybackWatchdog:()=>({start(){},stop(){},progress(){}}),
    readCaption:async(src,signal)=>{calls.captions.push({src,signal});return 'WEBVTT\n\n00:00.000 --> 00:02.000\nOlá';},
  });
  let code=readFileSync(new URL('../web/js/player.js',import.meta.url),'utf8').replace(/^import.*\r?\n/gm,'').replace(/^export /gm,'');
  vm.runInContext(code,context);
  const options={title:'Anime & teste',poster:'/poster.svg',season:1,episode:1,autoplay:false,
    episodes:[{episode_number:1,name:'Primeira história'},{episode_number:2,name:'Próximo capítulo'},{episode_number:3,name:'Ainda não chegou',air_date:'2099-01-01'}],
    loadSource:async()=>({streams:[{url:'https://video.test/first.mp4',type:'video/mp4',label:'Vídeo original'},{url:'https://video.test/second.mp4',type:'video/mp4',label:'1080p'}],complete:true}),
    loadCommunity:async()=>({total:12,comments:[],progress:[]}),loadHls:async()=>{},
    onProgress:(...args)=>calls.progress.push(args),onActivity:async()=>{},onEnded:async()=>{},onMutation:async()=>{},
    onEpisode:episode=>calls.episodes.push(episode),onComments:payload=>{calls.comments.push(payload);const panel=document.querySelector('#discussion');panel.hidden=!panel.hidden;},onClose:()=>calls.closed++,
    ...overrides,
  };
  context.host=document.querySelector('#player');context.options=options;
  const controller=vm.runInContext('mountWatchPlayer(host,options)',context);
  const q=selector=>document.querySelector(selector);
  const fire=(selector,type='click')=>q(selector).dispatchEvent(new window.Event(type,{bubbles:true}));
  const choose=(selector,value)=>{Object.defineProperty(q(selector),'value',{configurable:true,value});fire(selector,'change');};
  return {q,fire,choose,calls,controller,window,document,timers,
    runControlsTimer(){for(const [id,job] of [...timers])if(job.delay===2600){timers.delete(id);job.fn();}},
  };
}

test('source labels describe supplied video metadata without inventing audio variants',()=>{
  assert.equal(playbackSourceLabel({label:'1080p'}),'1080p');
  assert.equal(playbackSourceLabel({},1),'Vídeo 2');
  assert.equal(playbackSourceLabel({label:'  '}),'Vídeo 1');
});

test('mounted player loads episode opening independently and cleans up its overlay on source change',async()=>{
  const requests=[],f=fixture({loadOpening:async options=>{requests.push(options);return {opening:{start:35.25,end:125.5,episodeLength:1420}};}});try{
    await settle();const video=f.q('video');Object.defineProperty(video,'duration',{get:()=>1420});Object.defineProperty(video,'readyState',{get:()=>4});video.playbackRate=1;
    assert.equal(f.q('[data-opening-skip]').hidden,true);f.fire('video','loadedmetadata');await settle();assert.equal(requests.length,1);assert.equal(requests[0].duration,1420);
    video.currentTime=35.25;f.fire('video','timeupdate');assert.equal(f.q('[data-opening-skip]').hidden,false);
    f.fire('[data-opening-skip]');assert.equal(video.currentTime,125.5);assert.equal(f.q('[data-opening-skip]').hidden,true);
    video.currentTime=40;f.fire('video','timeupdate');assert.equal(f.q('[data-opening-skip]').hidden,false);
    f.choose('#watch-source','1');assert.equal(f.q('[data-opening-skip]').hidden,true);f.controller.destroy();assert.equal(f.timers.size,0);
  }finally{f.controller.destroy();}
});

test('player exposes real comments count, close callback and a collapsed episode list',async()=>{
  const f=fixture();try{
    await settle();
    assert.equal(f.q('.watch-heading h2').textContent,'Anime & teste');
    assert.match(f.q('.watch-heading p').textContent,/^EP\.1 — Primeira história/);
    assert.equal(f.q('#watch-episode-panel').hidden,true);
    f.fire('[data-episodes-toggle]');
    assert.equal(f.q('#watch-episode-panel').hidden,false);
    assert.equal(f.q('[data-episodes-toggle]').getAttribute('aria-expanded'),'true');
    assert.equal(f.q('[data-episode="3"]').disabled,true);
    f.fire('[data-next]');assert.deepEqual(f.calls.episodes,[2]);
    assert.equal(f.q('[data-comment-count]').textContent,'12');
    assert.equal(f.q('#discussion').hidden,true);
    f.fire('[data-comments]');assert.equal(f.q('#discussion').hidden,false);
    assert.equal(f.calls.comments[0].count,12);assert.equal(f.calls.comments[0].episode,1);
    f.fire('[data-player-close]');assert.equal(f.calls.closed,1);
  }finally{f.controller.destroy();}
});

test('controls hide after playback inactivity and remain visible for pause and open settings',async()=>{
  const f=fixture();try{
    await settle();
    assert.equal(f.q('[data-play]').getAttribute('aria-label'),'Pausar');
    f.runControlsTimer();assert.equal(f.q('.watch-screen').classList.contains('controls-hidden'),true);
    f.fire('.watch-screen','pointermove');assert.equal(f.q('.watch-screen').classList.contains('controls-hidden'),false);
    f.fire('[data-settings]');assert.equal(f.q('.watch-settings-panel').hidden,false);
    f.runControlsTimer();assert.equal(f.q('.watch-screen').classList.contains('controls-hidden'),false);
    f.fire('[data-settings-close]');f.fire('[data-play]');
    assert.equal(f.q('video').paused,true);assert.equal(f.q('.watch-center').hidden,false);
    f.runControlsTimer();assert.equal(f.q('.watch-screen').classList.contains('controls-hidden'),false);
  }finally{f.controller.destroy();}
});

test('an existing discussion panel is reused without duplicate ids or interrupting playback',async()=>{
  const f=fixture({},true);try{
    await settle();const video=f.q('video');
    assert.equal(f.document.querySelectorAll('#discussion').length,1);
    f.fire('[data-comments]');await settle();
    assert.equal(f.q('#discussion').hidden,false);assert.equal(f.q('video'),video);assert.equal(video.paused,false);
    assert.equal(f.q('[data-comments]').getAttribute('aria-expanded'),'true');
    f.fire('[data-comments]');await settle();
    assert.equal(f.q('#discussion').hidden,true);assert.equal(f.q('[data-comments]').getAttribute('aria-expanded'),'false');
  }finally{f.controller.destroy();}
});

test('switching video preserves position and speed while skip remains bounded by duration',async()=>{
  const f=fixture();try{
    await settle();const video=f.q('video');
    video.currentTime=47;f.choose('#watch-speed','1.5');assert.equal(video.playbackRate,1.5);
    assert.equal(video.defaultPlaybackRate,1.5);
    f.choose('#watch-source','1');await settle();video.dispatchEvent(new f.window.Event('loadedmetadata'));
    assert.equal(video.src,'https://video.test/second.mp4');assert.equal(video.currentTime,47);assert.equal(video.playbackRate,1.5);
    video.currentTime=118;f.fire('[data-skip="10"]');assert.equal(video.currentTime,120);
    video.currentTime=3;f.fire('[data-skip="-10"]');assert.equal(video.currentTime,0);
    assert.ok(f.calls.progress.some(([position])=>position===47));
  }finally{f.controller.destroy();}
});

test('manual captions can be enabled with auto captions disabled and removed without stopping video',async()=>{
  const f=fixture({autoCaptions:false,loadSubtitles:async()=>({subtitles:[{src:'https://subtitle.test/pt.vtt',language:'pt-BR',label:'Português'}]})});try{
    await settle();assert.equal(f.q('#watch-caption').disabled,false);assert.equal(f.calls.captions.length,0);
    f.choose('#watch-caption','https://subtitle.test/pt.vtt');await settle();
    assert.equal(f.q('video track').track.mode,'showing');assert.equal(f.calls.captions.length,1);
    assert.equal(f.q('video').paused,false);
    f.choose('#watch-caption','off');
    assert.equal(f.q('video track'),null);assert.equal(f.q('video').paused,false);
    assert.equal(f.calls.revoked.length,1);
  }finally{f.controller.destroy();}
});

test('external captions start disabled unless automatic captions were explicitly enabled',async()=>{
  const subtitles=[{src:'https://subtitle.test/pt.vtt',language:'pt-BR',label:'Português'}];
  for(const autoCaptions of [undefined,false,true]){
    const f=fixture({autoCaptions,loadSubtitles:async()=>({subtitles})});try{
      await settle();
      assert.equal(f.q('#watch-caption').value,autoCaptions===true?'auto':'off');
      assert.equal(f.calls.captions.length,autoCaptions===true?1:0);
      assert.equal(!!f.q('video track'),autoCaptions===true);
      assert.equal(f.q('video').paused,false);
    }finally{f.controller.destroy();}
  }
});

test('destroy silences the video, releases captions and ignores delayed provider updates',async()=>{
  let update;const f=fixture({loadSource:async({onUpdate})=>{update=onUpdate;return {streams:[{url:'https://video.test/first.mp4',type:'video/mp4'}],complete:false};}});
  await settle();f.controller.destroy();
  assert.equal(f.q('video').muted,true);assert.equal(f.q('video').paused,true);assert.equal(f.q('video').getAttribute('src'),null);
  update({streams:[{url:'https://video.test/late.mp4'}],complete:true});await settle();
  assert.equal(f.q('video').getAttribute('src'),null);assert.equal(f.timers.size,0);
});

function hlsFixture(overrides={}){
 let current;
 class Hls {
  static Events={ERROR:'error',MANIFEST_PARSED:'manifest',LEVEL_LOADED:'level',FRAG_LOADED:'fragment',SUBTITLE_TRACKS_UPDATED:'subtitles'};
  static isSupported(){return true;}
  constructor(){this.handlers=new Map();current=this;}
  on(event,callback){const list=this.handlers.get(event)||[];list.push(callback);this.handlers.set(event,list);}
  emit(event,data){for(const callback of this.handlers.get(event)||[])callback(event,data);}
  loadSource(url){this.url=url;}
  attachMedia(video){this.video=video;}
  destroy(){this.destroyed=true;}
 }
 const f=fixture({loadSource:async()=>({streams:[{url:'https://video.test/episode.m3u8',type:'application/vnd.apple.mpegurl'},{url:'https://video.test/alternate.mp4',type:'video/mp4'}],complete:true}),...overrides});f.window.Hls=Hls;
 return {...f,get hls(){return current;}};
}

test('HLS waits for its manifest before play and repeated manifest events never restart the episode',async()=>{
 const f=hlsFixture();try{
  await settle();assert.equal(f.calls.plays,0);assert.ok(f.hls);
  f.hls.emit('manifest');await settle();assert.equal(f.calls.plays,1);
  f.hls.emit('manifest');await settle();assert.equal(f.calls.plays,1);
 }finally{f.controller.destroy();}
});

test('an obsolete native error event without a media error cannot discard a playing source',async()=>{
 const f=fixture();try{await settle();f.q('video').error=null;f.fire('video','error');await settle();assert.equal(f.q('video').src,'https://video.test/first.mp4');assert.equal(f.calls.plays,1);}finally{f.controller.destroy();}
});

test('HLS engine fallback ignores late native errors while the alternative engine is loading',async()=>{
 let finish;const loaded=[];
 const f=hlsFixture({loadShaka:()=>new Promise(resolve=>finish=resolve)});try{
  await settle();f.hls.emit('error',{fatal:true,type:'mediaError'});await settle();assert.equal(typeof finish,'function');
  f.q('video').error={code:4};f.fire('video','error');await settle();assert.equal(f.calls.plays,0);assert.notEqual(f.q('video').src,'https://video.test/alternate.mp4');
  class Player{static isBrowserSupported(){return true;}async attach(){}addEventListener(){}async load(url){loaded.push(url);}async destroy(){}}
  f.window.shaka={Player};finish();await settle();assert.deepEqual(loaded,['https://video.test/episode.m3u8']);assert.equal(f.calls.plays,1);
 }finally{f.controller.destroy();}
});

async function runRetry(f,delay){const job=[...f.timers].find(([,row])=>row.delay===delay);assert.ok(job,`retry ${delay} scheduled`);f.timers.delete(job[0]);job[1].fn();await settle();}

test('an empty initial provider response renews automatically and starts the next available video',async()=>{
 const requests=[];const f=fixture({loadSource:async options=>{requests.push(options);return requests.length===1?{streams:[],complete:true}:{streams:[{url:'https://video.test/renewed.mp4',type:'video/mp4'}],complete:true};}});try{
  await settle();assert.equal(requests.length,1);assert.equal(f.q('[data-overlay-retry]').hidden,true);assert.match(f.q('[data-message-title]').textContent,/automaticamente/);
  await runRetry(f,900);assert.equal(requests.length,2);assert.equal(requests[1].fresh,true);assert.equal(f.q('video').src,'https://video.test/renewed.mp4');assert.equal(f.q('video').paused,false);
 }finally{f.controller.destroy();}
});

test('a failed metadata request recovers without a manual press and cancels obsolete attempts',async()=>{
 const requests=[];const f=fixture({loadSource:async options=>{requests.push(options);if(requests.length===1)throw Error('temporary outage');return {streams:[{url:'https://video.test/recovered.mp4',type:'video/mp4'}],complete:true};}});try{
  await settle();assert.equal(f.q('[data-overlay-retry]').hidden,true);assert.equal(requests[0].signal.aborted,true);await runRetry(f,900);assert.equal(f.q('video').src,'https://video.test/recovered.mp4');assert.equal(f.calls.plays,1);
 }finally{f.controller.destroy();}
});

test('three empty attempts exhaust one recovery and then expose the manual retry button',async()=>{
 let attempts=0;const f=fixture({loadSource:async()=>{attempts++;return {streams:[],complete:true};}});try{
  await settle();await runRetry(f,900);assert.equal(f.q('[data-overlay-retry]').hidden,true);await runRetry(f,2400);assert.equal(attempts,3);assert.equal(f.q('[data-overlay-retry]').hidden,false);assert.match(f.q('[data-message]').textContent,/3 tentativa/);assert.equal(f.timers.size,0);
 }finally{f.controller.destroy();}
});

test('closing while an automatic retry waits cancels the episode request and scheduled retry',async()=>{
 const requests=[];const f=fixture({loadSource:async options=>{requests.push(options);return {streams:[],complete:true};}});await settle();f.controller.destroy();await settle();assert.equal(requests.length,1);assert.equal(requests[0].signal.aborted,true);assert.equal(f.timers.size,0);
});

test('native embedded captions and HLS automatic captions remain disabled by default',async()=>{
 const f=hlsFixture();try{
  await settle();assert.equal(f.hls.subtitleDisplay,false);assert.equal(f.hls.subtitleTrack,-1);f.hls.subtitleDisplay=true;f.hls.subtitleTrack=0;f.hls.emit('subtitles');assert.equal(f.hls.subtitleDisplay,false);assert.equal(f.hls.subtitleTrack,-1);
  const native={kind:'subtitles',mode:'showing'},captions={kind:'captions',mode:'showing'},metadata={kind:'metadata',mode:'hidden'};f.q('video')._tracks=[native,captions,metadata];f.fire('video','loadedmetadata');assert.equal(native.mode,'disabled');assert.equal(captions.mode,'disabled');assert.equal(metadata.mode,'hidden');
 }finally{f.controller.destroy();}
});

test('a browser autoplay policy leaves the ready video waiting for a click beyond the recovery deadline',async()=>{
 const f=fixture();try{
  f.q('video').play=async()=>{throw Object.assign(Error('gesture needed'),{name:'NotAllowedError'});};await settle();assert.equal(f.q('.watch-center').hidden,false);assert.match(f.q('.watch-status').textContent,/toque em reproduzir/);assert.equal([...f.timers.values()].some(job=>job.delay===45000),false);assert.equal(f.q('[data-overlay-retry]').hidden,true);
 }finally{f.controller.destroy();}
});

test('a slow provider metadata deadline does not discard an already loading valid HLS source',async()=>{
 const f=hlsFixture({loadSource:async({onUpdate})=>{onUpdate({streams:[{url:'https://video.test/episode.m3u8',type:'application/vnd.apple.mpegurl'}],complete:false});throw Error('another provider timed out');}});try{
  await settle();assert.ok(f.hls);assert.equal([...f.timers.values()].some(job=>job.delay===900),false);f.hls.emit('manifest');await settle();assert.equal(f.calls.plays,1);assert.equal(f.q('video').paused,false);
 }finally{f.controller.destroy();}
});
