import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observedChanges, queueChanges, validateWebhook, deliver } from './notify-discord.mjs';

const character={id:'one',name:'One Stormcoast'};
const t0='2026-11-06T10:00:00Z',t1='2026-11-06T11:00:00Z';
const old={characterId:'one',at:t0,level:10,professions:{Mining:70},equipment:[{slot:'Head',id:10,name:'Old',quality:'common'}]};
const next={...old,at:t1,level:11,professions:{Mining:75},equipment:[{slot:'Head',id:20,name:'New helm',quality:'rare'}]};
const data=(snapshots,status='ok')=>({mode:'live',characters:[character],sourceStatuses:{one:status},snapshots});
const webhook='https://discord.com/api/webhooks/123456789012345678/exampleSecret0123456789';

test('detects only observed level, profession and meaningful equipment changes',()=>{
  const events=observedChanges(data([old]),data([old,next]));
  assert.equal(events.length,3);
  assert.match(events[0].text,/level 10 naar 11/);
  assert.match(events[1].text,/Mining 70 → 75/);
  assert.match(events[2].text,/New helm/);
  assert.equal(new Set(events.map(x=>x.id)).size,3);
  assert.deepEqual(queueChanges(events,events),events);
});

test('ignores demos, first sightings, unavailable and unchanged profiles',()=>{
  assert.deepEqual(observedChanges(data([]),data([next])),[]);
  assert.deepEqual(observedChanges(data([old]),data([old,next],'unavailable')),[]);
  assert.deepEqual(observedChanges(data([old]),data([old])),[]);
  assert.deepEqual(observedChanges({...data([old]),mode:'demo'},data([old,next])),[]);
  const missing={...next,professions:{Mining:75}};
  assert.equal(observedChanges(data([{...old,professions:{}}]),data([missing])).some(e=>e.text.includes('Mining')),false);
});

test('accepts only the dedicated Discord HTTPS endpoint',()=>{
  assert.equal(new URL(validateWebhook(webhook)).search,'?wait=true');
  for(const bad of ['https://evil.test/api/webhooks/1/exampleSecret012345','http://discord.com/api/webhooks/1/exampleSecret012345',webhook+'?x=1','https://discord.com.evil.test/api/webhooks/1/exampleSecret012345'])
    assert.equal(validateWebhook(bad),null);
});

test('a successful send is acknowledged and repeat events are coalesced',async()=>{
  const events=observedChanges(data([old]),data([next])); let calls=0;
  const result=await deliver(queueChanges(events,events),webhook,async (url,options)=>{
    calls++; assert.equal(new URL(url).search,'?wait=true');
    const body=JSON.parse(options.body);assert.deepEqual(body.allowed_mentions,{parse:[]});
    assert.match(body.content,/Mining 70 → 75/);return {ok:true};
  });
  assert.equal(calls,1);assert.equal(result.sent,3);assert.deepEqual(result.pending,[]);
});

test('a failed send preserves the complete queue for retry without exposing the URL',async()=>{
  const events=observedChanges(data([old]),data([next]));
  const result=await deliver(events,webhook,async()=>{throw Error(webhook)});
  assert.deepEqual(result.pending,events);assert.equal(result.sent,0);assert.equal(result.error.includes('Secret'),false);
  const limited=await deliver(events,webhook,async()=>({ok:false,status:429}));
  assert.deepEqual(limited.pending,events);
});

test('only acknowledged batches are removed when Discord rate-limits a later batch',async()=>{
  const events=Array.from({length:25},(_,i)=>({id:i.toString(16).padStart(64,'0'),at:t1,text:`Speler ${i}: level verhoogd.`}));
  let calls=0;
  const first=await deliver(events,webhook,async()=>({ok:++calls===1}));
  assert.equal(first.sent,20);assert.deepEqual(first.pending,events.slice(20));
  const second=await deliver(first.pending,webhook,async()=>({ok:true}));
  assert.equal(second.sent,5);assert.deepEqual(second.pending,[]);
});
