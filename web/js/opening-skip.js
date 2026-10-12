// Opening times belong to one episode and one video duration; never assume 90s.
export function validOpening(opening,duration){
  if(!opening||!Number.isFinite(duration)||duration<=0)return null;
  const {start,end,episodeLength}=opening;
  if(![start,end,episodeLength].every(Number.isFinite)||start<0||end<=start||end>=duration||Math.abs(episodeLength-duration)>1)return null;
  return {start,end,episodeLength};
}

export function createOpeningSkip({video,button,load,onSkip=()=>{},onFocus=()=>{},schedule=setTimeout,cancel=clearTimeout}){
  let dead=false,version=0,request=null,opening=null,requestedDuration=null,timer=null,buffering=false;
  const listeners=[];
  const on=(element,event,handler)=>{element.addEventListener(event,handler);listeners.push(()=>element.removeEventListener(event,handler));};
  const clearTimer=()=>{if(timer!==null)cancel(timer);timer=null;};
  function active(){
    const times=validOpening(opening,video.duration),time=video.currentTime;
    return times&&!video.error&&!video.ended&&!video.seeking&&video.readyState>=2&&Number.isFinite(time)&&time>=times.start&&time<times.end?times:null;
  }
  function sync(){
    if(dead)return;
    clearTimer();button.hidden=!active();
    const times=validOpening(opening,video.duration),time=video.currentTime,rate=video.playbackRate;
    if(!times||buffering||video.paused||video.seeking||video.error||video.ended||video.readyState<2||!Number.isFinite(time)||!Number.isFinite(rate)||rate<=0)return;
    const boundary=time<times.start?times.start:time<times.end?times.end:null;
    if(boundary!==null)timer=schedule(sync,Math.max(20,(boundary-time)/rate*1000));
  }
  function reset(){
    ++version;request?.abort();request=null;opening=null;requestedDuration=null;clearTimer();button.hidden=true;
  }
  async function refresh(){
    if(dead)return;
    const duration=video.duration;
    if(!Number.isFinite(duration)||duration<=0||video.readyState<1){reset();return;}
    if(requestedDuration!==null&&Math.abs(duration-requestedDuration)<.05){sync();return;}
    reset();requestedDuration=duration;
    if(typeof load!=='function')return;
    const token=version,controller=new AbortController();request=controller;
    try{
      const data=await load({duration,signal:controller.signal});
      if(dead||token!==version||controller.signal.aborted)return;
      opening=validOpening(data?.opening,duration);sync();
    }catch{}finally{if(request===controller)request=null;}
  }
  on(button,'click',()=>{
    const times=active();if(!times)return;
    try{video.currentTime=times.end;button.hidden=true;clearTimer();onFocus();onSkip(times.end);}
    catch{sync();}
  });
  on(video,'emptied',reset);
  for(const event of ['loadedmetadata','durationchange'])on(video,event,refresh);
  for(const event of ['loadeddata','playing'])on(video,event,()=>{buffering=false;sync();});
  for(const event of ['waiting','stalled'])on(video,event,()=>{buffering=true;sync();});
  for(const event of ['timeupdate','seeked','seeking','play','pause','ratechange','ended','error'])on(video,event,sync);
  button.hidden=true;
  return {reset,refresh,destroy(){if(dead)return;dead=true;reset();listeners.forEach(remove=>remove());}};
}
