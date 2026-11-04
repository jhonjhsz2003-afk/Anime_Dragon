import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coverTrailerFrame} from '../web/js/hero-trailers.js';
const css=readFileSync(new URL('../web/css/refinements-v35.css',import.meta.url),'utf8');

test('o YouTube cobre inteiramente o banner em diferentes tamanhos de tela',()=>{
 for(const [w,h] of [[1716,760],[1920,1080],[2560,600],[800,850],[390,760],[320,640]]){
  const rect=coverTrailerFrame(w,h);
  assert.ok(rect.width>=w,`${w}x${h}: largura precisa cobrir`);
  assert.ok(rect.height>=h,`${w}x${h}: altura precisa cobrir`);
  assert.ok(rect.width/rect.height>1.77 && rect.width/rect.height<1.79,`${w}x${h}: formato 16:9`);
 }
});

test('iframe de trailer não mostra contorno nem reduz tamanho no celular',()=>{
 assert.match(css,/overflow:hidden/);
 assert.match(css,/width:var\(--hero-video-width/);
 assert.match(css,/height:var\(--hero-video-height/);
 assert.match(css,/border:0!important/);
 assert.match(css,/border-radius:0!important/);
 assert.doesNotMatch(css,/width:290%/);
});
