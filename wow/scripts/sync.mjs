import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deriveMilestones } from '../progress.mjs';

const slots = { HEAD:'Head', NECK:'Neck', SHOULDER:'Shoulders', BACK:'Back', CHEST:'Chest', WRIST:'Wrists', HANDS:'Hands', WAIST:'Waist', LEGS:'Legs', FEET:'Feet', FINGER_1:'Ring 1', FINGER_2:'Ring 2', TRINKET_1:'Trinket 1', TRINKET_2:'Trinket 2', MAIN_HAND:'Main Hand', OFF_HAND:'Off Hand' };
const cleanString = value => typeof value === 'string' && value.length > 0 && value.length < 200 ? value : undefined;

function portrait(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'render.worldofwarcraft.com' && url.pathname.startsWith('/forever-eu/character/') ? url.href : undefined;
  } catch { return undefined; }
}

function itemIcon(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'wow.zamimg.com' && url.pathname.startsWith('/images/wow/icons/') ? url.href : undefined;
  } catch { return undefined; }
}

export function normalize(data, character, now = Date.now()) {
  if (!data || typeof data !== 'object' || cleanString(data.name)?.toLowerCase() !== character.name.toLowerCase() || !Number.isInteger(data.level) || data.level < 1 || data.level > 100) throw Error('Ongeldige profielgegevens');
  const fetched = typeof data.fetchedAt === 'number' && data.fetchedAt > 0 && data.fetchedAt <= now + 300000 ? data.fetchedAt : now;
  const equipment = Array.isArray(data.items) ? data.items.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const slot = slots[item.slot];
    if (!slot || !Number.isInteger(item.id) || !cleanString(item.name)) return [];
    const gems = Array.isArray(item.gems) ? item.gems.slice(0, 6).map(gem => Number.isSafeInteger(gem?.id) && gem.id > 0 ? gem.id : 0) : [];
    return [{ slot, id: item.id, name: item.name, quality: (cleanString(item.quality) || 'common').toLowerCase(),
      ...(itemIcon(item.icon) ? {icon:itemIcon(item.icon)} : {}),
      ...(Number.isSafeInteger(item.ilvl) && item.ilvl > 0 && item.ilvl <= 1000 ? {itemLevel:item.ilvl} : {}),
      ...(Number.isSafeInteger(item.enchantId) && item.enchantId > 0 ? {enchantId:item.enchantId} : {}),
      ...(cleanString(item.enchant) ? {enchant:item.enchant} : {}),
      ...(gems.some(Boolean) ? {gems} : {}) }];
  }) : [];
  return { characterId: character.id, at: new Date(fetched).toISOString(), observedAt:new Date(now).toISOString(), level: data.level, class: cleanString(data.className), race: cleanString(data.race), faction: cleanString(data.faction), guild: cleanString(data.guild), itemLevel: typeof data.averageIlvl === 'number' && Number.isFinite(data.averageIlvl) ? data.averageIlvl : undefined, portrait: portrait(data.avatar), render: portrait(data.render), equipment, source: 'Armory WoW Forever' };
}

export async function fetchProfile(character, now, request = fetch, pause = delay) {
  try {
    const u = new URL(character.armoryUrl);
    const parts = u.pathname.split('/');
    if (u.protocol !== 'https:' || u.hostname !== 'armorywowforever.com' || parts.slice(0, 5).join('/') !== '/c/forever/eu/normal') throw Error('Ongeldige Armory-link');
    const endpoint = `https://armorywowforever.com/api/character/forever/eu/normal/${encodeURIComponent(parts.at(-1))}`;
    const fetchOnce = () => request(endpoint, { headers: { Accept:'application/json' }, redirect:'manual', signal:AbortSignal.timeout(12000) });
    const response = await fetchOnce();
    if (!response.ok) return { id:character.id, status:response.status === 404 ? 'not_found' : 'unavailable' };
    const raw = await response.json();
    const initial = normalize(raw, character, now);
    // This Armory can return an old cached profile while it refreshes in the background.
    // Make one bounded follow-up request, retaining the valid first result if it fails.
    if (raw.fromCache === true && Number.isFinite(raw.fetchedAt) && raw.fetchedAt > 0 && now - raw.fetchedAt > 10*60*1000) {
      try {
        await pause(5000);
        const retry = await fetchOnce();
        if (retry.ok) {
          const candidate = await retry.json();
          if (Number.isFinite(candidate.fetchedAt) && candidate.fetchedAt > raw.fetchedAt && candidate.fetchedAt <= now + 300000) {
            return { id:character.id, status:'ok', snapshot:normalize(candidate, character, now + 5000) };
          }
        }
      } catch { /* use the validated initial profile if the follow-up fails */ }
    }
    return { id:character.id, status:'ok', snapshot:initial };
  } catch (error) {
    console.warn(`${character.id}: ${error instanceof Error ? error.message : String(error)}`);
    return { id:character.id, status:'unavailable' };
  }
}

