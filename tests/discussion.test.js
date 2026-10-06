import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mountDiscussion,relativeCommentTime} from '../web/js/discussion.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const row=(id,extra={})=>({id,userId:'u1',name:'Testador',nameColor:'gold',avatar:'/assets/avatar-default.svg',avatarFrame:{x:50,y:50,zoom:100},body:'Comentário '+id,spoiler:false,parentId:null,replyCount:0,deleted:false,mine:true,likes:0,dislikes:0,reaction:0,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',...extra});
const settle=async()=>{for(let n=0;n<16;n++)await new Promise(resolve=>setImmediate(resolve));};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

function setup(t,initial,{guest=false,draft=''}={}){
 const {document,window}=parseHTML('<html><body><section id="discussion" class="discussion-section"></section></body></html>');
 // Linkedom does not implement checked or AbortSignal listener removal. Checked
 // mirrors the native input property here; destruction is exercised without a shim.
 Object.defineProperty(window.HTMLInputElement.prototype,'checked',{configurable:true,get(){return this.hasAttribute('checked');},set(value){this.toggleAttribute('checked',!!value);}});
 window.HTMLElement.prototype.focus=function(){this.dispatchEvent(new window.Event('focus'));};
 const host=document.querySelector('#discussion'),model=initial.map(comment=>({...comment})),calls={get:[],post:[],toast:[],login:0},memory=new Map();
 const state={apiError:null,postError:null,apiGate:null,postGate:null,next:0};
 if(draft)memory.set('ad_draft_u1_1_all',draft);
 const result=params=>{
  const parent=params.get('parent'),offset=Number(params.get('offset')||0),sort=params.get('sort')||(parent?'oldest':'recent');
  if(parent&&!model.some(comment=>comment.id===parent))throw Error('Comentário não encontrado.');
  let rows=model.filter(comment=>parent?comment.parentId===parent:comment.parentId===null);
  rows=rows.sort((a,b)=>sort==='oldest'?a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id):sort==='popular'?(b.likes-b.dislikes)-(a.likes-a.dislikes)||b.id.localeCompare(a.id):b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
  const comments=rows.slice(offset,offset+20).map(comment=>({...comment,replyCount:model.filter(child=>child.parentId===comment.id).length}));
  return {ok:true,view:parent?'replies':'threads',comments,total:rows.length,totalComments:model.filter(comment=>!comment.deleted).length,offset,limit:20,hasMore:offset+comments.length<rows.length,nextOffset:offset+comments.length<rows.length?offset+comments.length:null};
 };
 const api=async path=>{calls.get.push(path);const params=new URL('https://site.test'+path).searchParams;if(state.apiError){const error=state.apiError(params);if(error)throw Error(error);}if(state.apiGate)await state.apiGate.promise;return result(params);};
 const post=async(path,payload)=>{
  calls.post.push({path,payload});if(state.postError)throw Error(state.postError);if(state.postGate)await state.postGate.promise;
  const current=model.find(comment=>comment.id===payload.id);
  if(payload.action==='comment'){const id='new-'+(++state.next);model.push(row(id,{body:payload.body,parentId:payload.parentId,spoiler:payload.spoiler,createdAt:'2026-02-01T00:00:00Z',updatedAt:'2026-02-01T00:00:00Z'}));return {ok:true,id};}
  if(payload.action==='edit'){current.body=payload.body;current.spoiler=payload.spoiler;current.updatedAt='2026-03-01T00:00:00Z';}
  if(payload.action==='commentReaction'){if(current.reaction===1)current.likes--;if(current.reaction===-1)current.dislikes--;if(payload.value===1)current.likes++;if(payload.value===-1)current.dislikes++;current.reaction=payload.value;}
  if(payload.action==='delete'){
   if(model.some(child=>child.parentId===current.id))Object.assign(current,{deleted:true,body:'Comentário excluído.',mine:false,userId:null,name:'Comentário excluído'});
   else model.splice(model.indexOf(current),1);
   let removed=true;while(removed){removed=false;for(const comment of [...model])if(comment.deleted&&!model.some(child=>child.parentId===comment.id)){model.splice(model.indexOf(comment),1);removed=true;}}
  }
  return {ok:true};
 };
 const controller=mountDiscussion(host,{animeId:1,data:result(new URLSearchParams()),user:()=>guest?null:{id:'u1',avatar:'/assets/avatar-default.svg'},
  avatarView:src=>`<span class="avatar"><img alt="" src="${esc(src||'/assets/avatar-default.svg')}"></span>`,nameClass:color=>'name-color-'+(color==='gold'?'gold':'ice'),api,post,
  store:{get:(key,fallback)=>memory.get(key)??fallback,set:(key,value)=>memory.set(key,value)},toast:(...args)=>calls.toast.push(args),onLogin:()=>calls.login++});
 t.after(()=>controller.destroy());
 const click=node=>{assert.ok(node,'Control must exist');node.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));};
 const article=id=>[...host.querySelectorAll('[data-comment]')].find(node=>node.dataset.comment===id);
 const action=(id,name)=>article(id)?.querySelector('[data-action="'+name+'"]');
 const input=(form,text)=>{const field=form.querySelector('textarea');field.value=text;field.dispatchEvent(new window.Event('input',{bubbles:true}));return field;};
 const submit=form=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 return {host,document,window,model,calls,memory,state,controller,click,article,action,input,submit};
}

