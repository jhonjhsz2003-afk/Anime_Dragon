import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveSearch} from '../web/js/live-search.js';
const turn=()=>new Promise(r=>setImmediate(r));
test('one character starts automatic search; rapid typing sends only the latest query',async()=>{
 const calls=[],shown=[];let run;const search=createLiveSearch(async q=>{calls.push(q);return {results:[q]};},state=>shown.push(state),{schedule:fn=>{run=fn;return 1;},cancel:()=>{run=null;}});
 search.change('n');run();await turn();assert.deepEqual(calls,['n']);assert.deepEqual(shown.at(-1).results,['n']);
 search.change('na');search.change('nar');search.change('naruto');run();await turn();assert.deepEqual(calls,['n','naruto']);
});
test('late responses cannot overwrite current search results; previous request is aborted',async()=>{
 const tasks=[],shown=[];let run;const search=createLiveSearch((q,signal)=>new Promise(resolve=>tasks.push({q,signal,resolve})),state=>shown.push(state),{schedule:fn=>{run=fn;return 1;},cancel(){}});
 search.change('s');run();search.change('solo');assert.equal(tasks[0].signal.aborted,true);run();
 tasks[1].resolve({results:['Solo Leveling']});await turn();tasks[0].resolve({results:['stale']});await turn();assert.deepEqual(shown.at(-1).results,['Solo Leveling']);
});
test('clearing or leaving dismisses results and suppresses pending callbacks',async()=>{
 const shown=[];let run,release;const search=createLiveSearch(()=>new Promise(r=>release=r),state=>shown.push(state),{schedule:fn=>{run=fn;return 1;},cancel(){}});
 search.change('a');run();search.change('');release({results:['late']});await turn();assert.equal(shown.at(-1).query,'');
 search.change('b');run();search.destroy();const count=shown.length;release({results:['late again']});await turn();assert.equal(shown.length,count);
});
