import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter,once} from 'node:events';
import {Events} from 'discord.js';
import {Store} from './store.mjs';
import {startBot} from './bot.mjs';

test('Discord message handler stores a bound player and posts only to the alerts channel',async t=>{
  const s=new Store(':memory:',[{id:'sylvex-stormcoast',name:'Sylvex Stormcoast'}]);
  const sent=[],created=[];
  class FakeClient extends EventEmitter {
    isReady(){return true}
    destroy(){}
    async login(){return 'ready'}
    application={commands:{create:async(command,guild)=>created.push({command,guild})}};
    channels={fetch:async id=>id==='2'?{isTextBased:()=>true,messages:{fetch:async()=>new Map()}}:{isTextBased:()=>true,send:async payload=>sent.push({id,payload})}};
  }
  const client=new FakeClient(),config={discordGuildId:'1',bridgeChannelId:'2',announcementsChannelId:'4',bindings:[{characterId:'sylvex-stormcoast',discordUserId:'3'}]};
  const bot=await startBot('not-a-real-token',config,s,()=>client);t.after(()=>{bot.close();s.close()});
  client.emit(Events.ClientReady);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(created.length,2);
  const msg={id:'50',guildId:'1',channelId:'2',author:{id:'3'},createdTimestamp:Date.now(),content:'[LB1]|Sylvex%20Stormcoast|12|ROGUE|1|Mining~42~75'};
  client.emit(Events.MessageCreate,msg);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.dataset().snapshots.at(-1).professions.Mining,42);
  assert.ok(sent.length>0);assert.ok(sent.every(x=>x.id==='4'));assert.ok(sent.every(x=>x.payload.allowedMentions.parse.length===0));
  const count=sent.length;client.emit(Events.MessageCreate,msg);await new Promise(resolve=>setImmediate(resolve));assert.equal(sent.length,count);
});
