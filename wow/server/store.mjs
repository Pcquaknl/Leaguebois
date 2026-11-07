import { DatabaseSync } from 'node:sqlite';

const timestamp = value => { const n=Date.parse(value); return Number.isFinite(n)?n:null; };
const byTime = (a,b) => (timestamp(a.at)??0)-(timestamp(b.at)??0);

export function composeDataset(characters, armory, observations) {
  const base = armory && armory.mode==='live' && Array.isArray(armory.snapshots) ? armory : {};
  const snapshots = [], statuses = {...base.sourceStatuses}, times = {...base.sourceTimes};
  let lastAddonTime = null;
  for (const c of characters) {
    const history = (base.snapshots||[]).filter(x=>x.characterId===c.id && timestamp(x.at)!==null && Number.isFinite(x.level)).map(x=>({kind:'armory',at:x.at,value:x}));
    for (const obs of observations.filter(x=>x.characterId===c.id && timestamp(x.at)!==null)) history.push({kind:'addon',at:obs.at,value:obs});
    history.sort(byTime);
    let current=null, latestAddon=null, latestArmory=null;
    for (const item of history) {
      if (item.kind==='armory') {
        const s = item.value;
        // A cached Armory profile cannot undo a higher level actually observed in-game.
        if (latestAddon && timestamp(s.at)>=timestamp(latestAddon.at) && s.level<latestAddon.level) continue;
        const previous=current;
        current = {...s};
        if (previous) {
          current.professions={...(previous.professions||{}),...(s.professions||{})};
          current.professionCaps={...(previous.professionCaps||{}),...(s.professionCaps||{})};
          current.professionTimes={...(previous.professionTimes||{}),...(s.professionTimes||{})};
          for (const name of Object.keys(s.professions||{})) {
            current.professionTimes[name]=s.professionTimes?.[name]||s.observedAt||s.at;
            if (!Object.hasOwn(s.professionCaps||{},name)) delete current.professionCaps[name];
          }
        }
        latestArmory=current;
      } else {
        const obs=item.value, previous=current||{};
        const professionTimes={...(previous.professionTimes||{})};
        const professionCaps={...(previous.professionCaps||{})};
        for (const name of Object.keys(obs.professions)) professionTimes[name]=obs.at;
        for (const name of Object.keys(obs.professions)) {
          if (Object.hasOwn(obs.professionCaps,name)) professionCaps[name]=obs.professionCaps[name];
          else delete professionCaps[name];
        }
        current={...previous,characterId:c.id,at:obs.at,observedAt:obs.at,level:obs.level,class:obs.class,
          professions:{...(previous.professions||{}),...obs.professions},
          professionCaps,professionTimes,
          source:'Leaguebois-addon; overige gegevens laatst bekende Armory'};
        latestAddon=current;
        lastAddonTime=Math.max(lastAddonTime??0,timestamp(obs.at));
      }
      snapshots.push(current);
    }
    if (latestAddon) {
      statuses[c.id]='ok';
      const armoryIsUsable=latestArmory && latestArmory.level>=latestAddon.level;
      const armoryTime=armoryIsUsable?timestamp(times[c.id]):null;
      const t=Math.max(timestamp(latestAddon.at),armoryTime??0);
      times[c.id]=new Date(t).toISOString();
    }
  }
  snapshots.sort(byTime);
  const found=characters.filter(c=>statuses[c.id]==='ok').length;
  const baseTime=timestamp(base.generatedAt), generated=lastAddonTime!==null ? Math.max(lastAddonTime,baseTime??0) : baseTime;
  return {schemaVersion:1,mode:'live',status:found===characters.length?'ready':found?'partial':'unavailable',
    levelCap:60,generatedAt:generated===null?null:new Date(generated).toISOString(),characters, snapshots,
    milestones:Array.isArray(base.milestones)?base.milestones:[],sourceStatuses:statuses,sourceTimes:times,
    progression:base.progression||{dungeons:[],raids:[]}};
}

