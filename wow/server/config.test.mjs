import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig} from './config.mjs';
const characters=[{id:'one',name:'One Stormcoast'}];
const valid={discordGuildId:'1',bridgeChannelId:'2',announcementsChannelId:'4',bindings:[{characterId:'one',discordUserId:'3'}]};
test('requires a trusted binding and a separate notification channel',()=>{
  assert.equal(validateConfig(valid,characters),valid);
  assert.throws(()=>validateConfig({...valid,bindings:[]},characters));
  assert.throws(()=>validateConfig({...valid,bindings:[{characterId:'one',discordUserId:'3',bridgeWebhookId:'8'}]},characters));
  assert.throws(()=>validateConfig({...valid,bindings:[{characterId:'other',discordUserId:'3'}]},characters));
  assert.throws(()=>validateConfig({...valid,announcementsChannelId:'2'},characters));
  assert.throws(()=>validateConfig({...valid,diagnostics:'false'},characters));
  assert.throws(()=>validateConfig({...valid,allowedOrigin:'https://leaguebois.nl/some-path'},characters));
  assert.doesNotThrow(()=>validateConfig({...valid,bindings:[],diagnostics:true},characters));
});
