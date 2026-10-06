import {chooseCaption} from './caption-language.js?v=9.6.1';
import {disposeMedia} from './media-lifecycle.js?v=9.6.1';
import {createPlaybackWatchdog,preferredAlternative} from './playback-watchdog.js?v=12.4.4';
import {mergeCaptions,readCaption} from './captions.js?v=9.6';
const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const playerIcons={
  play:'<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  back:'<path d="m14 6-6 6 6 6"/>',
  next:'<path d="m10 6 6 6-6 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  sound:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  muted:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/>',
  fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  shrink:'<path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>',
  settings:'<path d="m10 3-1 3-3 1-3-1-1 4 3 2v3l-2 2 3 3 3-1 2 1 1 3h4l1-3 3-1 3 1 1-4-3-2v-3l2-2-3-3-3 1-2-1-1-3z" transform="translate(1 -1) scale(.95)"/><circle cx="12" cy="12" r="3"/>',
  captions:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9H7v6h3m7-6h-3v6h3"/>',
  episodes:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 8h10M8 12h10M8 16h10M5 8h.01M5 12h.01M5 16h.01"/>',
  comment:'<path d="M20 16a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  chevron:'<path d="m8 10 4 4 4-4"/>',
};
const playerIcon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${playerIcons[name]||playerIcons.play}</svg>`;
const skipIcon=direction=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction<0?'M9 9H3V3M3 9a13 13 0 1 1-1 12':'M23 9h6V3m0 6a13 13 0 1 0 1 12'}"/><text x="16" y="21" text-anchor="middle" font-size="10" font-family="system-ui" fill="currentColor" stroke="none">10</text></svg>`;
export function playbackSourceLabel(source,index=0){
  const name=String(source?.label||source?.name||source?.quality||`Vídeo ${index+1}`).trim();
  return name||`Vídeo ${index+1}`;
}
export const clockTime = seconds => {
  const n = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds) || 0)) : 0;
  return n >= 3600 ? `${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}` : `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
};
export function playbackError(code) {
  if (code === 2) return 'A conexão com o vídeo falhou. Tente novamente em instantes.';
  if (code === 3) return 'O navegador não conseguiu decodificar este vídeo. Tentaremos abrir outra versão.';
  if (code === 4) return 'Esta fonte foi recusada ou usa um formato incompatível. Este vídeo não é compatível com o navegador.';
  return 'Não foi possível abrir este vídeo. Tente novamente em instantes.';
}

export async function startMedia(video,alive=()=>true){
  try{await video.play();return 'playing';}
  catch(error){
    if(!alive()||error.name==='AbortError')return 'cancelled';
    if(error.name!=='NotAllowedError')throw error;
    video.muted=true;
    try{await video.play();return alive()?'muted':'cancelled';}
    catch(second){if(!alive()||second.name==='AbortError')return 'cancelled';if(second.name==='NotAllowedError')return 'blocked';throw second;}
  }
}

// Media is embedded directly. CORS is required only for HLS.js and external captions.
export function mountWatchPlayer(host, options) {
  const o=options, e=escapeHTML, abort=new AbortController(), q=s=>host.querySelector(s);
  const externalDiscussion=host.parentElement?.querySelector('#discussion');
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
  let dead=false, generation=0, hls=null, shakaPlayer=null, engineSwitching=false, sources=[], selected=0, community=null;
  let resume=o.resume||0, lastSave=0, activity=false, started=false, captionUrls=[], auto=!!o.autoplay;
  let loadGeneration=0,prefetchedAt=0,sourceFailed=false,providersComplete=false,providerReport=[],failureLog=[],automaticRefreshes=0;const attempted=new Set();
  let extraCaptions=[],captionList=[],captionChoice='',captionRequest=0,captionAbort=null,captionTried=new Set();
  let controlsTimer=null,captionMode=o.autoCaptions===true?'auto':'off',commentCount=null,keyboardControls=false;const shakaTried=new Set();
  const sourceId=s=>s?.key||s?.url;
  const availableEpisodes=o.episodes.filter(x=>!x.air_date||x.air_date<=new Date().toISOString().slice(0,10));
  const previous=availableEpisodes.find(x=>x.episode_number===o.episode-1), next=availableEpisodes.find(x=>x.episode_number===o.episode+1);
  host.innerHTML=`<div class="watch-layout"><main class="watch-main"><div class="watch-screen controls-visible" tabindex="0" aria-label="Player de vídeo; espaço para reproduzir, setas para avançar ou retroceder">
    <video id="anime-video" playsinline autoplay preload="auto" disablepictureinpicture poster="${e(o.poster)}"></video>
    <header class="watch-heading">${typeof o.onClose==='function'?`<button class="watch-icon watch-close" data-player-close aria-label="Fechar player">${playerIcon('close')}</button>`:''}<div><h2 id="detail-title">${e(o.title)}</h2><p>T${o.season} EP.${o.episode} — ${e(o.episodes.find(x=>x.episode_number===o.episode)?.name||'Episódio '+o.episode)}</p></div></header>
    <div class="watch-notice"><span class="watch-loader" aria-hidden="true"></span><h3 data-message-title>Preparando episódio</h3><p data-message>Preparando o vídeo para você…</p><button class="watch-button" data-overlay-retry hidden>Tentar novamente</button><details class="watch-diagnostic" data-diagnostic hidden><summary>Detalhes das fontes</summary><pre data-diagnostic-text></pre></details></div>
    <div class="watch-center" hidden><button class="watch-icon watch-center-skip" data-skip="-10" aria-label="Retroceder 10 segundos" disabled>${skipIcon(-1)}</button><button class="watch-big-play" aria-label="Reproduzir vídeo">${playerIcon('play')}</button><button class="watch-icon watch-center-skip" data-skip="10" aria-label="Avançar 10 segundos" disabled>${skipIcon(1)}</button></div>
    <div class="watch-settings-panel" id="watch-settings-panel" hidden><div class="watch-settings-heading"><b>Ajustes da reprodução</b><button class="watch-icon" data-settings-close aria-label="Fechar ajustes">${playerIcon('close')}</button></div><label for="watch-source">Vídeo<select id="watch-source" disabled><option>Preparando vídeo…</option></select></label><label for="watch-caption">Legendas<select id="watch-caption" disabled><option>Buscando legendas…</option></select></label><label for="watch-speed">Velocidade<select id="watch-speed">${[.5,.75,1,1.25,1.5,1.75,2].map(x=>`<option value="${x}" ${x===1?'selected':''}>${x===1?'Normal':x+'×'}</option>`).join('')}</select></label></div>
    <div class="watch-controls"><label class="sr-only" for="watch-seek">Posição do vídeo</label><input id="watch-seek" type="range" min="0" max="100" value="0" step="0.1" disabled>
      <div class="watch-control-row"><button class="watch-icon" data-play aria-label="Reproduzir" disabled>${playerIcon('play')}</button><span class="watch-time">0:00 / 0:00</span><span class="watch-spacer"></span><div class="watch-volume-group"><button class="watch-icon" data-mute aria-label="Silenciar">${playerIcon('sound')}</button><input class="watch-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"></div><button class="watch-icon" data-settings aria-label="Ajustes de vídeo, legendas e velocidade" aria-expanded="false" aria-controls="watch-settings-panel">${playerIcon('settings')}</button><button class="watch-icon" data-fullscreen aria-label="Tela cheia">${playerIcon('fullscreen')}</button></div>
    </div></div>
    <div class="watch-session-bar"><div class="watch-track-pills"><button class="watch-pill" data-video-options aria-label="Escolher vídeo">Vídeo ${playerIcon('chevron')}</button><button class="watch-pill" data-caption-options aria-label="Escolher legendas">${playerIcon('captions')} Legendas ${playerIcon('chevron')}</button></div><button class="watch-comments-button" data-comments aria-controls="discussion">${playerIcon('comment')}<span>Comentários</span><b data-comment-count hidden></b></button></div>
    <button class="watch-button watch-sound-prompt" data-enable-sound hidden>${playerIcon('sound')} Ativar som</button><p class="watch-status" role="status" aria-live="polite"></p>
    <div class="watch-navigation"><button class="watch-button" data-previous ${previous?'':'disabled'}>${playerIcon('back')} Anterior</button><button class="watch-button watch-episode-toggle" data-episodes-toggle aria-expanded="false" aria-controls="watch-episode-panel">${playerIcon('episodes')} Episódios</button><button class="watch-button" data-watched disabled>${playerIcon('check')} Assistido</button><button class="watch-button watch-primary" data-next ${next?'':'disabled'}>Próximo ${playerIcon('next')}</button></div>
    <p data-community-status role="status"></p>
    <aside class="watch-sidebar" id="watch-episode-panel" hidden><div class="watch-sidebar-heading"><h3>Temporada ${o.season} <small>${o.episodes.length} episódios</small></h3></div><input class="watch-search" type="search" placeholder="Buscar episódio…" aria-label="Buscar episódio na temporada"><div class="watch-episodes"></div></aside>
    ${externalDiscussion?'':'<section id="discussion" class="discussion-section watch-discussion" aria-label="Comentários do episódio" hidden><h3>Comentários do episódio</h3><p>Carregando comentários…</p></section>'}
  </main></div>`;
  const video=q('video'), screen=q('.watch-screen'), seek=q('#watch-seek'), status=q('.watch-status'),discussion=externalDiscussion||q('#discussion');
  const watchdog=createPlaybackWatchdog(()=>{if(!dead)failure('Nenhuma versão conseguiu iniciar a reprodução. Tente novamente em instantes.');},{idleMs:5000,totalMs:16000});
  function showControls(){
    if(dead)return;clearTimeout(controlsTimer);screen.classList.remove('controls-hidden');screen.classList.add('controls-visible');
    if(!video.paused&&!video.ended&&!keyboardControls&&q('.watch-settings-panel').hidden)controlsTimer=setTimeout(()=>{if(dead||video.paused||keyboardControls||!q('.watch-settings-panel').hidden)return;screen.classList.remove('controls-visible');screen.classList.add('controls-hidden');},2600);
  }
  function setSettings(open,focus){
    q('.watch-settings-panel').hidden=!open;q('[data-settings]').setAttribute('aria-expanded',String(open));showControls();
    if(open&&focus)q(focus).focus();else if(!open&&focus)q('[data-settings]').focus();
  }
  function renderOptions(){
    q('#watch-source').innerHTML=sources.map((s,i)=>`<option value="${i}" ${i===selected?'selected':''}>${e(playbackSourceLabel(s,i))}</option>`).join('')||'<option>Vídeo indisponível</option>';
    q('#watch-source').disabled=sources.length<2;
    captionList=mergeCaptions(sources[selected]?.subtitles||[],extraCaptions);
    q('#watch-caption').innerHTML=`<option value="off" ${captionMode==='off'?'selected':''}>Desativadas</option><option value="auto" ${captionMode==='auto'?'selected':''}>Automáticas</option>${captionList.map(t=>`<option value="${e(t.src)}" ${captionMode===t.src?'selected':''}>${e(t.label||t.language||'Legenda')}</option>`).join('')}`;
    q('#watch-caption').disabled=!captionList.length;
    q('[data-video-options]').disabled=!sources.length;
    q('[data-caption-options]').disabled=!captionList.length;
    q('[data-video-options]').title=sources.length?playbackSourceLabel(sources[selected],selected):'Vídeo indisponível';
    q('[data-caption-options]').title=captionList.length?(captionMode==='off'?'Legendas desativadas':captionMode==='auto'?'Legendas automáticas':captionList.find(t=>t.src===captionMode)?.label||'Legenda selecionada'):'Este vídeo não tem legendas externas disponíveis';
    q('[data-caption-options]').classList.toggle('is-active',!!captionChoice);
  }
  function note(title, message, retry=false) {q('.watch-notice').hidden=false;q('.watch-center').hidden=true;q('[data-message-title]').textContent=title;q('[data-message]').textContent=message;q('[data-overlay-retry]').hidden=!retry;q('.watch-loader').hidden=retry;showControls();}
  function showDiagnostics(){
    const panel=q('[data-diagnostic]'),out=q('[data-diagnostic-text]');if(!panel||!out)return;
    const providers=providerReport.map(p=>`${p.name}: ${p.available?'fonte recebida':p.reason||'sem fonte web'}`);
    const attempts=failureLog.map((row,i)=>`Tentativa ${i+1} · ${row.source}: ${row.message}`);
    const lines=[`Fontes web encontradas: ${sources.length}`,`Fontes tentadas: ${attempted.size}`,...providers,...attempts];
    out.textContent=lines.join('\n');panel.hidden=false;
  }
  function failure(message) {if(dead)return;sourceFailed=true;watchdog.stop();const current=sources[selected];if(current){const row={source:playbackSourceLabel(current,selected),message:String(message||'falha de reprodução')};const last=failureLog.at(-1);if(!last||last.source!==row.source||last.message!==row.message)failureLog.push(row);}const alternative=sources.findIndex((s,i)=>i!==selected&&!attempted.has(sourceId(s)));if(alternative>=0){status.textContent='Abrindo outra versão do vídeo…';void selectSource(alternative);return;}if(!providersComplete){note('Preparando episódio','Estamos tentando abrir o vídeo. Aguarde um momento…');status.textContent='Preparando episódio…';return;}if(automaticRefreshes<1){automaticRefreshes++;note('Renovando fontes','As fontes falharam ou expiraram. Buscando links novos automaticamente…');status.textContent='Renovando fontes…';queueMicrotask(()=>{if(!dead)void load(true)});return;}note('Não foi possível iniciar','Nenhuma das fontes web disponíveis conseguiu reproduzir este episódio mesmo após renovar os links. Veja os detalhes abaixo.',true);showDiagnostics();status.textContent='';screen.classList.remove('is-playing');}
  function save() {if(started&&Number.isFinite(video.currentTime)&&video.currentTime>0){try{Promise.resolve(o.onProgress(video.currentTime,Number.isFinite(video.duration)?video.duration:0)).catch(()=>{});}catch{}}}
  function renderEpisodes() {
    const query=q('.watch-search').value.trim().toLocaleLowerCase('pt-BR');
    const rows=o.episodes.filter(x=>!query||String(x.episode_number)===query||x.name?.toLocaleLowerCase('pt-BR').includes(query));
    q('.watch-episodes').innerHTML=rows.map(x=>{const current=x.episode_number===o.episode,future=x.air_date&&x.air_date>new Date().toISOString().slice(0,10),watched=(community?.progress||[]).some(p=>p.season===o.season&&p.episode===x.episode_number);return `<button class="watch-episode ${current?'current':''}" data-episode="${x.episode_number}" ${current?'aria-current="true"':''} ${future?'disabled':''}><span>${String(x.episode_number).padStart(2,'0')}</span><div><b>${e(x.name||`Episódio ${x.episode_number}`)}</b><small>${future?'Em breve':current?'Você está aqui':watched?'✓ Assistido':x.runtime?`${x.runtime} min`:'Ver episódio'}</small></div><i>${current?'▶':watched?'✓':'›'}</i></button>`}).join('')||'<p>Nenhum episódio encontrado.</p>';
  }
  function renderCommunity() {
    if(!community)return;
    const watched=(community.progress||[]).some(x=>x.season===o.season&&x.episode===o.episode);
    q('[data-watched]').disabled=false;q('[data-watched]').innerHTML=`${playerIcon('check')} ${watched?'Assistido':'Marcar assistido'}`;q('[data-watched]').setAttribute('aria-pressed',String(watched));q('[data-community-status]').textContent='';renderEpisodes();
    const total=Number(community.total??community.comments?.length);commentCount=Number.isFinite(total)&&total>=0?total:null;
    q('[data-comment-count]').hidden=commentCount===null;q('[data-comment-count]').textContent=commentCount===null?'':String(commentCount);
  }
  async function refreshCommunity(){try{const result=await o.loadCommunity();if(!dead){community=result;renderCommunity();}}catch{if(!dead)q('[data-community-status]').textContent='Não foi possível consultar se este episódio foi assistido. Reabra o episódio para tentar novamente.';}}
  async function mutate(payload,button){button.disabled=true;try{await o.onMutation(payload);if(!dead)await refreshCommunity();}catch(err){if(!dead)q('[data-community-status]').textContent=err.message;}finally{if(!dead)button.disabled=false;}}
  function releaseShaka(){if(!shakaPlayer)return;const player=shakaPlayer;shakaPlayer=null;Promise.resolve(player.destroy?.()).catch(()=>{});}
  function resetMedia(){++captionRequest;captionAbort?.abort();watchdog.stop();engineSwitching=false;if(hls){hls.destroy();hls=null;}releaseShaka();video.pause();video.removeAttribute('src');video.load();video.querySelectorAll('track').forEach(t=>t.remove());captionUrls.forEach(URL.revokeObjectURL);captionUrls=[];seek.disabled=true;seek.value='0';seek.style.setProperty('--played','0%');q('.watch-time').textContent='0:00 / 0:00';host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=true);}
  function clearCaption(){++captionRequest;captionAbort?.abort();captionAbort=null;video.querySelectorAll('track').forEach(t=>t.remove());captionUrls.forEach(URL.revokeObjectURL);captionUrls=[];captionChoice='';}
  async function applyCaption(track,automatic=false){
    clearCaption();captionChoice=track.src;captionTried.add(track.src);captionAbort=new AbortController();const request=++captionRequest,version=generation;renderOptions();
    try{
      const text=await readCaption(track.src,captionAbort.signal);
      if(dead||request!==captionRequest||version!==generation)return;
      const url=URL.createObjectURL(new Blob([text],{type:'text/vtt'}));captionUrls.push(url);
      const el=document.createElement('track');el.kind='subtitles';el.src=url;el.label=track.label||track.language||'Legenda';el.srclang=track.language||'pt';video.append(el);el.track.mode='showing';
      on(el,'error',()=>{if(!dead&&request===captionRequest){el.remove();captionChoice='';renderOptions();if(automatic&&captionTried.size<3)void automaticCaption();else status.textContent='Esta legenda não abriu. Escolha outra nos ajustes.';}});
    }catch{if(!dead&&request===captionRequest&&version===generation){captionChoice='';renderOptions();if(automatic&&captionTried.size<3)void automaticCaption();else status.textContent='Não foi possível abrir a legenda. Escolha outra nos ajustes.';}}
  }
  async function automaticCaption(){
    if(captionMode!=='auto'||captionChoice||!sources.length||captionTried.size>=3)return;
    renderOptions();
    const track=chooseCaption(captionList,o.captionLocale||'pt-BR',captionTried);
    if(!track)return;
    await applyCaption(track,true);
  }
  async function loadExtraCaptions(){
    if(!o.loadSubtitles)return;
    try{const result=await o.loadSubtitles();if(dead)return;extraCaptions=result.subtitles||[];renderOptions();void automaticCaption();}catch{}
  }
  async function begin(version){
    try{const result=await startMedia(video,()=>!dead&&version===generation);if(dead||version!==generation)return;
      if(result==='muted'){q('[data-enable-sound]').hidden=false;status.textContent='O navegador iniciou sem som. Toque em Ativar som.';}
      else if(result==='blocked'){watchdog.stop();q('.watch-notice').hidden=true;q('.watch-center').hidden=false;showControls();status.textContent='Seu navegador pede um toque em reproduzir para iniciar.';}
    }catch(error){if(!dead&&version===generation)failure(playbackError(video.error?.code||4));}
  }
  async function attachShaka(source,version){
    if(!o.loadShaka)throw new Error('O player alternativo não está disponível.');
    await o.loadShaka();if(dead||version!==generation)return false;
    const Player=window.shaka?.Player;if(!Player||!Player.isBrowserSupported?.())throw new Error('O player alternativo não é compatível com este navegador.');
    engineSwitching=true;if(hls){hls.destroy();hls=null;}releaseShaka();video.pause();video.removeAttribute('src');video.load();
    const player=new Player();shakaPlayer=player;
    try{
      await player.attach(video);if(dead||version!==generation){releaseShaka();return false;}
      player.addEventListener?.('error',event=>{if(dead||version!==generation||engineSwitching)return;const detail=event?.detail;failure(detail?.severity===1?'A fonte apresentou um aviso de reprodução.':'O player alternativo não conseguiu manter esta fonte. Tentaremos outra versão.');});
      await player.load(source.url);if(dead||version!==generation)return false;
      engineSwitching=false;watchdog.progress();return true;
    }catch(error){engineSwitching=false;releaseShaka();throw error;}
  }
  async function fallbackToShaka(source,version,message){
    const id=sourceId(source);if(!id||!o.loadShaka){failure(message);return;}if(shakaTried.has(id))return;
    shakaTried.add(id);note('Tentando player alternativo','A primeira forma de reprodução falhou. Tentando outro motor automaticamente…');status.textContent='Tentando player alternativo…';
    try{if(await attachShaka(source,version))void begin(version);}
    catch{if(!dead&&version===generation)failure(message);}
  }
  async function selectSource(index, keepPosition=true){
    if(keepPosition&&video.currentTime>0)resume=video.currentTime;save();const version=++generation;resetMedia();captionChoice='';started=false;selected=index;
    const source=sources[index];if(!source)return;renderOptions();
    sourceFailed=false;attempted.add(sourceId(source));watchdog.start();
    note('Abrindo episódio','Conectando ao vídeo…');status.textContent='';q('[data-play]').disabled=false;
    try{
      const isHls=/mpegurl/i.test(source.type||'')||/\.m3u8(?:\?|$)/i.test(source.url);
      const isDash=/dash|mpd/i.test(source.type||'')||/\.mpd(?:\?|$)/i.test(source.url);
      if(isDash){
        if(!await attachShaka(source,version))return;
      } else if(isHls){
        if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=source.url;
        else {await o.loadHls();if(dead||version!==generation)return;if(!window.Hls?.isSupported()){if(await attachShaka(source,version)){}else return;}else{hls=new window.Hls({maxBufferLength:20,maxMaxBufferLength:40,backBufferLength:30,startLevel:0,manifestLoadingTimeOut:4500,manifestLoadingMaxRetry:0,levelLoadingTimeOut:4500,levelLoadingMaxRetry:0,fragLoadingTimeOut:6000,fragLoadingMaxRetry:0});hls.on(window.Hls.Events.ERROR,(_,data)=>{if(!dead&&version===generation&&data.fatal)void fallbackToShaka(source,version,data.type==='networkError'?'A conexão com este vídeo falhou. Tentaremos outra fonte.':playbackError(3));});for(const event of [window.Hls.Events.MANIFEST_PARSED,window.Hls.Events.LEVEL_LOADED,window.Hls.Events.FRAG_LOADED])if(event)hls.on(event,()=>{if(!dead&&version===generation)watchdog.progress();});hls.loadSource(source.url);hls.attachMedia(video);}}
      } else {video.src=source.url;video.load();}
      captionChoice='';captionTried.clear();if(captionMode==='auto')void automaticCaption();else if(captionMode!=='off'){const track=captionList.find(t=>t.src===captionMode);if(track)void applyCaption(track);else {captionMode='off';renderOptions();}}
      void begin(version);
    }catch(err){if(!dead&&version===generation)failure(err.message);}
  }
  async function load(fresh=false){
    const requestVersion=++loadGeneration;attempted.clear();providersComplete=false;providerReport=[];failureLog=[];const diagnostic=q('[data-diagnostic]');if(diagnostic)diagnostic.hidden=true;
    const version=++generation;save();if(video.currentTime>0)resume=video.currentTime;resetMedia();started=false;sources=[];q('[data-play]').disabled=true;seek.disabled=true;host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=true);note('Preparando sua sessão','Preparando o vídeo para você…');
    function update(result){
      if(dead||requestVersion!==loadGeneration)return;
      providersComplete=result.complete!==false;providerReport=Array.isArray(result.providers)?result.providers:providerReport;
      const current=sourceId(sources[selected]),hadSources=sources.length>0;
      sources=(result.streams?.length?result.streams:result.url?[result]:[]).filter(s=>s.url);
      if(!sources.length){if(result.complete!==false){note('Episódio indisponível','Não foi possível abrir este episódio agora. Tente novamente em instantes.',true);status.textContent='';}return;}
      selected=Math.max(0,sources.findIndex(s=>sourceId(s)===current));renderOptions();
      if(!hadSources)void selectSource(selected,false);
      else if(sourceFailed&&(providersComplete||sources.some(s=>!attempted.has(sourceId(s)))))failure(playbackError(video.error?.code));
      else {const alternative=preferredAlternative(sources,selected,attempted,started,video.readyState);if(alternative>=0)void selectSource(alternative);}
    }
    try{const result=await o.loadSource({fresh,onUpdate:update});update(result);
    }catch(err){if(!dead&&requestVersion===loadGeneration){providersComplete=true;failure('Não foi possível buscar o vídeo. Tente novamente em instantes.');}}
  }
  async function play(){if(!sources.length)return;if(!video.paused){video.pause();return;}try{watchdog.start();await video.play();}catch(err){if(!dead&&err.name!=='AbortError'){if(err.name==='NotAllowedError'){watchdog.stop();status.textContent='Toque em reproduzir para iniciar o vídeo.';}else failure(playbackError(video.error?.code||4));}}}
  function skip(seconds){if(Number.isFinite(video.duration))video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+seconds));}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(screen.requestFullscreen)await screen.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else status.textContent='Tela cheia não está disponível neste navegador.';}catch{status.textContent='Não foi possível ativar a tela cheia.';}}
  on(screen,'pointermove',showControls);on(screen,'pointerdown',()=>{keyboardControls=false;showControls();});on(screen,'focusin',showControls);
  on(screen,'focusout',ev=>{if(!screen.contains(ev.relatedTarget)){keyboardControls=false;showControls();}});
  on(document,'keydown',ev=>{if(ev.key==='Tab')keyboardControls=true;});
  on(screen,'keydown',ev=>{keyboardControls=true;showControls();if(ev.key==='Escape'&&!q('.watch-settings-panel').hidden){ev.preventDefault();ev.stopPropagation();setSettings(false,true);}});
  on(q('[data-settings]'),'click',()=>setSettings(q('.watch-settings-panel').hidden));
  on(q('[data-settings-close]'),'click',()=>setSettings(false,true));
  on(q('[data-video-options]'),'click',()=>setSettings(true,'#watch-source'));
  on(q('[data-caption-options]'),'click',()=>setSettings(true,'#watch-caption'));
  on(q('#watch-source'),'change',ev=>{const index=Number(ev.target.value);if(Number.isInteger(index)&&sources[index]&&index!==selected)void selectSource(index);});
  on(q('#watch-caption'),'change',ev=>{captionMode=ev.target.value;clearCaption();captionTried.clear();renderOptions();if(captionMode==='auto')void automaticCaption();else if(captionMode!=='off'){const track=captionList.find(t=>t.src===captionMode);if(track)void applyCaption(track);}});
  on(q('#watch-speed'),'change',ev=>{const rate=Number(ev.target.value);if([.5,.75,1,1.25,1.5,1.75,2].includes(rate)){video.defaultPlaybackRate=rate;video.playbackRate=rate;showControls();}});
  on(q('[data-episodes-toggle]'),'click',()=>{const panel=q('#watch-episode-panel'),open=panel.hidden;panel.hidden=!open;q('[data-episodes-toggle]').setAttribute('aria-expanded',String(open));if(open)panel.scrollIntoView?.({behavior:o.reducedMotion?'auto':'smooth',block:'nearest'});});
  on(q('[data-comments]'),'click',()=>{if(typeof o.onComments==='function'){Promise.resolve(o.onComments({season:o.season,episode:o.episode,count:commentCount})).then(()=>{if(!dead)q('[data-comments]').setAttribute('aria-expanded',String(!discussion.hidden));}).catch(()=>{if(!dead)q('[data-community-status]').textContent='Não foi possível abrir os comentários. Tente novamente.';});}else {discussion.hidden=!discussion.hidden;q('[data-comments]').setAttribute('aria-expanded',String(!discussion.hidden));if(!discussion.hidden)discussion.scrollIntoView?.({behavior:o.reducedMotion?'auto':'smooth',block:'start'});}});
  if(q('[data-player-close]'))on(q('[data-player-close]'),'click',()=>o.onClose());
  on(document,'fullscreenchange',()=>{q('[data-fullscreen]').innerHTML=playerIcon(document.fullscreenElement?'shrink':'fullscreen');q('[data-fullscreen]').setAttribute('aria-label',document.fullscreenElement?'Sair da tela cheia':'Tela cheia');showControls();});
  on(q('[data-play]'),'click',play);on(q('.watch-big-play'),'click',play);on(video,'click',play);
  host.querySelectorAll('[data-skip]').forEach(b=>on(b,'click',()=>skip(Number(b.dataset.skip))));
  on(q('[data-mute]'),'click',()=>{video.muted=!video.muted;});on(q('.watch-volume'),'input',ev=>{video.volume=Number(ev.target.value);video.muted=video.volume===0;});
  on(video,'volumechange',()=>{q('[data-enable-sound]').hidden=!video.muted;q('.watch-volume').value=String(video.muted?0:video.volume);q('.watch-volume').style.setProperty('--volume',`${video.muted?0:video.volume*100}%`);q('[data-mute]').innerHTML=playerIcon(video.muted?'muted':'sound');q('[data-mute]').setAttribute('aria-label',video.muted?'Ativar som':'Silenciar');});
  on(seek,'input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value);});
  on(q('[data-enable-sound]'),'click',()=>{video.muted=false;q('[data-enable-sound]').hidden=true;status.textContent='';if(video.paused)void begin(generation);});
  on(q('[data-overlay-retry]'),'click',()=>{automaticRefreshes=0;void load(true)});
  on(q('[data-fullscreen]'),'click',fullscreen);
  on(q('[data-previous]'),'click',()=>previous&&o.onEpisode(previous.episode_number));on(q('[data-next]'),'click',()=>next&&o.onEpisode(next.episode_number));
  function prepareNext(){if(next&&Date.now()-prefetchedAt>15000&&o.prefetch){prefetchedAt=Date.now();Promise.resolve(o.prefetch(next.episode_number)).catch(()=>{});}}
  on(q('[data-next]'),'pointerenter',prepareNext);on(q('[data-next]'),'focus',prepareNext);
  on(video,'timeupdate',()=>{if(!video.paused&&Number.isFinite(video.duration)&&video.duration-video.currentTime<=18)prepareNext();});
  on(q('.watch-search'),'input',renderEpisodes);on(q('.watch-episodes'),'click',ev=>{const b=ev.target.closest('[data-episode]');if(b&&!b.disabled)o.onEpisode(Number(b.dataset.episode));});
  on(q('[data-watched]'),'click',()=>mutate({action:'progress',season:o.season,episode:o.episode,watched:q('[data-watched]').getAttribute('aria-pressed')!=='true'},q('[data-watched]')));
  on(video,'loadedmetadata',()=>{if(resume>0&&resume<video.duration-2)video.currentTime=resume;resume=0;seek.disabled=!Number.isFinite(video.duration);host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=seek.disabled);});
  on(video,'progress',()=>watchdog.progress());
  on(video,'loadeddata',()=>watchdog.progress());
  on(video,'canplay',()=>{watchdog.progress();q('.watch-notice').hidden=true;q('.watch-center').hidden=!video.paused;});
  on(video,'playing',()=>{started=true;sourceFailed=false;screen.classList.add('is-playing');q('.watch-notice').hidden=true;q('.watch-center').hidden=true;q('[data-play]').innerHTML=playerIcon('pause');q('[data-play]').setAttribute('aria-label','Pausar');watchdog.stop();showControls();status.textContent=video.muted?'Reproduzindo sem som. Use Ativar som ou o controle de volume.':'';q('[data-enable-sound]').hidden=!video.muted;if(!activity){activity=true;Promise.resolve(o.onActivity()).catch(()=>{activity=false;});}});
  on(video,'pause',()=>{if(started)watchdog.stop();save();screen.classList.remove('is-playing');q('[data-play]').innerHTML=playerIcon('play');q('[data-play]').setAttribute('aria-label','Reproduzir');q('.watch-center').hidden=!q('.watch-notice').hidden;showControls();});
  on(video,'waiting',()=>{status.textContent='Carregando vídeo…';showControls();if(started&&!video.paused)watchdog.start();});
  on(video,'timeupdate',()=>{const duration=Number.isFinite(video.duration)?video.duration:0;seek.max=String(duration||100);seek.value=String(video.currentTime);seek.style.setProperty('--played',`${duration?video.currentTime/duration*100:0}%`);seek.setAttribute('aria-valuetext',`${clockTime(video.currentTime)} de ${clockTime(duration)}`);q('.watch-time').textContent=`${clockTime(video.currentTime)} / ${clockTime(duration)}`;if(Date.now()-lastSave>5000&&!video.paused){lastSave=Date.now();save();}});
  on(video,'error',()=>{if(engineSwitching)return;const current=sources[selected],isAdaptive=current&&(/mpegurl|dash|mpd/i.test(current.type||'')||/\.(?:m3u8|mpd)(?:\?|$)/i.test(current.url||''));if(current&&isAdaptive&&!shakaPlayer&&!shakaTried.has(sourceId(current))&&o.loadShaka){void fallbackToShaka(current,generation,playbackError(video.error?.code));return;}if(video.getAttribute('src')||hls||shakaPlayer)failure(playbackError(video.error?.code));});
  on(video,'ended',()=>{save();Promise.resolve(o.onEnded()).then(()=>{if(!dead)void refreshCommunity();}).catch(()=>{if(!dead)q('[data-community-status]').textContent='Não foi possível salvar o episódio assistido.';});if(auto&&next)o.onEpisode(next.episode_number);else status.textContent=next?'Episódio concluído. Seu próximo capítulo está pronto.':'Você chegou ao fim desta temporada.';});
  on(document,'keydown',ev=>{if(dead||ev.ctrlKey||ev.altKey||ev.metaKey||ev.target.closest('input,select,textarea,[contenteditable="true"]'))return;const k=ev.key.toLowerCase();if((k===' '||k==='k')&&!ev.target.closest('button,a,summary')){ev.preventDefault();void play();}else if(k==='arrowleft'||k==='arrowright'){ev.preventDefault();skip(k==='arrowleft'?-10:10);}else if(k==='m')video.muted=!video.muted;else if(k==='f')void fullscreen();});
  renderEpisodes();renderOptions();void load();void loadExtraCaptions();void refreshCommunity();
  function destroy(){if(dead)return;dead=true;clearTimeout(controlsTimer);++generation;++loadGeneration;observer.disconnect();watchdog.stop();captionAbort?.abort();abort.abort();save();disposeMedia(video,hls);hls=null;releaseShaka();captionUrls.forEach(URL.revokeObjectURL);captionUrls=[];}
  const observer=new MutationObserver(()=>{if(!host.isConnected)destroy();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  on(window,'pagehide',destroy);on(window,'popstate',destroy);on(window,'hashchange',destroy);
  return {destroy};
}
