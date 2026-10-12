import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeaderScroll} from '../web/js/header-scroll.js';
const {parseHTML} = await import(process.env.ANIMEDRAGON_DOM_MODULE || 'linkedom');

function setup() {
  const {window,document}=parseHTML('<html><body><header class="site-header"></header><div class="detail-modal"></div><div class="cards"></div></body></html>');
  const header=document.querySelector('header'),frames=new Map();let sequence=0;
  window.scrollY=0;
  const controller=createHeaderScroll(header,{requestFrame:callback=>{frames.set(++sequence,callback);return sequence},cancelFrame:id=>frames.delete(id)});
  const flush=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback())};
  // Linkedom models propagation for these synthetic events through bubbling.
  const scroll=target=>target.dispatchEvent(new window.Event('scroll',{bubbles:true}));
  const compact=()=>header.classList.contains('header-compact');
  return {window,document,header,controller,frames,flush,scroll,compact};
}
test('page scroll contracts the header and returns to its initial size without threshold flicker',()=>{
  const t=setup();t.window.scrollY=90;t.scroll(t.window);t.flush();assert.equal(t.compact(),true);
  t.window.scrollY=60;t.scroll(t.window);t.flush();assert.equal(t.compact(),true);
  t.window.scrollY=0;t.scroll(t.window);t.flush();assert.equal(t.compact(),false);t.controller.destroy();
});
test('opening an anime follows its own scroll and closing restores the page state',()=>{
  const t=setup();t.window.scrollY=800;t.controller.refresh();assert.equal(t.compact(),true);
  t.document.body.classList.add('detail-open');const detail=t.document.querySelector('.detail-modal');detail.scrollTop=0;
  t.document.dispatchEvent(new t.window.Event('header-contextchange'));assert.equal(t.compact(),false);
  detail.scrollTop=150;t.scroll(detail);t.flush();assert.equal(t.compact(),true);
  detail.scrollTop=0;t.scroll(detail);t.flush();assert.equal(t.compact(),false);
  t.document.querySelector('.cards').scrollLeft=500;t.scroll(t.document.querySelector('.cards'));t.flush();assert.equal(t.compact(),false);
  t.document.body.classList.remove('detail-open');t.controller.refresh();assert.equal(t.compact(),true);t.controller.destroy();
});
test('scroll work is limited to one animation frame and destroyed headers stop reacting',()=>{
  const t=setup();t.window.scrollY=200;for(let i=0;i<20;i++)t.scroll(t.window);assert.equal(t.frames.size,1);
  t.controller.destroy();assert.equal(t.frames.size,0);t.scroll(t.window);t.flush();assert.equal(t.compact(),false);
});
