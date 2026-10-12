import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningSkip,validOpening} from '../web/js/opening-skip.js';

const opening={start:35.25,end:125.5,episodeLength:1420.04};
const settle=async()=>{for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));};
function fixture(load=async()=>({opening})){
  const video=Object.assign(new EventTarget(),{duration:1420.04,currentTime:0,playbackRate:1,paused:false,readyState:4,seeking:false,ended:false,error:null});
  const button=Object.assign(new EventTarget(),{hidden:false}),timers=new Map(),skips=[],focused=[];let seq=0;
  const controller=createOpeningSkip({video,button,load,onSkip:t=>skips.push(t),onFocus:()=>focused.push(true),schedule:(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id;},cancel:id=>timers.delete(id)});
  return {video,button,timers,controller,skips,focused,fire:event=>video.dispatchEvent(new Event(event)),click:()=>button.dispatchEvent(new Event('click'))};
}

test('skip uses only a bounded opening for the actual video duration',()=>{
  assert.deepEqual(validOpening(opening,1420.04),opening);
  for(const bad of [null,{...opening,start:-1},{...opening,end:34},{...opening,end:1500},{...opening,end:NaN},{...opening,start:'35'},{...opening,episodeLength:1400}])assert.equal(validOpening(bad,1420.04),null);
  assert.equal(validOpening(opening,Infinity),null);
});

test('button appears at opening start, seeks exactly to its end and immediately disappears',async()=>{
  const f=fixture();try{
    assert.equal(f.button.hidden,true);f.fire('loadedmetadata');await settle();
    f.video.currentTime=35.249;f.fire('timeupdate');assert.equal(f.button.hidden,true);
    f.video.currentTime=35.25;f.fire('timeupdate');assert.equal(f.button.hidden,false);
    f.click();assert.equal(f.video.currentTime,125.5);assert.equal(f.button.hidden,true);assert.deepEqual(f.skips,[125.5]);assert.equal(f.focused.length,1);
    f.fire('seeked');assert.equal(f.button.hidden,true);f.click();assert.deepEqual(f.skips,[125.5]);
    f.video.currentTime=45;f.fire('seeked');assert.equal(f.button.hidden,false);
    f.video.currentTime=125.5;f.fire('timeupdate');assert.equal(f.button.hidden,true);
  }finally{f.controller.destroy();}assert.equal(f.timers.size,0);
});

test('boundary timer follows playback speed and stops during pauses and buffering',async()=>{
  const f=fixture();try{
    f.fire('loadedmetadata');await settle();assert.equal([...f.timers.values()][0].delay,35250);
    f.video.playbackRate=2;f.fire('ratechange');assert.equal([...f.timers.values()][0].delay,17625);
    const job=[...f.timers.values()][0];f.video.currentTime=35.25;job.fn();assert.equal(f.button.hidden,false);
    f.video.paused=true;f.fire('pause');assert.equal(f.button.hidden,false);assert.equal(f.timers.size,0);
    f.click();assert.equal(f.video.paused,true);assert.equal(f.video.playbackRate,2);
    f.video.currentTime=0;f.video.paused=false;f.fire('playing');assert.equal(f.timers.size,1);
    f.fire('waiting');assert.equal(f.timers.size,0);f.fire('playing');assert.equal(f.timers.size,1);
  }finally{f.controller.destroy();}
});

test('old source response is aborted and cannot put its times on a different video',async()=>{
  const requests=[],f=fixture(options=>new Promise(resolve=>requests.push({...options,resolve})));try{
    f.fire('loadedmetadata');await settle();assert.equal(requests.length,1);
    f.fire('durationchange');assert.equal(requests.length,1);
    f.controller.reset();assert.equal(requests[0].signal.aborted,true);
    f.video.duration=1500;f.fire('loadedmetadata');await settle();assert.equal(requests.length,2);
    requests[0].resolve({opening});await settle();f.video.currentTime=50;f.fire('timeupdate');assert.equal(f.button.hidden,true);
    requests[1].resolve({opening:{...opening,episodeLength:1500}});await settle();assert.equal(f.button.hidden,false);
    f.controller.destroy();assert.equal(f.button.hidden,true);f.fire('loadedmetadata');assert.equal(requests.length,2);
  }finally{f.controller.destroy();}
});

test('missing times, incompatible duration and network failure never block playback or invent a skip',async()=>{
  for(const load of [async()=>({opening:null}),async()=>({opening:{...opening,episodeLength:1450}}),async()=>{throw new Error('Unavailable');}]){
    const f=fixture(load);try{f.fire('loadedmetadata');await settle();f.video.currentTime=50;f.fire('timeupdate');f.click();assert.equal(f.button.hidden,true);assert.equal(f.video.currentTime,50);assert.equal(f.video.paused,false);assert.equal(f.timers.size,0);}finally{f.controller.destroy();}
  }
});

test('seeking and failed media hide the button; a failed seek keeps a usable opening button',async()=>{
  const f=fixture();try{
    f.fire('loadedmetadata');await settle();f.video.currentTime=50;f.fire('timeupdate');assert.equal(f.button.hidden,false);
    f.video.seeking=true;f.fire('seeking');assert.equal(f.button.hidden,true);f.video.seeking=false;f.fire('seeked');assert.equal(f.button.hidden,false);
    Object.defineProperty(f.video,'currentTime',{get:()=>50,set(){throw new Error('Seek refused');},configurable:true});f.click();assert.equal(f.button.hidden,false);assert.equal(f.skips.length,0);
    f.video.error={code:2};f.fire('error');assert.equal(f.button.hidden,true);f.click();assert.equal(f.skips.length,0);
  }finally{f.controller.destroy();}
});
