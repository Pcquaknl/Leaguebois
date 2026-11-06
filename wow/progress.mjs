/** Pure calculations based only on stored observations. Dates are observation times. */
const ms = value => { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null; };
const observedAt = sample => ms(sample?.observedAt) ?? ms(sample?.at);
const sourceAt = sample => ms(sample?.at) ?? observedAt(sample);

export function orderedHistory(snapshots, characterId) {
  return (Array.isArray(snapshots) ? snapshots : [])
    .filter(s => s?.characterId === characterId && sourceAt(s) !== null && Number.isFinite(s.level))
    .slice().sort((a,b) => sourceAt(a)-sourceAt(b));
}

/** Sum increases observed in the window; null means there is insufficient evidence. */
export function observedGain(snapshots, characterId, since, sourceTime) {
  const h = orderedHistory(snapshots, characterId);
  if (!h.length || !Number.isFinite(since)) return null;
  const lastSource = ms(sourceTime) ?? sourceAt(h.at(-1));
  let gains = 0, comparableChanges = 0;
  for (let i=1; i<h.length; i++) {
    const at = observedAt(h[i]);
    if (at !== null && at >= since) {
      gains += Math.max(0, h[i].level - h[i-1].level);
      comparableChanges++;
    }
  }
  if (comparableChanges) return gains;
  // Zero is only known when a level from before the window was checked within it.
  return sourceAt(h[0]) <= since && lastSource !== null && lastSource >= since ? 0 : null;
}

/** Milestones are permanently keyed by character and state that the date is a sighting. */
export function deriveMilestones(snapshots, previous = []) {
  const saved = new Map((Array.isArray(previous) ? previous : []).filter(x => x && typeof x.id === 'string').map(x => [x.id,x]));
  const ids = [...new Set((Array.isArray(snapshots) ? snapshots : []).map(s => s?.characterId).filter(x => typeof x === 'string'))];
  for (const characterId of ids) {
    const h = orderedHistory(snapshots, characterId);
    for (let i=0; i<h.length; i++) {
      const s = h[i], prev = h[i-1], date = new Date(observedAt(s)).toISOString();
      for (const level of [10,20,30,40,50,60]) {
        const crossed = prev && prev.level < level && s.level >= level;
        const firstAtLevel = !prev && s.level === level;
        const id = `${characterId}:level:${level}`;
        if ((crossed || firstAtLevel) && !saved.has(id)) saved.set(id, {id,characterId,kind:'level',level,at:date,basis:crossed?'crossing':'first_seen'});
      }
      if (!Array.isArray(s.equipment)) continue;
      for (const quality of ['rare','epic']) {
        const item = s.equipment.find(e => e && String(e.quality).toLowerCase() === quality && typeof e.name === 'string');
        const id = `${characterId}:first:${quality}`;
        if (item && !saved.has(id)) saved.set(id, {id,characterId,kind:'quality',quality,itemName:item.name,at:date,basis:'first_seen'});
      }
    }
  }
  return [...saved.values()].sort((a,b) => (ms(a.at) ?? 0)-(ms(b.at) ?? 0));
}

/** Capture only the last successfully received state for the visitor's own device. */
export function captureVisit(data, now = Date.now()) {
  const players = {};
  for (const c of data.characters || []) {
    if (data.mode !== 'live' || data.sourceStatuses?.[c.id] !== 'ok') continue;
    const s = orderedHistory(data.snapshots, c.id).at(-1);
    if (!s) continue;
    const equipment = Array.isArray(s.equipment) && s.equipment.length
      ? s.equipment.filter(x=>x && typeof x.slot === 'string' && Number.isSafeInteger(x.id))
        .map(x=>({slot:x.slot,id:x.id,name:String(x.name || ''),quality:String(x.quality || '')}))
      : null;
    players[c.id] = {name:String(c.nickname || c.name || c.id), level:s.level, equipment};
  }
  return {at:new Date(now).toISOString(),players};
}

/** Compare two known states; this doesn't imply exact time played or an acquisition time. */
export function changesSinceVisit(previous, current) {
  if (!previous?.players || !current?.players) return [];
  const changes = [];
  for (const [id, player] of Object.entries(current.players)) {
    const old = previous.players[id];
    if (!old) continue;
    if (Number.isFinite(old.level) && Number.isFinite(player.level) && player.level > old.level)
      changes.push({characterId:id,kind:'level',name:player.name,from:old.level,to:player.level,gained:player.level-old.level});
    if (Array.isArray(old.equipment) && Array.isArray(player.equipment)) {
      for (const item of player.equipment) {
        const former = old.equipment.find(x=>x.slot===item.slot);
        if (!former || former.id !== item.id || former.name !== item.name)
          changes.push({characterId:id,kind:'gear',name:player.name,itemName:item.name,quality:item.quality,slot:item.slot});
      }
    }
  }
  return changes.sort((a,b)=>(a.kind==='level'?0:1)-(b.kind==='level'?0:1));
}