test('composer exposes a labelled textarea, saves draft and submits once after inline forms are opened',async t=>{
 const ui=setup(t,[row('root')]);let form=ui.host.querySelector('.discussion-editor form'),textarea=form.querySelector('textarea');
 assert.equal(ui.host.querySelector('.discussion-heading h3').textContent,'1 Comentário');
 assert.equal(textarea.closest('.sr-only'),null);assert.equal(form.querySelector('label.sr-only').getAttribute('for'),textarea.id);assert.equal(form.querySelector('[type="submit"]').disabled,true);
 textarea.focus();assert.equal(form.classList.contains('is-expanded'),true);ui.input(form,' x ');assert.equal(form.querySelector('[type="submit"]').disabled,true);
 ui.input(form,'Minha teoria completa');assert.equal(form.querySelector('[type="submit"]').disabled,false);assert.equal(ui.memory.get('ad_draft_u1_1_all'),'Minha teoria completa');
 for(let n=0;n<3;n++){ui.click(ui.action('root','reply'));ui.click(ui.article('root').querySelector('[data-cancel-composer]'));}
 form.querySelector('[name="spoiler"]').checked=true;
 ui.submit(form);await settle();assert.equal(ui.calls.post.length,1);assert.equal(ui.calls.post[0].payload.action,'comment');assert.equal(ui.calls.post[0].payload.body,'Minha teoria completa');assert.equal(ui.calls.post[0].payload.spoiler,true);
 assert.equal(ui.memory.get('ad_draft_u1_1_all'),'');assert.equal(ui.host.querySelector('.discussion-editor textarea').value,'');assert.ok(ui.host.textContent.includes('Minha teoria completa'));
});

