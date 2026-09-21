const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clockTime = seconds => {
  const n = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds) || 0)) : 0;
  return n >= 3600 ? `${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}` : `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
};
export function playbackError(code) {
  if (code === 2) return 'A conexão com o vídeo falhou. Tente novamente ou selecione outra fonte.';
  if (code === 3) return 'O navegador não conseguiu decodificar este vídeo. Arquivos MKV/HEVC podem exigir outra versão, como MP4/H.264.';
  if (code === 4) return 'Esta fonte foi recusada ou usa um formato incompatível. Tente outra fonte. Vídeos MKV/HEVC não funcionam em todos os navegadores.';
  return 'Não foi possível abrir este vídeo. Tente novamente ou escolha outra fonte disponível.';
}

// Media is embedded directly. CORS is required only for HLS.js and external captions.
export function mountWatchPlayer(host, options) {
  const o=options, e=escapeHTML, abort=new AbortController(), q=s=>host.querySelector(s);
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
  let dead=false, generation=0, hls=null, sources=[], selected=0, community=null;
  let resume=o.resume||0, lastSave=0, activity=false, started=false, captionUrls=[], auto=!!o.autoplay;
  const availableEpisodes=o.episodes.filter(x=>!x.air_date||x.air_date<=new Date().toISOString().slice(0,10));
  const previous=availableEpisodes.find(x=>x.episode_number===o.episode-1), next=availableEpisodes.find(x=>x.episode_number===o.episode+1);
  host.innerHTML=`<header class="watch-heading"><div><span class="eyebrow">SALA DRAGON · TEMPORADA ${o.season}</span><h2 id="detail-title">${e(o.title)}</h2><p>Episódio ${o.episode} · ${e(o.episodes.find(x=>x.episode_number===o.episode)?.name||'Sua próxima história')}</p></div><button class="watch-button" data-cinema aria-pressed="false">Modo cinema</button></header>
  <div class="watch-layout"><main class="watch-main"><div class="watch-screen" tabindex="0" aria-label="Player de vídeo; espaço para reproduzir, setas para avançar ou retroceder">
    <video id="anime-video" playsinline preload="metadata" poster="${e(o.poster)}"></video>
    <div class="watch-notice"><span class="watch-emblem">✦</span><h3 data-message-title>Preparando sua sessão</h3><p data-message>Buscando fontes para este episódio…</p><button class="watch-button" data-overlay-retry hidden>Tentar novamente</button></div>
    <button class="watch-big-play" aria-label="Reproduzir vídeo" hidden>▶</button>
    <div class="watch-controls"><label class="sr-only" for="watch-seek">Posição do vídeo</label><input id="watch-seek" type="range" min="0" max="100" value="0" step="0.1" disabled>
      <div class="watch-control-row"><button class="watch-icon" data-play aria-label="Reproduzir" disabled>▶</button><button class="watch-icon watch-skip" data-skip="-10" aria-label="Retroceder 10 segundos" disabled>↶10</button><button class="watch-icon watch-skip" data-skip="10" aria-label="Avançar 10 segundos" disabled>10↷</button><button class="watch-icon" data-mute aria-label="Silenciar">♪</button><input class="watch-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"><span class="watch-time">0:00 / 0:00</span><span class="watch-spacer"></span><button class="watch-icon" data-pip aria-label="Picture-in-picture" hidden>▣</button><button class="watch-icon" data-fullscreen aria-label="Tela cheia">⛶</button></div>
    </div></div>
    <div class="watch-settings"><label>Fonte<select data-source disabled><option>Buscando fontes…</option></select></label><label>Velocidade<select data-speed>${[0.5,0.75,1,1.25,1.5,1.75,2].map(n=>`<option value="${n}" ${n===1?'selected':''}>${n}×</option>`).join('')}</select></label><label>Legendas<select data-captions disabled><option value="-1">Indisponíveis</option></select></label><button class="watch-button" data-retry>↻ Atualizar fontes</button></div>
    <p class="watch-status" role="status" aria-live="polite"></p>
    <div class="watch-navigation"><button class="watch-button" data-previous ${previous?'':'disabled'}>← Anterior</button><label class="watch-auto"><input type="checkbox" data-auto ${auto?'checked':''}> Próximo automático</label><button class="watch-button watch-primary" data-next ${next?'':'disabled'}>Próximo episódio →</button></div>
    <section class="watch-interactions" aria-label="Sua coleção e opinião"><div class="watch-actions"><button class="watch-button" data-collection="favorite" disabled>♡ Favoritar</button><button class="watch-button" data-collection="watchlater" disabled>＋ Assistir depois</button><button class="watch-button" data-collection="watching" disabled>◉ Acompanhar</button><button class="watch-button" data-reaction="1" disabled>Gostei</button><button class="watch-button" data-reaction="-1" disabled>Não gostei</button><button class="watch-button" data-watched disabled>✓ Marcar assistido</button><button class="watch-button" data-discuss>☷ Debater episódio</button></div><p data-community-status role="status">Carregando suas interações…</p></section>
    <details class="watch-help"><summary>Atalhos e ajuda para assistir</summary><p>Espaço / K: reproduzir ou pausar · ← / →: 10 segundos · M: silenciar · F: tela cheia. As fontes podem variar em formato e disponibilidade. Trocar de fonte preserva o ponto atual. O progresso fica salvo neste navegador.</p></details>
  </main><aside class="watch-sidebar"><div class="watch-sidebar-heading"><span class="eyebrow">CONTINUE A JORNADA</span><h3>Episódios <small>${o.episodes.length}</small></h3></div><input class="watch-search" type="search" placeholder="Buscar episódio…" aria-label="Buscar episódio na temporada"><div class="watch-episodes"></div></aside></div>`;
  const video=q('video'), screen=q('.watch-screen'), seek=q('#watch-seek'), status=q('.watch-status');
  function note(title, message, retry=false) {q('.watch-notice').hidden=false;q('.watch-big-play').hidden=true;q('[data-message-title]').textContent=title;q('[data-message]').textContent=message;q('[data-overlay-retry]').hidden=!retry;}
  function failure(message) {note('Esta fonte não reproduziu',message,true);status.textContent=message;screen.classList.remove('is-playing');}
  function save() {if(started&&Number.isFinite(video.currentTime)&&video.currentTime>0)o.onProgress(video.currentTime,Number.isFinite(video.duration)?video.duration:0);}
  function renderEpisodes() {
    const query=q('.watch-search').value.trim().toLocaleLowerCase('pt-BR');
    const rows=o.episodes.filter(x=>!query||String(x.episode_number)===query||x.name?.toLocaleLowerCase('pt-BR').includes(query));
    q('.watch-episodes').innerHTML=rows.map(x=>{const current=x.episode_number===o.episode,future=x.air_date&&x.air_date>new Date().toISOString().slice(0,10),watched=(community?.progress||[]).some(p=>p.season===o.season&&p.episode===x.episode_number);return `<button class="watch-episode ${current?'current':''}" data-episode="${x.episode_number}" ${current?'aria-current="true"':''} ${future?'disabled':''}><span>${String(x.episode_number).padStart(2,'0')}</span><div><b>${e(x.name||`Episódio ${x.episode_number}`)}</b><small>${future?'Em breve':current?'Você está aqui':watched?'✓ Assistido':x.runtime?`${x.runtime} min`:'Ver episódio'}</small></div><i>${current?'▶':watched?'✓':'›'}</i></button>`}).join('')||'<p>Nenhum episódio encontrado.</p>';
  }
  function renderCommunity() {
    if(!community)return;
    host.querySelectorAll('[data-collection]').forEach(b=>{b.disabled=false;b.setAttribute('aria-pressed',String(community.collections.includes(b.dataset.collection)));});
    host.querySelectorAll('[data-reaction]').forEach(b=>{b.disabled=false;const up=b.dataset.reaction==='1';b.textContent=`${up?'Gostei':'Não gostei'} · ${up?community.likes||0:community.dislikes||0}`;b.setAttribute('aria-pressed',String(community.reaction===Number(b.dataset.reaction)));});
    const watched=(community.progress||[]).some(x=>x.season===o.season&&x.episode===o.episode);
    q('[data-watched]').disabled=false;q('[data-watched]').textContent=watched?'✓ Episódio assistido':'✓ Marcar assistido';q('[data-watched]').setAttribute('aria-pressed',String(watched));q('[data-community-status]').textContent='';renderEpisodes();
  }
  async function refreshCommunity(){try{const result=await o.loadCommunity();if(!dead){community=result;renderCommunity();}}catch{if(!dead)q('[data-community-status]').textContent='Não foi possível carregar suas interações. Use Atualizar fontes para tentar novamente.';}}
  async function mutate(payload,button){button.disabled=true;try{await o.onMutation(payload);if(!dead)await refreshCommunity();}catch(err){if(!dead)q('[data-community-status]').textContent=err.message;}finally{if(!dead)button.disabled=false;}}
  function resetMedia(){if(hls){hls.destroy();hls=null;}video.pause();video.removeAttribute('src');video.load();video.querySelectorAll('track').forEach(t=>t.remove());captionUrls.forEach(URL.revokeObjectURL);captionUrls=[];q('[data-captions]').innerHTML='<option value="-1">Indisponíveis</option>';q('[data-captions]').disabled=true;seek.disabled=true;seek.value='0';q('.watch-time').textContent='0:00 / 0:00';host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=true);}
  async function captions(source,version){
    for(const track of (source.subtitles||[]).slice(0,12)){
      try{const response=await fetch(track.src,{signal:abort.signal,credentials:'omit'});if(!response.ok)throw new Error();const content=await response.text();if(dead||version!==generation)return;if(!content.trimStart().startsWith('WEBVTT'))continue;const url=URL.createObjectURL(new Blob([content],{type:'text/vtt'}));captionUrls.push(url);const el=document.createElement('track');el.kind='subtitles';el.src=url;el.label=track.label||track.language||'Legenda';el.srclang=track.language||'pt';video.append(el);const select=q('[data-captions]');if(select.disabled){select.innerHTML='<option value="-1">Desativadas</option>';select.disabled=false;}select.add(new Option(el.label,String(video.querySelectorAll('track').length-1)));}catch{if(!dead&&version===generation)status.textContent='A legenda externa não carregou. A reprodução do vídeo continua disponível.';}
    }
  }
  async function selectSource(index, keepPosition=true){
    if(keepPosition&&video.currentTime>0)resume=video.currentTime;save();const version=++generation;resetMedia();started=false;selected=index;
    const source=sources[index];if(!source)return;
    q('[data-source]').value=String(index);note('Abrindo episódio',source.name||'Conectando à fonte…');status.textContent='';q('[data-play]').disabled=false;
    try{
      if(/mpegurl/i.test(source.type||'')||/\.m3u8(?:\?|$)/i.test(source.url)){
        if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=source.url;
        else {await o.loadHls();if(dead||version!==generation)return;if(!window.Hls?.isSupported())throw new Error('Este navegador não oferece suporte a HLS.');hls=new window.Hls();hls.on(window.Hls.Events.ERROR,(_,data)=>{if(!dead&&version===generation&&data.fatal)failure(data.type==='networkError'?'A fonte HLS não permitiu carregar o vídeo. Verifique a conexão ou tente outra fonte; o provedor precisa permitir CORS.':playbackError(3));});hls.loadSource(source.url);hls.attachMedia(video);}
      } else {video.src=source.url;video.load();}
      void captions(source,version);
      if(o.autoplay)video.play().catch(()=>{});
    }catch(err){if(!dead&&version===generation)failure(err.message);}
  }
  async function load(){
    const version=++generation;save();if(video.currentTime>0)resume=video.currentTime;resetMedia();started=false;sources=[];q('[data-source]').disabled=true;q('[data-source]').innerHTML='<option>Buscando fontes…</option>';q('[data-play]').disabled=true;q('[data-retry]').disabled=true;seek.disabled=true;host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=true);note('Preparando sua sessão','Buscando fontes para este episódio…');
    try{const result=await o.loadSource();if(dead||version!==generation)return;sources=(result.streams?.length?result.streams:result.url?[result]:[]).filter(s=>s.url);
      if(!result.available||!sources.length){q('[data-source]').innerHTML='<option>Nenhuma fonte disponível</option>';note('Episódio indisponível',result.reason||'O provedor ainda não disponibilizou este episódio.',true);return;}
      q('[data-source]').innerHTML=sources.map((s,i)=>`<option value="${i}">${e(s.name||`Fonte ${i+1}`)}</option>`).join('');q('[data-source]').disabled=false;await selectSource(Math.min(selected,sources.length-1),false);
    }catch(err){if(!dead&&version===generation){q('[data-source]').innerHTML='<option>Falha ao buscar fontes</option>';failure(err.message);}}finally{if(!dead)q('[data-retry]').disabled=false;}
  }
  async function play(){if(!sources.length)return;if(!video.paused){video.pause();return;}try{await video.play();}catch(err){if(!dead&&err.name!=='AbortError'){if(err.name==='NotAllowedError')status.textContent='Toque em reproduzir para iniciar o vídeo.';else failure(playbackError(video.error?.code||4));}}}
  function skip(seconds){if(Number.isFinite(video.duration))video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+seconds));}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(screen.requestFullscreen)await screen.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else status.textContent='Tela cheia não está disponível neste navegador.';}catch{status.textContent='Não foi possível ativar a tela cheia.';}}
  on(q('[data-play]'),'click',play);on(q('.watch-big-play'),'click',play);on(video,'click',play);
  host.querySelectorAll('[data-skip]').forEach(b=>on(b,'click',()=>skip(Number(b.dataset.skip))));
  on(q('[data-mute]'),'click',()=>{video.muted=!video.muted;});on(q('.watch-volume'),'input',ev=>{video.volume=Number(ev.target.value);video.muted=video.volume===0;});
  on(video,'volumechange',()=>{q('.watch-volume').value=String(video.muted?0:video.volume);q('[data-mute]').textContent=video.muted?'×♪':'♪';q('[data-mute]').setAttribute('aria-label',video.muted?'Ativar som':'Silenciar');});
  on(seek,'input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value);});
  on(q('[data-speed]'),'change',ev=>{video.playbackRate=Number(ev.target.value);});on(q('[data-source]'),'change',ev=>selectSource(Number(ev.target.value)));
  on(q('[data-captions]'),'change',ev=>{Array.from(video.textTracks).forEach((t,i)=>t.mode=i===Number(ev.target.value)?'showing':'disabled');});
  on(q('[data-retry]'),'click',()=>{void load();void refreshCommunity();});on(q('[data-overlay-retry]'),'click',load);
  on(q('[data-fullscreen]'),'click',fullscreen);
  if(document.pictureInPictureEnabled&&video.requestPictureInPicture){q('[data-pip]').hidden=false;on(q('[data-pip]'),'click',async()=>{try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else await video.requestPictureInPicture();}catch{status.textContent='Inicie o vídeo antes de abrir picture-in-picture.';}});}
  on(q('[data-cinema]'),'click',ev=>{const active=host.classList.toggle('cinema');ev.target.setAttribute('aria-pressed',String(active));});
  on(q('[data-auto]'),'change',ev=>{auto=ev.target.checked;o.onAutoplay(auto);});
  on(q('[data-previous]'),'click',()=>previous&&o.onEpisode(previous.episode_number));on(q('[data-next]'),'click',()=>next&&o.onEpisode(next.episode_number));on(q('[data-discuss]'),'click',o.onDiscuss);
  on(q('.watch-search'),'input',renderEpisodes);on(q('.watch-episodes'),'click',ev=>{const b=ev.target.closest('[data-episode]');if(b&&!b.disabled)o.onEpisode(Number(b.dataset.episode));});
  host.querySelectorAll('[data-collection]').forEach(b=>on(b,'click',()=>mutate({action:'collection',kind:b.dataset.collection,enabled:!community.collections.includes(b.dataset.collection)},b)));
  host.querySelectorAll('[data-reaction]').forEach(b=>on(b,'click',()=>mutate({action:'reaction',value:community.reaction===Number(b.dataset.reaction)?0:Number(b.dataset.reaction)},b)));
  on(q('[data-watched]'),'click',()=>mutate({action:'progress',season:o.season,episode:o.episode,watched:q('[data-watched]').getAttribute('aria-pressed')!=='true'},q('[data-watched]')));
  on(video,'loadedmetadata',()=>{if(resume>0&&resume<video.duration-2)video.currentTime=resume;resume=0;video.playbackRate=Number(q('[data-speed]').value);seek.disabled=!Number.isFinite(video.duration);host.querySelectorAll('[data-skip]').forEach(b=>b.disabled=seek.disabled);});
  on(video,'canplay',()=>{q('.watch-notice').hidden=true;q('.watch-big-play').hidden=!video.paused;});
  on(video,'playing',()=>{started=true;screen.classList.add('is-playing');q('.watch-notice').hidden=true;q('.watch-big-play').hidden=true;q('[data-play]').textContent='Ⅱ';q('[data-play]').setAttribute('aria-label','Pausar');status.textContent='';if(!activity){activity=true;Promise.resolve(o.onActivity()).catch(()=>{activity=false;});}});
  on(video,'pause',()=>{save();screen.classList.remove('is-playing');q('[data-play]').textContent='▶';q('[data-play]').setAttribute('aria-label','Reproduzir');q('.watch-big-play').hidden=!q('.watch-notice').hidden;});
  on(video,'waiting',()=>{status.textContent='Carregando vídeo…';});
  on(video,'timeupdate',()=>{const duration=Number.isFinite(video.duration)?video.duration:0;seek.max=String(duration||100);seek.value=String(video.currentTime);seek.style.setProperty('--played',`${duration?video.currentTime/duration*100:0}%`);seek.setAttribute('aria-valuetext',`${clockTime(video.currentTime)} de ${clockTime(duration)}`);q('.watch-time').textContent=`${clockTime(video.currentTime)} / ${clockTime(duration)}`;if(Date.now()-lastSave>5000&&!video.paused){lastSave=Date.now();save();}});
  on(video,'error',()=>{if(video.getAttribute('src')||hls)failure(playbackError(video.error?.code));});
  on(video,'ended',()=>{save();Promise.resolve(o.onEnded()).then(()=>{if(!dead)void refreshCommunity();}).catch(()=>{if(!dead)q('[data-community-status]').textContent='Não foi possível salvar o episódio assistido.';});if(auto&&next)o.onEpisode(next.episode_number);else status.textContent=next?'Episódio concluído. Seu próximo capítulo está pronto.':'Você chegou ao fim desta temporada.';});
  on(document,'keydown',ev=>{if(dead||ev.ctrlKey||ev.altKey||ev.metaKey||ev.target.closest('input,select,textarea,[contenteditable="true"]'))return;const k=ev.key.toLowerCase();if((k===' '||k==='k')&&!ev.target.closest('button,a,summary')){ev.preventDefault();void play();}else if(k==='arrowleft'||k==='arrowright'){ev.preventDefault();skip(k==='arrowleft'?-10:10);}else if(k==='m')video.muted=!video.muted;else if(k==='f')void fullscreen();});
  renderEpisodes();void refreshCommunity();void load();
  return {destroy(){if(dead)return;save();dead=true;++generation;abort.abort();if(document.pictureInPictureElement===video)document.exitPictureInPicture().catch(()=>{});resetMedia();}};
}
