import { orderedHistory, observedGain, deriveMilestones, captureVisit, changesSinceVisit } from './progress.mjs';

const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const classIcons = {Warrior:'warrior',Mage:'mage',Rogue:'rogue',Priest:'priest',Hunter:'hunter',Warlock:'warlock',Paladin:'paladin',Druid:'druid',Shaman:'shaman',DeathKnight:'deathknight'};
const qualities = {rare:'#36a6ff',epic:'#c580ff',legendary:'#ffad56'};
const shortName = c => c.nickname || String(c.name || '').replace(/\s+Stormcoast$/i,'');
const labelName = (data,id) => { const c=data.characters.find(c=>c.id===id); return c ? shortName(c) : id; };
const latest = (data,id) => data.mode === 'live' && data.sourceStatuses?.[id] === 'not_found' ? undefined : orderedHistory(data.snapshots,id).at(-1);
const recentAt = s => s?.observedAt || s?.at;
const smallDate = at => {const t=Date.parse(at);return Number.isFinite(t)?new Date(t).toLocaleDateString('nl-NL',{day:'numeric',month:'short'}):'datum onbekend'};
const fullDate = at => {const t=Date.parse(at);return Number.isFinite(t)?new Date(t).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'datum onbekend'};

function avatar(c,s,color) {
  const first=escapeHTML((s?.class || c.name || '?')[0]);
  const classIcon=classIcons[s?.class];
  const src=s?.portrait || (classIcon ? `https://wow.zamimg.com/images/wow/icons/large/classicon_${classIcon}.jpg` : '');
  const alt=s?.portrait?'Personageportret':classIcon?`${s.class}-icoon`:'Geen afbeelding';
  return `<span class="roster-avatar" style="--class:${color}" title="${escapeHTML(alt)}"><span aria-hidden="true">${first}</span>${src?`<img src="${escapeHTML(src)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
}

function roster(data, mode, colors) {
  const now=Date.now(), midnight=new Date(now); midnight.setHours(0,0,0,0);
  const dayStart=midnight.getTime(), weekStart=now-7*86400000;
  const all=data.characters.map(c=>{
    const s=latest(data,c.id);
    const active=Number.isFinite(s?.level);
    const sourceTime=data.sourceTimes?.[c.id] || s?.at;
    const today=active?observedGain(data.snapshots,c.id,dayStart,sourceTime):null;
    const week=active?observedGain(data.snapshots,c.id,weekStart,sourceTime):null;
    const score=mode==='today'?today:mode==='week'?week:s?.level;
    return {c,s,active,today,week,score:Number.isFinite(score)?score:null};
  });
  all.sort((a,b)=>Number(b.active)-Number(a.active) || Number(b.score!==null)-Number(a.score!==null) || (b.score??0)-(a.score??0) || (b.s?.level??0)-(a.s?.level??0) || String(a.c.name).localeCompare(String(b.c.name)));
  const known=all.filter(x=>x.score!==null&&x.active);
  const leader=Math.max(0,...all.filter(x=>x.active).map(x=>x.s.level));
  const rows=all.map(({c,s,active,today,week,score})=>{
    const color=colors[s?.class]||'#caa968';
    const rank=score===null?'—':1+known.filter(other=>other.score>score).length;
    const gap=!active?'Wacht op Armory':mode==='level'?(leader===s.level?'Koploper':`${leader-s.level} achter koploper`):(score===null?'Geen vergelijkbare meting':'Groei waargenomen');
    const gain=mode==='today'?today:week;
    const gainLabel=mode==='today'?'vandaag':'7 dagen';
    const gainText=gain===null?'—':`+${gain}`;
    const progress=active?Math.max(0,Math.min(100,(s.level/(data.levelCap||60))*100)):0;
    const stale=data.mode==='live'&&data.sourceStatuses?.[c.id]==='unavailable';
    return `<button type="button" class="roster-row${active?'':' roster-unavailable'}" data-character="${escapeHTML(c.id)}" style="--class:${color}" aria-label="${escapeHTML(c.name)} ${active?'level '+s.level:'gegevens onbekend'}">
      <span class="roster-rank${rank===1?' rank-first':''}">${rank===1?'♛':rank}</span>${avatar(c,s,color)}
      <span class="roster-person"><strong>${escapeHTML(shortName(c))}</strong><small>${escapeHTML(s?.class||'Profiel onbekend')} · ${escapeHTML(stale?'bron tijdelijk niet bereikbaar':gap)}</small><span class="roster-bar"><i style="width:${progress}%"></i></span></span>
      <span class="roster-value"><strong>${active?s.level:'—'}</strong><small>level</small></span>
      <span class="roster-gain"><strong>${gainText}</strong><small>${gainLabel}</small></span><span class="roster-arrow" aria-hidden="true">›</span>
    </button>`;
  }).join('');
  const button=(id,label)=>`<button type="button" data-race="${id}" class="${mode===id?'active':''}" aria-pressed="${mode===id}">${label}</button>`;
  return `<section class="panel roster-panel"><div class="roster-heading"><div><div class="eyebrow">DE STORMCOAST RACE</div><h2>Road to ${Number(data.levelCap)||60}</h2></div><div class="race-tabs" aria-label="Sorteer de ranglijst">${button('level','Level')}${button('today','Vandaag')}${button('week','7 dagen')}</div></div><div class="roster-list">${rows||'<p class="empty-feed">Nog geen spelers geconfigureerd.</p>'}</div><p class="roster-foot">Groei is vastgesteld tussen meetmomenten; een streepje betekent dat er nog geen vergelijking is.</p></section>`;
}

