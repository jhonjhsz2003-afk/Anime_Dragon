import {releasesPage,mountReleases,releaseDay} from './releases.js?v=14.0.1';
import {giphyPage,mountGiphy,createGiphyClient,giphyId,observeGiphyAvatars} from './giphy.js?v=14.0.1';
import {createHeaderScroll} from './header-scroll.js?v=14.0.1';
import {createAuthSession} from './auth-session.js?v=14.0.1';
import {mountDiscussion} from './discussion.js?v=14.0.1';
import {bindLiveSearch,rankSearchResults} from './live-search.js?v=11.0.0';
import {preferredCaptionLocale} from './caption-language.js?v=9.6.1';
import {createCatalogCache,createIntentPreloader} from './navigation.js?v=14.0.1';
import { mountWatchPlayer } from './player.js?v=14.0.1';
import {createSourceLoader} from './sources.js?v=14.0.1';
import {createAccountDialog} from './account-dialog.js?v=14.0.1';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const defaultAvatar='/assets/avatar-default.svg';
const safeAvatar=src=>/^\/api\/avatar\/[a-zA-Z0-9-]{1,80}\?v=[a-zA-Z0-9-]+$/.test(src||'')||/^\/assets\/avatars\/avatar-([1-9]|1[0-2])(-animated)?\.svg$/.test(src||'')?src:defaultAvatar;
const frameStyle=(frame={})=>{const x=Math.max(0,Math.min(100,Number(frame.x??50)||0)),y=Math.max(0,Math.min(100,Number(frame.y??50)||0)),z=Math.max(100,Math.min(300,Number(frame.zoom??100)||100))/100;return `object-position:${x}% ${y}%;transform:translate(${(50-x)*(z-1)}%,${(50-y)*(z-1)}%) scale(${z})`};
function avatarView(src,frame={},cls='avatar',id='',alt=''){const gif=giphyId(src);return `<span class="avatar-frame ${cls}" ${id?`id="${id}"`:''}><img src="${safeAvatar(src)}" ${gif?`data-giphy-avatar="${gif}" title="GIF via GIPHY"`:''} alt="${esc(alt)}" style="${frameStyle(frame)}"></span>`}
let avatarObjectUrl=null;
const genres=[['10759','Ação e aventura','⚔'],['10765','Fantasia','✦'],['isekai','Isekai','⛩'],['magic','Magia','✧'],['light-novel','Light novel','▤'],['shounen','Shounen','炎'],['romance','Romance','♡'],['school','Vida escolar','桜'],['slice-of-life','Slice of life','☕'],['mecha','Mecha','⚙'],['supernatural','Sobrenatural','☾'],['samurai','Samurai','刀'],['sports','Esportes','◉'],['sci-fi','Ficção científica','◇'],['manga','Baseados em mangá','漫'],['35','Comédia','☀'],['18','Drama','◈'],['9648','Mistério','◌'],['10762','Infantil','✿']];
const icons={home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',anime:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m10 8 6 4-6 4z"/>',genres:'<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>',list:'<path d="M19 21 12 17 5 21V4h14z"/>',history:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',logout:'<path d="M9 3H3v18h6M10 12h11m-5-5 5 5-5 5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>'};
icons.favorites='<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>';
icons.library=icons.list;icons.calendar=icons.history;
icons.menu='<path d="M4 6h16M4 12h16M4 18h16"/>';
icons.shuffle='<path d="m17 3 4 4-4 4m0 2 4 4-4 4M3 7h3c4 0 5 10 9 10h6M3 17h3c4 0 5-10 9-10h6"/>';
icons.thumbUp='<path d="M7 10v11H3V10zm0 0 5-7c2 0 2 2 1 5h5c2 0 3 1 2 4l-2 7c0 1-1 2-3 2H7"/>';
icons.thumbDown='<path d="M7 14V3H3v11zm0 0 5 7c2 0 2-2 1-5h5c2 0 3-1 2-4l-2-7c0-1-1-2-3-2H7"/>';
icons.share='<path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/>';
icons.spark='<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>';
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[n]||icons.anime}</svg>`;
const fallback='/assets/poster-placeholder.svg';
const img=(path,size='w342')=>/^\/assets\/demo\/[a-z0-9-]+\.svg$/.test(path||'')?path:/^\/[\w.\/-]+$/.test(path||'')?`https://image.tmdb.org/t/p/${size}${path}`:fallback;
const year=p=>p.first_air_date?.slice(0,4)||'—';
const rating=p=>Number(p.vote_average||0)>0?Number(p.vote_average).toFixed(1):'—';
const state={authStatus:'loading',user:null,avatar:defaultAvatar,home:null,items:new Map(),list:[],history:[],prefs:store.get('ad_preferences',{motion:true,economy:false,autoCaptions:false}),details:null,episodes:[],season:1};
let lastPage=location.hash||'#home',handlingHistory=false;
let renderVersion=0,modalVersion=0,seasonVersion=0,focusBeforeModal=null,heroTimer=null,watchController=null,searchController=null,discussionController=null,releasesController=null;
let giphyController=null;const giphyClient=createGiphyClient();
if(state.prefs.captionPreferenceVersion!==1){state.prefs.autoCaptions=false;state.prefs.captionPreferenceVersion=1;store.set('ad_preferences',state.prefs);}
state.heroIndex=0;state.favorites=[];state.library=[];state.watched=[];state.commentSort='recent';
const pending=new Map(),cache=new Map();let catalogStorage;try{catalogStorage=sessionStorage;}catch{}const catalogMemory=createCatalogCache(catalogStorage);
function currentHistoryUrl(){return typeof location.href==='string'&&location.href?location.href:(typeof location.hash==='string'&&location.hash?location.hash:'#home')}
function route(){const hash=typeof location.hash==='string'?location.hash:'#home';const [page='home',query='']=(hash.slice(1)||'home').split('?');return {page,params:new URLSearchParams(query)}}
const overlayState=()=>history.state?.adOverlay||null;
function replaceHistoryState(stateValue,url=currentHistoryUrl()){if(typeof history.replaceState==='function')history.replaceState(stateValue,'',url)}
function pushHistoryState(stateValue,url=currentHistoryUrl()){if(typeof history.pushState==='function')history.pushState(stateValue,'',url);else replaceHistoryState(stateValue,url)}
function writeOverlay(next,{replace=false,direct=false}={}){
 const stateValue={...(history.state||{}),adOverlay:next||null};
 const keepDirect=replace&&next?.type==='detail'&&history.state?.adDirectDetail===true&&Number(history.state.adOverlay?.id)===Number(next.id);
 delete stateValue.adDirectDetail;if(direct||keepDirect)stateValue.adDirectDetail=true;
 if(replace)replaceHistoryState(stateValue);else pushHistoryState(stateValue);
}
function closeOverlay(){
 if(overlayState()?.type==='detail'&&history.state?.adDirectDetail===true){const base={...(history.state||{}),adOverlay:null};delete base.adDirectDetail;replaceHistoryState(base,'#home');lastPage='#home';void render();return;}
 if(overlayState()&&typeof history.back==='function')history.back();else closeModal();
}
function nav(page){if(['entrar','cadastro'].includes(page)){openAccount(page==='entrar');return}const hash=`#${page}`;if(location.hash===hash)render();else location.hash=hash}
if(!history.state||!Object.hasOwn(history.state,'adOverlay'))replaceHistoryState({...(history.state||{}),adOverlay:null});
function key(kind){return `ad_v7_${kind}_${state.user?.id||'guest'}`}
function loadPersonal(){state.favorites=[];state.library=[];state.watched=[];state.list=store.get(key('list'),[]).filter(x=>x&&Number.isInteger(x.id)&&x.media_type==='tv');state.history=store.get(key('history'),[]).filter(x=>x&&Number.isInteger(x.id)&&x.media_type==='tv');remember([...state.list,...state.history]);if(state.user)syncCollectionCounts().catch(()=>{});}
function remember(items){items.forEach(p=>state.items.set(String(p.id),p))}
function toast(message,type='ok'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;$('#toast-root').append(el);setTimeout(()=>el.remove(),4000)}
async function api(path,options={}){
 options.signal?.throwIfAborted?.();
 const get=!options.method||options.method==='GET',shared=get&&!options.signal,cached=path.startsWith('/api/community')?null:cache.get(path)||catalogMemory.get(path);
 if(get&&cached&&cached.expires>Date.now())return cached.data;
 if(shared&&pending.has(path))return pending.get(path);
 const timeout=AbortSignal.timeout(path.startsWith('/api/playback')?20000:15000),signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
 const promise=(async()=>{const response=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},signal});const data=await response.json().catch(()=>({ok:false,error:'Resposta inválida do servidor.'}));if(!response.ok||data.ok===false)throw new Error(data.error||'Não foi possível concluir. Tente novamente.');if(get&&!path.startsWith('/api/auth')&&!path.startsWith('/api/playback')&&!path.startsWith('/api/community')){if(cache.size>100)cache.delete(cache.keys().next().value);const expires=Date.now()+(path==='/api/catalog/home'?(data.partial?15000:45000):path.startsWith('/api/catalog/releases')?(data.partial||data.summary?15000:60000):300000);cache.set(path,{data,expires});catalogMemory.put(path,data,expires)}return data})();
 if(shared)pending.set(path,promise);try{return await promise}finally{if(shared&&pending.get(path)===promise)pending.delete(path)}
}
const loadPlayback=createSourceLoader(api);
const warmCatalog=createIntentPreloader(api);
const post=(path,data)=>api(path,{method:'POST',body:JSON.stringify(data)});
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('document-hidden',document.hidden));
function applyPrefs(){document.documentElement.classList.toggle('reduce-motion',!state.prefs.motion);document.documentElement.classList.toggle('data-saver',!!state.prefs.economy)}
function imageTag(p,{size='w500',eager=false,cls='poster'}={}){
 const economy=state.prefs.economy,small=size==='w185',width=economy?'w185':size;
 const variants=small?[185,342,500]:[342,500,780];
 const sizes=small?'80px':'(max-width: 600px) calc((100vw - 44px) / 2), (max-width: 1000px) 240px, 260px';
 return `<img class="${cls}" src="${img(p.poster_path,width)}" ${p.poster_path&&!economy?`srcset="${variants.map(n=>`${img(p.poster_path,'w'+n)} ${n}w`).join(', ')}" sizes="${sizes}"`:''} width="500" height="750" loading="${eager?'eager':'lazy'}" decoding="async" ${eager?'fetchpriority="high"':''} alt="${esc(p.title)}">`;
}
function card(p){return `<button type="button" class="card" data-id="${p.id}" aria-label="Ver ${esc(p.title)}"><div class="poster-wrap">${imageTag(p)}<span class="card-score">★ ${rating(p)}</span><span class="card-play">▶</span>${p.last_episode_to_air?.air_date?`<span class="release-tag">EP. ${p.last_episode_to_air.episode_number} · ${esc(p.last_episode_to_air.air_date.slice(5).split('-').reverse().join('/'))}</span>`:''}</div><div class="card-body"><div class="card-title">${esc(p.title)}</div><div class="card-sub">${year(p)} <span>•</span> Anime</div></div></button>`}
function skeletons(){return `<div class="catalog-grid" aria-label="Carregando animes" aria-busy="true">${Array.from({length:8},()=>'<div class="card skeleton"><div class="poster"></div><div class="card-body">&nbsp;</div></div>').join('')}</div>`}
const empty=(title,text='',button='')=>`<div class="empty"><span class="empty-symbol">${icon('anime')}</span><h3>${title}</h3><p>${text}</p>${button}</div>`;
function section(id,title,subtitle,items,{renderer=card,link=''}={}){
 if(!items?.length)return '';
 return `<section class="section"><div class="section-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${link?`<a href="${link}" class="section-link">Ver todos ${icon('right')}</a>`:''}</div><div class="catalog-rail"><button class="rail-arrow rail-prev" data-scroll="${id}" data-dir="-1" aria-label="Voltar em ${esc(title)}">${icon('left')}</button><div class="cards" id="${id}" tabindex="0" aria-label="${esc(title)}">${items.map(renderer).join('')}</div><button class="rail-arrow rail-next" data-scroll="${id}" data-dir="1" aria-label="Avançar em ${esc(title)}">${icon('right')}</button></div></section>`;
}
function episodeRailCard(p){
 const episode=p.last_episode_to_air;
 const date=episode?.air_date?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(episode.air_date+'T12:00:00Z')):'';
 return `<button type="button" class="card episode-rail-card" data-id="${p.id}" data-season="${episode?.season_number??1}" aria-label="Ver ${esc(p.title)}, episódio ${episode?.episode_number??1}"><div class="poster-wrap">${imageTag(p)}<span class="card-play">▶</span><span class="release-tag">EP.${episode?.episode_number??1}</span></div><div class="card-body"><div class="card-title">${esc(p.title)}</div><div class="card-sub">${date?`Exibido em ${esc(date)}`:'Episódio recente'}</div></div></button>`;
}
function upcomingRailCard(p){
 const valid=/^\d{4}-\d{2}-\d{2}$/.test(p.first_air_date||'')&&Number.isFinite(Date.parse(p.first_air_date));
 const date=valid?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(p.first_air_date+'T12:00:00Z')):'Data a confirmar';
 return `<button type="button" class="card" data-id="${p.id}" aria-label="Ver ${esc(p.title)}"><div class="poster-wrap">${imageTag(p)}<span class="release-tag">Nova série</span></div><div class="card-body"><div class="card-title">${esc(p.title)}</div><div class="card-sub">Estreia · ${esc(date)}</div></div></button>`;
}
function rankedCard(p,index){
 return `<button type="button" class="card ranked-card" data-id="${p.id}" aria-label="${index+1}. Ver ${esc(p.title)}"><span class="rank-number" aria-hidden="true">${index+1}</span><div class="poster-wrap">${imageTag(p)}<span class="card-play">▶</span></div><div class="card-body"><div class="card-title">${esc(p.title)}</div><div class="card-sub">★ ${rating(p)} · ${year(p)}</div></div></button>`;
}
function brand(){return `<a class="brand" href="#home" aria-label="AnimeDragon, início"><img src="/assets/dragon-mark.webp?v=14.0.1" alt="" width="45" height="45"><strong>Anime<span>Dragon</span></strong></a>`}
function accountMarkup(){if(state.user)return `<a class="profile-chip identity-ring-${identityOf().frame}" href="#profile" aria-label="Meu perfil">${avatarView(state.avatar,state.user?.avatarFrame,'avatar','','Meu perfil')}<b class="${nameClass(state.user.nameColor)}">${esc(state.user.name)}</b></a><button class="icon-btn" data-logout aria-label="Sair da conta">${icon('logout')}</button>`;if(state.authStatus!=='ready')return '<span class="account-restoring" role="status">Conectando sua conta…</span>';return `<a href="#entrar" class="login-link">Entrar ${icon('profile')}</a>`;}
function updateAccount(){const account=$('.header-account');if(account){account.innerHTML=accountMarkup();bindLogout(account);}}
function bindLogout(root=document){$$('[data-logout]',root).forEach(b=>b.onclick=async()=>{b.disabled=true;try{await post('/api/auth/logout',{});authSession.clear();nav('home');toast('Você saiu da conta.')}catch(e){toast(e.message,'err');b.disabled=false}});}
function layout(inner){
 const {page:current,params}=route(),releases=current==='releases';
 const navs=[['home','Início','#home'],['anime','Animes','#anime'],['calendar','Lançamentos','#releases'],['library','Minha lista','#library']];
 const active=index=>index===2?releases:index===1?current==='anime'&&!releases:current===navs[index][0];
 const searchOpen=current==='search';
 return `<div class="shell ${current==='home'?'home-view':''}"><header class="site-header ${searchOpen?'search-open':''}"><div class="masthead"><button class="icon-btn menu-toggle" id="mobile-menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="main-navigation">${icon('menu')}</button>${brand()}<nav class="top-nav" id="main-navigation" aria-label="Navegação principal">${navs.map(([id,name,href],index)=>`<a href="${href}" class="${active(index)?'active':''}" ${active(index)?'aria-current="page"':''}>${icon(id)}<span>${name}</span></a>`).join('')}<details class="header-more"><summary aria-label="Mais opções">${icon('menu')}<span>Explorar</span></summary><div><a href="#genres">${icon('genres')} Gêneros e temas</a><a href="#gifs">${icon('spark')} Galeria de GIFs</a><a href="#calendar">${icon('calendar')} Minha agenda</a><a href="#history">${icon('history')} Histórico</a><a href="#settings">${icon('settings')} Preferências</a></div></details></nav><div class="header-tools"><button class="icon-btn" id="header-surprise" data-surprise type="button" aria-label="Escolher um anime aleatório">${icon('shuffle')}</button><button class="icon-btn" id="header-search-toggle" type="button" aria-label="Buscar anime" aria-expanded="${searchOpen}" aria-controls="header-search">${icon('search')}</button></div><div class="header-account">${accountMarkup()}</div></div><div class="topbar" id="header-search"><form class="search" id="search-form" role="search"><label class="sr-only" for="global-search">Buscar anime</label>${icon('search')}<input id="global-search" type="search" aria-controls="page-content" autocomplete="off" name="q" placeholder="Buscar por nome do anime…" maxlength="120" value="${esc(params.get('q')||'')}"></form><button class="icon-btn" id="header-search-close" type="button" aria-label="Fechar busca">${icon('close')}</button></div></header><main class="main"><div class="content">${current!=='home'?'<button class="page-back" id="page-back">← Voltar</button>':''}<div id="page-content">${inner}</div><footer class="site-footer"><div><a class="footer-brand" href="#home">Anime<span>Dragon</span></a><p>Uma nova história a cada capítulo.</p><small>© ${new Date().getFullYear()} AnimeDragon</small></div><div class="footer-credit"><span>Catálogo atualizado automaticamente</span><small>AnimeDragon v14.0.1</small><a class="giphy-footer-credit" href="https://giphy.com/" target="_blank" rel="noopener noreferrer"><img src="/assets/powered-by-giphy.png" width="140" alt="Powered By GIPHY"></a></div></footer></div></main></div>`;
}
function home(){
 const d=state.home,hero=(d.featured||d.trending)[0];
 if(!hero)return empty('Ainda não há animes por aqui.','Tente novamente em instantes.');
 return `<div class="layout"><div class="home-main">${heroMarkup()}${d.updated?.length?section('updated','Novos episódios','Animes atuais que acabaram de receber episódio novo',d.updated,{renderer:episodeRailCard,link:'#anime?sort=first_air_date.desc'}):''}${continueWatching()}${section('popular',d.trendingSource==='tmdb_week'?'Em alta nesta semana':'Em alta agora','Tendências e histórias que estão movimentando a temporada',d.trending,{link:'#anime'})}${d.upcoming?.length?section('upcoming','Próximas estreias','Novas séries com data anunciada · Veja também temporadas e episódios na agenda',d.upcoming,{renderer:upcomingRailCard,link:'#releases'}):''}${section('top','Melhores do momento','Boas avaliações, popularidade e variedade entre os animes atuais',d.top,{link:'#anime?sort=vote_average.desc'})}${d.popular?.length?section('ranking','Populares agora','Uma seleção de animes atuais que vale conhecer',d.popular.slice(0,10),{renderer:rankedCard}):''}${section('recent','Estreias recentes','Histórias que chegaram recentemente ao catálogo',d.recent,{link:'#anime?sort=first_air_date.desc'})}<section class="section home-discovery"><div class="discovery-bar"><div><span class="eyebrow">CATÁLOGO ATUALIZADO AUTOMATICAMENTE</span><h2>Qual universo combina com você?</h2></div><button class="secondary" id="surprise-me" data-surprise>${icon('shuffle')} Surpreenda-me</button></div><div class="mood-chips">${genres.map(([id,name,symbol])=>`<a href="#anime?genre=${id}">${symbol} ${name}</a>`).join('')}</div></section></div></div>`;
}
function genreTiles(){return `<div class="genre-grid">${genres.map(([id,name,symbol],i)=>`<a class="genre genre-${i}" href="#anime?genre=${id}"><span>${symbol}</span><b>${name}</b>${icon('right')}</a>`).join('')}</div>`}
function heading(title,subtitle){return `<div class="page-heading"><span class="eyebrow">ANIMEDRAGON</span><h1>${title}</h1><p>${subtitle}</p></div>`}
function listing(page,params){const search=page==='search',selected=params.get('genre')||'';return `${heading(search?'Encontre sua próxima história':(genres.find(g=>g[0]===selected)?.[1]||'Catálogo atual de animes'),search?`Buscando por “${esc(params.get('q')||'')}”`:'Animes em alta, novas estreias e séries populares que continuam recebendo episódios.')}<div class="catalog-toolbar">${!search?`<div class="filters">${[['popularity.desc','Em alta'],['vote_average.desc','Melhores recentes'],['first_air_date.desc','Estreias recentes']].map(([v,l])=>`<button class="filter ${(params.get('sort')||'popularity.desc')===v?'active':''}" data-sort="${v}">${l}</button>`).join('')}</div><label class="select-label">Gênero ou tema<select id="genre-select"><option value="">Todos os universos</option>${genres.map(([id,name])=>`<option value="${id}" ${id===selected?'selected':''}>${name}</option>`).join('')}</select></label>`:''}</div><div id="catalog-results">${skeletons()}</div>`}
function collection(kind){const history=kind==='history';return `${heading(history?'Meu histórico':kind==='favorites'?'Meus favoritos':'Assistir depois',history?'Continue de onde parou neste navegador.':'Sua coleção salva na conta, em qualquer dispositivo.')}<div id="collection-results">${history?(state.history.length?`<div class="catalog-grid">${state.history.map(card).join('')}</div>`:empty('Nenhum episódio iniciado ainda.')):state.user?skeletons():empty('Entre para salvar sua coleção.','Seus favoritos e sua lista ficam vinculados à sua conta.','<a class="primary" href="#entrar">Entrar</a>')}</div>`}

