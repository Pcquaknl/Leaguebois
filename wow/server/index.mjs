import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from './store.mjs';
import {createHttpServer} from './http.mjs';
import {startBot} from './bot.mjs';
import {validateConfig} from './config.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const characters=JSON.parse(await readFile(path.join(here,'../characters.json'),'utf8'));
const configPath=process.env.LEAGUEBOIS_CONFIG||path.join(here,'settings.json');
const config=validateConfig(JSON.parse(await readFile(configPath,'utf8')),characters);
if(!process.env.DISCORD_BOT_TOKEN) throw Error('DISCORD_BOT_TOKEN ontbreekt.');
const dbPath=process.env.LEAGUEBOIS_DB||path.join(here,'data/live.sqlite');
await mkdir(path.dirname(dbPath),{recursive:true});
const store=new Store(dbPath,characters);
const remote='https://raw.githubusercontent.com/Pcquaknl/Leaguebois/wow-live-data/wow/data/live.json';
async function refreshArmory(){try{const response=await fetch(remote,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);const body=await response.text();if(body.length>8_000_000)throw Error('Te groot');store.setArmory(JSON.parse(body));}catch(error){console.warn('Armory-opname tijdelijk niet beschikbaar:',error.message)}}
await refreshArmory();
const armoryTimer=setInterval(()=>void refreshArmory(),5*60000);armoryTimer.unref();
const web=createHttpServer(store,config.allowedOrigin||'https://leaguebois.nl');
web.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Leaguebois live API gestart.'));
let bot;
try{bot=await startBot(process.env.DISCORD_BOT_TOKEN,config,store)}catch(error){console.error('Discord-bot kon niet verbinden:',error.message);web.close();store.close();process.exitCode=1}
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{clearInterval(armoryTimer);bot?.close();web.close(()=>{store.close();process.exit(0)})});
