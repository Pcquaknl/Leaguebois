import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observedGain, deriveMilestones, captureVisit, changesSinceVisit } from '../progress.mjs';
const sample=(at, level, equipment=undefined)=>({characterId:'one',at,level,...(equipment ? {equipment} : {})});
const t0='2026-11-01T00:00:00Z',t1='2026-11-06T18:00:00Z',t2='2026-11-07T01:00:00Z';

test('level standings show observed changes and distinguish unknown from zero', () => {
  const since=Date.parse('2026-11-06T00:00:00Z');
  assert.equal(observedGain([sample(t1,12)],'one',since,t1),null);
  assert.equal(observedGain([sample(t0,10),sample(t1,12),sample(t2,15)],'one',since,t2),5);
  assert.equal(observedGain([sample(t0,10)],'one',since,t2),0);
  assert.equal(observedGain([sample(t0,10)],'one',since,t0),null);
});

test('milestones require observed evidence and remain permanent', () => {
  const rare={slot:'Chest',id:12,name:'A rare vest',quality:'rare'};
  const first=deriveMilestones([sample(t0,15),sample(t1,22,[rare])]);
  assert.equal(first.some(x=>x.level===10),false);
  assert.equal(first.find(x=>x.level===20)?.basis,'crossing');
  assert.equal(first.find(x=>x.quality==='rare')?.itemName,'A rare vest');
  assert.deepEqual(deriveMilestones([],first),first);
  assert.equal(deriveMilestones([sample(t0,10)]).find(x=>x.level===10)?.basis,'first_seen');
});

test('visit differences require comparable known data and never mix demo', () => {
  const characters=[{id:'one',name:'One Stormcoast'}],s=sample(t0,10,[{slot:'Chest',id:1,name:'Old',quality:'common'}]);
  const a=captureVisit({mode:'live',characters,snapshots:[s],sourceStatuses:{one:'ok'}},Date.parse(t0));
  const b=captureVisit({mode:'live',characters,snapshots:[s,sample(t1,12,[{slot:'Chest',id:2,name:'New',quality:'rare'}])],sourceStatuses:{one:'ok'}},Date.parse(t1));
  assert.deepEqual(changesSinceVisit(a,b).map(x=>x.kind),['level','gear']);
  assert.deepEqual(changesSinceVisit(null,b),[]);
  assert.deepEqual(captureVisit({mode:'demo',characters,snapshots:[s],sourceStatuses:{one:'ok'}}).players,{});
  assert.deepEqual(captureVisit({mode:'live',characters,snapshots:[s],sourceStatuses:{one:'unavailable'}}).players,{});
});

test('profession milestones and visit changes require comparable real observations',()=>{
  const first={...sample(t0,10),professions:{Mining:70}}, second={...sample(t1,11),professions:{Mining:76}};
  const milestones=deriveMilestones([first,second]);
  assert.equal(milestones.find(m=>m.kind==='profession'&&m.rank===75)?.basis,'crossing');
  assert.equal(deriveMilestones([{...sample(t1,11),professions:{Mining:90}}]).some(m=>m.kind==='profession'),false);
  assert.deepEqual(deriveMilestones([],milestones),milestones);
  const characters=[{id:'one',name:'One'}],sourceStatuses={one:'ok'};
  const before=captureVisit({mode:'live',characters,sourceStatuses,snapshots:[first]});
  const after=captureVisit({mode:'live',characters,sourceStatuses,snapshots:[first,second]});
  const change=changesSinceVisit(before,after).find(x=>x.kind==='profession');
  assert.deepEqual({profession:change.profession,from:change.from,to:change.to},{profession:'Mining',from:70,to:76});
  assert.equal(changesSinceVisit({players:{one:{name:'One',level:10,professions:null}}},after).some(x=>x.kind==='profession'),false);
});

