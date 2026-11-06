import { captureVisit } from './progress.mjs';
const LAST_KEY='leaguebois-wow-last-visit-v1';
const SESSION_KEY='leaguebois-wow-visit-session-v1';
const MAX_SESSION_MS=30*60*1000;
const parse=value=>{try{return JSON.parse(value)}catch{return null}};

export function createVisitTracker(local,session,clock=Date.now) {
  let previous=null, initialized=false, started=0;
  return {
    reset(){ initialized=false; previous=null; started=0; try{session.removeItem(SESSION_KEY)}catch{} },
    record(data){
      if(data.mode!=='live') return {previous:null,storageAvailable:true};
      try {
        const now=clock();
        if(!initialized){
          const savedSession=parse(session.getItem(SESSION_KEY));
          if(savedSession && Number.isFinite(savedSession.started) && now-savedSession.started<MAX_SESSION_MS && now>=savedSession.started){
            previous=savedSession.previous || null;
            started=savedSession.started;
          } else {
            const saved=parse(local.getItem(LAST_KEY));
            previous=saved?.players && Number.isFinite(Date.parse(saved.at)) ? saved : null;
            started=now;
            session.setItem(SESSION_KEY,JSON.stringify({started,previous}));
          }
          initialized=true;
        }
        const current=captureVisit(data,now);
        if(data.status!=='unavailable' && Object.keys(current.players).length){
          const last=parse(local.getItem(LAST_KEY));
          current.players={...(last?.players || {}),...current.players};
          local.setItem(LAST_KEY,JSON.stringify(current));
        }
        return {previous,storageAvailable:true};
      } catch { return {previous:null,storageAvailable:false}; }
    }
  };
}