const nameColors={ice:'Azul gelo',blue:'Azul',cyan:'Ciano',green:'Verde',gold:'Dourado',orange:'Laranja',pink:'Rosa',violet:'Violeta'};
const nameClass=color=>'name-color-'+(Object.hasOwn(nameColors,color)?color:'ice');
const profileCovers={aurora:'Aurora',inferno:'Fogo azul',nebula:'Nebulosa',moon:'Luar'};
const profileFrames={flame:'Chama azul',crystal:'Cristal',halo:'Halo dourado',plain:'Essencial'};
function identityOf(user=state.user){const value=user?.identity||{};return {cover:Object.hasOwn(profileCovers,value.cover)?value.cover:'aurora',frame:Object.hasOwn(profileFrames,value.frame)?value.frame:'flame',title:value.title||'Explorador de universos'}}
function identityClass(user=state.user){const value=identityOf(user);return `identity-cover identity-cover-${value.cover} identity-ring-${value.frame}`}
function identityEditor(){const value=identityOf();return `<section class="identity-editor"><h3>Crie sua assinatura.</h3><p>Escolha uma atmosfera, uma moldura e um título que tenham a sua cara. A prévia ao lado muda na hora.</p><fieldset><legend>Atmosfera do perfil</legend><input type="hidden" id="profile-cover" value="${value.cover}"><div class="identity-choices">${Object.entries(profileCovers).map(([id,label])=>`<button type="button" class="identity-choice" data-identity-cover="${id}" aria-pressed="${value.cover===id}"><span class="identity-sample identity-cover-${id}" aria-hidden="true"></span>${label}</button>`).join('')}</div></fieldset><fieldset><legend>Moldura do avatar</legend><input type="hidden" id="profile-frame" value="${value.frame}"><div class="identity-choices">${Object.entries(profileFrames).map(([id,label])=>`<button type="button" class="identity-choice" data-identity-frame="${id}" aria-pressed="${value.frame===id}"><span class="identity-frame-sample" aria-hidden="true">✦</span>${label}</button>`).join('')}</div></fieldset><div class="field"><label for="profile-title">Seu título pessoal</label><input id="profile-title" minlength="2" maxlength="40" value="${esc(value.title)}" placeholder="Ex.: Guardião das madrugadas"><small>Até 40 caracteres. Aparece junto do seu nome no perfil.</small></div></section>`}
function profile(){if(route().params.get('user'))return '<div id="public-profile">'+skeletons()+'</div>';if(!state.user)return `${heading('Seu perfil, sua identidade','Entre na sua conta para escolher um avatar e personalizar seu perfil.')}${empty('Faça parte do AnimeDragon','Sua conta está esperando por você.','<a href="#entrar" class="primary">Entrar</a> <a href="#cadastro" class="secondary">Criar conta</a>')}`;return `${heading('Meu perfil','Um universo de histórias. Uma identidade só sua.')}<div class="profile-page"><section class="profile-cover ${identityClass()}">${avatarView(state.avatar,state.user?.avatarFrame,'big-avatar','profile-avatar','Sua foto')}<span class="badge identity-title" id="identity-title-preview">${esc(identityOf().title)}</span><h2 class="${nameClass(state.user.nameColor)}">${esc(state.user.name)}</h2><p>${esc(state.user.bio||'Sempre pronto para a próxima aventura.')}</p><form id="privacy-form" class="privacy-control"><label for="profile-visibility">Quem pode ver meu universo?</label><select id="profile-visibility"><option value="private" ${state.user.visibility!=='public'?'selected':''}>Privado · somente eu</option><option value="public" ${state.user.visibility==='public'?'selected':''}>Público · qualquer pessoa</option></select><p>Quando público, seu perfil mostra bio, listas, episódios assistidos e últimas reproduções. Seu e-mail nunca aparece para visitantes. Comentários continuam visíveis nos animes.</p><button class="secondary" type="submit">Salvar privacidade</button><p id="privacy-message" role="status"></p></form><a class="secondary profile-share" href="#profile?user=${encodeURIComponent(state.user.id)}">Ver meu perfil compartilhável ↗</a><button class="secondary" data-logout>Sair da conta</button></section><section class="rail-card">${photoEditor()}<form id="profile-form"><div class="form-grid"><div class="field"><label for="pf-name">Nome de usuário</label><input id="pf-name" value="${esc(state.user.name)}" minlength="3" maxlength="30" required></div><div class="field"><label for="pf-email">E-mail da conta</label><input id="pf-email" value="${esc(state.user.email)}" type="email" readonly></div><div class="field full"><label for="pf-bio">Sua bio</label><textarea id="pf-bio" maxlength="300" placeholder="Conte um pouco sobre seu universo…">${esc(state.user.bio)}</textarea></div></div>${identityEditor()}<span class="name-color-label">Cor do seu nome</span><div id="name-preview" class="name-preview ${nameClass(state.user.nameColor)}">${esc(state.user.name)}</div><input type="hidden" id="profile-name-color" value="${Object.hasOwn(nameColors,state.user.nameColor)?state.user.nameColor:'ice'}"><div class="name-palette" role="group" aria-label="Cor do nome">${Object.entries(nameColors).map(([color,label])=>`<button type="button" class="name-swatch ${nameClass(color)}" data-name-color="${color}" aria-label="${label}" aria-pressed="${(state.user.nameColor||'ice')===color}"><span></span></button>`).join('')}</div><p id="profile-error" role="alert" class="form-error"></p><button class="primary" type="submit">Salvar alterações</button></form></section></div><section class="profile-universe"><div class="section-head"><div><h2>Meu universo anime</h2><p>Favoritos, acompanhamentos e suas últimas reproduções.</p></div></div><div id="profile-library">${skeletons()}</div></section>`}
function settings(){return `${heading('Do seu jeito','Preferências que ficam salvas neste navegador.')}<section class="rail-card settings-card">${[['motion','Animações da interface','Transições suaves e efeitos visuais.'],['autoplay','Próximo episódio automático','Continue a maratona quando um episódio terminar.'],['autoCaptions','Legendas automáticas no seu idioma','Começa desligado. Ative se quiser escolher legendas automaticamente.'],['economy','Economizar dados','Capas menores para conexões mais lentas.']].map(([id,title,description])=>`<div class="setting-row"><div><b>${title}</b><p>${description}</p></div><button class="switch ${state.prefs[id]?'on':''}" role="switch" aria-checked="${!!state.prefs[id]}" aria-label="${title}" data-pref="${id}"></button></div>`).join('')}</section>`}
let accountDialog=null;
function openAccount(login=true){
 if(state.user){toast('Você já está conectado.');return}
 if(accountDialog){accountDialog.show(login);return}
 accountDialog=createAccountDialog({document,login,authenticate:async(values,mode)=>{const result=await post('/api/auth/'+mode,{...values,avatar:defaultAvatar});authSession.accept(result.user);toast(mode==='register'?'Sua conta foi criada! Personalize seu perfil quando quiser.':'Bem-vindo de volta!');},onClose:()=>{accountDialog=null;}});
}
function closeAccount(){accountDialog?.close();}


