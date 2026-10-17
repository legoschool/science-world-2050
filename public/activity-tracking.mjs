/** Conservative participation estimate: focused, visible, online, recent input.
 * No background/offline queue of elapsed time. The server also bounds every
 * accepted sample and grants one live tab per student a measuring lease.
 */
export function startActivityTracking({api,getContext}) {
  const sessionId=crypto.randomUUID();
  let sequence=0,lastInput=-Infinity,lastTick=performance.now(),lastPulse=-Infinity;
  let current=null,wasActive=false,elapsed=0,inFlight=false,stopped=false;
  const packets=[];
  const pendingErrors=[],seenErrors=new WeakSet(),recentErrors=new Map();
  const context=()=>{
    const c=getContext();
    if(!c?.enabled||!c.userId||!c.runId||!c.gameId||!c.taskId)return null;
    return {userId:c.userId,runId:c.runId,gameId:c.gameId,taskId:c.taskId};
  };
  const key=c=>c?`${c.userId}|${c.runId}|${c.gameId}|${c.taskId}`:'';
  const payload=c=>({runId:c.runId,gameId:c.gameId,taskId:c.taskId});
  const live=now=>document.visibilityState==='visible'&&document.hasFocus()&&navigator.onLine&&now-lastInput<60000;
  const drain=async()=>{
    if(inFlight)return;
    inFlight=true;
    try{
      while(packets.length){
        const p=packets.shift();
        if(!navigator.onLine||performance.now()-p.created>15000||getContext()?.userId!==p.c.userId)continue;
        try{await api('activity-pulse',{...payload(p.c),sessionId,sequence:++sequence,active:p.active,activeMs:p.ms});}
        catch{packets.length=0;wasActive=false;elapsed=0;break;}
      }
    }
    finally{inFlight=false;}
  };
  const pulse=(c,active,ms=0)=>{
    if(!c||!navigator.onLine)return;
    packets.push({c,active,ms:Math.max(0,Math.min(15000,Math.floor(ms))),created:performance.now()});
    if(packets.length>12)packets.shift();
    drain();
  };
  const flushErrors=async()=>{
    if(!navigator.onLine||!pendingErrors.length)return;
    const e=pendingErrors.shift(),c=context();
    if(!c||c.userId!==e.userId)return;
    try{await api('activity-error',e.data);}
    catch(error){if(!error?.status||error.status>=500)pendingErrors.unshift(e);}
  };
  let sendingErrors=false;
  const queueError=(code,operation,status=0,error)=>{
    const c=context();if(!c)return;
    if(error&&typeof error==='object'){
      if(seenErrors.has(error))return;
      seenErrors.add(error);
    }
    const sig=`${c.userId}|${code}|${operation}`,now=performance.now();
    if(now-(recentErrors.get(sig)??-Infinity)<30000)return;
    recentErrors.set(sig,now);
    pendingErrors.push({userId:c.userId,data:{...payload(c),id:crypto.randomUUID(),code,operation,status}});
    if(pendingErrors.length>20)pendingErrors.shift();
  };
  function reportError(path,error){
    const name=String(path).replace(/^\/api\//,'').split('?')[0];
    if(name.startsWith('activity-'))return;
    const status=Number(error?.status)||0;
    // Expected answer validation, conflict, and access failures are not outages.
    if(status>=400&&status<500)return;
    const operations=['state','events','mission-check','writeup-check','discovery-check','answer-check','mission','writeup','discovery'];
    const operation=operations.includes(name)?name:'other';
    const code=['state','events'].includes(name)?'save_failed':name.endsWith('-check')?'activity_failed':'load_failed';
    queueError(code,operation,status,error);
  }
  const tick=()=>{
    if(stopped)return;
    const now=performance.now(),c=context(),dt=Math.max(0,Math.min(now-lastTick,1500));lastTick=now;
    const active=!!c&&live(now);
    if(key(c)!==key(current)){
      // End the old stage before opening the new one, including short stages.
      if(current&&wasActive)pulse(current,false,elapsed+dt);
      current=c;wasActive=false;elapsed=0;lastPulse=-Infinity;
    }
    if(!active){
      if(wasActive)pulse(current,false,elapsed);
      wasActive=false;elapsed=0;lastPulse=-Infinity;
    }else if(!wasActive){
      wasActive=true;elapsed=0;lastPulse=now;pulse(current,true,0);
    }else{
      elapsed+=dt;
      if(now-lastPulse>=10000){const sample=elapsed;elapsed=0;lastPulse=now;pulse(current,true,sample);}
    }
    if(!sendingErrors&&pendingErrors.length&&navigator.onLine){sendingErrors=true;flushErrors().finally(()=>{sendingErrors=false;});}
  };
  const input=e=>{if(e.isTrusted){lastInput=performance.now();tick();}};
  const suspend=()=>{lastInput=-Infinity;if(!navigator.onLine)packets.length=0;tick();};
  const visibility=()=>{if(document.visibilityState!=='visible')suspend();else tick();};
  const scriptError=e=>queueError('script_error','other',0,e.error);
  const rejection=e=>{
    if(e.reason?.status>=400&&e.reason.status<500)return;
    queueError('script_error','other',0,e.reason);
  };
  const inputEvents=['pointerdown','keydown','input','wheel','touchstart'];
  inputEvents.forEach(name=>window.addEventListener(name,input,{capture:true,passive:true}));
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('blur',suspend);window.addEventListener('offline',suspend);
  window.addEventListener('pagehide',suspend);window.addEventListener('online',tick);
  window.addEventListener('error',scriptError);window.addEventListener('unhandledrejection',rejection);
  const timer=setInterval(tick,1000);
  return {reportError,stop(){
    if(stopped)return;suspend();stopped=true;clearInterval(timer);pendingErrors.length=0;
    inputEvents.forEach(name=>window.removeEventListener(name,input,true));
    document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('blur',suspend);window.removeEventListener('offline',suspend);
    window.removeEventListener('pagehide',suspend);window.removeEventListener('online',tick);
    window.removeEventListener('error',scriptError);window.removeEventListener('unhandledrejection',rejection);
  }};
}
