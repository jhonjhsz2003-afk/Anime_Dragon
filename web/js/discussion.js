const escapeHTML=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyph=(path)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const thumbsUp=glyph('<path d="M7 10v11H3V10zm0 0 5-7c2 0 2 2 1 5h5c2 0 3 1 2 4l-2 7c0 1-1 2-3 2H7"/>');
const thumbsDown=glyph('<path d="M7 14V3H3v11zm0 0 5 7c2 0 2-2 1-5h5c2 0 3-1 2-4l-2-7c0-1-1-2-3-2H7"/>');
const replyIcon=glyph('<path d="m9 6-6 6 6 6M3 12h10c5 0 8 3 8 7"/>');
const chevron=glyph('<path d="m6 9 6 6 6-6"/>');
const count=value=>Number.isFinite(Number(value))?Math.max(0,Math.trunc(Number(value))):0;

export function relativeCommentTime(value,now=Date.now()) {
 const seconds=Math.max(0,Math.floor((now-new Date(value).getTime())/1000));
 if(!Number.isFinite(seconds))return '';
 if(seconds<60)return 'agora';
 for(const [size,unit] of [[31536000,'ano'],[2592000,'mês'],[604800,'semana'],[86400,'dia'],[3600,'hora'],[60,'minuto']])if(seconds>=size){const n=Math.floor(seconds/size);return `há ${n} ${unit==='mês'?(n===1?'mês':'meses'):unit+(n===1?'':'s')}`;}
 return 'agora';
}