async function render(){const authPage=route().page;if(['entrar','cadastro'].includes(authPage)){const destination=/^#(entrar|cadastro)(?:\?|$)/.test(lastPage)?'#home':lastPage;replaceHistoryState(null,destination);lastPage=destination;if(!$('.shell'))void render();openAccount(authPage==='entrar');return}searchController?.destroy();searchController=null;releasesController?.destroy();releasesController=null;giphyController?.destroy();giphyController=null;if(avatarObjectUrl){URL.revokeObjectURL(avatarObjectUrl);avatarObjectUrl=null}clearInterval(heroTimer);const version=++renderVersion,{page,params}=route();closeModal();document.title=page==='cadastro'?'Criar conta · AnimeDragon':page==='entrar'?'Entrar · AnimeDragon':'AnimeDragon';let inner;
 if(page==='home')inner=state.home?home():skeletons();
 else if(page==='anime'||page==='search')inner=listing(page,params);
 else if(page==='genres')inner=heading('Escolha seu próximo universo.','Isekai, magia, light novels e muito mais. Encontre sua próxima maratona.')+genreTiles();
 else if(page==='list'||page==='history'||page==='favorites')inner=collection(page);
 else if(page==='library')inner=libraryPage(params);else if(page==='calendar')inner=calendarPage();else if(page==='releases')inner=releasesPage();
 else if(page==='profile')inner=profile();else if(page==='settings')inner=settings();else if(page==='gifs')inner=giphyPage();
 else{nav('home');return}
 $('#app').innerHTML=layout(inner);bind();window.scrollTo(0,0);
 if(page==='releases')releasesController=mountReleases($('#page-content'),{api,remember,onOpen:event=>openDetails(event.anime.id,event.kind==='episode'?event.season_number:undefined)});
 if(page==='gifs')giphyController=mountGiphy($('#page-content'),{client:giphyClient,user:()=>state.user,onLogin:()=>openAccount(true),onSelect:async id=>{const userId=state.user?.id;if(!userId)throw new Error('Entre para personalizar seu perfil.');const data=await post('/api/profile/avatar/giphy',{id});if(state.user?.id!==userId)throw new Error('Entre novamente para salvar sua escolha.');authSession.accept({...state.user,avatar:data.avatar,avatarFrame:data.avatarFrame});store.set('ad_avatar',data.avatar);toast('Seu novo GIF foi salvo no perfil!');nav('profile')}});
 if(page==='home'&&params.get('anime')){
  const id=Number(params.get('anime'));if(Number.isInteger(id)&&id>0){writeOverlay({type:'detail',id,season:null},{replace:true,direct:true});void openDetails(id,undefined,null,true);}
 }
 if(page==='home'&&!state.home){try{const data=await api('/api/catalog/home');state.home=data;remember([...data.trending,...data.top,...data.recent,...(data.updated||[]),...(data.featured||[]),...(data.upcoming||[]),...(data.popular||[])]);migrateLists();if(version===renderVersion)render()}catch(e){if(version===renderVersion){$('.content').innerHTML=empty('O catálogo deu uma pausa.',esc(e.message),'<button class="primary" id="retry-home">Tentar novamente</button>');$('#retry-home').onclick=()=>render()}}}
 if(page==='anime'||page==='search')loadCatalog(page,params,version);
 if(['list','favorites','library','calendar'].includes(page))loadRemoteCollection(page,version);
 if(page==='profile'){const target=params.get('user')||state.user?.id;if(target)loadProfileUniverse(target,version,!!params.get('user'));}
}
function migrateLists(){if(store.get('ad_v7_migrated',false))return;const old=store.get('ad_list',[]);if(Array.isArray(old)){for(const title of old){const p=[...state.items.values()].find(x=>x.title===title);if(p&&!state.list.some(x=>x.id===p.id))state.list.push(p)}store.set(key('list'),state.list)}store.set('ad_v7_migrated',true)}
async function loadCatalog(page,params,version){const path=page==='search'?`/api/catalog/search?${params}`:`/api/catalog/discover?${params}`;try{const data=await api(path);if(version!==renderVersion)return;remember(data.results);$('#catalog-results').innerHTML=(data.results.length?`<div class="catalog-grid">${data.results.map(card).join('')}</div>`:empty('Nenhum anime nesta página.','Tente outro nome, filtro ou avance a página.'))+`<nav class="pagination" aria-label="Páginas do catálogo"><button class="secondary" data-page="${data.page-1}" ${data.page<=1?'disabled':''}>${icon('left')} Anterior</button><span>Página ${data.page} de ${Math.max(data.page,data.totalPages)}</span><button class="secondary" data-page="${data.page+1}" ${data.page>=data.totalPages?'disabled':''}>Próxima ${icon('right')}</button></nav>`;bindCards();$$('[data-page]').forEach(b=>b.onclick=()=>{params.set('page',b.dataset.page);nav(`${page}?${params}`)})}catch(e){if(version===renderVersion){$('#catalog-results').innerHTML=empty('Não foi possível carregar.',esc(e.message),'<button class="primary" id="retry-catalog">Tentar novamente</button>');$('#retry-catalog').onclick=()=>loadCatalog(page,params,version)}}}
async function toggleList(id){
 if(!state.user){toast('Entre para salvar na sua conta.');nav('entrar');return;}
 const userId=state.user.id,buttons=$$('[data-list]').filter(button=>button.dataset.list===String(id));
 buttons.forEach(button=>button.disabled=true);
 try{
  const data=await api('/api/community/'+id),enabled=!data.collections.includes('watchlater');
  await post('/api/community/'+id,{action:'collection',kind:'watchlater',enabled});
  if(state.user?.id!==userId)return;
  updateSavedState(id,enabled);
  toast(enabled?'Salvo para assistir depois':'Removido de assistir depois');
  if($('#anime-actions'))await mountCommunity(Number(id));
 }catch(error){toast(error.message,'err');}
 finally{buttons.forEach(button=>{if(button.isConnected)button.disabled=false;});}
}
function updateSavedState(id,enabled){
 state.list=state.list.filter(item=>Number(item.id)!==Number(id));
 if(enabled)state.list.push(state.items.get(String(id))||{id:Number(id)});
 $$('[data-list]').filter(button=>button.dataset.list===String(id)).forEach(button=>{
  button.textContent=enabled?'✓ Salvo':'＋ Minha lista';
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',enabled?'Remover de assistir depois':'Salvar para assistir depois');
 });
}
function bindCards(){$$('[data-id]').forEach(b=>b.onclick=()=>openDetails(b.dataset.id,b.dataset.season?Number(b.dataset.season):undefined));$$('[data-list]').forEach(b=>b.onclick=()=>toggleList(b.dataset.list))}
function beginCatalogSearch(q){
 releasesController?.destroy();releasesController=null;giphyController?.destroy();giphyController=null;
 closeModal();
 ++renderVersion;clearInterval(heroTimer);
 $('.shell')?.classList.remove('home-view');
 const hash=`#search?q=${encodeURIComponent(q)}`,entering=route().page!=='search';
 if(entering)window.scrollTo(0,0);
 const nextState={...(history.state||{}),adOverlay:null};
 delete nextState.adDirectDetail;
 if(entering)pushHistoryState(nextState,hash);else replaceHistoryState(nextState,hash);
 lastPage=hash;
 $$('.top-nav a').forEach(a=>{a.classList.remove('active');a.removeAttribute('aria-current');});
 $('#page-content').innerHTML=`<section class="live-catalog" aria-labelledby="live-search-title"><div class="page-heading"><span class="eyebrow">ENCONTRE SEU PRÓXIMO ANIME</span><h1 id="live-search-title">${q?`Animes para “${esc(q)}”`:'Qual história você procura?'}</h1><p id="search-status" role="status">${q?'Buscando títulos…':'Digite uma letra ou parte do nome para ver as capas aqui.'}</p></div><div id="live-search-results" aria-busy="${!!q}">${q?skeletons():''}</div></section>`;
}
function showCatalogSearch(result){
 const target=$('#live-search-results');if(!target||!result.query)return;
 target.setAttribute('aria-busy',String(!!result.loading));
 if(result.loading)return;
 const items=rankSearchResults(result.results,result.query);remember(items);
 $('#search-status').textContent=result.error?'A busca não respondeu. Pressione Enter para tentar novamente.':items.length?`${items.length} ${items.length===1?'anime':'animes'} nesta página · Continue digitando para refinar a busca.`:'Nenhum anime encontrado. Tente outro nome ou continue digitando.';
 target.innerHTML=items.length?`<div class="catalog-grid search-catalog">${items.map(card).join('')}</div>`:'';
 if(result.data?.totalPages>1){target.insertAdjacentHTML('beforeend',`<a class="secondary search-more" href="#search?q=${encodeURIComponent(result.query)}&page=2">Ver mais resultados →</a>`);}
 bindCards();
}
let headerScrollController=null;
function bindHeader(){
 const header=$('.site-header');if(!header)return;
 headerScrollController?.destroy();headerScrollController=createHeaderScroll(header);
 const menu=$('#mobile-menu-toggle'),search=$('#header-search-toggle'),close=$('#header-search-close');
 const setMenu=open=>{header.classList.toggle('menu-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');syncHeaderOffset(header);};
 const setSearch=open=>{header.classList.toggle('search-open',open);search.setAttribute('aria-expanded',String(open));if(open){setMenu(false);$('#global-search').focus();}syncHeaderOffset(header);};
 header.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link&&!['#entrar','#cadastro'].includes(link.getAttribute('href'))){if(overlayState())replaceHistoryState({...history.state,adOverlay:null});closeModal();}});
 menu.onclick=()=>{const open=!header.classList.contains('menu-open');if(open)setSearch(false);setMenu(open)};
 search.onclick=()=>setSearch(!header.classList.contains('search-open'));
 close.onclick=()=>{setSearch(false);search.focus();};
 header.onkeydown=event=>{if(event.key==='Escape'){if(header.classList.contains('menu-open')||header.classList.contains('search-open')||$('.header-more[open]'))event.preventDefault?.();setMenu(false);setSearch(false);$('.header-more')?.removeAttribute('open');search.focus();}};
 syncHeaderOffset(header);
}
function bindDetailTabs(){
 const buttons=$$('.detail-tabs [role="tab"]');
 const select=index=>{buttons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;document.getElementById(button.getAttribute('aria-controls')).hidden=i!==index;});};
 buttons.forEach((button,index)=>{button.onclick=()=>select(index);button.onkeydown=event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%buttons.length;else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();select(next);buttons[next].focus();};});
}

