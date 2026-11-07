import {Client, GatewayIntentBits, Events, SlashCommandBuilder} from 'discord.js';
import {acceptMessage,standings,professions} from './service.mjs';

export async function startBot(token,config,store,createClient=options=>new Client(options)) {
  const client=createClient({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
  let sending=false;
  const dispatch=message=>{
    if(message.guildId!==config.discordGuildId||message.channelId!==config.bridgeChannelId)return;
    if(config.diagnostics && message.content?.startsWith('[LEAGUEBOIS-TEST]')) {
      console.log('Testbericht van de brug:',JSON.stringify({authorId:message.author?.id,webhookId:message.webhookId||null,username:message.author?.username}));
      return;
    }
    if(!message.content?.startsWith('[LB1]|'))return;
    const result=acceptMessage(message,config,store);
    if(config.diagnostics && result.status==='untrusted') console.log('Ongekoppelde relay:',JSON.stringify({authorId:message.author?.id,webhookId:message.webhookId||null,username:message.author?.username}));
    if(result.status==='stored') void flushNotifications();
  };
  async function flushNotifications(){
    if(sending||!client.isReady()||!config.announcementsChannelId)return;
    sending=true;
    try{const channel=await client.channels.fetch(config.announcementsChannelId);
      if(!channel?.isTextBased()||typeof channel.send!=='function')throw Error('Meldingenkanaal is niet beschikbaar');
      for(const row of store.pendingNotifications(20)) {await channel.send({content:row.body,allowedMentions:{parse:[]}});store.markSent(row.id)}
    }catch(error){console.warn('Discord-melding niet verzonden:',error.message)}finally{sending=false}
  }
  async function recover(){
    try{
      const channel=await client.channels.fetch(config.bridgeChannelId);
      if(channel?.isTextBased()&&channel.messages){const messages=await channel.messages.fetch({limit:100});for(const message of [...messages.values()].sort((a,b)=>a.createdTimestamp-b.createdTimestamp))dispatch(message)}
    }catch(error){console.warn('Discord-berichten teruglezen niet gelukt:',error.message)}
  }
  client.on(Events.ClientReady,async()=>{
    console.log('Discord-bot verbonden.');
    try{
      const commands=[new SlashCommandBuilder().setName('stand').setDescription('Bekijk de Leaguebois levelrace'),new SlashCommandBuilder().setName('beroepen').setDescription('Bekijk de laatst bekende beroepen').addStringOption(o=>o.setName('personage').setDescription('Naam van een speler').setRequired(false))];
      for(const command of commands) await client.application.commands.create(command,config.discordGuildId);
    }catch(error){console.warn('Discord-opdrachten registreren niet gelukt:',error.message)}
    await recover();
    void flushNotifications();
  });
  client.on(Events.ShardResume,()=>void recover());
  client.on(Events.MessageCreate,dispatch);
  client.on(Events.InteractionCreate,async interaction=>{
    if(!interaction.isChatInputCommand()||interaction.guildId!==config.discordGuildId)return;
    try{if(interaction.commandName==='stand')await interaction.reply({content:standings(store.dataset()),allowedMentions:{parse:[]}});
      else if(interaction.commandName==='beroepen')await interaction.reply({content:professions(store.dataset(),interaction.options.getString('personage')||''),allowedMentions:{parse:[]}});
    }catch(error){console.warn('Discord-opdracht mislukt:',error.message)}
  });
  client.on(Events.Error,error=>console.warn('Discord-verbinding:',error.message));
  const timer=setInterval(()=>void flushNotifications(),60000);timer.unref();
  await client.login(token);
  return {client,close(){clearInterval(timer);client.destroy()}};
}
