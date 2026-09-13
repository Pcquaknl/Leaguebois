function getUpgrades(civ) {
return upgradeData[civ] || {};
}
function getUpgradeClass(value) {
if (value?.includes("⭐")) return "upgrade-special";
if (value?.includes("✅")) return "upgrade-yes";
return "upgrade-no";
}
function renderSectionTitle(title) {
return     '<div class="section-title"><span class="section-dot"></span><span>' + title + '</span></div>';
}
function renderSide(containerId, civName, isMySide) {
const container = document.getElementById(containerId);
const data = civData[civName] || { shortDesc: 'Geen beschrijving beschikbaar.' };
const uusCounters = uniqueUnitsData[civName] || [];
const u = getUpgrades(civName) || {};
const uniqueUnitsHtml = (data.uniqueUnits && data.uniqueUnits.length > 0)
? data.uniqueUnits.map(uu =>       '<div class="unit-card">' +
'<div class="unit-name">' + uu.name + '</div>' +
'<div class="unit-desc">' + uu.desc + '</div>' +
'</div>'
).join('')
: '<div class="unit-card"><div class="unit-desc">Geen unique units beschikbaar.</div></div>';
const matchupHtml = (uusCounters.length > 0)
? uusCounters.map(uu =>       '<div class="matchup-item">' +
'<div class="unit-name">' + uu.name + '</div>' +
'<div class="flex flex-wrap gap-2 mt-3">' +
'<span class="good-chip">✓ Goed tegen: ' + uu.good + '</span>' +
'<span class="bad-chip">✗ Slecht tegen: ' + uu.bad + '</span>' +
'</div>' +
'</div>'
).join('')
: '<div class="matchup-item"><div class="unit-desc">Geen matchup-data beschikbaar.</div></div>';
const uniqueTechsHtml = (data.uniqueTechs && data.uniqueTechs.length > 0)
? '<ul class="info-list">' + data.uniqueTechs.map(t => '<li>' + t + '</li>').join('') + '</ul>'
: '<div class="unit-desc">Geen unique technologies beschikbaar.</div>';
const bonusesHtml = (data.bonuses && data.bonuses.length > 0)
? '<ul class="info-list">' + data.bonuses.map(b => '<li>' + b + '</li>').join('') + '</ul>'
: '<div class="unit-desc">Geen civilization bonuses beschikbaar.</div>';
const upgradeItems = [
['Militia', u.militia],
['Spear', u.spear],
['Archer', u.archer],
['Skirmisher', u.skirm],
['Scout', u.scout],
['Knight', u.knight],
['Cav Archer', u.cavarcher],
['Siege', u.mangonel],
['Scorpion', u.scorpion],
['Gunpowder', u.gunpowder]
];
const upgradesHtml = upgradeItems.map(([label, value]) =>     '<div class="upgrade-item">' +
'<div class="upgrade-name">' + label + '</div>' +
'<div class="upgrade-value ' + getUpgradeClass(value || '❌') + '">' + (value || '❌') + '</div>' +
'</div>'
).join('');
container.innerHTML =     '<div class="section-card">' +
'<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">' +
'<div>' +
'<div class="side-pill ' + (isMySide ? 'my-side' : 'opp-side') + '">' + (isMySide ? '✅ Mijn civilization' : '⚔️ Tegenstander') + '</div>' +
'<h2 class="text-3xl md:text-4xl font-black ' + (isMySide ? 'text-green-400' : 'text-red-400') + '">' + civName + '</h2>' +
'</div>' +
'<div class="mini-badge legend-chip max-w-xs">Sterktes: ' + data.shortDesc + '</div>' +
'</div>' +
'<div class="overview-card">' +
renderSectionTitle('Sterktes in notendop') +
'<div class="text-slate-200 text-sm md:text-base">' + data.shortDesc + '</div>' +
'</div>' +
'<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">' +
'<div class="info-box">' +
renderSectionTitle('Unique Units') +
uniqueUnitsHtml +
'</div>' +
'<div class="info-box">' +
renderSectionTitle('Team Bonus') +
'<div class="team-bonus-chip">🛡️ ' + (data.teamBonus || 'Geen team bonus beschikbaar.') + '</div>' +
'<div class="legend-row mt-4">' +
'<span class="legend-chip">Unique units en counters hieronder</span>' +
'</div>' +
'</div>' +
'</div>' +
'<div class="uu-card">' +
renderSectionTitle('Unique Unit Matchups') +
matchupHtml +
'</div>' +
'<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">' +
'<div class="info-box">' +
renderSectionTitle('Unique Technologies') +
uniqueTechsHtml +
'</div>' +
'<div class="info-box">' +
renderSectionTitle('Civilization Bonuses') +
bonusesHtml +
'</div>' +
'</div>' +
'<div class="info-box">' +
renderSectionTitle('Complete Upgrade Overzicht') +
'<div class="upgrade-grid">' + upgradesHtml + '</div>' +
'</div>' +
'</div>';
}
function updateDisplay() {
const myCiv = document.getElementById('myCiv').value;
const oppCiv = document.getElementById('oppCiv').value;
document.getElementById('mainContainer').innerHTML = '<div id="mySide"></div><div id="oppSide"></div>';
renderSide('mySide', myCiv, true);
renderSide('oppSide', oppCiv, false);
}
function swapCivilizations() {
const mySelect = document.getElementById('myCiv');
const oppSelect = document.getElementById('oppCiv');
const temp = mySelect.value;
mySelect.value = oppSelect.value;
oppSelect.value = temp;
updateDisplay();
}
function init() {
const mySelect = document.getElementById('myCiv');
const oppSelect = document.getElementById('oppCiv');
const swapBtn = document.getElementById('swapBtn');
if (!mySelect || !oppSelect) return;
mySelect.addEventListener('change', updateDisplay);
oppSelect.addEventListener('change', updateDisplay);
if (swapBtn) swapBtn.addEventListener('click', swapCivilizations);
updateDisplay();
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}