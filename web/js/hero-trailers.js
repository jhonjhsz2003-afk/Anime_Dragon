/** Prévia do banner: YouTube IFrame Player API oficial, sem API key no navegador. */
const VIDEO_ID=/^[a-zA-Z0-9_-]{11}$/;
let apiPromise;
let apiRetryAfter=0;
export const validTrailerId=value=>typeof value==='string'&&VIDEO_ID.test(value);
/** Converte um vídeo 16:9 em um fundo que cobre o banner, sem faixas laterais.
 * A margem extra de 28% também recorta parte das barras incluídas no próprio vídeo.
 */
export function coverTrailerFrame(width,height,overscan=1.28){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const ratio=16/9;
 const frameWidth=Math.ceil(Math.max(w,h*ratio)*overscan);
 return {width:frameWidth,height:Math.ceil(frameWidth/ratio)};
}
export function preloadYouTubeIframeAPI(){
 if(typeof window==='undefined'||typeof document==='undefined')return Promise.resolve(null);
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(Date.now()<apiRetryAfter)return Promise.resolve(null);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  let finished=false;
  const previous=window.onYouTubeIframeAPIReady;
  const finish=(error)=>{
   if(finished)return;
   finished=true;
   clearTimeout(watchdog);
   if(error)reject(error);else resolve(window.YT);
  };
  window.onYouTubeIframeAPIReady=()=>{
   if(typeof previous==='function')try{previous()}catch{}
   if(window.YT?.Player)finish();else finish(new Error('API indisponível'));
  };
  const script=document.createElement('script');
  script.src='https://www.youtube.com/iframe_api';
  script.async=true;
  script.referrerPolicy='strict-origin-when-cross-origin';
  script.onerror=()=>finish(new Error('Falha ao carregar YouTube'));
  const watchdog=setTimeout(()=>finish(new Error('Tempo limite do YouTube')),6500);
  document.head.appendChild(script);
 }).catch(()=>{apiPromise=null;apiRetryAfter=Date.now()+60000;return null});
 return apiPromise;
}
export function mountHeroYouTubePreview(hero,videoId){
 if(!hero||!validTrailerId(videoId))return {destroy(){}};
 let disposed=false,player=null,observer=null;
 const stage=document.createElement('div');
 stage.className='hero-video-stage';
 stage.setAttribute('aria-hidden','true');
 const mount=document.createElement('div');
 stage.appendChild(mount);
 hero.prepend(stage);
 const resizeFrame=()=>{
  if(disposed)return;
  const {width,height}=coverTrailerFrame(hero.clientWidth,hero.clientHeight);
  stage.style.setProperty('--hero-video-width',`${width}px`);
  stage.style.setProperty('--hero-video-height',`${height}px`);
 };
 resizeFrame();
 if(typeof ResizeObserver==='function'){
  observer=new ResizeObserver(resizeFrame);
  observer.observe(hero);
 }else window.addEventListener('resize',resizeFrame,{passive:true});
 const hide=()=>{
  hero.classList.remove('trailer-playing');
  // A imagem do anime continua visível se autoplay for bloqueado.
 };
 const clear=()=>{
  if(disposed)return;
  disposed=true;
  hide();
  observer?.disconnect();
  if(!observer)window.removeEventListener('resize',resizeFrame);
  if(player){try{player.destroy()}catch{}player=null;}
  stage.remove();
 };
 void preloadYouTubeIframeAPI().then(YT=>{
  if(disposed||!YT?.Player||!hero.isConnected||document.hidden){clear();return;}
  try{
   player=new YT.Player(mount,{
    videoId,
    width:'1280',height:'720',
    playerVars:{autoplay:1,mute:1,controls:0,playsinline:1,rel:0,disablekb:1,iv_load_policy:3,origin:location.origin},
    events:{
     onReady:event=>{
      if(disposed)return;
      try{event.target.mute();event.target.playVideo()}catch{clear()}
     },
     onStateChange:event=>{
      if(disposed)return;
      if(event.data===YT.PlayerState.PLAYING){
       hero.classList.add('trailer-playing');
      }else if(event.data===YT.PlayerState.ENDED){hide();}
     },
     onError:()=>clear(),
     onAutoplayBlocked:()=>clear()
    }
   });
  }catch{clear()}
 });
 return {destroy:clear};
}
