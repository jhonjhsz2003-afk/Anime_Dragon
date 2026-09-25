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