function snapshotActivity(data) {
  const events=[];
  for(const c of data.characters){
    const h=orderedHistory(data.snapshots,c.id);
    for(let i=1;i<h.length;i++){
      const before=h[i-1],after=h[i];
      if(after.level>before.level)events.push({kind:'level',name:shortName(c),from:before.level,to:after.level,at:recentAt(after)});
      if(Array.isArray(before.equipment)&&before.equipment.length&&Array.isArray(after.equipment)) {
        for(const item of after.equipment) {
          const old=before.equipment.find(x=>x.slot===item.slot);
          if(item && ['rare','epic'].includes(item.quality) && (!old || old.id!==item.id || old.name!==item.name))
            events.push({kind:'gear',name:shortName(c),itemName:item.name,quality:item.quality,at:recentAt(after)});
        }
      }
    }
  }
  return events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}

function activity(data,previousVisit,storageAvailable) {
  const current=captureVisit(data);
  const changes=data.mode==='live'?changesSinceVisit(previousVisit,current):[];
  const hasBaseline=!!previousVisit?.players && data.mode==='live';
  const recent=snapshotActivity(data);
  const rows=hasBaseline?changes.slice(0,5).map(event=>{
    const text=event.kind==='level'?`${event.name} steeg van level ${event.from} naar ${event.to}`:`${event.name} heeft nu ${event.itemName} uitgerust`;
    return `<div class="activity-line"><span class="activity-icon ${event.kind}">${event.kind==='level'?'↑':'✦'}</span><span>${escapeHTML(text)}</span></div>`;
  }).join(''):recent.slice(0,4).map(event=>{
    const text=event.kind==='level'?`${event.name} steeg van level ${event.from} naar ${event.to}`:`${event.name} heeft ${event.itemName} uitgerust`;
    return `<div class="activity-line"><span class="activity-icon ${event.kind}">${event.kind==='level'?'↑':'✦'}</span><span>${escapeHTML(text)}<small>${escapeHTML(fullDate(event.at))} · waargenomen</small></span></div>`;
  }).join('');
  const title=hasBaseline?'Sinds je vorige bezoek':'Recent waargenomen';
  const hint=hasBaseline?`Nieuwe metingen sinds ${fullDate(previousVisit.at)} · op dit apparaat`:(storageAvailable?'Na je volgende bezoek zie je wat er voor jou nieuw is.':'Recente metingen van de groep.');
  const blank=hasBaseline?(Object.keys(current.players).length?'Geen nieuwe verschillen bij de beschikbare profielen.':'Geen actuele profielen beschikbaar om te vergelijken.'):'Nog geen veranderingen tussen metingen vastgelegd.';
  return `<section class="panel dashboard-panel activity-panel"><div class="dash-panel-heading"><div><div class="eyebrow">WAT IS ER NIEUW?</div><h2>${title}</h2></div><span class="dash-glyph">✦</span></div><p class="dash-hint">${escapeHTML(hint)}</p><div>${rows||`<p class="empty-feed">${escapeHTML(blank)}</p>`}</div>${hasBaseline&&changes.length>5?`<p class="dash-hint">En ${changes.length-5} andere ${changes.length-5===1?'verandering':'veranderingen'}.</p>`:''}</section>`;
}

