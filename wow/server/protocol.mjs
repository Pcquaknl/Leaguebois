const CLASSES = new Map(Object.entries({WARRIOR:'Warrior',PALADIN:'Paladin',HUNTER:'Hunter',ROGUE:'Rogue',PRIEST:'Priest',SHAMAN:'Shaman',MAGE:'Mage',WARLOCK:'Warlock',DRUID:'Druid',DEATHKNIGHT:'DeathKnight'}));
const nameKey = value => String(value).normalize('NFKC').trim().toLocaleLowerCase('en-US');
const validText = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max && /^[\p{L}\p{M} .'-]+$/u.test(value);

export function parseRelay(content, characters) {
  if (typeof content !== 'string' || !content.startsWith('[LB1]|') || Buffer.byteLength(content,'utf8') > 240) return null;
  const parts = content.split('|');
  if (parts.length !== 6 || !/^(0|1)$/.test(parts[4])) return null;
  try {
    const name = decodeURIComponent(parts[1]);
    const c = characters.find(item => nameKey(item.name) === nameKey(name));
    if (!c || !/^(?:[1-9]|[1-5][0-9]|60)$/.test(parts[2]) || !CLASSES.has(parts[3])) return null;
    const professions = {}, professionCaps = {};
    const skills = parts[5] ? parts[5].split(';') : [];
    if (skills.length > 6) return null;
    for (const skill of skills) {
      const fields = skill.split('~');
      if (fields.length !== 3) return null;
      const label = decodeURIComponent(fields[0]);
      if (!validText(label,60) || Object.hasOwn(professions,label) || !/^(?:0|[1-9][0-9]{0,3})$/.test(fields[1])) return null;
      const rank = Number(fields[1]);
      if (rank > 1000 || !(fields[2] === '-' || /^(?:[1-9][0-9]{0,3})$/.test(fields[2]))) return null;
      const cap = fields[2] === '-' ? null : Number(fields[2]);
      // Game-provided bonuses can make a displayed rank higher than its base cap.
      if (cap !== null && cap > 1000) return null;
      professions[label] = rank;
      if (cap !== null) professionCaps[label] = cap;
    }
    return {characterId:c.id,level:Number(parts[2]),class:CLASSES.get(parts[3]),professions,professionCaps,complete:parts[4] === '1'};
  } catch { return null; }
}

/** Bind each profile to a known Discord user or an explicitly trusted bridge webhook. */
export function authorizedRelay(message, config, characterId) {
  if (String(message.guildId || '') !== String(config.discordGuildId || '') ||
      String(message.channelId || '') !== String(config.bridgeChannelId || '')) return false;
  const bindings = Array.isArray(config.bindings) ? config.bindings : [];
  return bindings.some(binding => {
    if (binding.characterId !== characterId) return false;
    if (!message.webhookId && binding.discordUserId && String(message.author?.id || '') === String(binding.discordUserId)) return true;
    return !!(message.webhookId && binding.bridgeWebhookId && binding.bridgeUsername &&
      String(message.webhookId) === String(binding.bridgeWebhookId) && message.author?.username === binding.bridgeUsername);
  });
}
