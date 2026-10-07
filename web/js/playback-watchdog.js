// A progressing download is not a stalled one. Both idle and total startup
// time are bounded; callers stop this timer on play, pause, switch and teardown.
export function createPlaybackWatchdog(onStall,{now=Date.now,schedule=setTimeout,cancel=clearTimeout,idleMs=8000,totalMs=30000}={}){
 let timer=null,active=false,began=0,progressed=0,epoch=0;
 function stop(){active=false;++epoch;cancel(timer);timer=null;}
 function arm(){const version=epoch;timer=schedule(()=>{
   if(!active||version!==epoch)return;
   const elapsed=now();
   if(elapsed-progressed>=idleMs||elapsed-began>=totalMs){stop();onStall();}
   else arm();
 },Math.max(1,Math.min(idleMs-(now()-progressed),totalMs-(now()-began))));}
 return {start(){if(active)return;stop();active=true;began=progressed=now();arm();},progress(){if(active)progressed=now();},stop};
}

export function sourcePriority(source={}){
 const type=source.type||'',label=`${source.name||''} ${source.title||''}`;
 if(/matroska|hevc|h\.265/i.test(type+' '+label))return 0;
 if(/mpegurl|video\/(?:mp4|webm)/i.test(type)||/\.m3u8(?:\?|$)/i.test(source.url||''))return 2;
 return 1;
}

export function preferredAlternative(sources,selected,attempted,started,readyState){
 if(started||readyState>=3)return -1;
 const priority=sourcePriority(sources[selected]);
 return sources.findIndex((source,index)=>index!==selected&&!attempted.has(source.key||source.url)&&sourcePriority(source)>priority);
}

// One episode has one recovery budget. Empty results, request failures and media
// failures share it, so overlapping events cannot create an endless retry loop.
export function createPlaybackRecovery({onAttempt,onRetry=()=>{},onExhausted=()=>{}}={},
 {now=Date.now,schedule=setTimeout,cancel=clearTimeout,maxAttempts=3,budgetMs=45000,delays=[900,2400]}={}){
 let state='idle',attempt=0,began=0,epoch=0,timer=null,deadline=null,controller=null,lastReason='';
 const clear=()=>{cancel(timer);cancel(deadline);timer=deadline=null;};
 function stop(next){++epoch;clear();controller?.abort();controller=null;state=next;}
 function exhausted(reason){if(state!=='active'&&state!=='waiting')return;stop('exhausted');onExhausted({reason:reason||lastReason,attempts:attempt});}
 function launch(fresh){
  if(state!=='active'&&state!=='waiting')return;
  if(attempt>=maxAttempts||now()-began>=budgetMs){exhausted(lastReason);return;}
  state='active';attempt++;controller?.abort();const current=controller=new AbortController(),version=epoch;
  Promise.resolve().then(()=>{if(version!==epoch||current.signal.aborted||state!=='active')return;return onAttempt({attempt,fresh,signal:current.signal,timeoutMs:Math.min(12000,Math.max(1,budgetMs-(now()-began)))});})
   .catch(error=>{if(version===epoch&&!current.signal.aborted&&state==='active')retry(error?.message||'A busca do vídeo falhou.');});
 }
 function start({fresh=false}={}){stop('idle');state='active';attempt=0;began=now();lastReason='';deadline=schedule(()=>exhausted(lastReason||'A reprodução não iniciou dentro do prazo.'),budgetMs);launch(fresh);}
 function retry(reason){
  if(state==='succeeded'){start({fresh:true});return true;}
  if(state==='waiting')return true;
  if(state!=='active')return false;
  lastReason=reason;controller?.abort();const delay=delays[Math.min(attempt-1,delays.length-1)]||0;
  if(attempt>=maxAttempts||now()-began+delay>=budgetMs){exhausted(reason);return false;}
  state='waiting';onRetry({attempt:attempt+1,maxAttempts,delay,reason});const version=epoch;
  timer=schedule(()=>{timer=null;if(version===epoch)launch(true);},delay);return true;
 }
 return {start,retry,success(){if(state==='active'||state==='waiting')stop('succeeded');},cancel(){stop('cancelled');},get attempts(){return attempt;},get state(){return state;}};
}
