import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {giphyRequest} from '../web/js/giphy.js';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('v29: sticker search uses official GIPHY stickers endpoint and PG-13 rating',()=>{
 const url=new URL(giphyRequest('fake-key',{kind:'stickers',query:'anime sparkle'}));
 assert.equal(url.origin,'https://api.giphy.com');assert.equal(url.pathname,'/v1/stickers/search');
 assert.equal(url.searchParams.get('q'),'anime sparkle');assert.equal(url.searchParams.get('rating'),'pg-13');
});
test('v29: separate profile tabs, 12 atmospheres, name segments and shared profile poster sizing',()=>{
 const js=file('web/js/app.js'),css=file('web/css/profile-v29.css'),server=file('server/profile-identity.js');
 for(const tab of ['universe','appearance','photo','account'])assert.match(js,new RegExp(`profile-panel-${tab}`));
 for(const section of ['atmosphere','frames','stickers','names'])assert.match(js,new RegExp(`studio-${section}`));
 assert.match(js,/function styledName/);assert.match(js,/name-emoji/);
 assert.match(js,/sticker-stage/);assert.match(js,/data-giphy-avatar/);
 assert.match(css,/#public-profile \.profile-minimal-grid/);
 assert.match(server,/const covers = new Set\(\['aurora'.*'prism'\]\)/);
});
