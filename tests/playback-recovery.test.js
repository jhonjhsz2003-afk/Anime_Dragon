import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaybackWatchdog,preferredAlternative,sourcePriority} from '../web/js/playback-watchdog.js';
function fixture(){
 let time=0,next=0,failures=0;const jobs=new Map();
 const watcher=createPlaybackWatchdog(()=>failures++,{now:()=>time,schedule:(fn,delay)=>{jobs.set(++next,{fn,at:time+delay});return next;},cancel:id=>jobs.delete(id)});
 return {watcher,get failures(){return failures;},advance(ms){const end=time+ms;while(true){const job=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!job||job[1].at>end)break;time=job[1].at;jobs.delete(job[0]);job[1].fn();}time=end;}};
}
test('loading that makes progress beyond ten seconds is not falsely timed out',()=>{
 const f=fixture();f.watcher.start();f.advance(6000);f.watcher.progress();f.advance(6000);f.watcher.progress();f.advance(6000);assert.equal(f.failures,0);
 f.watcher.stop();f.advance(40000);assert.equal(f.failures,0);
});
test('a stalled download fails once after eight idle seconds and repeated waiting does not extend it',()=>{
 const f=fixture();f.watcher.start();f.advance(6000);f.watcher.start();f.advance(2000);assert.equal(f.failures,1);f.advance(40000);assert.equal(f.failures,1);
});
test('endless partial progress cannot hold startup open indefinitely',()=>{
 const f=fixture();f.watcher.start();for(let n=0;n<5;n++){f.advance(5000);f.watcher.progress();}f.advance(5000);assert.equal(f.failures,1);
});
test('switching or closing cancels the previous deadline; a later stall can be monitored',()=>{
 const f=fixture();f.watcher.start();f.advance(7000);f.watcher.stop();f.watcher.start();f.advance(7000);assert.equal(f.failures,0);f.advance(1000);assert.equal(f.failures,1);
});
test('a confirmed playable format replaces an unstarted opaque stream without waiting for timeout',()=>{
 const list=[{url:'https://video.test/opaque'},{url:'/api/video?ticket=x',type:'application/vnd.apple.mpegurl'}];
 assert.equal(preferredAlternative(list,0,new Set([list[0].url]),false,0),1);
 assert.equal(preferredAlternative(list,0,new Set(),true,4),-1);
 assert.equal(preferredAlternative(list,0,new Set(),false,3),-1);
 assert.equal(preferredAlternative(list,0,new Set([list[1].url]),false,0),-1);
 assert.ok(sourcePriority({type:'video/x-matroska'})<sourcePriority(list[1]));
});
