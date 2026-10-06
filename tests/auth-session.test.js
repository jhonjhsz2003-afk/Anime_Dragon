import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthSession} from '../web/js/auth-session.js';

const alice={id:'7',name:'Alice',avatar:'/assets/avatar-default.svg'};
const bob={id:'8',name:'Bob'};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function harness(request,options={}){
 let time=0,sequence=0;const timers=new Map(),changes=[],statuses=[],calls=[];
 const win=new EventTarget(),doc=new EventTarget();win.navigator={onLine:true};doc.visibilityState='visible';
 const session=createAuthSession({request:(path,opts)=>{calls.push({path,...opts});return request(path,opts);},
  onChange:(user,meta)=>changes.push({user,meta}),onStatus:(status,meta)=>statuses.push({status,meta}),
  window:win,document:doc,now:()=>time,schedule:(run,delay)=>{const id=++sequence;timers.set(id,{run,at:time+delay});return id;},cancel:id=>timers.delete(id),...options});
 return {session,win,doc,changes,statuses,calls,timers,fire:(target,event)=>target.dispatchEvent(new Event(event)),
  async advance(ms){const end=time+ms;await flush();for(;;){const next=[...timers].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].run();await flush();}time=end;await flush();}};
}
const failure=status=>Object.assign(new Error('Unavailable'),{status});

test('a new page restores its user from the server cookie without browser storage',async()=>{
 let cookieUser=alice;
 const first=harness(async()=>({ok:true,user:cookieUser}));first.session.start();await flush();
 assert.deepEqual(first.session.user,alice);assert.equal(first.calls[0].path,'/api/auth/me');
 assert.equal(first.calls[0].credentials,'same-origin');assert.equal(first.calls[0].cache,'no-store');
 assert.equal(first.changes[0].meta.definitive,true);assert.equal(first.statuses[0].status,'loading');first.session.destroy();
 const reload=harness(async()=>({ok:true,user:cookieUser}));reload.session.start();await flush();
 assert.deepEqual(reload.session.user,alice);assert.equal(reload.calls.length,1);reload.session.destroy();
});

test('startup 503 retries with deterministic backoff and never claims anonymous user',async()=>{
 let count=0;const h=harness(async()=>{if(++count<3)throw failure(503);return {ok:true,user:alice};});
 h.session.start();await flush();assert.equal(h.changes.length,0);assert.equal(h.session.status,'retrying');
 await h.advance(999);assert.equal(h.calls.length,1);await h.advance(1);assert.equal(h.calls.length,2);
 assert.equal(h.statuses.at(-1).meta.retryInMs,3000);await h.advance(2999);assert.equal(h.calls.length,2);
 await h.advance(1);assert.deepEqual(h.session.user,alice);assert.equal(h.changes.length,1);h.session.destroy();
});

test('transient failure and invalid JSON shape preserve the confirmed user in memory',async()=>{
 let response=()=>{throw failure(503);};const h=harness(async()=>response());h.session.accept(alice);
 await h.session.restore({force:true});assert.deepEqual(h.session.user,alice);assert.equal(h.changes.length,1);
 assert.equal(h.statuses.at(-1).meta.preserved,true);
 response=()=>({ok:true});await h.advance(1000);assert.deepEqual(h.session.user,alice);assert.equal(h.changes.length,1);
 response=()=>({ok:true,user:alice});await h.advance(3000);assert.equal(h.changes.length,2);assert.equal(h.changes.at(-1).meta.changed,false);h.session.destroy();
});

test('expired cookie user:null and explicit HTTP 401 are definitive anonymous responses',async()=>{
 let response=()=>({ok:true,user:null});const h=harness(async()=>response());h.session.accept(alice);
 await h.session.restore({force:true});assert.equal(h.session.user,null);assert.equal(h.changes.at(-1).meta.source,'server');
 h.session.accept(alice);response=()=>{throw failure(401);};await h.session.restore({force:true});
 assert.equal(h.session.user,null);assert.equal(h.session.status,'ready');assert.equal(h.changes.at(-1).meta.httpStatus,401);
 assert.equal(h.timers.size,0);h.session.destroy();
});

