import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISCUSSION_REFRESH_MS,discussionIsVisible} from '../web/js/discussion.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v38: atualização periódica verifica apenas se comentários estão visíveis',()=>{
 assert.equal(DISCUSSION_REFRESH_MS,4000);
 const doc={hidden:false};
 const outer={hidden:false,parentElement:null};
 const inner={isConnected:true,hidden:false,parentElement:outer};
 assert.equal(discussionIsVisible(inner,doc),true);
 doc.hidden=true;assert.equal(discussionIsVisible(inner,doc),false);doc.hidden=false;
 outer.hidden=true;assert.equal(discussionIsVisible(inner,doc),false);outer.hidden=false;
 inner.isConnected=false;assert.equal(discussionIsVisible(inner,doc),false);
});

test('v38: comentários não ficam em cache e refresh preserva o formulário e é desmontável',()=>{
 const app=read('web/js/app.js'),ui=read('web/js/discussion.js');
 assert.match(app,/from '\.\/discussion\.js\?v=38\.0\.0'/);
 assert.match(app,/!path\.startsWith\('\/api\/community'\)/);
 assert.match(ui,/setInterval\(\(\)=>\{void liveRefresh\(\);\},DISCUSSION_REFRESH_MS\)/);
 assert.match(ui,/previous===fingerprint\(\)/);
 assert.match(ui,/render\(\{preserveEditors:background\}\)/);
 assert.match(ui,/clearInterval\(pollTimer\)/);
 assert.match(ui,/if\(dead\|\|polling\|\|mutations\|\|!discussionIsVisible\(host\)/);
});