export function mountDiscussion(host,o) {
 const e=escapeHTML,abort=new AbortController(),signal=abort.signal,comments=new Map(),branches=new Map(),hostListeners=[],formListeners=new Map();
 let dead=false,roots=[...o.data.comments],data=o.data,sort=o.sort||'recent',offset=roots.length,generation=0;
 const user=()=>typeof o.user==='function'?o.user():o.user;
 const draftKey=`ad_draft_${user()?.id||'guest'}_${o.animeId}_${o.scope?`${o.scope.season}_${o.scope.episode}`:'all'}`;
 function request(extra={}){const query=new URLSearchParams({view:'threads',sort,...(o.scope||{}),...extra});return o.api(`/api/community/${o.animeId}?${query}`);}
 function listen(node,event,fn,cleanup=hostListeners){if(!node)return;node.addEventListener(event,fn,{signal});cleanup.push(()=>node.removeEventListener(event,fn));}
 function requireLogin(){if(user())return true;o.onLogin?.();return false;}
 function remember(rows){for(const row of rows)comments.set(row.id,row);}
 function composer({parent=null,edit=null}={}) {
  const current=user();if(!current)return `<div class="comment-guest">${o.avatarView(null)}<a href="#entrar">Entre para deixar um comentário…</a></div>`;
  const body=edit?.body||(parent?'':o.store?.get(draftKey,'')||'');
  const inputId=`discussion-body-${o.animeId}-${parent||edit?.id||'root'}`;
  return `<form class="comment-composer ${body?'is-expanded':''}" data-parent="${e(parent||'')}" data-edit="${e(edit?.id||'')}">${o.avatarView(current.avatar,current.avatarFrame)}<div class="composer-body">${parent?'<div class="composer-context">Respondendo a '+e(comments.get(parent)?.name||'um comentário')+'</div>':edit?'<div class="composer-context">Editar comentário</div>':''}<label class="sr-only" for="${e(inputId)}">${edit?'Editar comentário':'Deixe um comentário…'}</label><textarea id="${e(inputId)}" name="body" minlength="2" maxlength="2000" required rows="1" placeholder="Deixe um comentário…">${e(body)}</textarea><div class="composer-actions"><label><input name="spoiler" type="checkbox" ${edit?.spoiler?'checked':''}> Spoiler</label><button type="button" data-cancel-composer>Cancelar</button><button class="primary" type="submit" ${body.trim().length<2?'disabled':''}>${edit?'Salvar':'Comentar'}</button></div><p class="form-error" role="alert"></p></div></form>`;
 }
 function commentHTML(c,depth=0){
  const branch=branches.get(c.id),open=branch?.open,deleted=c.deleted;
  c={...c,likes:count(c.likes),dislikes:count(c.dislikes),replyCount:count(c.replyCount)};
  return `<div class="comment-thread" data-thread="${e(c.id)}"><article class="comment ${deleted?'comment-deleted':''}" data-comment="${e(c.id)}">${o.avatarView(deleted?null:c.avatar,c.avatarFrame)}<div class="comment-main"><div class="comment-byline">${deleted?'<b>Comentário excluído</b>':`<a href="#profile?user=${encodeURIComponent(c.userId||'')}" class="comment-author"><b class="${o.nameClass(c.nameColor)}">${e(c.name)}</b></a>`}<time datetime="${e(c.createdAt)}" title="${e(new Date(c.createdAt).toLocaleString('pt-BR'))}">${relativeCommentTime(c.createdAt)}</time>${!deleted&&c.updatedAt!==c.createdAt?'<small>(editado)</small>':''}${!deleted?`<details class="comment-menu"><summary aria-label="Opções do comentário de ${e(c.name)}">⋮</summary><div>${c.mine?`<button data-action="edit">Editar</button><button data-action="delete">Excluir</button>`:'<button data-action="report">Denunciar</button>'}</div></details>`:''}</div>${c.episode&&!o.scope?`<small class="episode-label">EP.${c.episode}</small>`:''}${deleted?'<p class="comment-text">Este comentário foi excluído.</p>':c.spoiler?`<details class="spoiler"><summary>Contém spoiler · mostrar</summary><p>${e(c.body)}</p></details>`:`<p class="comment-text">${e(c.body)}</p>`}${!deleted?`<div class="comment-tools"><button data-action="vote" data-value="1" class="comment-vote ${c.reaction===1?'selected':''}" aria-label="Curti este comentário" aria-pressed="${c.reaction===1}">${thumbsUp}<span>${c.likes||''}</span></button><button data-action="vote" data-value="-1" class="comment-vote ${c.reaction===-1?'selected':''}" aria-label="Não curti este comentário" aria-pressed="${c.reaction===-1}">${thumbsDown}<span>${c.dislikes||''}</span></button><button data-action="reply">${replyIcon} Responder</button></div>`:''}<div class="inline-composer"></div>${c.replyCount?`<button class="thread-toggle" data-action="replies" aria-expanded="${!!open}">${chevron}<span>${open?'Ocultar respostas':`${c.replyCount} ${c.replyCount===1?'resposta':'respostas'}`}</span></button>`:''}</div></article><div class="thread-replies" ${open?'':'hidden'}>${open?(branch.rows||[]).map(r=>commentHTML(r,depth+1)).join(''):''}${open&&branch.hasMore?'<button class="thread-more" data-more-replies="'+e(c.id)+'">Mais respostas</button>':''}</div></div>`;
 }
 function render(){
  if(dead||!host.isConnected)return;
  remember(roots);
  const total=count(data.totalComments??data.total);
  host.innerHTML=`<div class="discussion-heading"><h3>${total} ${total===1?'Comentário':'Comentários'}${o.scope?` <small>EP.${o.scope.episode}</small>`:''}</h3><label class="discussion-order"><span class="sr-only">Ordem dos comentários</span><select aria-label="Ordem dos comentários"><option value="recent" ${sort==='recent'?'selected':''}>↓ Mais recentes</option><option value="oldest" ${sort==='oldest'?'selected':''}>↑ Mais antigos</option><option value="popular" ${sort==='popular'?'selected':''}>Mais curtidos</option></select></label></div><div class="discussion-editor">${composer()}</div><div class="comment-list">${roots.map(c=>commentHTML(c)).join('')||'<p class="discussion-empty">Ainda não há comentários. Comece a conversa.</p>'}</div><p class="discussion-status" role="status"></p>${data.hasMore??offset<data.total?'<button class="secondary comments-more" data-more-comments>Mais comentários</button>':''}`;
  bindComposers();
 }
 function bindComposers(){
  for(const [form,cleanup] of formListeners)if(!host.contains(form)){cleanup.forEach(remove=>remove());formListeners.delete(form);}
  for(const form of host.querySelectorAll('.comment-composer')){
   if(formListeners.has(form))continue;
   const cleanup=[];formListeners.set(form,cleanup);const on=(node,event,fn)=>listen(node,event,fn,cleanup);
   const textarea=form.querySelector('textarea'),submit=form.querySelector('[type="submit"]'),spoiler=form.querySelector('[name="spoiler"]');let sending=false;
   on(textarea,'focus',()=>form.classList.add('is-expanded'));
   on(textarea,'input',()=>{submit.disabled=sending||textarea.value.trim().length<2;if(!form.dataset.parent&&!form.dataset.edit)o.store?.set(draftKey,textarea.value);textarea.style.height='auto';textarea.style.height=Math.min(220,textarea.scrollHeight||48)+'px';});
   on(form,'submit',async ev=>{
    ev.preventDefault();if(dead||sending||!requireLogin())return;
    const error=form.querySelector('[role="alert"]');error.textContent='';
    if(textarea.value.trim().length<2||textarea.value.length>2000){error.textContent='Escreva entre 2 e 2.000 caracteres.';return;}
    sending=true;submit.disabled=true;textarea.disabled=true;spoiler.disabled=true;
    const parentId=form.dataset.parent||null,editId=form.dataset.edit||null;
    let saved=false;
    try{await o.post(`/api/community/${o.animeId}`,{action:editId?'edit':'comment',id:editId,parentId,body:textarea.value,spoiler:spoiler.checked,...(o.scope||{})});saved=true;if(!parentId&&!editId)o.store?.set(draftKey,'');await refresh(parentId||comments.get(editId)?.parentId);}
    catch(err){if(form.isConnected){if(saved){textarea.value='';if(parentId||editId)form.remove();else form.classList.remove('is-expanded');o.toast?.('Comentário salvo. Não foi possível atualizar a conversa; tente recarregá-la.','err');}else error.textContent=err.message;}}
    finally{sending=false;if(form.isConnected){textarea.disabled=false;spoiler.disabled=false;submit.disabled=textarea.value.trim().length<2;}}
   });
   on(form.querySelector('[data-cancel-composer]'),'click',()=>{if(sending)return;if(form.dataset.parent||form.dataset.edit)form.remove();else{form.classList.remove('is-expanded');textarea.value='';spoiler.checked=false;submit.disabled=true;o.store?.set(draftKey,'');}});
  }
 }
 async function loadBranch(id,append=false){
  const branch=branches.get(id)||{rows:[],open:true},version=generation,wanted=Math.max(20,branch.rows.length);
  let result=await request({parent:id,offset:append?branch.rows.length:0,sort:'oldest'});
  if(dead||version!==generation)return;
  const rows=append?[...branch.rows,...result.comments]:[...result.comments];
  while(!append&&(result.hasMore??rows.length<result.total)&&rows.length<wanted){result=await request({parent:id,offset:result.nextOffset??rows.length,sort:'oldest'});if(dead||version!==generation)return;if(!result.comments.length)break;rows.push(...result.comments);}
  branch.rows=[...new Map(rows.map(row=>[row.id,row])).values()];branch.open=true;branch.hasMore=result.hasMore??branch.rows.length<result.total;
  branches.set(id,branch);remember(branch.rows);const c=comments.get(id);if(c)c.replyCount=result.total;
 }
 async function refresh(openParent){
  const version=++generation,wanted=Math.max(20,roots.length),first=await request({offset:0});if(dead||version!==generation)return;
  const rows=[...first.comments];let result=first;
  while((result.hasMore??rows.length<result.total)&&rows.length<wanted){result=await request({offset:result.nextOffset??rows.length});if(dead||version!==generation)return;if(!result.comments.length)break;rows.push(...result.comments);}
  data={...first,hasMore:result.hasMore??rows.length<first.total};roots=[...new Map(rows.map(row=>[row.id,row])).values()];offset=roots.length;comments.clear();remember(roots);
  const visited=new Set();
  async function updateBranches(current){
   for(const c of current){
    if(dead||version!==generation)return;
    visited.add(c.id);const branch=branches.get(c.id);
    if(c.replyCount&&(branch?.open||c.id===openParent)){await loadBranch(c.id);if(dead||version!==generation)return;await updateBranches(branches.get(c.id).rows);}
    else if(!c.replyCount)branches.delete(c.id);
   }
  }
  await updateBranches(roots);if(dead||version!==generation)return;
  for(const id of branches.keys())if(!visited.has(id))branches.delete(id);
  render();o.onData?.(data);
 }
 listen(host,'change',async ev=>{if(!ev.target.matches('.discussion-order select'))return;sort=ev.target.value;o.onSort?.(sort);branches.clear();try{await refresh();}catch(err){o.toast?.(err.message,'err');}});
 listen(host,'click',async ev=>{
  const button=ev.target.closest('button');if(!button||button.disabled||!host.contains(button))return;
  const article=button.closest('[data-comment]'),thread=button.closest('[data-thread]'),id=article?.dataset.comment||thread?.dataset.thread,c=comments.get(id),action=button.dataset.action;
  try{
   if(button.hasAttribute('data-more-comments')){button.disabled=true;const version=generation,result=await request({offset});if(dead||version!==generation)return;roots=[...new Map([...roots,...result.comments].map(row=>[row.id,row])).values()];offset=roots.length;data={...data,total:result.total,totalComments:result.totalComments??data.totalComments,hasMore:result.hasMore??offset<result.total};render();return;}
   if(button.dataset.moreReplies){button.disabled=true;await loadBranch(button.dataset.moreReplies,true);render();return;}
   if(action==='replies'){const branch=branches.get(id);if(branch?.open){branch.open=false;render();}else{button.disabled=true;await loadBranch(id);render();}return;}
   if(!action||!c||!requireLogin())return;
   if(action==='reply'||action==='edit'){const target=article.querySelector('.inline-composer');host.querySelectorAll('.inline-composer').forEach(el=>el.innerHTML='');target.innerHTML=composer(action==='edit'?{edit:c}:{parent:id});bindComposers();target.querySelector('textarea').focus();return;}
   button.disabled=true;
   if(action==='vote'){const votes=[...article.querySelectorAll('[data-action="vote"]')];if(votes.some(vote=>vote!==button&&vote.disabled)){button.disabled=false;return;}votes.forEach(vote=>vote.disabled=true);const clicked=Number(button.dataset.value),value=c.reaction===clicked?0:clicked;try{await o.post(`/api/community/${o.animeId}`,{action:'commentReaction',id,value});if(dead||!article.isConnected)return;if(c.reaction===1)c.likes=Math.max(0,(c.likes||0)-1);if(c.reaction===-1)c.dislikes=Math.max(0,(c.dislikes||0)-1);if(value===1)c.likes=(c.likes||0)+1;if(value===-1)c.dislikes=(c.dislikes||0)+1;c.reaction=value;for(const vote of votes){const n=Number(vote.dataset.value);vote.classList.toggle('selected',n===value);vote.setAttribute('aria-pressed',String(n===value));vote.querySelector('span').textContent=(n===1?c.likes:c.dislikes)||'';}}finally{votes.forEach(vote=>vote.disabled=false);}}
   else if(action==='delete'){if(!button.dataset.confirmed){button.dataset.confirmed='1';button.textContent='Confirmar exclusão';button.disabled=false;return;}await o.post(`/api/community/${o.animeId}`,{action:'delete',id});await refresh(c.parentId);}
   else if(action==='report'){await o.post(`/api/community/${o.animeId}`,{action:'report',id});button.textContent='Denúncia registrada';}
  }catch(err){o.toast?.(err.message,'err');if(button.isConnected)button.disabled=false;}
 });
 render();
 return {destroy(){dead=true;++generation;abort.abort();hostListeners.forEach(remove=>remove());for(const cleanup of formListeners.values())cleanup.forEach(remove=>remove());formListeners.clear();},refresh};
}
