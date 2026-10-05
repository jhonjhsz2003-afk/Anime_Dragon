// The server's HttpOnly cookie is the only persisted credential. Keep user data in memory.
export function createAuthSession({
 request,onChange=()=>{},onStatus=()=>{},window:win=globalThis.window,document:doc=globalThis.document,
 now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout,revalidateMs=300000,throttleMs=30000,
 retryDelays=[1000,3000,10000,30000,60000]
}={}){
 if(typeof request!=='function')throw new TypeError('A session request function is required.');
 const interval=Math.min(300000,Math.max(1,Number(revalidateMs)||300000));
 const throttle=Math.min(interval,Math.max(0,Number(throttleMs)||0));
 const delays=retryDelays.filter(delay=>Number.isFinite(delay)&&delay>0);
 if(!delays.length)throw new TypeError('At least one positive retry delay is required.');
 let user=null,known=false,status='idle',started=false,destroyed=false,revision=0,inFlight=null;
 let lastAttempt=-Infinity,lastChecked=null,failures=0,retryTimer=null,retryDue=null,periodicTimer=null;
 const visible=()=>doc?.visibilityState!=='hidden'&&doc?.hidden!==true;
 const online=()=>win?.navigator?.onLine!==false;
 const validUser=value=>value&&typeof value==='object'&&!Array.isArray(value)&&
  (typeof value.id==='string'&&value.id.length>0||typeof value.id==='number'&&Number.isFinite(value.id));
 const httpStatus=error=>Number(error?.status??error?.statusCode??error?.response?.status)||0;
 const sameUser=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);
 function setStatus(value,meta={}){if(destroyed)return;status=value;onStatus(value,{known,preserved:!!user,...meta});}
 function clearRetry(){if(retryTimer!==null)cancel(retryTimer);retryTimer=null;retryDue=null;}
 function clearPeriodic(){if(periodicTimer!==null)cancel(periodicTimer);periodicTimer=null;}
 function resumeRetry(){
  if(destroyed||retryDue===null||retryTimer!==null||!visible())return;
  retryTimer=schedule(()=>{retryTimer=null;if(!destroyed&&visible())restore({force:true,reason:'retry'});},Math.max(0,retryDue-now()));
 }
 function retry(reason,errorStatus=0){
  failures++;const delay=delays[Math.min(failures-1,delays.length-1)];
  clearRetry();retryDue=now()+delay;
  setStatus('retrying',{reason,attempt:failures,retryInMs:delay,retryAt:retryDue,errorStatus});
  resumeRetry();
 }
 function schedulePeriodic(){
  clearPeriodic();if(!started||destroyed||!visible())return;
  periodicTimer=schedule(()=>{periodicTimer=null;if(destroyed)return;restore({reason:'interval'});schedulePeriodic();},interval);
 }
 function invalidate(){revision++;clearRetry();inFlight?.controller.abort();inFlight=null;}
 function commit(next,meta){
  const changed=!known||!sameUser(user,next);user=next;known=true;failures=0;lastChecked=now();clearRetry();
  setStatus('ready',{reason:meta.reason,checkedAt:lastChecked});
  if(!destroyed)onChange(user,{...meta,definitive:true,changed,checkedAt:lastChecked});
  schedulePeriodic();
 }
 function restore({force=false,reason='manual'}={}){
  if(destroyed)return Promise.resolve(user);
  if(inFlight)return inFlight.promise;
  if(!force&&now()-lastAttempt<throttle)return Promise.resolve(user);
  if(!online()){retry(reason);return Promise.resolve(user);}
  clearRetry();lastAttempt=now();
  const ticket={revision,controller:new AbortController(),promise:null},attempt=failures+1,startedAt=lastAttempt;
  ticket.promise=Promise.resolve().then(async()=>{
   // accept(), clear() or destroy() can run before the scheduled request begins.
   if(destroyed||ticket.revision!==revision)return user;
   let data,error;
   try{data=await request('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:ticket.controller.signal});}
   catch(caught){error=caught;}
   if(destroyed||ticket.revision!==revision)return user;
   inFlight=null;
   const code=httpStatus(error);
   if(error&&code!==401){retry(reason,code);return user;}
   if(!error&&(!data||data.ok===false||!Object.hasOwn(data,'user')||(data.user!==null&&!validUser(data.user)))){
    retry(reason);return user;
   }
   commit(error?null:data.user,{reason,source:'server',attempt,durationMs:Math.max(0,now()-startedAt),...(code?{httpStatus:code}:{})});
   return user;
  });
  inFlight=ticket;setStatus('loading',{reason,attempt});return ticket.promise;
 }
 function accept(next){
  if(destroyed)return user;
  if(!validUser(next))throw new TypeError('A confirmed user with an id is required.');
  invalidate();lastAttempt=now();commit(next,{reason:'login',source:'accepted',attempt:0});return user;
 }
 function clear(){
  if(destroyed)return user;
  invalidate();lastAttempt=now();commit(null,{reason:'logout',source:'explicit',attempt:0});return user;
 }
 const onOnline=()=>restore({reason:'online'});
 const onPageshow=()=>restore({reason:'pageshow'});
 const onFocus=()=>restore({reason:'focus'});
 function onVisibility(){
  if(visible()){restore({reason:'visibility'});resumeRetry();schedulePeriodic();}
  else{clearPeriodic();if(retryTimer!==null)cancel(retryTimer);retryTimer=null;}
 }
 function start(){
  if(started||destroyed)return controller;
  started=true;win?.addEventListener?.('online',onOnline);win?.addEventListener?.('pageshow',onPageshow);
  win?.addEventListener?.('focus',onFocus);doc?.addEventListener?.('visibilitychange',onVisibility);
  restore({reason:'startup'});schedulePeriodic();return controller;
 }
 function destroy(){
  if(destroyed)return;destroyed=true;invalidate();clearPeriodic();
  win?.removeEventListener?.('online',onOnline);win?.removeEventListener?.('pageshow',onPageshow);
  win?.removeEventListener?.('focus',onFocus);doc?.removeEventListener?.('visibilitychange',onVisibility);started=false;
 }
 const controller={restore,accept,clear,start,destroy,get user(){return user;},get status(){return status;},get checkedAt(){return lastChecked;}};
 return controller;
}
