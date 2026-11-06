import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const slots = { HEAD:'Head', NECK:'Neck', SHOULDER:'Shoulders', BACK:'Back', CHEST:'Chest', WRIST:'Wrists', HANDS:'Hands', WAIST:'Waist', LEGS:'Legs', FEET:'Feet', FINGER_1:'Ring 1', FINGER_2:'Ring 2', TRINKET_1:'Trinket 1', TRINKET_2:'Trinket 2', MAIN_HAND:'Main Hand', OFF_HAND:'Off Hand' };
const cleanString = value => typeof value === 'string' && value.length > 0 && value.length < 200 ? value : undefined;

function portrait(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'render.worldofwarcraft.com' && url.pathname.startsWith('/forever-eu/character/') ? url.href : undefined;
  } catch { return undefined; }
}

export function normalize(data, character, now = Date.now()) {
  if (!data || typeof data !== 'object' || cleanString(data.name)?.toLowerCase() !== character.name.toLowerCase() || !Number.isInteger(data.level) || data.level < 1 || data.level > 100) throw Error('Ongeldige profielgegevens');
  const fetched = typeof data.fetchedAt === 'number' && data.fetchedAt > 0 && data.fetchedAt <= now + 300000 ? data.fetchedAt : now;
  const equipment = Array.isArray(data.items) ? data.items.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const slot = slots[item.slot];
    return slot && Number.isInteger(item.id) && cleanString(item.name) ? [{ slot, id: item.id, name: item.name, quality: (cleanString(item.quality) || 'common').toLowerCase() }] : [];
  }) : [];
  return { characterId: character.id, at: new Date(fetched).toISOString(), level: data.level, class: cleanString(data.className), race: cleanString(data.race), faction: cleanString(data.faction), guild: cleanString(data.guild), itemLevel: typeof data.averageIlvl === 'number' && Number.isFinite(data.averageIlvl) ? data.averageIlvl : undefined, portrait: portrait(data.avatar), equipment, source: 'Armory WoW Forever' };
}

export async function fetchProfile(character, now, request = fetch) {
  try {
    const u = new URL(character.armoryUrl);
    const parts = u.pathname.split('/');
    if (u.protocol !== 'https:' || u.hostname !== 'armorywowforever.com' || parts.slice(0, 5).join('/') !== '/c/forever/eu/normal') throw Error('Ongeldige Armory-link');
    const response = await request(`https://armorywowforever.com/api/character/forever/eu/normal/${encodeURIComponent(parts.at(-1))}`, { headers: { Accept:'application/json' }, redirect:'manual', signal:AbortSignal.timeout(12000) });
    if (!response.ok) return { id:character.id, status:response.status === 404 ? 'not_found' : 'unavailable' };
    return { id:character.id, status:'ok', snapshot:normalize(await response.json(), character, now) };
  } catch (error) {
    console.warn(`${character.id}: ${error instanceof Error ? error.message : String(error)}`);
    return { id:character.id, status:'unavailable' };
  }
}

const comparable = snapshot => {
  const { at, source, ...fields } = snapshot;
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
    else if (Date.parse(profile.snapshot.at) === Date.parse(old.at) && !old.portrait && profile.snapshot.portrait) {
      snapshots[snapshots.indexOf(old)] = { ...old, portrait: profile.snapshot.portrait };
    }
  }
  const ok = profiles.filter(profile => profile.status === 'ok').length;
  const status = ok === characters.length ? 'ready' : profiles.some(profile => profile.status !== 'unavailable') ? 'partial' : 'unavailable';
  return { schemaVersion:1, mode:'live', status, levelCap:60, generatedAt:new Date(now).toISOString(), characters, snapshots, sourceStatuses, sourceTimes, progression:previous.progression || { dungeons:[], raids:[] } };
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
