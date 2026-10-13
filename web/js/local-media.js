/** AnimeDragon v31 — searchable DragonGIF-backed media gallery. No GIPHY API key. */
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DRAGONGIF_ORIGIN='https://dragongif-api.jhonjhszgame2003.workers.dev';
/** Nunca exibir URLs fornecidas pela API que apontem para outro domínio. */
export function isDragonMediaUrl(value,kind){
 if(typeof value!=='string'||value.length>1000||!value.startsWith(DRAGONGIF_ORIGIN+'/media/'))return false;
 let url;try{url=new URL(value)}catch{return false}
 if(url.href!==value||url.origin!==DRAGONGIF_ORIGIN||url.search||url.hash||url.username||url.password)return false;
 const m=/^\/media\/(gifs|stickers)\/(.+)$/i.exec(url.pathname);
 if(!m||(kind&&m[1]!==kind))return false;
 const segments=m[2].split('/');
 if(segments.some(s=>!s||/%(?:2f|5c|00)/i.test(s)))return false;
 try{if(segments.some(s=>{const d=decodeURIComponent(s);return d==='.'||d==='..'||/[\\\x00-\x1f]/.test(d)}))return false}catch{return false}
 return /\.(gif|webp|png|apng|avif)$/i.test(url.pathname);
}
let latestResults=null;
export function localAvatarSrc(value){
 if(typeof value!=='string')return null;
 const path=value.split('?')[0];
 if(isDragonMediaUrl(path,'gifs'))return path;
 // URLs antigas são convertidas para URLs diretas quando renderizadas no navegador.
 if(/^\/api\/dragongif\/file\/dg_[0-9a-f]{32}$/.test(path))return path;
 if(!/^\/assets\/profile-media\/GIFs\/[\w%().!~*'\/-]+\.(?:gif|webp|png|apng|jpe?g|avif)$/i.test(path)||/(?:^|\/)\.{1,2}(?:\/|$)/.test(path)||/%2f|%5c|%00/i.test(path))return null;
 return path;
}
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function filterLocalMedia(rows,{query='',kind='gif'}={}){
 const terms=fold(query).trim().split(/\s+/).filter(Boolean);
 return (Array.isArray(rows)?rows:[]).filter(x=>x&&typeof x.url==='string'&&['gif','sticker'].includes(x.kind)&&(kind==='all'||x.kind===kind)&&terms.every(t=>fold(x.title+' '+(x.tags||[]).join(' ')).includes(t)));
}
export async function searchDragonMedia({query='',kind='all',page=1,limit=36,fetcher=globalThis.fetch,signal}={}){
 const type=kind==='gif'?'gifs':kind==='sticker'?'stickers':'all';
 const params=new URLSearchParams({q:String(query).slice(0,100),type,page:String(page),limit:String(limit)});
 let response;
 try{response=await fetcher(DRAGONGIF_ORIGIN+'/api/v1/media?'+params,{signal,mode:'cors',cache:'no-store',credentials:'omit'});}
 catch(error){if(error?.name==='AbortError')throw error;throw new Error('Falha na conexão direta com DragonGIF. Verifique a API e as permissões CORS no navegador.');}
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw new Error(data.error||'Falha ao consultar o DragonGIF.');
 const ids=new Set();
 const items=(Array.isArray(data.items)?data.items:[]).filter(x=>{
   if(!/^dg_[0-9a-f]{32}$/.test(x.id)||ids.has(x.id)||!['gifs','stickers'].includes(x.kind)||!isDragonMediaUrl(x.url,x.kind))return false;
   ids.add(x.id);return true;
 }).map(x=>({id:x.id,title:String(x.title||'Sem título').slice(0,120),kind:x.kind==='gifs'?'gif':'sticker',url:x.url,tags:Array.isArray(x.tags)?x.tags:[]}));
 return {...data,items};
}
export async function dragonStats({fetcher=globalThis.fetch}={}){
 let response;
 try{response=await fetcher(DRAGONGIF_ORIGIN+'/api/v1/stats',{mode:'cors',cache:'no-store',credentials:'omit'});}
 catch{throw new Error('Não foi possível conectar à API pública do DragonGIF.');}
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw new Error(data.error||'API DragonGIF indisponível.');
 return data;
}
/** Restaura somente imagens com URLs legadas de perfis das versões anteriores. */
export async function restoreDragonImages(root=document,{fetcher=globalThis.fetch}={}){
 const targets=Array.from(root.querySelectorAll('img[src^="/api/dragongif/file/dg_"]'));
 await Promise.all(targets.map(async img=>{
   const value=img.getAttribute('src');const id=/^\/api\/dragongif\/file\/(dg_[0-9a-f]{32})$/.exec(value)?.[1];
   if(!id)return;
   try{
     const r=await fetcher(DRAGONGIF_ORIGIN+'/api/v1/media/'+id,{mode:'cors',credentials:'omit'});
     const d=await r.json();if(r.ok&&d.ok&&isDragonMediaUrl(d.item?.url,d.item?.kind))img.src=d.item.url;
   }catch{/* perfis novos utilizam as URLs estáticas diretamente */}
 }));
}
export async function loadLocalCatalog({refresh=false,fetcher=globalThis.fetch}={}){
 if(refresh)latestResults=null;
 if(!latestResults)latestResults=searchDragonMedia({kind:'all',limit:100,fetcher}).then(data=>data.items).catch(error=>{latestResults=null;throw error});
 return latestResults;
}
export function localGalleryPage(){return `<section class="dragon-media-page local-gallery"><div class="dragon-media-heading"><div><span class="eyebrow">DRAGONGIF · BIBLIOTECA CONECTADA</span><h1>Seu universo, em movimento.</h1><p>Explore GIFs de avatar e stickers para seu perfil, direto da biblioteca DragonGIF.</p></div></div><div class="local-gallery-stats" id="local-gallery-count">Conectando à biblioteca DragonGIF…</div><form class="dragon-media-search" id="local-gallery-form"><label class="sr-only" for="local-gallery-query">Pesquisar mídia</label><input id="local-gallery-query" type="search" placeholder="Anime, personagem, humor, nome do arquivo…" autocomplete="off" maxlength="90"><button class="primary" type="submit">Pesquisar</button></form><div class="dragon-media-chips" role="group" aria-label="Tipos de mídia"><button type="button" data-local-kind="gif" class="selected">GIFs animados</button><button type="button" data-local-kind="sticker">Stickers</button><button type="button" data-local-kind="all">Todos</button></div><div class="dragon-media-toolbar"><span id="local-gallery-results">Descubra a biblioteca.</span><a class="secondary" href="#profile?edit=stickers">Personalizar meu perfil ↗</a></div><p role="status" class="dragon-media-status" id="local-gallery-status"></p><div class="dragon-media-grid" id="local-gallery-grid"></div><button type="button" class="secondary dragon-media-more" id="local-gallery-more" hidden>Carregar mais resultados</button><dialog class="dragon-media-dialog" id="local-gallery-dialog"><button type="button" class="icon-btn dragon-media-close" id="local-gallery-close" aria-label="Fechar prévia">×</button><div class="dragon-media-preview" id="local-gallery-preview"></div><div class="dragon-media-selection" id="local-gallery-selection"></div></dialog></section>`;}
export function mountLocalGallery(host,{onSelect,onLogin,user,loadMedia=searchDragonMedia}={}){
 let dead=false,kind='gif',query='',page=0,hasMore=false,busy=false,selected=null,items=[],serial=0,controller=null,timer=null;
 const grid=host.querySelector('#local-gallery-grid'),status=host.querySelector('#local-gallery-status'),more=host.querySelector('#local-gallery-more'),dialog=host.querySelector('dialog');
 const card=x=>`<button type="button" class="dragon-media-card local-media-card" data-local-open="${escapeHtml(x.id)}" aria-label="Visualizar ${escapeHtml(x.title)}"><img src="${escapeHtml(x.url)}" alt="${escapeHtml(x.title)}" loading="lazy" decoding="async"><span>${escapeHtml(x.title)}</span></button>`;
 async function load(reset=false){
  if(reset){page=0;items=[];grid.replaceChildren();controller?.abort();serial++;}
  if(dead||busy&&!reset||!reset&&!hasMore&&page>0)return;
  const token=++serial;const abort=new AbortController();controller=abort;busy=true;more.hidden=true;status.textContent='Pesquisando na biblioteca DragonGIF…';
  try{
   const result=await loadMedia({query,kind,page:page+1,limit:36,signal:abort.signal});
   if(dead||token!==serial)return;
   page++;hasMore=!!result.hasMore;const ids=new Set(items.map(x=>x.id));const add=result.items.filter(x=>!ids.has(x.id));items.push(...add);grid.insertAdjacentHTML('beforeend',add.map(card).join(''));
   host.querySelector('#local-gallery-results').textContent=`${items.length} ${kind==='gif'?'GIFs':kind==='sticker'?'stickers':'arquivos'} exibidos${hasMore?' · mais resultados disponíveis':''}`;
   status.textContent=items.length?'':query?'Nenhum resultado para esta pesquisa. Tente outro termo.':'Nenhum arquivo cadastrado ainda. Importe os arquivos no painel DragonGIF.';
   more.hidden=!hasMore;
  }catch(error){if(!dead&&token===serial&&error.name!=='AbortError')status.textContent=error.message||'Falha ao buscar no DragonGIF.';}
  finally{if(token===serial){busy=false;controller=null;}}
 }
 dragonStats().then(d=>{if(!dead)host.querySelector('#local-gallery-count').textContent=`${(d.gifs||0).toLocaleString('pt-BR')} GIFs · ${(d.stickers||0).toLocaleString('pt-BR')} stickers · acervo DragonGIF`}).catch(()=>{if(!dead)host.querySelector('#local-gallery-count').textContent='Aguardando conexão com o DragonGIF.'});
 void load(true);
 function open(x){selected=x;host.querySelector('#local-gallery-preview').innerHTML=`<img src="${escapeHtml(x.url)}" alt="${escapeHtml(x.title)}">`;host.querySelector('#local-gallery-selection').innerHTML=`<h2>${escapeHtml(x.title)}</h2><p>${x.kind==='gif'?'GIF animado':'Sticker'} · DragonGIF</p><div class="dragon-media-actions">${x.kind==='gif'?'<button class="primary" type="button" id="local-gallery-use">Usar como avatar</button>':'<a class="primary" href="#profile?edit=stickers">Adicionar ao perfil ↗</a>'}<button class="secondary" id="local-gallery-cancel" type="button">Voltar à galeria</button></div><p id="local-gallery-action-status" role="status"></p>`;dialog.showModal();}
 host.addEventListener('click',async e=>{
  const tab=e.target.closest('[data-local-kind]');if(tab){kind=tab.dataset.localKind;host.querySelectorAll('[data-local-kind]').forEach(b=>b.classList.toggle('selected',b===tab));void load(true);return}
  const cardBtn=e.target.closest('[data-local-open]');if(cardBtn){const item=items.find(x=>x.id===cardBtn.dataset.localOpen);if(item)open(item);return}
  if(e.target.closest('#local-gallery-more')){void load();return}
  if(e.target.closest('#local-gallery-close,#local-gallery-cancel')){dialog.close();return}
  const use=e.target.closest('#local-gallery-use');if(!use||busy||!selected)return;
  if(!user?.()){dialog.close();onLogin?.();return}
  use.disabled=true;const note=host.querySelector('#local-gallery-action-status');
  try{await onSelect?.(selected.url);if(!dead)dialog.close();}catch(error){note.textContent=error.message||'Não foi possível salvar o avatar.'}finally{if(use.isConnected)use.disabled=false}
 });
 const input=host.querySelector('#local-gallery-query');
 host.querySelector('#local-gallery-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(timer);query=input.value.trim();void load(true)});
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{query=input.value.trim();void load(true)},330)});
 more.onclick=()=>void load();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 return {destroy(){dead=true;controller?.abort();clearTimeout(timer);if(dialog.open)dialog.close()}};
}
