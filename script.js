// Lijst met beschikbare rollen en icon URLs
const roles = [
    { name: 'Top', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Top_icon.png/120px-Top_icon.png?58442' },
    { name: 'Jungle', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Jungle_icon.png/120px-Jungle_icon.png?9225d' },
    { name: 'Mid', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Middle_icon.png/120px-Middle_icon.png?fa3f0' },
    { name: 'ADC', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Bottom_icon.png/120px-Bottom_icon.png?6d4b2' },
    { name: 'Support', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Support_icon.png/120px-Support_icon.png?af1ff' }
];

// Variabelen
let players = [];
let currentPlayerIndex = 0;
let availableRoles = [...roles];
let assignments = {};
let enableDJ = false;
let enableSupportReroll = false;
let djPlayer = '';   // ← nu gewoon 1 string i.p.v. array

// Elementen
const playerInputs = document.querySelectorAll('input[type="text"]');
const djCheckbox = document.getElementById('enable-dj');
const supportRerollCheckbox = document.getElementById('enable-support-reroll');
const startBtn = document.getElementById('start-btn');
const playerInputDiv = document.getElementById('player-input');
const gameDiv = document.getElementById('game');
const wheelContainer = document.getElementById('wheel-container');
const wheel = document.getElementById('wheel');
const wheelIcon = document.getElementById('wheel-icon');
const currentPlayerP = document.getElementById('current-player');
const slotmachineContainer = document.getElementById('slotmachine-container');
const djMessage = document.getElementById('dj-message');
const resultsDiv = document.getElementById('results');
const resetBtn = document.getElementById('reset-btn');

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

function startGame() {
    players = [];
    playerInputs.forEach(input => {
        if (input.value.trim() !== '') players.push(input.value.trim());
    });
    
    if (players.length < 1 || players.length > 5) {
        alert('Voer 1 tot 5 spelers in.');
        return;
    }
    
    enableDJ = djCheckbox.checked;
    enableSupportReroll = supportRerollCheckbox.checked;
    
    currentPlayerIndex = Math.floor(Math.random() * players.length);
    
    playerInputDiv.classList.add('hidden');
    gameDiv.classList.remove('hidden');
    
    spinWheelForCurrentPlayer();
}

// === Role wheel (ongewijzigd) ===
function spinWheelForCurrentPlayer() {
    const player = players[currentPlayerIndex];
    currentPlayerP.textContent = `Huidige speler: ${player} (draait voor role...)`;
    
    wheel.style.animation = 'spin 0.5s linear infinite';
    
    let spinInterval = setInterval(() => {
        const randomRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
        wheelIcon.src = randomRole.icon;
        wheelIcon.alt = randomRole.name;
    }, 100);
    
    setTimeout(() => {
        clearInterval(spinInterval);
        wheel.style.animation = 'none';
        
        const roleIndex = Math.floor(Math.random() * availableRoles.length);
        const chosenRole = availableRoles[roleIndex];
        availableRoles.splice(roleIndex, 1);
        
        wheelIcon.src = chosenRole.icon;
        wheelIcon.alt = chosenRole.name;
        
        assignments[player] = chosenRole.name;
        
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        
        if (availableRoles.length === roles.length - players.length) {
            setTimeout(checkAndHandleSupportReroll, 2000);
        } else {
            setTimeout(spinWheelForCurrentPlayer, 2000);
        }
    }, 3000);
}

// === Support reroll (blijft hetzelfde) ===
function hasSupportButNoADC() {
    return Object.values(assignments).includes('Support') && 
           !Object.values(assignments).includes('ADC');
}

function checkAndHandleSupportReroll() {
    if (!enableSupportReroll || !hasSupportButNoADC()) {
        finishGame();
        return;
    }
    performSupportReroll();
}

function finishGame() {
    if (enableDJ) spinDJ();
    else showResults();
}

function performSupportReroll() {
    const supportPlayer = Object.keys(assignments).find(p => assignments[p] === 'Support');
    if (!supportPlayer) return finishGame();

    currentPlayerIndex = players.indexOf(supportPlayer);
    currentPlayerP.textContent = `Support reroll voor: ${supportPlayer} (geen ADC!)`;

    const supportRole = roles.find(r => r.name === 'Support');
    if (!availableRoles.some(r => r.name === 'Support')) availableRoles.push(supportRole);
    delete assignments[supportPlayer];

    spinWheelForReroll(supportPlayer);
}

function spinWheelForReroll(player) {
    wheel.style.animation = 'spin 0.5s linear infinite';
    
    let spinInterval = setInterval(() => {
        const randomRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
        wheelIcon.src = randomRole.icon;
        wheelIcon.alt = randomRole.name;
    }, 100);
    
    setTimeout(() => {
        clearInterval(spinInterval);
        wheel.style.animation = 'none';
        
        const roleIndex = Math.floor(Math.random() * availableRoles.length);
        const chosenRole = availableRoles[roleIndex];
        availableRoles.splice(roleIndex, 1);
        
        wheelIcon.src = chosenRole.icon;
        wheelIcon.alt = chosenRole.name;
        
        assignments[player] = chosenRole.name;

        if (hasSupportButNoADC()) {
            setTimeout(performSupportReroll, 1800);
        } else {
            setTimeout(finishGame, 2000);
        }
    }, 3000);
}

// === DJ ROL – nu precies hetzelfde als de role wheel (alleen namen) ===
function spinDJ() {
    wheelContainer.classList.add('hidden');
    currentPlayerP.classList.add('hidden');
    slotmachineContainer.classList.remove('hidden');
    djMessage.textContent = 'DJ Rolllllllll 🦜';

    slotmachineContainer.innerHTML = '';
    slotmachineContainer.appendChild(djMessage);

    // Groot tekstvak voor de draaiende namen
    const nameDisplay = document.createElement('div');
    nameDisplay.style.fontSize = '42px';
    nameDisplay.style.fontWeight = 'bold';
    nameDisplay.style.color = '#fff';
    nameDisplay.style.textAlign = 'center';
    nameDisplay.style.margin = '40px 0';
    nameDisplay.style.minHeight = '60px';
    nameDisplay.style.textShadow = '0 0 20px #ff00ff';
    slotmachineContainer.appendChild(nameDisplay);

    const chosenPlayer = players[Math.floor(Math.random() * players.length)];
    djPlayer = chosenPlayer;

    // Snelle wissel zoals bij de icons
    let spinInterval = setInterval(() => {
        const randomName = players[Math.floor(Math.random() * players.length)];
        nameDisplay.textContent = randomName;
    }, 90);

    // Stop na 3 seconden
    setTimeout(() => {
        clearInterval(spinInterval);
        
        // Laat de echte winnaar zien
        nameDisplay.textContent = chosenPlayer;
        nameDisplay.style.fontSize = '52px';
        nameDisplay.style.color = '#ffff00';
        nameDisplay.style.textShadow = '0 0 30px gold';

        setTimeout(showResults, 2200);
    }, 3000);
}

function showResults() {
    slotmachineContainer.classList.add('hidden');
    
    resultsDiv.innerHTML = '<h2>Resultaten:</h2>';
    players.forEach(player => {
        const role = assignments[player];
        const iconUrl = roles.find(r => r.name === role).icon;
        resultsDiv.innerHTML += `<p>${player}: ${role} <img src="${iconUrl}" alt="${role}" width="32"></p>`;
    });
    
    if (enableDJ && djPlayer) {
        resultsDiv.innerHTML += `<p style="font-size:24px; color:#ff00ff; margin-top:20px;">DJ: ${djPlayer} 🦜</p>`;
    }
    
    resetBtn.classList.remove('hidden');
}

function resetGame() {
    players = [];
    currentPlayerIndex = 0;
    availableRoles = [...roles];
    assignments = {};
    enableDJ = false;
    enableSupportReroll = false;
    djPlayer = '';
    
    playerInputDiv.classList.remove('hidden');
    gameDiv.classList.add('hidden');
    wheelContainer.classList.remove('hidden');
    currentPlayerP.classList.remove('hidden');
    slotmachineContainer.classList.add('hidden');
    slotmachineContainer.innerHTML = '';
    resultsDiv.innerHTML = '';
    resetBtn.classList.add('hidden');
    wheelIcon.src = '';
    wheelIcon.alt = '';
    wheel.style.animation = 'none';
}
