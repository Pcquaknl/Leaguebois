import {parseRelay,authorizedRelay} from './protocol.mjs';

export function acceptMessage(message,config,store,now=Date.now()) {
  if(typeof message.content!=='string'||!message.content.startsWith('[LB1]|')) return {status:'ignored'};
  const payload=parseRelay(message.content,store.characters);
  if(!payload) return {status:'invalid'};
  if(!authorizedRelay(message,config,payload.characterId)) return {status:'untrusted'};
  const time=Number(message.createdTimestamp);
  if(!Number.isFinite(time)||time>now+300000||time<now-30*86400000) return {status:'invalid_time'};
  const result=store.record(String(message.id),new Date(time).toISOString(),payload,!!config.announcementsChannelId && now-time<600000);
  return {status:result.duplicate?'duplicate':'stored',notifications:result.notifications};
}

const latest=(data,id)=>data.snapshots.filter(s=>s.characterId===id).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).at(-1);
export function standings(data) {
  const rows=data.characters.map(c=>({c,s:latest(data,c.id)})).sort((a,b)=>(b.s?.level??0)-(a.s?.level??0));
  if(!rows.length)return 'Nog geen personages geconfigureerd.';
  return ['**Leaguebois · Levelrace**',...rows.map(({c,s})=>s?`• ${c.name} — level ${s.level} (${s.class||'klasse onbekend'})`:`• ${c.name} — nog geen gegevens`)].join('\n').slice(0,1900);
}
export function professions(data, characterName='') {
  const query=String(characterName).trim().toLocaleLowerCase('en-US');
  const chars=query?data.characters.filter(c=>c.name.toLocaleLowerCase('en-US').includes(query)):data.characters;
  if(!chars.length)return 'Personage niet gevonden.';
  const rows=[];
  for(const c of chars){const s=latest(data,c.id), skills=Object.entries(s?.professions||{});
    if(!skills.length){rows.push(`**${c.name}** — beroepen nog niet bekend`);continue}
    rows.push(`**${c.name}** — `+skills.map(([name,rank])=>`${name} ${rank}${s.professionCaps?.[name]?`/${s.professionCaps[name]}`:''}${s.professionTimes?.[name]?` (<t:${Math.floor(Date.parse(s.professionTimes[name])/1000)}:R>)`:''}`).join(' · '));
  }
  return ['**Leaguebois · Beroepen**',...rows].join('\n').slice(0,1900);
}