const comparable = snapshot => {
  const { at, observedAt, source, ...fields } = snapshot;
  return JSON.stringify(fields);
};

export function merge(previous, characters, profiles, now = Date.now()) {
  const allowed = new Set(characters.map(character => character.id));
  const snapshots = (Array.isArray(previous.snapshots) ? previous.snapshots : []).filter(snapshot => allowed.has(snapshot.characterId) && Number.isFinite(Date.parse(snapshot.at)));
  const sourceTimes = { ...previous.sourceTimes };
  const sourceStatuses = {};
  for (const profile of profiles) {
    sourceStatuses[profile.id] = profile.status;
    if (!profile.snapshot) continue;
    sourceTimes[profile.id] = profile.snapshot.at;
    const old = snapshots.filter(s => s.characterId === profile.id).sort((a,b) => Date.parse(a.at)-Date.parse(b.at)).at(-1);
    if (!old || (Date.parse(profile.snapshot.at) > Date.parse(old.at) && (comparable(old) !== comparable(profile.snapshot) || old.at.slice(0,10) !== profile.snapshot.at.slice(0,10)))) snapshots.push(profile.snapshot);
    else if (Date.parse(profile.snapshot.at) === Date.parse(old.at)) {
      // New fields can become available without the Armory changing its profile timestamp.
      const currentItems = profile.snapshot.equipment || [];
      const equipment = (old.equipment || []).map(item => {
        const current = currentItems.find(candidate => candidate.slot === item.slot && candidate.id === item.id);
        if (!current) return item;
        const extra = {};
        for (const field of ['itemLevel','enchantId','enchant','gems','icon']) if (current[field] !== undefined) extra[field] = current[field];
        return { ...item, ...extra };
      });
      const enriched = { ...old, ...(old.portrait ? {} : profile.snapshot.portrait ? {portrait:profile.snapshot.portrait} : {}), ...(old.render ? {} : profile.snapshot.render ? {render:profile.snapshot.render} : {}), ...(old.equipment ? {equipment} : {}) };
      if (JSON.stringify(enriched) !== JSON.stringify(old)) snapshots[snapshots.indexOf(old)] = enriched;
    }
  }
  const ok = profiles.filter(profile => profile.status === 'ok').length;
  const status = ok === characters.length ? 'ready' : profiles.some(profile => profile.status !== 'unavailable') ? 'partial' : 'unavailable';
  return { schemaVersion:1, mode:'live', status, levelCap:60, generatedAt:new Date(now).toISOString(), characters, snapshots, milestones:deriveMilestones(snapshots,previous.milestones), sourceStatuses, sourceTimes, progression:previous.progression || { dungeons:[], raids:[] } };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const characters = JSON.parse(await readFile(path.join(root, 'characters.json'), 'utf8'));
  const previous = JSON.parse(await readFile(path.join(root, 'data/live.json'), 'utf8'));
  if (!Array.isArray(characters) || !characters.length || new Set(characters.map(c => c.id)).size !== characters.length) throw Error('Ongeldige personageconfiguratie');
  const now = Date.now();
  const profiles = await Promise.all(characters.map(character => fetchProfile(character, now)));
  const next = merge(previous, characters, profiles, now);
  await writeFile(path.join(root, 'data/live.json'), JSON.stringify(next, null, 2) + '\n');
  console.log(`Armory: ${profiles.filter(p => p.status === 'ok').length}/${characters.length} profielen beschikbaar; status ${next.status}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();



