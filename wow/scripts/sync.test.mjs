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

test('incorporates a newly available portrait with the same profile timestamp', () => {
  const first = normalize(source, character, now);
  const previous = {snapshots:[first]};
  const portrait = 'https://render.worldofwarcraft.com/forever-eu/character/76/8992076-avatar.jpg';
  const updated = merge(previous, [character], [{id:character.id,status:'ok',snapshot:{...first,portrait}}], now);
  assert.equal(updated.snapshots.length, 1);
  assert.equal(updated.snapshots[0].portrait, portrait);
  assert.equal(updated.snapshots[0].level, first.level);
  assert.equal(first.portrait, undefined);
});


test('preserves actual item level, enchantment and socket positions', () => {
  const snap = normalize({...source,items:[{slot:'MAIN_HAND',id:123,name:'Dagger',quality:'UNCOMMON',ilvl:12,enchantId:5,enchant:'Sharpened',gems:[null,{id:456}]}]}, character, now);
  assert.deepEqual(snap.equipment[0], {slot:'Main Hand',id:123,name:'Dagger',quality:'uncommon',itemLevel:12,enchantId:5,enchant:'Sharpened',gems:[0,456]});
  const old = normalize(source,character,now);
  const updated = merge({snapshots:[old]},[character],[{id:character.id,status:'ok',snapshot:snap}],now);
  assert.equal(updated.snapshots.length,1);
  assert.deepEqual(updated.snapshots[0].equipment[0].gems,[0,456]);
  assert.equal(updated.snapshots[0].equipment[0].itemLevel,12);
  assert.equal(old.equipment[0].itemLevel,undefined);
});
