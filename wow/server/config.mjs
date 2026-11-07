const snowflake=value=>typeof value==='string'&&/^\d{1,24}$/.test(value);
export function validateConfig(config,characters) {
  if(!config||!snowflake(config.discordGuildId)||!snowflake(config.bridgeChannelId))throw Error('Vul geldige Discord-server- en gekoppeld kanaal-ID in.');
  if(config.announcementsChannelId && (!snowflake(config.announcementsChannelId)||config.announcementsChannelId===config.bridgeChannelId))throw Error('Kies een apart Discord-meldingenkanaal.');
  if(config.diagnostics!==undefined && typeof config.diagnostics!=='boolean')throw Error('Diagnostics moet true of false zijn.');
  if(!Array.isArray(config.bindings)||(!config.bindings.length&&config.diagnostics!==true)||config.bindings.length>100)throw Error('Koppel ten minste één personage of schakel expliciet diagnostics in.');
  const seen=new Set();
  for(const b of config.bindings){
    if(!b||!characters.some(c=>c.id===b.characterId)||seen.has(b.characterId))throw Error('Onbekende of dubbel gekoppelde characterId.');
    seen.add(b.characterId);
    const user=snowflake(b.discordUserId)&&!b.bridgeWebhookId&&!b.bridgeUsername;
    const hook=snowflake(b.bridgeWebhookId)&&typeof b.bridgeUsername==='string'&&b.bridgeUsername.length>0&&b.bridgeUsername.length<=80&&!b.discordUserId;
    if(!user&&!hook)throw Error('Kies per character één geldige Discord-gebruiker of vertrouwde bridge-webhook en naam.');
  }
  if(config.allowedOrigin){const u=new URL(config.allowedOrigin);if(u.protocol!=='https:'||u.origin!==config.allowedOrigin)throw Error('allowedOrigin moet een HTTPS-origin zonder pad zijn.');}
  return config;
}
