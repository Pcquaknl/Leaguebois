import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const time = value => { const t = Date.parse(value); return Number.isFinite(t) ? t : null; };
const safe = value => String(value ?? '').replace(/[\r\n\u0000-\u001f]/g, ' ').slice(0, 120);
const latest = (data, id) => (data?.snapshots || [])
  .filter(s => s?.characterId === id && time(s.at) !== null)
  .sort((a,b) => time(a.at) - time(b.at)).at(-1);

// Create messages only from two real, comparable snapshots for the same player.
export function observedChanges(before, after) {
  if (before?.mode !== 'live' || after?.mode !== 'live' || !Array.isArray(after.characters)) return [];
  const changes = [];
  for (const character of after.characters) {
    if (after.sourceStatuses?.[character.id] !== 'ok') continue;
    const old = latest(before, character.id), current = latest(after, character.id);
    if (!old || !current || time(current.at) <= time(old.at)) continue;
    const name = safe(character.nickname || character.name), at = current.at;
    const add = (kind, value, text) => {
      const id = createHash('sha256').update(JSON.stringify([character.id, at, kind, value])).digest('hex');
      changes.push({ id, at, text });
    };
    if (Number.isInteger(old.level) && Number.isInteger(current.level) && current.level > old.level)
      add('level', current.level, `🎉 ${name} ging van level ${old.level} naar ${current.level}.`);
    for (const [profession, rank] of Object.entries(current.professions || {})) {
      const prior = old.professions?.[profession];
      if (Number.isInteger(prior) && Number.isInteger(rank) && rank > prior)
        add('profession', `${profession}:${rank}`, `🔨 ${name}: ${safe(profession)} ${prior} → ${rank}.`);
    }
    if (Array.isArray(old.equipment) && old.equipment.length && Array.isArray(current.equipment)) {
      for (const item of current.equipment) {
        const prior = old.equipment.find(existing => existing?.slot === item?.slot);
        if (prior && Number.isSafeInteger(item?.id) && item.id > 0 && prior.id !== item.id &&
            ['rare','epic','legendary'].includes(String(item.quality).toLowerCase()) && item.name) {
          add('equipment', `${item.slot}:${item.id}`, `⚔️ ${name} rustte ${safe(item.name)} (${safe(item.quality)}) uit.`);
        }
      }
    }
  }
  return changes;
}

export function validateWebhook(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'discord.com' || url.port || url.username || url.password ||
        url.search || url.hash || !/^\/api\/webhooks\/\d{1,24}\/[A-Za-z0-9._-]{10,}$/.test(url.pathname)) return null;
    url.searchParams.set('wait', 'true');
    return url.href;
  } catch { return null; }
}

export async function deliver(pending, webhook, request = fetch) {
  const url = validateWebhook(webhook);
  if (!url) return { pending, sent:0, error:'Discord-webhook is ongeldig.' };
  const remaining = [...pending];
  let sent = 0;
  while (remaining.length) {
    const batch = [];
    let length = 0;
    for (const event of remaining) {
      const line = safe(event.text);
      if (batch.length >= 20 || length + line.length + 1 > 1800) break;
      batch.push(line); length += line.length + 1;
    }
    if (!batch.length) return {pending:remaining,sent,error:'Ongeldig meldingsbericht.'};
    try {
      const response = await request(url, {method:'POST', redirect:'error', signal:AbortSignal.timeout(12000),
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({content:batch.join('\n'),allowed_mentions:{parse:[]}})});
      if (!response.ok) return {pending:remaining,sent,error:'Discord accepteerde de melding nog niet.'};
    } catch { return {pending:remaining,sent,error:'Discord is tijdelijk niet bereikbaar.'}; }
    sent += batch.length;
    remaining.splice(0,batch.length);
  }
  return {pending:remaining,sent,error:null};
}

export function queueChanges(pending, changes) {
  const all = new Map();
  for (const item of [...pending,...changes]) {
    if (item && /^[a-f0-9]{64}$/.test(item.id || '') && typeof item.text === 'string' && time(item.at) !== null)
      all.set(item.id, {id:item.id,at:item.at,text:safe(item.text)});
  }
  return [...all.values()];
}

async function main() {
  const [beforePath,afterPath,outboxPath] = process.argv.slice(2);
  if (!beforePath || !afterPath || !outboxPath) throw Error('Ontbrekende gegevensbestanden.');
  const webhook = process.env.WOW_DISCORD_WEBHOOK_URL;
  if (!webhook) { console.log('Discord-meldingen staan uit; de website synchroniseert normaal.'); return; }
  const [before,after,outbox] = await Promise.all([beforePath,afterPath,outboxPath].map(async file=>JSON.parse(await readFile(file,'utf8'))));
  const pending = queueChanges(Array.isArray(outbox.pending) ? outbox.pending : [], observedChanges(before,after));
  const result = await deliver(pending,webhook);
  await writeFile(outboxPath,JSON.stringify({version:1,pending:result.pending},null,2)+'\n');
  if (result.error) console.warn(result.error+' Meldingen blijven klaarstaan voor de volgende controle.');
  else console.log(`Discord: ${result.sent} waargenomen meldingen verzonden.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch { console.warn('Discord-meldingen konden niet worden verwerkt. De Armory-sync gaat door.'); }
}
