const tooltipCache = new Map();
const qualityColors = {poor:'#9d9d9d',common:'#fff',uncommon:'#1eff00',rare:'#0070dd',epic:'#a335ee',legendary:'#ff8000'};
const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const cleanLine = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0,400);
let active = null;
let pinned = false;
let token = 0;
let leaveTimer = null;

const popup = document.createElement('div');
popup.className = 'item-tooltip';
popup.id = 'item-tooltip';
popup.hidden = true;
popup.setAttribute('role', 'region');
popup.setAttribute('aria-label', 'Iteminformatie');
popup.setAttribute('aria-live', 'polite');
document.body.append(popup);

function info(button) {
  return {
    id:Number(button.dataset.itemId),
    name:button.dataset.itemName || 'Item',
    slot:button.dataset.itemSlot || '',
    quality:button.dataset.itemQuality || 'common',
    ilvl:Number(button.dataset.itemLevel) || null,
    enchantId:Number(button.dataset.itemEnchant) || null,
    enchant:button.dataset.itemEnchantText || '',
    gems:button.dataset.itemGems ? button.dataset.itemGems.split(':').map(Number).filter(x => Number.isSafeInteger(x) && x >= 0) : []
  };
}

function position() {
  if (!active || popup.hidden || !active.isConnected) return;
  if (innerWidth <= 650) {
    popup.style.left = '12px';
    popup.style.right = '12px';
    popup.style.bottom = '12px';
    popup.style.top = 'auto';
    return;
  }
  popup.style.right = 'auto';
  popup.style.bottom = 'auto';
  const rect = active.getBoundingClientRect();
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  const right = rect.right + 10;
  const left = right + width < innerWidth - 10 ? right : Math.max(10, rect.left - width - 10);
  popup.style.left = `${Math.round(left)}px`;
  popup.style.top = `${Math.round(Math.max(10, Math.min(rect.top, innerHeight - height - 10)))}px`;
}

function heading(item) {
  const color = qualityColors[item.quality] || qualityColors.common;
  return `<div class="tooltip-head"><strong style="color:${color}">${safeText(item.name)}</strong><button type="button" class="tooltip-close" aria-label="Sluit iteminformatie">×</button></div>${item.ilvl ? `<div class="tooltip-ilvl">Item level ${item.ilvl}</div>` : ''}`;
}

function rowsFrom(html) {
  if (typeof html !== 'string' || html.length > 50000) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.children).slice(0, 35).flatMap(node => {
    const tag = node.tagName.toLowerCase();
    if (!['tt-line','tt-double-line'].includes(tag)) return [];
    let content = cleanLine(node.textContent);
    if (!content || /(?:you (?:have|haven.t)|appearance (?:is|has been)|collected this appearance)/i.test(content)) return [];
    if (node.getAttribute('data-line-type') === 'item-price') {
      const currencies = [['price-gold','gold'],['price-silver','silver'],['price-copper','copper']].flatMap(([cls,label]) => {
        const amount = cleanLine(node.querySelector(`.${cls}`)?.textContent);
        return /^\d+$/.test(amount) ? [`${amount} ${label}`] : [];
      });
      if (!currencies.length) return [];
      content = `Sell Price: ${currencies.join(' ')}`;
    }
    const colorValue = node.querySelector('tt-inline-color')?.getAttribute('data-color');
    const color = /^#[0-9a-f]{6}$/i.test(colorValue || '') ? colorValue : '#e8e4da';
    if (tag === 'tt-double-line' && node.children.length >= 2) {
      const parts = Array.from(node.children).slice(0,2).map(child => cleanLine(child.textContent));
      return [`<div class="tooltip-pair" style="color:${color}"><span>${safeText(parts[0])}</span><span>${safeText(parts[1])}</span></div>`];
    }
    return [`<div class="tooltip-line" style="color:${color}">${safeText(content)}</div>`];
  });
}

