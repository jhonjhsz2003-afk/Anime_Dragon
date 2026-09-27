import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveSearch,rankSearchResults} from '../web/js/live-search.js';
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

test('prefix matches precede partial matches and duplicate anime IDs disappear',()=>{
 const results=rankSearchResults([{id:1,title:'Uma história de Naruto'},{id:2,title:'Naruto Shippuden'},{id:3,title:'Naruto'},{id:2,title:'Naruto Shippuden'},{id:4,title:'Narumi'}],'naruto');
 assert.deepEqual(results.map(x=>x.id),[3,2,1,4]);
 assert.equal(rankSearchResults([{id:1,title:'Estrelas além'},{id:2,title:'Além das estrelas'}],'alem')[0].id,2);
});