test('reply expansion, nested threads, collapse and pagination preserve parent identity',async t=>{
 const items=[row('root')];for(let n=0;n<23;n++)items.push(row('reply-'+String(n).padStart(2,'0'),{parentId:'root',mine:false}));items.push(row('nested',{parentId:'reply-00'}));
 const ui=setup(t,items);assert.equal(ui.host.querySelectorAll('[data-comment]').length,1);assert.equal(ui.action('root','replies').getAttribute('aria-expanded'),'false');
 ui.click(ui.action('root','replies'));await settle();assert.equal(ui.host.querySelectorAll('[data-comment]').length,21);assert.equal(ui.action('root','replies').getAttribute('aria-expanded'),'true');
 ui.click(ui.action('reply-00','replies'));await settle();assert.equal(ui.article('nested').closest('.comment-thread').parentElement.closest('.comment-thread').dataset.thread,'reply-00');
 ui.click(ui.host.querySelector('[data-more-replies="root"]'));await settle();assert.equal(ui.host.querySelectorAll('[data-comment]').length,25);assert.equal(ui.host.querySelector('[data-more-replies="root"]'),null);
 ui.click(ui.action('root','replies'));assert.equal(ui.host.querySelectorAll('[data-comment]').length,1);assert.equal(ui.action('root','replies').getAttribute('aria-expanded'),'false');
 ui.click(ui.action('root','replies'));await settle();assert.ok(ui.article('reply-22'));assert.ok(ui.article('nested'));
 ui.click(ui.action('reply-22','reply'));const form=ui.article('reply-22').querySelector('form');ui.input(form,'Resposta ao último comentário');ui.submit(form);await settle();
 assert.equal(ui.calls.post.at(-1).payload.parentId,'reply-22');assert.ok(ui.article('new-1'));assert.ok(ui.article('reply-22'));assert.ok(ui.article('nested'));
});

test('editing a loaded reply keeps both root pages and loaded reply pages visible',async t=>{
 const items=[];for(let n=0;n<22;n++)items.push(row('root-'+String(n).padStart(2,'0')));for(let n=0;n<23;n++)items.push(row('reply-'+String(n).padStart(2,'0'),{parentId:'root-00',spoiler:n===22}));
 const ui=setup(t,items);ui.click(ui.host.querySelector('[data-more-comments]'));await settle();assert.ok(ui.article('root-00'));assert.equal(ui.host.querySelector('[data-more-comments]'),null);
 ui.click(ui.action('root-00','replies'));await settle();ui.click(ui.host.querySelector('[data-more-replies="root-00"]'));await settle();
 ui.click(ui.action('reply-22','edit'));const form=ui.article('reply-22').querySelector('form');assert.equal(form.querySelector('textarea').value,'Comentário reply-22');assert.equal(form.querySelector('[name="spoiler"]').checked,true);
 ui.input(form,'Texto corrigido');form.querySelector('[name="spoiler"]').checked=false;ui.submit(form);await settle();
 assert.equal(ui.calls.post.at(-1).payload.action,'edit');assert.equal(ui.calls.post.at(-1).payload.id,'reply-22');assert.equal(ui.calls.post.at(-1).payload.spoiler,false);
 assert.ok(ui.article('root-00'));assert.ok(ui.article('root-21'));assert.equal(ui.article('reply-22').querySelector('.comment-text').textContent,'Texto corrigido');assert.equal(ui.article('reply-22').querySelector('form'),null);
});

test('network failures preserve composer text and restore load and vote controls',async t=>{
 const ui=setup(t,[row('root'),row('reply',{parentId:'root'})]);
 ui.state.apiError=params=>params.has('parent')?'Rede indisponível':null;ui.click(ui.action('root','replies'));await settle();assert.equal(ui.action('root','replies').disabled,false);assert.equal(ui.action('root','replies').getAttribute('aria-expanded'),'false');
 ui.state.apiError=null;ui.click(ui.action('root','replies'));await settle();assert.ok(ui.article('reply'));
 let form=ui.host.querySelector('.discussion-editor form');ui.input(form,'Meu texto precisa continuar aqui');ui.state.postError='Falha ao publicar';ui.submit(form);await settle();assert.equal(form.querySelector('textarea').value,'Meu texto precisa continuar aqui');assert.equal(form.querySelector('textarea').disabled,false);assert.equal(form.querySelector('[type="submit"]').disabled,false);assert.equal(form.querySelector('[role="alert"]').textContent,'Falha ao publicar');
 const votes=[...ui.article('root').querySelectorAll('[data-action="vote"]')];ui.click(votes[0]);await settle();assert.equal(votes[0].disabled,false);assert.equal(votes[1].disabled,false);assert.equal(votes[0].getAttribute('aria-pressed'),'false');
 ui.state.postError=null;ui.click(votes[0]);await settle();assert.equal(votes[0].getAttribute('aria-pressed'),'true');assert.equal(votes[0].querySelector('span').textContent,'1');ui.click(votes[1]);await settle();assert.equal(votes[0].getAttribute('aria-pressed'),'false');assert.equal(votes[1].getAttribute('aria-pressed'),'true');ui.click(votes[1]);await settle();assert.equal(votes[1].getAttribute('aria-pressed'),'false');
});