async function fetchTooltip(item) {
  if (!Number.isSafeInteger(item.id) || item.id <= 0) throw Error('Onbekend item');
  const url = new URL(`https://forever.warcraftdb.com/api/v1/tooltip/item/${item.id}`);
  if (Number.isSafeInteger(item.enchantId) && item.enchantId > 0) url.searchParams.set('ench', String(item.enchantId));
  if (item.gems.length) url.searchParams.set('gems', item.gems.join(':'));
  const key = url.href;
  if (!tooltipCache.has(key)) {
    const request = fetch(url, {signal:AbortSignal.timeout(10000), credentials:'omit', referrerPolicy:'no-referrer'})
      .then(response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.json(); })
      .then(data => { if (!data || typeof data.html !== 'string' || typeof data.name !== 'string') throw Error('Geen itemgegevens'); return data; })
      .catch(error => { tooltipCache.delete(key); throw error; });
    tooltipCache.set(key, request);
  }
  return tooltipCache.get(key);
}

function normalizedName(value) { return cleanLine(value).toLocaleLowerCase('en-US').replace(/[’‘]/g,"'"); }

async function show(button, pin = false) {
  clearTimeout(leaveTimer);
  if (active !== button) {
    if (active) active.setAttribute('aria-expanded', 'false');
    active = button;
    pinned = false;
  }
  if (pin) pinned = true;
  const current = ++token;
  button.setAttribute('aria-expanded', 'true');
  const item = info(button);
  popup.hidden = false;
  popup.innerHTML = `${heading(item)}<div class="tooltip-line">Itemgegevens worden geladen…</div>`;
  position();
  try {
    const data = await fetchTooltip(item);
    if (current !== token || active !== button || !button.isConnected) return;
    const lines = rowsFrom(data.html);
    const variant = normalizedName(item.name) !== normalizedName(data.name);
    popup.innerHTML = `${heading(item)}${lines.length ? lines.join('') : '<div class="tooltip-line">Geen aanvullende eigenschappen beschikbaar.</div>'}${item.enchant ? `<div class="tooltip-enchant">${safeText(item.enchant)}</div>` : ''}${variant ? '<div class="tooltip-caveat">Basisitem: willekeurige bonussen kunnen afwijken.</div>' : ''}<div class="tooltip-source">Itemgegevens: Warcraft DB · WoW Forever</div>`;
  } catch {
    if (current !== token || active !== button || !button.isConnected) return;
    popup.innerHTML = `${heading(item)}<div class="tooltip-line">Extra itemgegevens zijn momenteel niet beschikbaar.</div><div class="tooltip-source">Naam en kwaliteit: Armory</div>`;
  }
  position();
}

export function hideItemTooltip() {
  clearTimeout(leaveTimer);
  token++;
  if (active) active.setAttribute('aria-expanded', 'false');
  active = null;
  pinned = false;
  popup.hidden = true;
}

function scheduleHide() {
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => { if (!pinned) hideItemTooltip(); }, 140);
}

document.addEventListener('pointerover', event => {
  if (event.pointerType === 'touch') return;
  if (popup.contains(event.target)) { clearTimeout(leaveTimer); return; }
  const button = event.target.closest?.('[data-item-id]');
  if (button && button !== active) show(button);
});
document.addEventListener('pointerout', event => {
  if (event.pointerType === 'touch') return;
  const button = event.target.closest?.('[data-item-id]');
  if (button === active && !button?.contains(event.relatedTarget) && !popup.contains(event.relatedTarget)) scheduleHide();
  if (popup.contains(event.target) && !popup.contains(event.relatedTarget) && !active?.contains(event.relatedTarget)) scheduleHide();
});
document.addEventListener('focusin', event => {
  const button = event.target.closest?.('[data-item-id]');
  if (button && button !== active) show(button);
});
document.addEventListener('focusout', event => {
  if (event.target === active && !popup.contains(event.relatedTarget)) scheduleHide();
});
document.addEventListener('click', event => {
  if (event.target.closest?.('.tooltip-close')) { hideItemTooltip(); return; }
  const button = event.target.closest?.('[data-item-id]');
  if (button) {
    if (button === active && pinned) hideItemTooltip(); else show(button, true);
  } else if (!popup.contains(event.target)) hideItemTooltip();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !popup.hidden) hideItemTooltip(); });
window.addEventListener('resize', position);
window.addEventListener('scroll', position, {passive:true});
