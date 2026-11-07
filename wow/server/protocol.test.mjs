import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRelay,authorizedRelay} from './protocol.mjs';
const chars=[{id:'sylvex-stormcoast',name:'Sylvex Stormcoast'}];
const wire='[LB1]|Sylvex%20Stormcoast|12|ROGUE|1|Mining~42~75;Blacksmithing~18~75';
test('parses real character profession data and unknown caps',()=>{
  assert.deepEqual(parseRelay(wire,chars),{characterId:'sylvex-stormcoast',level:12,class:'Rogue',professions:{Mining:42,Blacksmithing:18},professionCaps:{Mining:75,Blacksmithing:75},complete:true});
  assert.equal(parseRelay('[LB1]|Sylvex%20Stormcoast|12|ROGUE|0|Mining~42~-',chars).professionCaps.Mining,undefined);
});
test('rejects invalid, forged, oversized and impossible inputs',()=>{
  for(const bad of ['[LB1]|Unknown|12|ROGUE|1|','[LB1]|Sylvex%20Stormcoast|61|ROGUE|1|','[LB1]|Sylvex%20Stormcoast|12|ROGUE|1|Mining~1001~75','[LB1]|Sylvex%20Stormcoast|12|ROGUE|1|Mining~1~75;Mining~2~75','[LB1]|%ZZ|12|ROGUE|1|',wire+'x'.repeat(240)]) assert.equal(parseRelay(bad,chars),null);
  assert.equal(parseRelay('[LB1]|Sylvex%20Stormcoast|12|ROGUE|1|Mining~80~75',chars).professions.Mining,80);
});
test('requires the correct Discord server, channel, and character-to-sender binding',()=>{
  const config={discordGuildId:'1',bridgeChannelId:'2',bindings:[{characterId:'sylvex-stormcoast',discordUserId:'3'}]};
  const msg={guildId:'1',channelId:'2',author:{id:'3'}};
  assert.equal(authorizedRelay(msg,config,'sylvex-stormcoast'),true);
  assert.equal(authorizedRelay({...msg,channelId:'4'},config,'sylvex-stormcoast'),false);
  assert.equal(authorizedRelay({...msg,author:{id:'4'}},config,'sylvex-stormcoast'),false);
  assert.equal(authorizedRelay({...msg,webhookId:'5'},config,'sylvex-stormcoast'),false);
  assert.equal(authorizedRelay(msg,config,'another-character'),false);
  const hook={...config,bindings:[{characterId:'sylvex-stormcoast',bridgeWebhookId:'5',bridgeUsername:'Sylvex Stormcoast'}]};
  assert.equal(authorizedRelay({...msg,webhookId:'5',author:{username:'Sylvex Stormcoast'}},hook,'sylvex-stormcoast'),true);
  assert.equal(authorizedRelay({...msg,webhookId:'5',author:{username:'Someone else'}},hook,'sylvex-stormcoast'),false);
});