test('pagination network errors recover and retry the same offsets',async t=>{
 const items=[];for(let n=0;n<21;n++)items.push(row('root-'+String(n).padStart(2,'0')));for(let n=0;n<21;n++)items.push(row('reply-'+String(n).padStart(2,'0'),{parentId:'root-20'}));
 const ui=setup(t,items);ui.state.apiError=params=>params.get('offset')==='20'?'Falha de página':null;
 let more=ui.host.querySelector('[data-more-comments]');ui.click(more);await settle();assert.equal(more.disabled,false);assert.equal(ui.host.querySelectorAll('[data-comment]').length,20);
 ui.state.apiError=null;ui.click(more);await settle();assert.equal(ui.host.querySelectorAll('[data-comment]').length,21);
 ui.click(ui.action('root-20','replies'));await settle();more=ui.host.querySelector('[data-more-replies="root-20"]');ui.state.apiError=params=>params.has('parent')&&params.get('offset')==='20'?'Falha de respostas':null;
 ui.click(more);await settle();assert.equal(more.disabled,false);assert.equal(ui.article('reply-20'),undefined);ui.state.apiError=null;ui.click(more);await settle();assert.ok(ui.article('reply-20'));
 const last=new URL('https://site.test'+ui.calls.get.at(-1)).searchParams;assert.equal(last.get('parent'),'root-20');assert.equal(last.get('offset'),'20');
});

test('in-flight submissions and votes block duplicate or conflicting actions',async t=>{
 const ui=setup(t,[row('root')]);let form=ui.host.querySelector('.discussion-editor form');ui.input(form,'Um envio somente');ui.state.postGate=deferred();ui.submit(form);ui.submit(form);await settle();assert.equal(ui.calls.post.length,1);assert.equal(form.querySelector('textarea').disabled,true);
 ui.state.postGate.resolve();await settle();ui.state.postGate=deferred();const votes=[...ui.article('root').querySelectorAll('[data-action="vote"]')];ui.click(votes[0]);ui.click(votes[1]);await settle();assert.equal(ui.calls.post.length,2);assert.ok(votes.every(button=>button.disabled));ui.state.postGate.resolve();await settle();assert.ok(votes.every(button=>!button.disabled));
});

test('deleting the last reply of a removed parent cleans the visible branch without a stale request',async t=>{
 const ui=setup(t,[row('root',{deleted:true,body:'Comentário excluído.',mine:false}),row('reply',{parentId:'root'})]);ui.click(ui.action('root','replies'));await settle();ui.click(ui.action('reply','delete'));assert.equal(ui.action('reply','delete').textContent,'Confirmar exclusão');ui.click(ui.action('reply','delete'));await settle();
 assert.equal(ui.host.querySelectorAll('[data-comment]').length,0);assert.ok(ui.host.textContent.includes('0 Comentários'));assert.equal(ui.calls.toast.length,0);assert.equal(ui.host.querySelector('.comment-deleted'),null);
});