test('overlapping restores coalesce into one request, including forced restores',async()=>{
 let release;const h=harness(()=>new Promise(resolve=>release=resolve));
 const a=h.session.restore(),b=h.session.restore({force:true});assert.equal(a,b);await flush();assert.equal(h.calls.length,1);
 release({ok:true,user:alice});await a;assert.equal(h.changes.length,1);h.session.destroy();
});

test('explicit logout aborts and ignores a late user response',async()=>{
 let release;const h=harness(()=>new Promise(resolve=>release=resolve));h.session.accept(alice);
 const pending=h.session.restore({force:true});await flush();h.session.clear();assert.equal(h.calls[0].signal.aborted,true);
 release({ok:true,user:alice});await pending;assert.equal(h.session.user,null);assert.equal(h.changes.length,2);h.session.destroy();
});

test('successful login invalidates an older anonymous restore and prevents request before dispatch',async()=>{
 let release;const h=harness(()=>new Promise(resolve=>release=resolve));const pending=h.session.restore();await flush();
 h.session.accept(bob);release({ok:true,user:null});await pending;assert.deepEqual(h.session.user,bob);assert.equal(h.changes.length,1);
 const queued=h.session.restore({force:true});h.session.accept(alice);await queued;
 assert.equal(h.calls.length,1);assert.deepEqual(h.session.user,alice);h.session.destroy();
});

test('focus, pageshow, online and visibility share throttle; forced manual check bypasses it',async()=>{
 const h=harness(async()=>({ok:true,user:alice}));h.session.start();await flush();
 for(const event of ['focus','pageshow','online'])h.fire(h.win,event);h.fire(h.doc,'visibilitychange');await flush();assert.equal(h.calls.length,1);
 await h.advance(30000);h.fire(h.win,'focus');h.fire(h.win,'pageshow');h.fire(h.win,'online');await flush();assert.equal(h.calls.length,2);
 await h.session.restore({force:true});assert.equal(h.calls.length,3);h.session.destroy();
});

test('offline startup resumes on online event, without reporting logout',async()=>{
 const h=harness(async()=>({ok:true,user:alice}));h.win.navigator.onLine=false;h.session.start();await flush();
 assert.equal(h.calls.length,0);assert.equal(h.changes.length,0);assert.equal(h.session.status,'retrying');
 h.win.navigator.onLine=true;h.fire(h.win,'online');await flush();assert.equal(h.calls.length,1);assert.deepEqual(h.session.user,alice);h.session.destroy();
});

test('visible tabs revalidate periodically without refreshing on return; hidden tabs resume failed retries',async()=>{
 let fail=false;const h=harness(async()=>{if(fail)throw failure(503);return {ok:true,user:alice};},{revalidateMs:900000});
 h.session.start();await flush();await h.advance(300000);assert.equal(h.calls.length,2);
 h.doc.visibilityState='hidden';h.fire(h.doc,'visibilitychange');await h.advance(600000);assert.equal(h.calls.length,2);
 h.doc.visibilityState='visible';h.fire(h.doc,'visibilitychange');await flush();assert.equal(h.calls.length,2);
 fail=true;await h.session.restore({force:true});assert.equal(h.calls.length,3);
 h.doc.visibilityState='hidden';h.fire(h.doc,'visibilitychange');await h.advance(5000);assert.equal(h.calls.length,3);
 fail=false;h.doc.visibilityState='visible';h.fire(h.doc,'visibilitychange');await h.advance(0);assert.equal(h.calls.length,4);assert.deepEqual(h.session.user,alice);h.session.destroy();
});

test('destroy removes listeners, cancels timers and suppresses late callbacks',async()=>{
 let release;const h=harness(()=>new Promise(resolve=>release=resolve));h.session.start();h.session.start();await flush();
 assert.equal(h.calls.length,1);h.session.destroy();assert.equal(h.calls[0].signal.aborted,true);assert.equal(h.timers.size,0);
 const count=h.statuses.length;release({ok:true,user:alice});await flush();
 for(const event of ['focus','pageshow','online'])h.fire(h.win,event);h.fire(h.doc,'visibilitychange');await h.advance(600000);
 await h.session.restore({force:true});h.session.accept(alice);h.session.clear();
 assert.equal(h.calls.length,1);assert.equal(h.changes.length,0);assert.equal(h.statuses.length,count);
});