function milestoneCopy(data,m) {
  const name=labelName(data,m.characterId);
  if(m.kind==='level')return {title:`${name} · level ${m.level}`,detail:m.basis==='crossing'?'Levelgrens waargenomen':'Bij de eerste meting vastgelegd',icon:m.level===60?'♛':'✦'};
  if(m.kind==='quality')return {title:`${name} · ${m.quality==='epic'?'Epic':'Rare'} voor het eerst vastgelegd`,detail:m.itemName || 'Voor het eerst vastgelegd',icon:m.quality==='epic'?'◆':'◇'};
  return {title:`${name} · mijlpaal`,detail:'Vastgelegd',icon:'✦'};
}

export function milestonesFor(data){return deriveMilestones(data.snapshots,data.milestones).filter(m=>data.characters.some(c=>c.id===m.characterId)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));}
function milestoneRows(data,limit) {
  const milestones=milestonesFor(data).slice(0,limit);
  return milestones.length?milestones.map(m=>{const copy=milestoneCopy(data,m),color=m.kind==='quality'?qualities[m.quality]:null;return `<div class="milestone-row"><span class="milestone-icon"${color?` style="color:${color}"`:''}>${copy.icon}</span><span><strong>${escapeHTML(copy.title)}</strong><small>${escapeHTML(copy.detail)}</small></span><time>${escapeHTML(smallDate(m.at))}</time></div>`}).join(''):'<p class="empty-feed">Zodra een mijlpaal wordt waargenomen, verschijnt hij hier.</p>';
}

function milestonePanel(data){const count=milestonesFor(data).length;return `<section class="panel dashboard-panel"><div class="dash-panel-heading"><div><div class="eyebrow">HET GROEPSVERHAAL</div><h2>Mijlpalen</h2></div><span class="count-badge">${count}</span></div><p class="dash-hint">Alleen momenten die de tracker heeft gezien.</p>${milestoneRows(data,4)}<button type="button" class="inline-link" data-view="milestones">Bekijk alle mijlpalen →</button></section>`;}

export function renderDashboard(data,mode,previousVisit,storageAvailable,colors){
  const found=data.characters.filter(c=>Number.isFinite(latest(data,c.id)?.level)).length;
  const isDemo=data.mode==='demo', stale=data.status==='unavailable';
  return `<div class="dash-title"><div><div class="eyebrow">LEAGUEBOIS / WOW FOREVER</div><h1>De Stormcoast groep</h1></div><details class="source-status${stale?' source-stale':''}"><summary><span class="status-dot"></span>${isDemo?'Demogegevens':stale?'Gegevens mogelijk oud':`${found}/${data.characters.length} profielen`}</summary><p>${isDemo?'Deze personages zijn fictief.':`De Armory wordt ongeveer elke 15 minuten gecontroleerd. Levels kunnen tijdens het spelen achterlopen en meestal pas na uitloggen veranderen. Portretten en profielen ontbreken soms bij de bron.`}</p></details></div>${isDemo?'<div class="note"><b>DEMO</b> — Dit zijn voorbeeldpersonages. <button id="live-button" class="text-button">Terug naar live</button></div>':''}<div class="dashboard-grid">${roster(data,mode,colors)}<div class="dashboard-side">${activity(data,previousVisit,storageAvailable)}${milestonePanel(data)}</div></div>`;
}

export function renderMilestones(data){const list=milestonesFor(data);return `<div class="section-head"><div><div class="eyebrow">LEAGUEBOIS / HET GROEPSVERHAAL</div><h1 class="heading">Mijlpalen</h1></div><span class="subtle">${list.length} vastgelegd</span></div><p class="milestone-intro">Dit zijn waargenomen momenten sinds de tracker gegevens verzamelt. Het moment op de site kan later zijn dan het moment in de game.</p><section class="panel dashboard-panel milestone-wall">${milestoneRows(data,Infinity)}</section>`;}