test('untrusted comment text stays escaped and guests can expand replies but cannot mutate',async t=>{
 const attack='<img src=x onerror=alert(1)>',ui=setup(t,[row('root',{name:attack,body:attack,userId:'"><script>alert(1)</script>',likes:attack}),row('reply',{parentId:'root',body:'</textarea><script>alert(1)</script>'})],{guest:true});
 assert.equal(ui.host.querySelector('script'),null);assert.equal(ui.host.querySelector('[onerror]'),null);assert.ok(ui.host.querySelector('.comment-text').textContent.includes(attack));assert.ok(ui.host.querySelector('.comment-author').textContent.includes(attack));assert.equal(ui.host.querySelector('form'),null);
 ui.click(ui.action('root','replies'));await settle();assert.ok(ui.article('reply'));assert.equal(ui.host.querySelector('script'),null);ui.click(ui.action('root','reply'));ui.click(ui.action('root','vote'));await settle();assert.equal(ui.calls.login,2);assert.equal(ui.calls.post.length,0);
});

test('destroy removes handlers in Linkedom and late network results cannot redraw the host',async t=>{
 const ui=setup(t,[row('root'),row('reply',{parentId:'root'})]);ui.state.apiGate=deferred();ui.click(ui.action('root','replies'));await settle();const before=ui.host.innerHTML;ui.controller.destroy();ui.state.apiGate.resolve();await settle();assert.equal(ui.host.innerHTML,before);ui.click(ui.action('root','reply'));await settle();assert.equal(ui.host.querySelector('.inline-composer form'),null);assert.equal(ui.calls.post.length,0);
});

test('chronological selection reloads roots in the requested order',async t=>{
 const ui=setup(t,[row('older',{createdAt:'2026-01-01T00:00:00Z'}),row('newer',{createdAt:'2026-02-01T00:00:00Z'})]);
 assert.equal(ui.host.querySelector('[data-comment]').dataset.comment,'newer');const select=ui.host.querySelector('.discussion-order select');
 for(const option of select.querySelectorAll('option'))option.toggleAttribute('selected',option.value==='oldest');
 select.dispatchEvent(new ui.window.Event('change',{bubbles:true}));await settle();
 assert.equal(ui.host.querySelector('[data-comment]').dataset.comment,'older');assert.equal(new URL('https://site.test'+ui.calls.get.at(-1)).searchParams.get('sort'),'oldest');
 assert.equal(ui.host.querySelector('.discussion-heading h3').textContent,'2 Comentários');
});

test('a saved post followed by a refresh error cannot resend its cleared text',async t=>{
 const ui=setup(t,[row('root')]),form=ui.host.querySelector('.discussion-editor form');ui.input(form,'Publicação salva apesar da atualização');
 ui.state.apiError=()=> 'Atualização indisponível';ui.submit(form);await settle();
 assert.equal(ui.calls.post.length,1);assert.equal(ui.model.some(comment=>comment.id==='new-1'),true);assert.equal(form.querySelector('textarea').value,'');assert.equal(form.querySelector('[type="submit"]').disabled,true);
 assert.ok(ui.calls.toast.some(([message])=>message.includes('Comentário salvo')));ui.submit(form);await settle();assert.equal(ui.calls.post.length,1);
 ui.state.apiError=null;await ui.controller.refresh();assert.ok(ui.article('new-1'));
});

test('relative timestamps handle Portuguese plurals, invalid dates and future clocks',()=>{
 const now=Date.parse('2026-10-04T12:00:00Z'),ago=seconds=>new Date(now-seconds*1000).toISOString();
 for(const [seconds,label] of [[0,'agora'],[59,'agora'],[60,'há 1 minuto'],[120,'há 2 minutos'],[3600,'há 1 hora'],[86400,'há 1 dia'],[1209600,'há 2 semanas'],[2592000,'há 1 mês'],[5184000,'há 2 meses'],[31536000,'há 1 ano']])assert.equal(relativeCommentTime(ago(seconds),now),label);
 assert.equal(relativeCommentTime('data inválida',now),'');assert.equal(relativeCommentTime(ago(-3600),now),'agora');
});
