import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVisitTracker} from '../visit.mjs';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
const sample=level=>({mode:'live',status:'ready',characters:[{id:'a',name:'A'}],sourceStatuses:{a:'ok'},snapshots:[{characterId:'a',at:'2026-11-06T10:00:00Z',level}]});

test('first visit has no fabricated changes; reload keeps the same visit baseline',()=>{
  const local=memory(),session=memory();let time=Date.parse('2026-11-06T11:00:00Z');
  let tracker=createVisitTracker(local,session,()=>time);
  assert.equal(tracker.record(sample(10)).previous,null);
  time+=1000;tracker=createVisitTracker(local,session,()=>time);
  assert.equal(tracker.record(sample(11)).previous,null);
  tracker.reset();const result=tracker.record(sample(12));
  assert.equal(result.previous.players.a.level,11);
});
test('demo and unavailable data do not overwrite the live comparison',()=>{
  const local=memory(),session=memory();let time=Date.parse('2026-11-06T11:00:00Z');
  const tracker=createVisitTracker(local,session,()=>time);
  tracker.record(sample(10));tracker.record({...sample(99),mode:'demo'});
  tracker.record({...sample(15),status:'unavailable'});
  tracker.reset();assert.equal(tracker.record(sample(11)).previous.players.a.level,10);
});
