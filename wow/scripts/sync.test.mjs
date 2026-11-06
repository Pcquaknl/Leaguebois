import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, fetchProfile, merge } from './sync.mjs';

const character = { id:'sylvex-stormcoast', name:'Sylvex Stormcoast', armoryUrl:'https://armorywowforever.com/c/forever/eu/normal/Sylvex-Stormcoast' };
const now = Date.parse('2026-11-06T12:00:00Z');
const source = { name:'Sylvex Stormcoast', level:10, className:'Rogue', fetchedAt:now, items:[{slot:'MAIN_HAND',id:123,name:'Dagger',quality:'UNCOMMON'}] };

test('normalizes verified profile and filters invalid images', () => {
  const snap = normalize({...source,avatar:'https://evil.example/x'}, character, now);
  assert.equal(snap.level,10); assert.equal(snap.portrait,undefined);
  assert.deepEqual(snap.equipment,[{slot:'Main Hand',id:123,name:'Dagger',quality:'uncommon'}]);
  assert.throws(() => normalize({...source,name:'Someone else'},character,now));
});

test('distinguishes missing from unavailable profiles', async () => {
  const missing = await fetchProfile(character, now, async () => ({ok:false,status:404}));
  const limited = await fetchProfile(character, now, async () => ({ok:false,status:429}));
  assert.equal(missing.status,'not_found'); assert.equal(limited.status,'unavailable');
});

test('retains observed history and adds only real updates', () => {
  const first = normalize(source,character,now);
  const previous = {snapshots:[first]};
  const same = {...first, at:new Date(now+60000).toISOString()};
  const unchanged = merge(previous,[character],[{id:character.id,status:'ok',snapshot:same}],now+60000);
  assert.equal(unchanged.snapshots.length,1);
  assert.equal(unchanged.sourceTimes[character.id],same.at);
  const changed = merge(unchanged,[character],[{id:character.id,status:'ok',snapshot:{...same,level:11}}],now+60000);
  assert.deepEqual(changed.snapshots.map(s=>s.level),[10,11]);
  const unavailable = merge(changed,[character],[{id:character.id,status:'unavailable'}],now+120000);
  assert.equal(unavailable.status,'unavailable'); assert.equal(unavailable.snapshots.length,2);
});