export class Store {
  constructor(path, characters) {
    this.characters=characters;
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observations (message_id TEXT PRIMARY KEY, character_id TEXT NOT NULL, at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS observations_character_time ON observations(character_id,at);
      CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, message_id TEXT NOT NULL, body TEXT NOT NULL, sent_at TEXT, UNIQUE(message_id,body));`);
  }
  close(){this.db.close()}
  getArmory(){const row=this.db.prepare("SELECT value FROM state WHERE key='armory'").get();try{return row?JSON.parse(row.value):null}catch{return null}}
  setArmory(value){
    if(!value||value.mode!=='live'||!Array.isArray(value.snapshots)||!Number.isFinite(Date.parse(value.generatedAt))) throw Error('Ongeldige Armory-gegevens');
    const previous=this.getArmory();
    if(previous && timestamp(previous.generatedAt)>timestamp(value.generatedAt)) return false;
    if(previous){
      const history=new Map();
      for(const sample of [...previous.snapshots,...value.snapshots]){
        if(!sample || typeof sample.characterId!=='string' || timestamp(sample.at)===null) continue;
        const key=`${sample.characterId}\u0000${sample.at}`;
        history.set(key,{...(history.get(key)||{}),...sample});
      }
      const milestones=new Map();
      for(const m of [...(previous.milestones||[]),...(value.milestones||[])]) if(m && typeof m.id==='string') milestones.set(m.id,m);
      value={...value,snapshots:[...history.values()].sort(byTime),milestones:[...milestones.values()]};
    }
    this.db.prepare("INSERT INTO state(key,value) VALUES('armory',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(value));
    return true;
  }
  getObservations(){return this.db.prepare('SELECT payload,at FROM observations ORDER BY at,message_id').all().map(row=>({...JSON.parse(row.payload),at:row.at}));}
  dataset(){return composeDataset(this.characters,this.getArmory(),this.getObservations());}
  record(messageId,at,payload,queueNotifications=true){
    if(typeof messageId!=='string'||!/^[0-9]{1,24}$/.test(messageId)||timestamp(at)===null) throw Error('Ongeldig bericht');
    if(!this.characters.some(c=>c.id===payload.characterId)) throw Error('Onbekend personage');
    const old=this.dataset().snapshots.filter(s=>s.characterId===payload.characterId).sort(byTime).at(-1);
    const name=this.characters.find(c=>c.id===payload.characterId)?.name||payload.characterId;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result=this.db.prepare('INSERT OR IGNORE INTO observations(message_id,character_id,at,payload) VALUES(?,?,?,?)').run(messageId,payload.characterId,at,JSON.stringify(payload));
      if(!Number(result.changes)){this.db.exec('COMMIT');return {duplicate:true,notifications:[]}}
      const notices=[];
      if(queueNotifications && (!old || timestamp(at)>=(timestamp(old.at)??0))) {
        if(!old) notices.push(`📋 ${name}: level ${payload.level} vastgelegd.`);
        else if(Number.isFinite(old.level)&&payload.level>old.level) notices.push(`🎉 ${name}: level ${payload.level} waargenomen (was ${old.level}).`);
        for(const [profession,rank] of Object.entries(payload.professions)) {
          const previous=old?.professions?.[profession],cap=payload.professionCaps?.[profession],suffix=cap?` / ${cap}`:'';
          if(typeof previous!=='number') notices.push(`🔨 ${name}: ${profession} ${rank}${suffix} vastgelegd.`);
          else if(rank>previous) notices.push(`🔨 ${name}: ${profession} ${previous} → ${rank}${suffix}.`);
          else if(rank<previous) notices.push(`🔨 ${name}: ${profession} is nu ${rank}${suffix}.`);
        }
      }
      const insert=this.db.prepare('INSERT OR IGNORE INTO notifications(message_id,body) VALUES(?,?)');
      for(const body of notices) insert.run(messageId,body);
      this.db.exec('COMMIT');
      return {duplicate:false,notifications:notices};
    } catch(error) {this.db.exec('ROLLBACK');throw error}
  }
  pendingNotifications(limit=20){return this.db.prepare('SELECT id,body FROM notifications WHERE sent_at IS NULL ORDER BY id LIMIT ?').all(limit)}
  markSent(id){this.db.prepare('UPDATE notifications SET sent_at=? WHERE id=?').run(new Date().toISOString(),id)}
}