function bind(){bindHeader();bindProfilePrivacy();bindCards();bindExtras();bindHero();const search=$('#search-form');if(search){searchController=bindLiveSearch(search,{change:beginCatalogSearch,show:showCatalogSearch,request:async(q,signal)=>{const response=await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`,{credentials:'same-origin',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});const data=await response.json();if(!response.ok||data.ok===false)throw Error('Busca indisponível');return data;}});}
 $$('[data-scroll]').forEach(b=>b.onclick=()=>{const rail=document.getElementById(b.dataset.scroll);rail.scrollBy({left:Number(b.dataset.dir)*rail.clientWidth*.85,behavior:reducedMotion()?'instant':'smooth'})});
 $$('.cards').forEach(rail=>{const update=()=>{$$(`[data-scroll="${rail.id}"]`).forEach(b=>b.disabled=Number(b.dataset.dir)<0?rail.scrollLeft<2:rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2)};rail.addEventListener('scroll',update,{passive:true});rail.onkeydown=e=>{if(e.target!==rail)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();rail.scrollBy({left:(e.key==='ArrowRight'?1:-1)*200,behavior:reducedMotion()?'instant':'smooth'})}};requestAnimationFrame(update)});
 $$('[data-sort]').forEach(b=>b.onclick=()=>{const p=route().params;p.set('sort',b.dataset.sort);p.delete('page');nav(`anime?${p}`)});const genre=$('#genre-select');if(genre)genre.onchange=()=>{const p=route().params;p.delete('page');genre.value?p.set('genre',genre.value):p.delete('genre');nav(`anime?${p}`)};

 bindLogout();
 $$('[data-pref]').forEach(b=>b.onclick=()=>{const k=b.dataset.pref;state.prefs[k]=!state.prefs[k];store.set('ad_preferences',state.prefs);b.classList.toggle('on',state.prefs[k]);b.setAttribute('aria-checked',String(state.prefs[k]));applyPrefs()});
 const profileForm=$('#profile-form');if(profileForm)profileForm.onsubmit=async e=>{e.preventDefault();const userId=state.user?.id,button=$('button[type=submit]',profileForm),error=$('#profile-error',profileForm);if(!userId)return;button.disabled=true;error.textContent='';try{const d=await post('/api/auth/profile',{name:$('#pf-name',profileForm).value,bio:$('#pf-bio',profileForm).value,avatar:state.avatar,nameColor:$('#profile-name-color',profileForm).value,identity:{cover:$('#profile-cover',profileForm).value,frame:$('#profile-frame',profileForm).value,title:$('#profile-title',profileForm).value}});if(state.user?.id!==userId)return;authSession.accept(d.user);store.set('ad_avatar',state.avatar);if(profileForm.isConnected){toast('Perfil atualizado!');render()}}catch(err){if(profileForm.isConnected&&state.user?.id===userId){error.textContent=err.message;button.disabled=false}}};
}

function reducedMotion(){return !state.prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches}

let detailHeaderObserver=null;
function clearDetailHeaderBack(){
 $('#header-detail-back')?.remove();$('.site-header')?.classList.remove('has-detail-back');document.body.classList.remove('detail-header-back');
}
function mountDetailHeaderBack(){
 const header=$('.site-header'),masthead=$('.masthead',header||document);if(!header||!masthead)return false;
 let button=$('#header-detail-back',masthead);
 if(!button){button=document.createElement('button');button.id='header-detail-back';button.type='button';button.className='header-detail-back';button.setAttribute('aria-label','Voltar para a página anterior');button.innerHTML=`${icon('left')}<span>Voltar</span>`;masthead.prepend(button);}
 button.onclick=closeOverlay;header.classList.add('has-detail-back');document.body.classList.add('detail-header-back');
 const previous=$('#modal-root .detail-modal .modal-navigation');if(previous)previous.hidden=true;
 return true;
}
function syncHeaderOffset(header=$('.site-header')){
 if(!header)return;
 const bottom=element=>{const box=element?.getBoundingClientRect?.();return Number(box?.bottom??box?.height??element?.offsetHeight)||0;};
 const offset=Math.ceil(Math.max(0,bottom(header),bottom($('.masthead',header)),header.classList.contains('search-open')?bottom($('#header-search',header)):0,header.classList.contains('menu-open')?bottom($('#main-navigation',header)):0));
 document.documentElement.style.setProperty('--header-actual-offset',`${offset}px`);document.documentElement.style.setProperty('--detail-header-height',`${offset}px`);
}
function refreshHeaderScroll(){document.dispatchEvent(new document.defaultView.Event('header-contextchange'));}
function setModal(content,watch=false){
 discussionController?.destroy();discussionController=null;if(watchController){watchController.destroy();watchController=null;}
 detailHeaderObserver?.disconnect();detailHeaderObserver=null;
 $('#modal-root').innerHTML=`<div class="modal-back ${watch?'watch-back':'detail-back'}"><section class="modal ${watch?'watch-modal':'detail-modal'}" role="${watch?'dialog':'region'}" ${watch?'aria-modal="true" ':''}aria-labelledby="detail-title" tabindex="-1"><div class="modal-navigation"><button class="modal-back-button" id="modal-back">${icon('left')} Voltar</button><span>ANIMEDRAGON</span></div>${content}</section></div>`;
 document.body.classList.add('modal-open');document.body.classList.toggle('detail-open',!watch);$('#app').inert=watch;
 if(watch)clearDetailHeaderBack();else mountDetailHeaderBack();
 const main=$('#app .main');if(main)main.inert=!watch;refreshHeaderScroll();
 if(!watch){const header=$('.site-header');const measure=()=>syncHeaderOffset(header);measure();if(header&&typeof ResizeObserver==='function'){detailHeaderObserver=new ResizeObserver(measure);[header,$('.masthead',header),$('#header-search',header),$('#main-navigation',header)].filter(Boolean).forEach(element=>detailHeaderObserver.observe(element));}}
 $('#modal-root .modal').focus();$('#modal-root .modal-back').onclick=e=>{if(e.target===e.currentTarget)closeOverlay()};
 $('#modal-back').onclick=closeOverlay;
}
const closeButton=()=>'';
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href="#entrar"],a[href="#cadastro"]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openAccount(link.getAttribute('href')==='#entrar');},true);
function detailHero(p){
 const seasons=(p.seasons||[]).filter(s=>s.season_number>0&&s.episode_count!==0),overview=esc(p.overview||'Sinopse ainda não disponível.');
 return `<section class="detail-hero">${p.backdrop_path?`<img class="detail-hero-art" src="${img(p.backdrop_path,state.prefs.economy?'w780':'w1280')}" ${state.prefs.economy?'':`srcset="${img(p.backdrop_path,'w780')} 780w, ${img(p.backdrop_path,'w1280')} 1280w, ${img(p.backdrop_path,'original')} 1920w" sizes="100vw"`} width="1920" height="1080" alt="" decoding="async" fetchpriority="high">`:''}<div class="detail-copy"><div class="detail-identity"><span class="eyebrow">ANIME · ${year(p)}</span><h2 id="detail-title">${esc(p.title)}</h2>${p.original_title&&p.original_title!==p.title?`<p class="detail-original-title">${esc(p.original_title)}</p>`:''}<div class="genre-tags">${(p.genres||[]).map(g=>`<span>${esc(g.name)}</span>`).join('')}</div><div class="detail-primary-actions"><button class="primary" id="detail-watch" disabled>▶ Assistir</button><button class="secondary" id="share-anime" aria-label="Compartilhar anime">${icon('share')}</button></div><div id="anime-actions" class="anime-actions"></div></div><div class="detail-context"><details class="detail-synopsis"><summary><span class="synopsis-excerpt">${overview}</span><span class="synopsis-expand">Ler sinopse completa ${icon('right')}</span><span class="synopsis-collapse">Recolher sinopse ${icon('left')}</span></summary><p class="synopsis">${overview}</p></details><div class="meta"><span class="detail-rating">★ ${rating(p)}</span><span>${year(p)}</span>${seasons.length>1?`<span>${seasons.length} temporadas</span>`:''}<span>${p.number_of_episodes||0} episódios</span></div></div></div></section>`;
}
async function openDetails(id,preferredSeason,discussionEpisode=null,fromBack=false){
 void loadPlayback.prepare().catch(()=>{});
 const numericId=Number(id);if(!Number.isInteger(numericId)||numericId<=0)return;
 if(!fromBack){
  const current=overlayState(),next={type:'detail',id:numericId,season:Number.isInteger(Number(preferredSeason))?Number(preferredSeason):null};
  writeOverlay(next,{replace:current?.type==='detail'&&Number(current.id)===numericId});
 }
 if(!$('#modal-root .modal'))focusBeforeModal=document.activeElement;
 const version=++modalVersion;++seasonVersion;state.details=null;state.watched=[];state.episodes=[];state.episodeLimit=40;
 setModal('<div class="modal-head"><h2 id="detail-title">Carregando anime…</h2></div><div class="detail-loading skeleton" aria-busy="true"></div>');
 try{
  const d=await api(`/api/catalog/tv/${id}`);if(version!==modalVersion)return;const p=d.item;state.details=p;remember([p]);
  const seasons=(p.seasons||[]).filter(s=>s.episode_count!==0),regular=seasons.filter(s=>s.season_number>0),special=seasons.find(s=>s.season_number===0);
  state.season=seasons.some(s=>s.season_number===Number(preferredSeason))?Number(preferredSeason):(regular[0]?.season_number??seasons[0]?.season_number??0);
  if(overlayState()?.type==='detail'&&Number(overlayState().id)===Number(p.id))writeOverlay({type:'detail',id:Number(p.id),season:state.season},{replace:true});
  const seasonControl=regular.length>1?`<label class="season-picker"><span class="sr-only">Escolher temporada</span><select id="season-select">${[...regular,...(special?[special]:[])].map(s=>`<option value="${s.season_number}" ${s.season_number===state.season?'selected':''}>${s.season_number?`Temporada ${s.season_number}`:'Especiais'}${s.episode_count?` · ${s.episode_count} episódios`:''}</option>`).join('')}</select></label>`:'';
  const specialControl=special&&regular.length===1?`<button type="button" class="season-chip" data-season-choice="${regular[0].season_number}" aria-pressed="${state.season===regular[0].season_number}">Episódios</button><button type="button" class="season-chip" data-season-choice="0" aria-pressed="${state.season===0}">Especiais</button>`:'';
  setModal(`${detailHero(p)}<div class="detail-tabs" role="tablist" aria-label="Informações do anime"><button id="detail-tab-episodes" role="tab" aria-selected="true" aria-controls="detail-panel-episodes">Episódios</button><button id="detail-tab-related" role="tab" tabindex="-1" aria-selected="false" aria-controls="similar-animes">Relacionados</button><button id="detail-tab-comments" role="tab" tabindex="-1" aria-selected="false" aria-controls="discussion">Comentários</button></div><section class="detail-episodes" id="detail-panel-episodes" role="tabpanel" aria-labelledby="detail-tab-episodes"><div class="episodes-heading"><div><span class="eyebrow">CONTINUE A HISTÓRIA</span><h3>Episódios</h3></div>${seasonControl||specialControl?`<div class="season-controls">${seasonControl}${specialControl}</div>`:''}</div><div class="episode-toolbar"><label class="episode-search">${icon('search')}<input id="episode-search" type="search" placeholder="Buscar episódio por número ou nome" aria-label="Buscar episódio" autocomplete="off"></label><button type="button" class="episode-sort" id="episode-order" value="asc" aria-pressed="false" aria-label="Inverter ordem dos episódios">↓ Do primeiro ao último</button></div><div id="episodes" aria-live="polite"></div></section><section id="similar-animes" class="similar-section" role="tabpanel" aria-labelledby="detail-tab-related" hidden></section><section id="discussion" class="discussion-section" role="tabpanel" aria-labelledby="detail-tab-comments" hidden></section>`);
  bindDetailTabs();mountCommunity(p.id,discussionEpisode===null?null:{season:state.season,episode:discussionEpisode});loadSimilar(p.id,version);void enrichDetails(p,version);bindCards();$('#share-anime').onclick=()=>shareAnime(p);
  const select=$('#season-select');if(select)select.onchange=e=>loadSeason(p.id,Number(e.target.value));
  $$('[data-season-choice]').forEach(button=>button.onclick=()=>loadSeason(p.id,Number(button.dataset.seasonChoice)));
  let searchTimer;$('#episode-search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(version===modalVersion)renderEpisodes()},100)};
  $('#episode-order').onclick=e=>{const button=e.currentTarget;button.value=button.value==='desc'?'asc':'desc';renderEpisodes()};
  if(seasons.length)await loadSeason(p.id,state.season);else{
   const announced=/^\d{4}-\d{2}-\d{2}$/.test(p.first_air_date||'')&&p.first_air_date>releaseDay();
   $('#detail-watch').textContent=announced?'Estreia em breve':'Episódios indisponíveis';
   $('#episode-search').disabled=true;$('#episode-order').disabled=true;
   $('#episodes').innerHTML=empty(announced?'Esta história ainda vai estrear.':'Episódios ainda não cadastrados.',announced?'Confira a data anunciada em Lançamentos. Os episódios aparecem quando forem cadastrados.':'O catálogo ainda não tem episódios disponíveis para este anime.');
  }
 }catch(e){if(version!==modalVersion)return;setModal(`<div class="modal-head"><h2 id="detail-title">Não foi possível abrir</h2></div>${empty('Tente novamente em instantes.',esc(e.message),'<button class="primary" id="retry-details">Tentar novamente</button>')}`);const retry=$('#retry-details');if(retry)retry.onclick=()=>openDetails(id)}
}
async function loadSeason(id,season){
 const version=++seasonVersion,modal=modalVersion;state.season=season;state.episodes=[];state.episodeLimit=40;
 if(overlayState()?.type==='detail'&&Number(overlayState().id)===Number(id))writeOverlay({type:'detail',id:Number(id),season},{replace:true});
 const search=$('#episode-search'),host=$('#episodes');if(!host)return;if(search)search.value='';
 $$('[data-season-choice]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.seasonChoice)===season)));
 const select=$('#season-select');if(select){select.value=String(season);select.classList.toggle('is-special',season===0);}
 const watch=$('#detail-watch');if(watch){watch.disabled=true;watch.textContent='Carregando episódios…';}
 host.innerHTML='<div class="episode-loading" role="status" aria-busy="true">Carregando episódios…</div>';
 try{const d=await api(`/api/catalog/tv/${id}/season/${season}`);if(version!==seasonVersion||modal!==modalVersion)return;state.episodes=d.season.episodes||[];renderEpisodes()}
 catch(e){if(version===seasonVersion&&modal===modalVersion){host.innerHTML=empty('Não foi possível carregar os episódios.',esc(e.message),'<button class="primary" id="retry-season">Tentar novamente</button>');$('#retry-season').onclick=()=>loadSeason(id,season)}}
}
let episodePreparation=null;
function prepareEpisode(episode){if(episodePreparation||state.prefs.economy||navigator.connection?.saveData||!state.details)return;const item=state.episodes.find(x=>x.episode_number===episode);if(!item||(item.air_date&&item.air_date>releaseDay()))return;episodePreparation=loadPlayback(state.details.id,state.season,episode).catch(()=>{}).finally(()=>{episodePreparation=null;});}
function renderEpisodes(options={}){
 const host=$('#episodes');if(!host)return;const focusedWatched=document.activeElement?.dataset?.watched;
 if(!state.episodes.length&&!state.details?.seasons?.length){
  const announced=/^\d{4}-\d{2}-\d{2}$/.test(state.details?.first_air_date||'')&&state.details.first_air_date>releaseDay(),watch=$('#detail-watch');
  if(watch){watch.disabled=true;watch.textContent=announced?'Estreia em breve':'Episódios indisponíveis';watch.onclick=null;}
  host.innerHTML=empty(announced?'Esta história ainda vai estrear.':'Episódios ainda não cadastrados.',announced?'Confira a data anunciada em Lançamentos. Os episódios aparecem quando forem cadastrados.':'O catálogo ainda não tem episódios disponíveis para este anime.');return;
 }
 const today=releaseDay(),watchedNumbers=new Set(state.watched.filter(x=>x.season===state.season).map(x=>x.episode));
 const available=state.episodes.filter(e=>!e.air_date||e.air_date<=today).sort((a,b)=>a.episode_number-b.episode_number),resume=state.history.find(p=>Number(p.id)===Number(state.details?.id)&&p.season===state.season),first=available.find(e=>e.episode_number===resume?.episode&&!watchedNumbers.has(e.episode_number))||available.find(e=>!watchedNumbers.has(e.episode_number))||available[0],watch=$('#detail-watch');
 if(watch){watch.disabled=!first;watch.textContent=first?`▶ ${resume?.episode===first.episode_number?'Continuar':'Assistir'} EP.${first.episode_number}`:'Nenhum episódio disponível';watch.onclick=()=>first&&openPlayer(first.episode_number);}
 const normalize=value=>String(value||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(),q=normalize($('#episode-search')?.value),order=$('#episode-order'),desc=order?.value==='desc',filterKey=`${state.season}|${desc}|${q}`;
 if(order){order.textContent=desc?'↑ Do último ao primeiro':'↓ Do primeiro ao último';order.setAttribute('aria-pressed',String(desc));}
 if(host.dataset.filterKey!==filterKey){state.episodeLimit=40;host.dataset.filterKey=filterKey;}
 const previousLimit=state.episodeLimit||40;if(options.more)state.episodeLimit=previousLimit+40;
 const numeric=q.match(/^(?:ep(?:isodio)?\.?\s*)?(\d+)$/)?.[1],episodes=state.episodes.filter(e=>!q||String(e.episode_number)===(numeric||q)||normalize(e.name).includes(q)).sort((a,b)=>(desc?-1:1)*(a.episode_number-b.episode_number)),visible=episodes.slice(0,state.episodeLimit||40),dateFormat=new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'});
 const tile=e=>{const future=e.air_date&&e.air_date>today,watched=watchedNumbers.has(e.episode_number),name=esc(`EP.${e.episode_number} · ${e.name||'Episódio'}`),still=e.still_path||state.details?.backdrop_path;
  const preview=e.thumbnail||still?`<img src="${esc(e.thumbnail||img(still,state.prefs.economy?'w300':'w500'))}" ${!e.thumbnail&&still&&!state.prefs.economy?`srcset="${img(still,'w300')} 300w, ${img(still,'w500')} 500w, ${img(still,'w780')} 780w" sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 1000px) 46vw, (max-width: 1500px) 30vw, 22vw"`:''} alt="" loading="lazy" decoding="async" width="500" height="281">`:'<span class="preview-missing">Prévia indisponível</span>';
  return `<div class="episode-tile ${watched?'is-watched':''}"><button type="button" class="episode" data-episode="${e.episode_number}" aria-label="${future?'Episódio ainda não disponível':'Assistir'} ${name}" ${future?'disabled':''}><span class="episode-preview">${preview}<span class="episode-badge">EP. ${e.episode_number}</span>${e.runtime?`<span class="episode-duration">${e.runtime} min</span>`:''}<span class="episode-preview-play" aria-hidden="true">${future?'◷':'▶'}</span>${watched?'<span class="episode-watched-line"></span>':''}</span><span class="episode-info"><b>${name}</b><small>${future?'Previsto para ':''}${e.air_date?dateFormat.format(new Date(e.air_date+'T12:00:00Z')):'Data não informada'}</small>${e.overview?`<span class="episode-description">${esc(e.overview)}</span>`:''}</span></button><button type="button" class="watched-toggle" data-watched="${e.episode_number}" aria-label="${watched?'Desmarcar':'Marcar'} episódio ${e.episode_number} como assistido" aria-pressed="${watched}" ${future?'disabled':''}>${watched?'✓ Assistido':'○ Marcar como assistido'}</button></div>`;
 };
 host.innerHTML=`<div class="episode-count">${episodes.length} ${episodes.length===1?'episódio':'episódios'}${q?' encontrados':''}${visible.length<episodes.length?` · exibindo ${visible.length}`:''}</div>`+(episodes.length?`<div class="episode-grid">${visible.map(tile).join('')}</div>${visible.length<episodes.length?`<button type="button" class="secondary episodes-more" id="episodes-more">Mostrar mais ${Math.min(40,episodes.length-visible.length)} episódios ${icon('right')}</button>`:''}`:empty('Nenhum episódio encontrado.',q?'Tente outro nome ou número.':'Esta temporada ainda não tem episódios cadastrados.'));
 $$('[data-episode]',host).forEach(b=>{b.onclick=()=>openPlayer(Number(b.dataset.episode));let timer;const warm=()=>b.isConnected&&!b.disabled&&prepareEpisode(Number(b.dataset.episode));b.onpointerenter=()=>{timer=setTimeout(warm,180)};b.onpointerleave=()=>clearTimeout(timer);b.onfocus=warm;b.onpointerdown=warm;});
 $$('[data-watched]',host).forEach(b=>b.onclick=()=>toggleWatched(Number(b.dataset.watched),b));
 const more=$('#episodes-more');if(more)more.onclick=()=>renderEpisodes({more:true});
 if(options.more){const next=$$('[data-episode]',host)[previousLimit];if(next&&!next.disabled)next.focus();else if(more)more.focus();else $('#episode-order')?.focus();}
 else if(focusedWatched)$$('[data-watched]',host).find(button=>button.dataset.watched===focusedWatched)?.focus();
}
function closeModal(){
 discussionController?.destroy();discussionController=null;detailHeaderObserver?.disconnect();detailHeaderObserver=null;
 clearDetailHeaderBack();
 if(watchController){watchController.destroy();watchController=null;}++modalVersion;++seasonVersion;const had=!!$('#modal-root').innerHTML;$('#modal-root').innerHTML='';document.body.classList.remove('modal-open','detail-open');$('#app').inert=false;const main=$('#app .main');if(main)main.inert=false;refreshHeaderScroll();
 if(had&&focusBeforeModal?.isConnected)focusBeforeModal.focus();
}
async function openPlayer(episode,fromHistory=false){
 const p=state.details,season=state.season;if(!p)return;
 if(!fromHistory){
  const current=overlayState(),next={type:'player',id:Number(p.id),season:Number(season),episode:Number(episode)};
  writeOverlay(next,{replace:current?.type==='player'});
 }
 if(!state.prefs.economy&&!navigator.connection?.saveData){void loadHls().catch(()=>{});void loadShaka().catch(()=>{});}
 ++modalVersion;
 setModal('<div id="playback-body" class="watch-body"></div><section id="discussion" class="discussion-section watch-discussion" hidden></section>',true);
 const captionLocale=preferredCaptionLocale(navigator.languages?.length?navigator.languages:[navigator.language]);
 const previous=state.history.find(x=>x.id===p.id&&x.season===season&&x.episode===episode);
 watchController=mountWatchPlayer($('#playback-body'),{
  title:p.title,season,episode,episodes:state.episodes,poster:img(p.backdrop_path,state.prefs.economy?'w780':'original'),autoplay:true,resume:previous?.progress||0,
  loadSource:options=>loadPlayback(p.id,season,episode,options),
  captionLocale,loadSubtitles:()=>api(`/api/subtitles?id=${p.id}&season=${season}&episode=${episode}&locale=${encodeURIComponent(captionLocale)}`),autoCaptions:state.prefs.autoCaptions===true,
  prefetch:next=>!state.prefs.economy&&!navigator.connection?.saveData?loadPlayback(p.id,season,next):Promise.resolve(),
  loadCommunity:()=>api(`/api/community/${p.id}?season=${season}&episode=${episode}`),loadHls,loadShaka,
  onComments:()=>{const panel=$('#discussion');if(panel){panel.hidden=!panel.hidden;if(!panel.hidden){panel.scrollIntoView({block:'start',behavior:'smooth'});panel.querySelector('textarea,a,button')?.focus();}}},
  onMutation:async payload=>{if(!state.user)throw new Error('Entre na sua conta para salvar sua coleção e participar.');await post(`/api/community/${p.id}`,payload);syncCollectionCounts().catch(()=>{});},
  onEpisode:openPlayer,
  onClose:closeOverlay,
  onAutoplay:value=>{state.prefs.autoplay=value;store.set('ad_preferences',state.prefs);},
  onProgress:(progress,duration)=>{const entry={...p,season,episode,progress:Math.floor(progress),duration:Math.floor(duration)};state.history=[entry,...state.history.filter(x=>x.id!==p.id)].slice(0,50);store.set(key('history'),state.history);},
  onActivity:()=>state.user?post(`/api/community/${p.id}`,{action:'activity',season,episode}):Promise.resolve(),
  onEnded:()=>state.user?post(`/api/community/${p.id}`,{action:'progress',season,episode,watched:true}):Promise.resolve()
 });
 void mountCommunity(p.id,{season,episode});
}

function heroMarkup(){
 const items=state.home?.featured||state.home?.trending||[],p=items[state.heroIndex%items.length];
 if(!p)return '';
 const saved=state.list.some(item=>Number(item.id)===Number(p.id));
 return `<section class="hero rotating-hero" aria-label="Animes atuais em destaque">${p.backdrop_path?`<img class="hero-art" src="${img(p.backdrop_path,state.prefs.economy?'w780':'w1280')}" alt="" width="1280" height="720" fetchpriority="high">`:''}<div class="hero-content"><div class="hero-kicker"><span>${icon('spark')} ${esc(p.highlight_reason||'Em destaque agora')}</span><span>★ ${rating(p)}</span></div><h1>${esc(p.title)}</h1>${p.original_title&&p.original_title!==p.title?`<h2 class="hero-original-title">${esc(p.original_title)}</h2>`:''}<div class="meta"><span>${year(p)}</span><span>Série de anime</span></div><p>${esc(p.overview||'Conheça essa história e explore seus episódios.')}</p><div class="actions"><button class="primary" data-id="${p.id}">▶ Ver episódios</button><button class="secondary hero-save" data-list="${p.id}" aria-label="${saved?'Remover de assistir depois':'Salvar para assistir depois'}" aria-pressed="${saved}">${saved?'✓ Salvo':'＋ Minha lista'}</button><button class="secondary hero-info" data-id="${p.id}" aria-label="Detalhes de ${esc(p.title)}">${icon('info')}</button></div></div><div class="hero-switcher"><button class="icon-btn" data-hero-step="-1" aria-label="Destaque anterior">${icon('left')}</button><div class="hero-dots">${items.slice(0,6).map((x,i)=>`<button data-hero-index="${i}" aria-label="Mostrar ${esc(x.title)}" aria-pressed="${i===state.heroIndex}" class="${i===state.heroIndex?'active':''}"></button>`).join('')}</div><button class="icon-btn" data-hero-step="1" aria-label="Próximo destaque">${icon('right')}</button><button class="hero-pause" id="hero-pause" aria-label="${state.heroPaused?'Retomar':'Pausar'} destaques">${state.heroPaused?'▶':'Ⅱ'}</button></div></section>`;
}
function bindHero(){clearInterval(heroTimer);const hero=$('.rotating-hero');if(!hero)return;const show=i=>{const length=Math.min(6,(state.home.featured||state.home.trending).length);state.heroIndex=(i+length)%length;hero.outerHTML=heroMarkup();bindCards();bindHero()};$$('[data-hero-index]').forEach(b=>b.onclick=()=>show(Number(b.dataset.heroIndex)));$$('[data-hero-step]').forEach(b=>b.onclick=()=>show(state.heroIndex+Number(b.dataset.heroStep)));$('#hero-pause').onclick=()=>{state.heroPaused=!state.heroPaused;show(state.heroIndex)};if(!reducedMotion()&&!state.heroPaused)heroTimer=setInterval(()=>{if(!document.hidden&&!hero.matches(':hover')&&!hero.contains(document.activeElement))show(state.heroIndex+1)},7000)}
async function loadSimilar(id,version){const el=$('#similar-animes');if(!el)return;el.innerHTML='<h3>Se você gostou deste, explore também</h3><p>Buscando recomendações…</p>';try{const d=await api(`/api/catalog/tv/${id}/recommendations`);if(version!==modalVersion||!el.isConnected)return;d.results=d.results.filter(p=>Number(p.id)!==Number(id));remember(d.results);el.innerHTML=`<h3>Se você gostou deste, explore também</h3>${d.results.length?`<div class="similar-grid">${d.results.slice(0,6).map(card).join('')}</div>`:'<p>Ainda não há recomendações para este anime.</p>'}`;bindCards()}catch(e){if(el.isConnected)el.innerHTML='<h3>Animes parecidos</h3><p>As recomendações estão indisponíveis neste momento.</p>'}}
async function syncCollectionCounts(){if(!state.user)return;const userId=state.user.id;const d=await api('/api/community/collections');if(state.user?.id!==userId)return;state.list=d.items.filter(x=>x.kind==='watchlater').map(x=>({id:x.anime_id}));state.favorites=d.items.filter(x=>x.kind==='favorite').map(x=>({id:x.anime_id}));state.library=d.items;$$('[data-list]').forEach(button=>{const saved=state.list.some(item=>Number(item.id)===Number(button.dataset.list));button.textContent=saved?'✓ Salvo':'＋ Minha lista';button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',saved?'Remover de assistir depois':'Salvar para assistir depois');});}
async function loadRemoteCollection(page,version){
 if(!state.user)return;const target=$('#collection-results');
 try{const d=await api('/api/community/collections');if(version!==renderVersion)return;state.library=d.items;
 const selected=page==='library'?(route().params.get('kind')||'all'):page==='calendar'?'watching':page==='favorites'?'favorite':'watchlater';
 const ids=[...new Set(d.items.filter(x=>selected==='all'||x.kind===selected).map(x=>x.anime_id))];const items=[];let failures=0;
 for(let i=0;i<ids.length;i+=4){const part=await Promise.allSettled(ids.slice(i,i+4).map(async id=>(page!=='calendar'&&state.items.get(String(id)))||(await api(`/api/catalog/tv/${id}`)).item));if(version!==renderVersion)return;part.forEach(x=>x.status==='fulfilled'?items.push(x.value):failures++);}
 remember(items);if(version!==renderVersion)return;
 if(page==='calendar'){target.innerHTML=calendarItems(items);bindCards();return;}
 const display=()=>{const q=($('#library-search')?.value||'').toLocaleLowerCase('pt-BR');const sort=$('#library-sort')?.value;let visible=items.filter(p=>p.title.toLocaleLowerCase('pt-BR').includes(q));if(sort==='title')visible.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));if(sort==='rating')visible.sort((a,b)=>b.vote_average-a.vote_average);
 target.innerHTML=(visible.length?`<div class="library-count">${visible.length} animes · sua próxima aventura está aqui</div><div class="catalog-grid">${visible.map(p=>`<div class="library-item">${card(p)}<div class="library-badges">${d.items.filter(x=>x.anime_id===p.id).map(x=>`<span>${collectionNames[x.kind]}</span>`).join('')}</div></div>`).join('')}</div>`:empty('Nenhum anime por aqui.',q?'Tente outro nome.':'Abra um anime e escolha como quer acompanhá-lo.','<a class="primary" href="#anime">Descobrir animes →</a>'))+(failures?`<p>${failures} títulos não carregaram. Suas escolhas continuam salvas.</p>`:'');bindCards();};
 display();if($('#library-search'))$('#library-search').oninput=display;if($('#library-sort'))$('#library-sort').onchange=display;
 }catch(e){if(version===renderVersion)target.innerHTML=empty('Não foi possível abrir sua coleção.',esc(e.message),'<button class="secondary" id="retry-library">Tentar novamente</button>');if($('#retry-library'))$('#retry-library').onclick=()=>loadRemoteCollection(page,version);}
}
let communityVersion=0;
async function mountCommunity(id,scope=null,offset=0){
 const version=++communityVersion,modal=modalVersion,actions=$('#anime-actions'),panel=$('#discussion');if(!panel)return;
 discussionController?.destroy();discussionController=null;panel.dataset.animeId=id;panel.dataset.scope=JSON.stringify(scope);
 if(actions)actions.innerHTML='<p>Carregando suas interações…</p>';panel.innerHTML='<h3>Comentários</h3><p role="status">Carregando conversa…</p>';
 try{const query=new URLSearchParams({view:'threads',offset,sort:state.commentSort,...(scope||{})}),d=await api(`/api/community/${id}?${query}`);if(version!==communityVersion||modal!==modalVersion)return;
  state.watched=d.progress||[];renderEpisodes();
  const requireLogin=()=>{if(state.user)return true;toast('Entre na sua conta para participar.');nav('entrar');return false;};
  if(actions){actions.innerHTML=`<button class="secondary ${d.collections.includes('favorite')?'selected':''}" data-community-kind="favorite" aria-pressed="${d.collections.includes('favorite')}">♥ ${d.collections.includes('favorite')?'Favoritado':'Favoritar'}</button><button class="secondary ${d.collections.includes('watchlater')?'selected':''}" data-community-kind="watchlater" aria-pressed="${d.collections.includes('watchlater')}">${d.collections.includes('watchlater')?'✓ Salvo':'＋ Minha lista'}</button><button class="secondary ${d.collections.includes('watching')?'selected':''}" data-community-kind="watching" aria-pressed="${d.collections.includes('watching')}">${d.collections.includes('watching')?'✓ Acompanhando':'♧ Acompanhar'}</button><span class="reaction-group"><button class="secondary ${d.reaction===1?'selected':''}" data-reaction="1" aria-label="Gostei, ${d.likes} votos" aria-pressed="${d.reaction===1}">${icon('thumbUp')} <b>${d.likes||''}</b></button><button class="secondary ${d.reaction===-1?'selected':''}" data-reaction="-1" aria-label="Não gostei, ${d.dislikes} votos" aria-pressed="${d.reaction===-1}">${icon('thumbDown')} <b>${d.dislikes||''}</b></button></span>`;
   const mutate=async(payload,button)=>{if(!requireLogin())return;button.disabled=true;try{await post(`/api/community/${id}`,payload);if(payload.action==='collection'&&payload.kind==='watchlater')updateSavedState(id,payload.enabled);if(modal===modalVersion)await mountCommunity(id,scope,offset);}catch(err){toast(err.message,'err');if(button.isConnected)button.disabled=false;}};
   $$('[data-community-kind]',actions).forEach(b=>b.onclick=()=>mutate({action:'collection',kind:b.dataset.communityKind,enabled:!d.collections.includes(b.dataset.communityKind)},b));
   $$('[data-reaction]',actions).forEach(b=>b.onclick=()=>mutate({action:'reaction',value:d.reaction===Number(b.dataset.reaction)?0:Number(b.dataset.reaction)},b));
  }
  discussionController=mountDiscussion(panel,{animeId:id,scope,data:d,api,post,user:()=>state.user,avatarView,nameClass,toast,store,sort:state.commentSort,onSort:value=>state.commentSort=value,onLogin:requireLogin});
 }catch(err){if(version===communityVersion&&modal===modalVersion){if(actions)actions.innerHTML='<p>Não foi possível carregar as interações.</p>';panel.innerHTML=`<h3>Comentários</h3><p>${esc(err.message)}</p><button class="secondary" id="retry-community">Tentar novamente</button>`;$('#retry-community').onclick=()=>mountCommunity(id,scope,offset);}}
}
let hlsPromise,shakaPromise;
function loadHls(){if(window.Hls)return Promise.resolve();if(!hlsPromise)hlsPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/js/vendor/hls.min.js';script.onload=resolve;script.onerror=()=>{hlsPromise=null;reject(new Error('O suporte HLS não carregou. Tente outra fonte.'))};document.head.append(script)});return hlsPromise}
function loadShaka(){
 if(window.shaka?.Player)return Promise.resolve();
 if(!shakaPromise)shakaPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/shaka-player@5.2.12/dist/shaka-player.compiled.js';
  script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';
  script.onload=()=>window.shaka?.Player?resolve():(shakaPromise=null,reject(new Error('O player alternativo não iniciou.')));
  script.onerror=()=>{shakaPromise=null;reject(new Error('O player alternativo não carregou.'))};
  document.head.append(script);
 });
 return shakaPromise;
}


const collectionNames={favorite:'Favoritos',watchlater:'Assistir mais tarde',watching:'Acompanhando',completed:'Concluídos',paused:'Pausados',dropped:'Abandonados'};
function libraryPage(params){const selected=params.get('kind')||'all';return `${heading('Sua coleção. Seu universo.','Organize cada história, do primeiro encontro ao último episódio.')}<div class="library-tabs">${[['all','Todos'],...Object.entries(collectionNames)].map(([id,name])=>`<a class="${selected===id?'active':''}" href="#library?kind=${id}">${name}</a>`).join('')}</div>${state.user?`<div class="library-toolbar"><label class="search library-search">${icon('search')}<input id="library-search" placeholder="Buscar na sua biblioteca" aria-label="Buscar na sua biblioteca"></label><label class="select-label">Ordenar<select id="library-sort"><option value="added">Adicionados recentemente</option><option value="title">Nome A–Z</option><option value="rating">Nota do catálogo</option></select></label></div>`:''}<div id="collection-results">${state.user?skeletons():empty('Sua próxima maratona merece uma lista.','Entre para sincronizar sua biblioteca entre dispositivos.','<a href="#entrar" class="primary">Entrar na minha conta →</a>')}</div>`}
function calendarPage(){return `${heading('Nunca perca o próximo capítulo.','Próximos episódios dos animes que você está acompanhando.')}<div id="collection-results">${state.user?skeletons():empty('A agenda começa com a sua coleção.','Entre e marque animes como Acompanhando.','<a href="#entrar" class="primary">Entrar →</a>')}</div>`}
function calendarItems(items){const upcoming=items.filter(p=>p.next_episode_to_air?.air_date).sort((a,b)=>a.next_episode_to_air.air_date.localeCompare(b.next_episode_to_air.air_date));return (upcoming.length?`<div class="schedule-grid">${upcoming.map(p=>{const e=p.next_episode_to_air;return `<button class="schedule-card" data-id="${p.id}" data-season="${e.season_number}">${imageTag(p)}<div><span class="eyebrow">${new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short',weekday:'short',timeZone:'UTC'}).format(new Date(e.air_date+'T12:00:00Z'))}</span><h3>${esc(p.title)}</h3><p>EP.${e.episode_number} — ${esc(e.name||'Novo episódio')}</p><span class="text-link">Ver anime →</span></div></button>`}).join('')}</div>`:empty('Nenhum lançamento anunciado.','A agenda aparece quando houver data para o próximo episódio dos seus animes.','<a href="#library?kind=watching" class="secondary">Ver acompanhando →</a>'))+'<p class="schedule-note">Datas informadas pelo catálogo; a disponibilidade do vídeo pode variar.</p>';}
function continueWatching(){const items=state.history.filter(p=>p.progress>0&&(!p.duration||p.progress<p.duration-10)).slice(0,8);if(!items.length)return '';return `<section class="section continue-section"><div class="section-head"><div><h2>Você parou na melhor parte.</h2><p>Continue exatamente de onde parou neste navegador.</p></div><a href="#history" class="text-link">Ver histórico →</a></div><div class="continue-rail" tabindex="0" aria-label="Continuar assistindo">${items.map(p=>`<button class="continue-card" data-resume="${p.id}"><img src="${img(p.backdrop_path,'w500')}" alt="" loading="lazy"><span class="resume-play">▶</span><div><b>${esc(p.title)}</b><small>EP.${p.episode} · ${Math.floor(p.progress/60)} min assistidos</small><progress value="${p.progress}" max="${p.duration||p.progress+1}" aria-label="Progresso do episódio"></progress></div></button>`).join('')}</div></section>`}
function bindExtras(){const back=$('#page-back');if(back)back.onclick=()=>{if(history.length>1)history.back();else nav('home')};$$('[data-surprise]').forEach(surprise=>surprise.onclick=()=>{const choices=[...new Map([...(state.home?.trending||[]),...(state.home?.top||[]),...(state.home?.recent||[])].map(p=>[p.id,p])).values()];if(choices.length)openDetails(choices[Math.floor(Math.random()*choices.length)].id);else{nav('home');toast('O catálogo está carregando. Tente novamente em instantes.');}});$$('[data-resume]').forEach(b=>b.onclick=async()=>{const p=state.history.find(p=>p.id===Number(b.dataset.resume));await openDetails(p.id,p.season);if(state.details?.id===p.id)openPlayer(p.episode)});}
function addCancelReply(cancel){const button=document.createElement('button');button.type='button';button.className='text-link';button.textContent='Cancelar';button.onclick=()=>{cancel();$('#reply-context').textContent='';$('#comment-body').value='';$('#comment-spoiler').checked=false};$('#reply-context').append(' ',button)}
async function shareAnime(p){const url=location.origin+location.pathname+'#home?anime='+p.id;try{await navigator.clipboard.writeText(url);toast('Link do anime copiado!')}catch{const field=document.createElement('input');field.value=url;field.readOnly=true;field.setAttribute('aria-label','Link para compartilhar');$('#share-anime').after(field);field.select();toast('Copie o link selecionado.')}}
async function toggleWatched(episode,button){if(!state.user){toast('Entre para salvar seu progresso.');nav('entrar');return}const id=state.details.id,season=state.season,version=modalVersion;const watched=!state.watched.some(x=>x.season===season&&x.episode===episode);button.disabled=true;try{await post(`/api/community/${id}`,{action:'progress',season,episode,watched});if(version!==modalVersion)return;state.watched=state.watched.filter(x=>!(x.season===season&&x.episode===episode));if(watched)state.watched.push({season,episode});renderEpisodes()}catch(e){toast(e.message,'err');if(button.isConnected)button.disabled=false}}



function photoEditor(){const f=state.user.avatarFrame||{x:50,y:50,zoom:100};return `<section class="photo-editor"><h3>Sua foto. Sua identidade.</h3><p>Envie JPG, PNG, WebP ou GIF animado de até 1,9 MB. A animação do GIF é preservada.</p><a class="secondary profile-gif-gallery" href="#gifs">Explorar a galeria de GIFs</a><label class="upload-label" for="avatar-file">＋ Escolher foto ou GIF</label><input id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><div class="photo-preview-layout"><div class="photo-preview avatar-frame"><img id="avatar-preview" src="${safeAvatar(state.avatar)}" ${giphyId(state.avatar)?`data-giphy-avatar="${giphyId(state.avatar)}"`:""} style="${frameStyle(f)}" alt="Prévia do enquadramento"></div><div class="photo-adjustments"><label for="avatar-x">Posição horizontal</label><input id="avatar-x" type="range" min="0" max="100" value="${f.x}" aria-label="Posição horizontal"><label for="avatar-y">Posição vertical</label><input id="avatar-y" type="range" min="0" max="100" value="${f.y}" aria-label="Posição vertical"><label for="avatar-zoom">Zoom</label><input id="avatar-zoom" type="range" min="100" max="300" value="${f.zoom}" aria-label="Zoom da foto"><button class="secondary" type="button" id="center-photo">Centralizar automaticamente</button></div></div><div class="photo-actions"><button class="primary" type="button" id="save-photo">Salvar foto e ajuste</button><button class="secondary" type="button" id="reset-photo">Remover foto</button></div><p role="status" id="photo-message">A prévia mostra como a foto aparecerá no perfil e nos comentários. Sua foto é visível junto do nome, mesmo com listas privadas.</p></section>`}
function bindPhotoEditor(){const input=$('#avatar-file');if(!input)return;let file=null,selection=0;const preview=$('#avatar-preview'),message=$('#photo-message'),save=$('#save-photo');const frame=()=>({x:Number($('#avatar-x').value),y:Number($('#avatar-y').value),zoom:Number($('#avatar-zoom').value)});const update=()=>preview.style.cssText=frameStyle(frame());for(const id of ['avatar-x','avatar-y','avatar-zoom'])$('#'+id).oninput=update;$('#center-photo').onclick=()=>{$('#avatar-x').value=50;$('#avatar-y').value=50;$('#avatar-zoom').value=100;update()};input.onchange=async()=>{const version=++selection;const chosen=input.files?.[0];if(!chosen)return;if(chosen.size>1900000){message.textContent='A imagem deve ter até 1,9 MB. Escolha um arquivo menor.';input.value='';return}if(!['image/jpeg','image/png','image/webp','image/gif'].includes(chosen.type)){message.textContent='Use JPG, PNG, WebP ou GIF.';input.value='';return}save.disabled=true;const objectUrl=URL.createObjectURL(chosen);const probe=new Image();probe.src=objectUrl;try{await probe.decode();if(!input.isConnected||version!==selection){URL.revokeObjectURL(objectUrl);return}if(probe.naturalWidth>8192||probe.naturalHeight>8192)throw new Error('Use uma imagem de até 8.192 pixels em cada dimensão.');if(avatarObjectUrl)URL.revokeObjectURL(avatarObjectUrl);avatarObjectUrl=objectUrl;file=chosen;preview.removeAttribute('data-giphy-avatar');preview.src=objectUrl;$('#center-photo').click();message.textContent='Prévia pronta. Ajuste a posição e o zoom e salve sua foto.';}catch(error){URL.revokeObjectURL(objectUrl);message.textContent=error.message||'Não foi possível abrir a imagem.';input.value='';}finally{if(input.isConnected&&version===selection)save.disabled=false}};
 const apply=d=>{authSession.accept({...state.user,avatar:d.avatar,avatarFrame:d.avatarFrame});store.set('ad_avatar',d.avatar);[preview,$('#profile-avatar img')].filter(Boolean).forEach(img=>{const gif=giphyId(d.avatar);img.src=safeAvatar(d.avatar);img.removeAttribute('data-giphy-resolving');if(gif)img.dataset.giphyAvatar=gif;else img.removeAttribute('data-giphy-avatar');img.style.cssText=frameStyle(d.avatarFrame)});giphyAvatars.refresh();file=null;input.value='';if(avatarObjectUrl){URL.revokeObjectURL(avatarObjectUrl);avatarObjectUrl=null}};
 save.onclick=async()=>{const userId=state.user?.id;if(!userId)return;save.disabled=true;input.disabled=true;message.textContent='Salvando sua foto…';try{const query=new URLSearchParams(frame());const d=file?await api('/api/profile/avatar?'+query,{method:'POST',body:file,headers:{'Content-Type':file.type}}):await post('/api/profile/avatar/crop?'+query,{});if(!input.isConnected||state.user?.id!==userId)return;apply(d);message.textContent='Foto e enquadramento salvos!'}catch(e){if(message.isConnected)message.textContent=e.message}finally{if(input.isConnected){save.disabled=false;input.disabled=false}}};
 $('#reset-photo').onclick=async e=>{const userId=state.user?.id;if(!userId)return;e.target.disabled=true;try{const d=await post('/api/profile/avatar/reset',{});if(!input.isConnected||state.user?.id!==userId)return;apply(d);$('#center-photo').click();message.textContent='Foto removida.'}catch(error){if(message.isConnected)message.textContent=error.message}finally{if(e.target.isConnected)e.target.disabled=false}};
}

function bindProfilePrivacy(){bindPhotoEditor();bindIdentityEditor();$$('[data-name-color]').forEach(b=>b.onclick=()=>{$('#profile-name-color').value=b.dataset.nameColor;$('#name-preview').className='name-preview '+nameClass(b.dataset.nameColor);$$('[data-name-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});const form=$('#privacy-form');if(!form)return;form.onsubmit=async e=>{e.preventDefault();const userId=state.user?.id;if(!userId)return;const button=$('button',form),message=$('#privacy-message',form);button.disabled=true;message.textContent='Salvando…';try{const d=await post('/api/auth/privacy',{visibility:$('#profile-visibility',form).value});if(state.user?.id!==userId)return;authSession.accept(d.user);if(message.isConnected)message.textContent=d.user.visibility==='public'?'Seu perfil está público.':'Seu perfil está privado. Só você vê suas listas.';}catch(error){if(message.isConnected)message.textContent=error.message}finally{if(button.isConnected)button.disabled=false}}}
function bindIdentityEditor(){
 const cover=$('.profile-cover'),title=$('#profile-title');if(!cover||!title)return;
 const preview=()=>{cover.className='profile-cover '+identityClass({identity:{cover:$('#profile-cover').value,frame:$('#profile-frame').value}});$('#identity-title-preview').textContent=title.value||'Seu título pessoal';};
 for(const kind of ['cover','frame'])$$('[data-identity-'+kind+']').forEach(button=>button.onclick=()=>{$('#profile-'+kind).value=button.dataset['identity'+kind[0].toUpperCase()+kind.slice(1)];$$('[data-identity-'+kind+']').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));preview();});
 title.oninput=preview;
}
async function loadProfileUniverse(userId,version,standalone){
 const target=$(standalone?'#public-profile':'#profile-library');if(!target)return;
 try{
  const d=await api('/api/community/profile/'+encodeURIComponent(userId));if(version!==renderVersion)return;
  const avatar=d.profile.avatar;
  if(standalone){target.innerHTML=`<section class="public-profile-header ${identityClass(d.profile)}">${avatarView(avatar,d.profile.avatarFrame,'big-avatar','','Foto de '+d.profile.name)}<div><span class="eyebrow">UNIVERSO OTAKU · ${d.profile.visibility==='public'?'PÚBLICO':'PRIVADO'}</span><p class="badge identity-title">${esc(identityOf(d.profile).title)}</p><h1 class="${nameClass(d.profile.nameColor)}">${esc(d.profile.name)}</h1>${d.profile.bio?`<p>${esc(d.profile.bio)}</p>`:''}<div class="actions">${!d.private?'<button class="secondary" id="copy-profile">↗ Copiar link do perfil</button>':''}${d.owner?'<a href="#profile" class="secondary">Editar meu perfil</a>':''}</div></div></section><div id="profile-library"></div>`;const copy=$('#copy-profile');if(copy)copy.onclick=async()=>{const url=location.origin+location.pathname+'#profile?user='+encodeURIComponent(d.profile.id);try{await navigator.clipboard.writeText(url);toast('Link do perfil copiado!')}catch{const input=document.createElement('input');input.value=url;input.readOnly=true;input.setAttribute('aria-label','Link do perfil');copy.after(input);input.select()}};}
  const body=$('#profile-library');if(d.private){body.innerHTML=empty('Este universo é privado.','Esta pessoa optou por não compartilhar suas listas e atividades.');return;}
  const ids=[...new Set([...d.items,...d.activity,...d.progress].map(p=>p.anime_id))];const items=[];let failures=0;
  body.innerHTML=skeletons();for(let i=0;i<ids.length;i+=4){const chunk=await Promise.allSettled(ids.slice(i,i+4).map(async id=>state.items.get(String(id))||(await api('/api/catalog/tv/'+id)).item));if(version!==renderVersion)return;chunk.forEach(x=>x.status==='fulfilled'?items.push(x.value):failures++)}remember(items);
  const groups=[['all','Todos'],['watching','Acompanhando'],['activity','Assistindo'],['favorite','Favoritos'],['watchlater','Assistir mais tarde'],['completed','Concluídos'],['paused','Pausados'],['dropped','Abandonados']];
  const matches=(p,kind)=>kind==='all'||(kind==='activity'?d.activity.some(x=>x.anime_id===p.id):d.items.some(x=>x.anime_id===p.id&&x.kind===kind));let selected='all';
  const draw=()=>{body.innerHTML=`${d.owner&&d.profile.visibility!=='public'?'<p class="privacy-hint">🔒 Só você pode ver este universo. Torne o perfil público para compartilhar.</p>':''}<div class="profile-counters"><div><b>${d.items.filter(x=>x.kind==='favorite').length}</b><span>Favoritos</span></div><div><b>${d.items.filter(x=>x.kind==='watching').length}</b><span>Acompanhando</span></div><div><b>${d.activity.length}</b><span>Últimas reproduções</span></div><div><b>${d.progress.reduce((n,x)=>n+x.episodes,0)}</b><span>Episódios assistidos</span></div></div><div class="library-tabs profile-tabs">${groups.map(([id,name])=>`<button class="${id===selected?'active':''}" data-profile-kind="${id}">${name}</button>`).join('')}</div>${selected==='activity'?'<p class="profile-activity-note">Últimos animes reproduzidos. Esta lista não indica presença ao vivo.</p>':''}<div class="catalog-grid">${items.filter(p=>matches(p,selected)).map(p=>{const activity=d.activity.find(x=>x.anime_id===p.id),progress=d.progress.find(x=>x.anime_id===p.id);return `<div class="library-item">${card(p)}<div class="library-badges">${d.items.filter(x=>x.anime_id===p.id).map(x=>`<span>${collectionNames[x.kind]}</span>`).join('')}</div>${activity?`<p class="profile-episode">Última reprodução · EP.${activity.episode}</p>`:''}${progress?`<p class="profile-episode">✓ ${progress.episodes} episódios assistidos</p>`:''}${d.owner?`<label class="profile-organize"><span>Meu acompanhamento</span><select data-profile-status="${p.id}" aria-label="Organizar ${esc(p.title)}"><option value="">Sem acompanhamento</option>${['watching','completed','paused','dropped'].map(k=>`<option value="${k}" ${d.items.some(x=>x.anime_id===p.id&&x.kind===k)?'selected':''}>${collectionNames[k]}</option>`).join('')}</select></label>`:''}</div>`}).join('')}</div>${items.some(p=>matches(p,selected))?'':empty('Ainda não há animes nesta lista.',d.owner?'Abra um anime para favoritar, acompanhar ou salvar para depois.':'As escolhas desta pessoa aparecerão aqui.')} ${failures?`<p>${failures} títulos não carregaram agora. As listas continuam salvas.</p>`:''}`;bindCards();$$('[data-profile-kind]',body).forEach(b=>b.onclick=()=>{selected=b.dataset.profileKind;draw()});$$('[data-profile-status]',body).forEach(select=>select.onchange=async()=>{const id=Number(select.dataset.profileStatus),previous=d.items.find(x=>x.anime_id===id&&['watching','completed','paused','dropped'].includes(x.kind));const kind=select.value||previous?.kind;if(!kind)return;select.disabled=true;try{await post('/api/community/'+id,{action:'collection',kind,enabled:!!select.value});d.items=d.items.filter(x=>x.anime_id!==id||!['watching','completed','paused','dropped'].includes(x.kind));if(select.value)d.items.push({anime_id:id,kind});draw()}catch(e){toast(e.message,'err');select.value=previous?.kind||'';select.disabled=false}});};draw();
 }catch(e){if(version===renderVersion){target.innerHTML=empty('Não foi possível abrir o perfil.',esc(e.message),'<button class="secondary" id="retry-profile">Tentar novamente</button>');$('#retry-profile').onclick=()=>loadProfileUniverse(userId,version,standalone)}}
}

async function restoreOverlayFromHistory(value){
 if(handlingHistory)return;handlingHistory=true;
 try{
  if(!value){closeModal();return;}
  if(value.type==='detail'){await openDetails(value.id,value.season,null,true);return;}
  if(value.type==='player'){
   if(!state.details||Number(state.details.id)!==Number(value.id)||Number(state.season)!==Number(value.season))await openDetails(value.id,value.season,null,true);
   if(state.details&&Number(state.details.id)===Number(value.id))await openPlayer(Number(value.episode),true);
  }
 }finally{handlingHistory=false;}
}
window.addEventListener('popstate',event=>{void restoreOverlayFromHistory(event.state?.adOverlay||null)});
window.addEventListener('hashchange',()=>{lastPage=location.hash||'#home';if(history.state?.adOverlay)replaceHistoryState({...history.state,adOverlay:null});render()});
let resizeFrame=0;window.addEventListener('resize',()=>{if(resizeFrame)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;$$('.cards').forEach(r=>r.dispatchEvent(new Event('scroll')))});});
document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement&&!e.target.dataset.fallback){e.target.dataset.fallback='1';e.target.removeAttribute('srcset');e.target.src=fallback}},true);
document.addEventListener('keydown',e=>{const modal=$('#modal-root .modal');if(!modal||e.defaultPrevented||$('.account-dialog[open]'))return;if(e.key==='Escape'&&!document.fullscreenElement){e.preventDefault();closeOverlay()}if(e.key==='Tab'&&modal.classList.contains('watch-modal')){const nodes=$$('button:not([disabled]),a[href],input,textarea,summary,select,video[controls],[tabindex="0"]',modal).filter(el=>!el.closest('[hidden]')&&(!el.getClientRects||el.getClientRects().length>0));const first=nodes[0],last=nodes.at(-1);if(!first){e.preventDefault();return}if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modal)){e.preventDefault();first.focus()}}});
const authSession=createAuthSession({window,document,
 request:async(path,options)=>{const response=await fetch(path,{...options,signal:AbortSignal.any([options.signal,AbortSignal.timeout(15000)])});const data=await response.json();if(!response.ok||data.ok===false)throw Object.assign(new Error(data.error||'Não foi possível consultar sua conta.'),{status:response.status});return data;},
 onStatus:status=>{state.authStatus=status;updateAccount();},
 onChange:(user,meta)=>{const previous=state.user?.id;state.user=user;state.avatar=user?.avatar||defaultAvatar;if(previous!==user?.id)loadPersonal();updateAccount();if(user){closeAccount();if(['entrar','cadastro'].includes(route().page)){replaceHistoryState(null,'#home');lastPage='#home';}}if(meta.changed&&previous!==user?.id){const discussion=$('#discussion');if(discussion?.dataset.animeId)void mountCommunity(discussion.dataset.animeId,JSON.parse(discussion.dataset.scope||'null'));else if(['profile','library','list','favorites','calendar','history'].includes(route().page))void render();}}
});
applyPrefs();loadPersonal();render();
authSession.start();
const giphyAvatars=observeGiphyAvatars(document,{client:giphyClient});

// Returning to the tab never rebuilds the current page. Catalog data refreshes on the next normal navigation/request.

async function enrichDetails(p,version){
 try{const d=await api(`/api/addons/metadata?id=${p.id}`);if(version!==modalVersion||!d.available)return;
   if(!p.overview&&d.description){p.overview=d.description;const el=$('.synopsis');if(el)el.textContent=d.description;}
   if(d.cast?.length){const el=document.createElement('p');el.className='anime-cast';el.textContent='Elenco · '+d.cast.join(' · ');$('.detail-copy')?.append(el);}
 }catch{}
}

// Prepare only a destination the visitor points to; never preload all genres.
let intentTimer=0;
function prepareDestination(target){
 if(state.prefs.economy||navigator.connection?.saveData||/^(slow-)?2g$/.test(navigator.connection?.effectiveType||''))return;
 const card=target.closest('[data-id]'),link=target.closest('a[href^="#"]');
 if(card&&/^\d+$/.test(card.dataset.id)){void warmCatalog(`/api/catalog/tv/${card.dataset.id}`).then(d=>{const season=d?.item?.seasons?.find(s=>s.season_number>0);if(season)void warmCatalog(`/api/catalog/tv/${card.dataset.id}/season/${season.season_number}`);});return;}
 if(!link)return;const [page,query='']=link.getAttribute('href').slice(1).split('?');
 if(page==='anime')void warmCatalog('/api/catalog/discover?'+query);else if(page==='home'&&!query)void warmCatalog('/api/catalog/home');
}
document.addEventListener('pointerover',e=>{clearTimeout(intentTimer);const target=e.target;intentTimer=setTimeout(()=>prepareDestination(target),160);},{passive:true});
document.addEventListener('pointerout',()=>clearTimeout(intentTimer),{passive:true});
document.addEventListener('focusin',e=>{clearTimeout(intentTimer);const target=e.target;intentTimer=setTimeout(()=>prepareDestination(target),160);});
document.addEventListener('pointerdown',e=>{clearTimeout(intentTimer);prepareDestination(e.target);},{passive:true});
