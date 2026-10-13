import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v31: sticker search uses DragonGIF API, without GIPHY',()=>{
 const js=file('web/js/app.js'),gallery=file('web/js/local-media.js');
 assert.match(js,/searchDragonMedia/);assert.match(js,/kind:'sticker'/);
 assert.doesNotMatch(js,/api\.giphy\.com/);
 assert.match(gallery,/api\/v1\/media/);
});
test('v29: separate profile tabs, 12 atmospheres, name segments and shared profile poster sizing',()=>{
 const js=file('web/js/app.js'),css=file('web/css/profile-v29.css'),server=file('server/profile-identity.js');
 for(const tab of ['universe','appearance','photo','account'])assert.match(js,new RegExp(`profile-panel-${tab}`));
 for(const section of ['atmosphere','frames','stickers','names'])assert.match(js,new RegExp(`studio-${section}`));
 assert.match(js,/function styledName/);assert.match(js,/name-emoji/);
 assert.match(js,/sticker-stage/);assert.match(js,/stickerMarkup/);
 assert.match(css,/#public-profile \.profile-minimal-grid/);
 assert.match(server,/const covers = new Set\(\['aurora'.*'prism'\]\)/);
});
