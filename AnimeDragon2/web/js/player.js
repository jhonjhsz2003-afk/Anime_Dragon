import {mergeCaptions,readCaption} from './captions.js?v=9.6';
const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
  let dead=false, generation=0, hls=null, sources=[], selected=0, community=null;
  let resume=o.resume||0, lastSave=0, activity=false, started=false, captionUrls=[], auto=!!o.autoplay;
  let loadGeneration=0,prefetchedAt=0,sourceTimer=null,sourceFailed=false,providersComplete=false;const attempted=new Set();
  let extraCaptions=[],captionList=[],captionChoice='',captionRequest=0,captionAbort=null,captionTried=new Set();
  const sourceId=s=>s?.key||s?.url;
  const availableEpisodes=o.episodes.filter(x=>!x.air_date||x.air_date<=new Date().toISOString().slice(0,10));
  const previous=availableEpisodes.find(x=>x.episode_number===o.episode-1), next=availableEpisodes.find(x=>x.episode_number===o.episode+1);
  host.innerHTML=`<header class="watch-heading"><div><span class="eyebrow">SALA DRAGON · TEMPORADA ${o.season}</span><h2 id="detail-title">${e(o.title)}</h2><p>Episódio ${o.episode} · ${e(o.episodes.find(x=>x.episode_number===o.episode)?.name||'Sua próxima história')}</p></div></header>
  <div class="watch-layout"><main class="watch-main"><div class="watch-screen" tabindex="0" aria-label="Player de vídeo; espaço para reproduzir, setas para avançar ou retroceder">
    <video id="anime-video" playsinline autoplay preload="auto" disablepictureinpicture poster="${e(o.poster)}"></video>
    <div class="watch-notice"><span class="watch-emblem">✦</span><h3 data-message-title>Preparando sua sessão</h3><p data-message>Preparando o vídeo para você…</p><button class="watch-button" data-overlay-retry hidden>Tentar novamente</button></div>
    <button class="watch-big-play" aria-label="Reproduzir vídeo" hidden>▶</button>
    <div class="watch-controls"><label class="sr-only" for="watch-seek">Posição do vídeo</label><input id="watch-seek" type="range" min="0" max="100" value="0" step="0.1" disabled>
      <div class="watch-control-row"><button class="watch-icon" data-play aria-label="Reproduzir" disabled>▶</button><button class="watch-icon watch-skip" data-skip="-10" aria-label="Retroceder 10 segundos" disabled>↶10</button><button class="watch-icon watch-skip" data-skip="10" aria-label="Avançar 10 segundos" disabled>10↷</button><button class="watch-icon" data-mute aria-label="Silenciar">♪</button><input class="watch-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"><span class="watch-time">0:00 / 0:00</span><span class="watch-spacer"></span><button class="watch-icon" data-fullscreen aria-label="Tela cheia">⛶</button></div>
    </div></div>
    <button class="watch-button" data-enable-sound hidden>♪ Ativar som</button><p class="watch-status" role="status" aria-live="polite"></p>
    <div class="watch-navigation"><button class="watch-button" data-previous ${previous?'':'disabled'}>← Anterior</button><button class="watch-button" data-watched disabled>✓ Marcar como assistido</button><button class="watch-button watch-primary" data-next ${next?'':'disabled'}>Próximo episódio →</button></div>
    <p data-community-status role="status"></p>
    <section id="discussion" class="discussion-section watch-discussion" aria-label="Comentários do episódio"><h3>Comentários do episódio</h3><p>Carregando comentários…</p></section>
  </main><aside class="watch-sidebar"><div class="watch-sidebar-heading"><span class="eyebrow">CONTINUE A JORNADA</span><h3>Episódios <small>${o.episodes.length}</small></h3></div><input class="watch-search" type="search" placeholder="Buscar episódio…" aria-label="Buscar episódio na temporada"><div class="watch-episodes"></div></aside></div>`;
  const video=q('video'), screen=q('.watch-screen'), seek=q('#watch-seek'), status=q('.watch-status');
  function note(title, message, retry=false) {q('.watch-notice').hidden=false;q('.watch-big-play').hidden=true;q('[data-message-title]').textContent=title;q('[data-message]').textContent=message;q('[data-overlay-retry]').hidden=!retry;}
  function failure(message) {sourceFailed=true;clearTimeout(sourceTimer);const alternative=sources.findIndex((s,i)=>i!==selected&&!attempted.has(sourceId(s)));if(alternative>=0){status.textContent='Abrindo outra versão do vídeo…';void selectSource(alternative);return;}if(!providersComplete){note('Preparando episódio','Estamos tentando abrir o vídeo. Aguarde um momento…');status.textContent='Preparando episódio…';return;}note('Não foi possível iniciar',message,true);status.textContent=message;screen.classList.remove('is-playing');}
  function save() {if(started&&Number.isFinite(video.currentTime)&&video.currentTime>0)o.onProgress(video.currentTime,Number.isFinite(video.duration)?video.duration:0);}
  function renderEpisodes() {
    const query=q('.watch-search').value.trim().toLocaleLowerCase('pt-BR');
    const rows=o.episodes.filter(x=>!query||String(x.episode_number)===query||x.name?.toLocaleLowerCase('pt-BR').includes(query));
    q('.watch-episodes').innerHTML=rows.map(x=>{const current=x.episode_number===o.episode,future=x.air_date&&x.air_date>new Date().toISOString().slice(0,10),watched=(community?.progress||[]).some(p=>p.season===o.season&&p.episode===x.episode_number);return `<button class="watch-episode ${current?'current':''}" data-episode="${x.episode_number}" ${current?'aria-current="true"':''} ${future?'disabled':''}><span>${String(x.episode_number).padStart(2,'0')}</span><div><b>${e(x.name||`Episódio ${x.episode_number}`)}</b><small>${future?'Em breve':current?'Você está aqui':watched?'✓ Assistido':x.runtime?`${x.runtime} min`:'Ver episódio'}</small></div><i>${current?'▶':watched?'✓':'›'}</i></button>`}).join('')||'<p>Nenhum episódio encontrado.</p>';
  }
  function renderCommunity() {
    if(!community)return;
    const watched=(community.progress||[]).some(x=>x.season===o.season&&x.episode===o.episode);
    q('[data-watched]').disabled=false;q('[data-watched]').textContent=watched?'✓ Episódio assistido':'✓ Marcar como assistido';q('[data-watched]').setAttribute('aria-pressed',String(watched));q('[data-community-status]').textContent='';renderEpisodes();
  }
  async function refreshCommunity(){try{const result=await o.loadCommunity();if(!dead){community=result;renderCommunity();}}catch{if(!dead)q('[data-community-status]').textContent='Não foi possível consultar se este episódio foi assistido. Reabra o episódio para tentar novamente.';}}
  async function mutate(payload,button){button.disabled=true;try{await o.onMutation(payload);if(!dead)await refreshCommunity();}catch(err){if(!dead)q('[data-community-status]').textContent=err.message;}finally{if(!dead)button.disabled=false;}}
  function resetMedia(){++captionRequest;captionAbort?.abort();clearTimeout(sourceTimer);if(hls){hls.destroy();hls=null;}video.pause();video.removeAttribute('src');video.load();video.querySelectorAll('track').forEach(t=>t.remove());captionUrls.forEach(URL.revokeObjectURL);captionUrls=[];seek.disabled=true;seek.value='0';seek.style.setProperty('--played','0%');q('.watch-time').textContent='0:00 / 0:00';host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=true);}
  async function automaticCaption(){
    if(o.autoCaptions===false||captionChoice||!sources.length||captionTried.size>=3)return;
    captionList=mergeCaptions(sources[selected]?.subtitles||[],extraCaptions);
    const track=captionList.find(t=>/^(pt(?:-br)?|por|pob)$/i.test(t.language||'')&&!captionTried.has(t.src));
    if(!track)return;
    captionChoice=track.src;captionTried.add(track.src);captionAbort?.abort();captionAbort=new AbortController();const request=++captionRequest,version=generation;
    try{
      const text=await readCaption(track.src,captionAbort.signal);
      if(dead||request!==captionRequest||version!==generation)return;
      const url=URL.createObjectURL(new Blob([text],{type:'text/vtt'}));captionUrls.push(url);
      const el=document.createElement('track');el.kind='subtitles';el.src=url;el.label=track.label;el.srclang=track.language||'pt';video.append(el);el.track.mode='showing';
      on(el,'error',()=>{if(!dead&&request===captionRequest){el.remove();captionChoice='';if(captionTried.size<3)void automaticCaption();}});
    }catch{if(!dead&&request===captionRequest&&version===generation){captionChoice='';if(captionTried.size<3)void automaticCaption();}}
  }
  async function loadExtraCaptions(){
    if(!o.loadSubtitles||o.autoCaptions===false)return;
    try{const result=await o.loadSubtitles();if(dead)return;extraCaptions=result.subtitles||[];void automaticCaption();}catch{}
  }
  async function begin(version){
    try{const result=await startMedia(video,()=>!dead&&version===generation);if(dead||version!==generation)return;
      if(result==='muted'){q('[data-enable-sound]').hidden=false;status.textContent='O navegador iniciou sem som. Toque em Ativar som.';}
      else if(result==='blocked'){clearTimeout(sourceTimer);q('.watch-notice').hidden=true;q('.watch-big-play').hidden=false;status.textContent='Seu navegador pede um toque em reproduzir para iniciar.';}
    }catch(error){if(!dead&&version===generation)failure(playbackError(video.error?.code||4));}
  }
  async function selectSource(index, keepPosition=true){
    if(keepPosition&&video.currentTime>0)resume=video.currentTime;save();const version=++generation;resetMedia();captionChoice='';started=false;selected=index;
    const source=sources[index];if(!source)return;
    sourceFailed=false;attempted.add(sourceId(source));sourceTimer=setTimeout(()=>{if(!dead&&version===generation&&video.readyState<3)failure('Esta fonte está demorando para responder. Tentaremos outra fonte disponível.');},10000);
    note('Abrindo episódio','Conectando ao vídeo…');status.textContent='';q('[data-play]').disabled=false;
    try{
      if(/mpegurl/i.test(source.type||'')||/\.m3u8(?:\?|$)/i.test(source.url)){
        if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=source.url;
        else {await o.loadHls();if(dead||version!==generation)return;if(!window.Hls?.isSupported())throw new Error('Este navegador não oferece suporte a HLS.');hls=new window.Hls({maxBufferLength:20,maxMaxBufferLength:40,backBufferLength:30});hls.on(window.Hls.Events.ERROR,(_,data)=>{if(!dead&&version===generation&&data.fatal)failure(data.type==='networkError'?'A conexão com este vídeo falhou. Tentaremos outra fonte.':playbackError(3));});hls.loadSource(source.url);hls.attachMedia(video);}
      } else {video.src=source.url;video.load();}
      captionChoice='';captionTried.clear();void automaticCaption();
      void begin(version);
    }catch(err){if(!dead&&version===generation)failure(err.message);}
  }
  async function load(fresh=false){
    const requestVersion=++loadGeneration;attempted.clear();providersComplete=false;
    const version=++generation;save();if(video.currentTime>0)resume=video.currentTime;resetMedia();started=false;sources=[];q('[data-play]').disabled=true;seek.disabled=true;host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=true);note('Preparando sua sessão','Preparando o vídeo para você…');
    function update(result){
      if(dead||requestVersion!==loadGeneration)return;
      providersComplete=result.complete!==false;
      const current=sourceId(sources[selected]),hadSources=sources.length>0;
      sources=(result.streams?.length?result.streams:result.url?[result]:[]).filter(s=>s.url);
      if(!sources.length){if(result.complete!==false){note('Episódio indisponível','Não foi possível abrir este episódio agora. Tente novamente em instantes.',true);status.textContent='';}return;}
      selected=Math.max(0,sources.findIndex(s=>sourceId(s)===current));
      if(!hadSources)void selectSource(selected,false);
      else if(sourceFailed&&(providersComplete||sources.some(s=>!attempted.has(sourceId(s)))))failure(playbackError(video.error?.code));
    }
    try{const result=await o.loadSource({fresh,onUpdate:update});update(result);
    }catch(err){if(!dead&&requestVersion===loadGeneration){providersComplete=true;failure('Não foi possível buscar o vídeo. Tente novamente em instantes.');}}
  }
  async function play(){if(!sources.length)return;if(!video.paused){video.pause();return;}try{await video.play();}catch(err){if(!dead&&err.name!=='AbortError'){if(err.name==='NotAllowedError')status.textContent='Toque em reproduzir para iniciar o vídeo.';else failure(playbackError(video.error?.code||4));}}}
  function skip(seconds){if(Number.isFinite(video.duration))video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+seconds));}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(screen.requestFullscreen)await screen.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else status.textContent='Tela cheia não está disponível neste navegador.';}catch{status.textContent='Não foi possível ativar a tela cheia.';}}
  on(q('[data-play]'),'click',play);on(q('.watch-big-play'),'click',play);on(video,'click',play);
  host.querySelectorAll('[data-skip]').forEach(b=>on(b,'click',()=>skip(Number(b.dataset.skip))));
  on(q('[data-mute]'),'click',()=>{video.muted=!video.muted;});on(q('.watch-volume'),'input',ev=>{video.volume=Number(ev.target.value);video.muted=video.volume===0;});
  on(video,'volumechange',()=>{q('[data-enable-sound]').hidden=!video.muted;q('.watch-volume').value=String(video.muted?0:video.volume);q('.watch-volume').style.setProperty('--volume',`${video.muted?0:video.volume*100}%`);q('[data-mute]').textContent=video.muted?'×♪':'♪';q('[data-mute]').setAttribute('aria-label',video.muted?'Ativar som':'Silenciar');});
  on(seek,'input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value);});
  on(q('[data-enable-sound]'),'click',()=>{video.muted=false;q('[data-enable-sound]').hidden=true;status.textContent='';if(video.paused)void begin(generation);});
  on(q('[data-overlay-retry]'),'click',()=>load(true));
  on(q('[data-fullscreen]'),'click',fullscreen);
  on(q('[data-previous]'),'click',()=>previous&&o.onEpisode(previous.episode_number));on(q('[data-next]'),'click',()=>next&&o.onEpisode(next.episode_number));
  function prepareNext(){if(next&&Date.now()-prefetchedAt>15000&&o.prefetch){prefetchedAt=Date.now();Promise.resolve(o.prefetch(next.episode_number)).catch(()=>{});}}
  on(q('[data-next]'),'pointerenter',prepareNext);on(q('[data-next]'),'focus',prepareNext);
  on(video,'timeupdate',()=>{if(!video.paused&&Number.isFinite(video.duration)&&video.duration-video.currentTime<=18)prepareNext();});
  on(q('.watch-search'),'input',renderEpisodes);on(q('.watch-episodes'),'click',ev=>{const b=ev.target.closest('[data-episode]');if(b&&!b.disabled)o.onEpisode(Number(b.dataset.episode));});
  on(q('[data-watched]'),'click',()=>mutate({action:'progress',season:o.season,episode:o.episode,watched:q('[data-watched]').getAttribute('aria-pressed')!=='true'},q('[data-watched]')));
  on(video,'loadedmetadata',()=>{if(resume>0&&resume<video.duration-2)video.currentTime=resume;resume=0;seek.disabled=!Number.isFinite(video.duration);host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=seek.disabled);});
  on(video,'canplay',()=>{clearTimeout(sourceTimer);q('.watch-notice').hidden=true;q('.watch-big-play').hidden=!video.paused;});
  on(video,'playing',()=>{started=true;screen.classList.add('is-playing');q('.watch-notice').hidden=true;q('.watch-big-play').hidden=true;q('[data-play]').textContent='Ⅱ';q('[data-play]').setAttribute('aria-label','Pausar');clearTimeout(sourceTimer);status.textContent=video.muted?'Reproduzindo sem som. Use Ativar som ou o controle de volume.':'';q('[data-enable-sound]').hidden=!video.muted;if(!activity){activity=true;Promise.resolve(o.onActivity()).catch(()=>{activity=false;});}});
  on(video,'pause',()=>{save();screen.classList.remove('is-playing');q('[data-play]').textContent='▶';q('[data-play]').setAttribute('aria-label','Reproduzir');q('.watch-big-play').hidden=!q('.watch-notice').hidden;});
  on(video,'waiting',()=>{status.textContent='Carregando vídeo…';});
  on(video,'timeupdate',()=>{const duration=Number.isFinite(video.duration)?video.duration:0;seek.max=String(duration||100);seek.value=String(video.currentTime);seek.style.setProperty('--played',`${duration?video.currentTime/duration*100:0}%`);seek.setAttribute('aria-valuetext',`${clockTime(video.currentTime)} de ${clockTime(duration)}`);q('.watch-time').textContent=`${clockTime(video.currentTime)} / ${clockTime(duration)}`;if(Date.now()-lastSave>5000&&!video.paused){lastSave=Date.now();save();}});
  on(video,'error',()=>{if(video.getAttribute('src')||hls)failure(playbackError(video.error?.code));});
  on(video,'ended',()=>{save();Promise.resolve(o.onEnded()).then(()=>{if(!dead)void refreshCommunity();}).catch(()=>{if(!dead)q('[data-community-status]').textContent='Não foi possível salvar o episódio assistido.';});if(auto&&next)o.onEpisode(next.episode_number);else status.textContent=next?'Episódio concluído. Seu próximo capítulo está pronto.':'Você chegou ao fim desta temporada.';});
  on(document,'keydown',ev=>{if(dead||ev.ctrlKey||ev.altKey||ev.metaKey||ev.target.closest('input,select,textarea,[contenteditable="true"]'))return;const k=ev.key.toLowerCase();if((k===' '||k==='k')&&!ev.target.closest('button,a,summary')){ev.preventDefault();void play();}else if(k==='arrowleft'||k==='arrowright'){ev.preventDefault();skip(k==='arrowleft'?-10:10);}else if(k==='m')video.muted=!video.muted;else if(k==='f')void fullscreen();});
  renderEpisodes();void load();void loadExtraCaptions();void refreshCommunity();
  return {destroy(){if(dead)return;save();dead=true;++generation;abort.abort();resetMedia();}};
}
