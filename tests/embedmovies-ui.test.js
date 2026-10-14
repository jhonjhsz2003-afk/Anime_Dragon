import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../web/css/player.css',import.meta.url),'utf8');
const player=readFileSync(new URL('../web/js/player.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');

test('v23: cabeçalho do AnimeDragon separado do player de terceiros',()=>{
  assert.match(css,/\.watch-screen\.is-external-embed\s*\{\s*display:flex;/);
  assert.match(css,/\.watch-screen\.is-external-embed \.watch-heading[\s\S]*?position:relative;/);
  assert.match(css,/\.watch-screen\.is-external-embed \.watch-embed\s*\{[\s\S]*?position:relative;/);
  assert.match(css,/\.watch-screen\.is-external-embed \.watch-heading \.watch-close[\s\S]*?pointer-events:auto;/);
});
test('v23: selects internos não aparecem para iframe e são restaurados no player próprio',()=>{
  assert.match(player,/q\('\[data-video-options\]'\)\.hidden=true;q\('\[data-caption-options\]'\)\.hidden=true;/);
  assert.match(player,/q\('\[data-video-options\]'\)\.hidden=false;q\('\[data-caption-options\]'\)\.hidden=false;/);
  assert.match(player,/frame\.loading='eager'/);
  assert.match(player,/frame\.setAttribute\('fetchpriority','high'\)/);
  assert.ok(!player.includes('autoselectDubbed')); // Não prometer controle que o provedor não documenta.
});
test('v28: recursos de interface usam nova versão e evitam cache de CSS antigo',()=>{
  assert.match(html,/\/css\/player\.css\?v=23\.0\.0/);
  assert.match(html,/\/js\/app\.js\?v=33\.0\.0/);
});
