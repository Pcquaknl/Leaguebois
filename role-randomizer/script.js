// ====================== SECRET TEEMO SWITCH ======================
// ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
const ENABLE_TEEMO = true;   // ← Zet hier op false als je hem helemaal uit wilt
// ====================== SECRET TEEMO SWITCH ======================

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
let djPlayer = '';

// Elementen (geen teemoCheckbox meer)
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

// === TEEMO MEME (alleen na alle rollen) ===
function triggerTeemo(player) {
    const gifUrl = 'https://media1.tenor.com/m/chDlStGNdBkAAAAd/teemo-league.gif';
    const soundUrl = 'https://wiki.leagueoflegends.com/en-us/images/Teemo_Select.ogg?eb738';

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '10000';
    overlay.style.backgroundImage = `url(${gifUrl})`;
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.cursor = 'pointer';
    overlay.style.transition = 'opacity 0.6s ease';

    const text = document.createElement('div');
    text.style.textAlign = 'center';
    text.style.color = '#fff';
    text.style.textShadow = '5px 5px 15px #000, -5px -5px 15px #000';
    text.style.fontFamily = 'Impact, sans-serif';
    text.innerHTML = `
        <h1 style="font-size: 95px; margin: 0; letter-spacing: 4px;">TEEMO TIME!!!</h1>
        <h2 style="font-size: 55px; margin: 15px 0;">${player} SPEELT TEEMO 🍄</h2>
        <p style="font-size: 28px; opacity: 0.9;">klik om te sluiten</p>
    `;
    overlay.appendChild(text);

    const audio = new Audio(soundUrl);
    audio.volume = 0.85;
    audio.play().catch(() => {});

    overlay.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 600);
    });

    document.body.appendChild(overlay);
}

// === Na alle rollen (inclusief reroll) checken we Teemo ===
function handlePostRollTeemo() {
    if (!ENABLE_TEEMO) {
        proceedToFinal();
        return;
    }

    // Wie heeft Top of Jungle?
    const candidates = players.filter(p => {
        const role = assignments[p];
        return role === 'Top' || role === 'Jungle';
    });

    const victims = [];
    candidates.forEach(p => {
        if (Math.random() < 0.10) victims.push(p);
    });

    if (victims.length === 0) {
        proceedToFinal();
        return;
    }

    // Teemo één voor één met pauze (zodat je ze goed ziet)
    let i = 0;
    function triggerNext() {
        if (i >= victims.length) {
            proceedToFinal();
            return;
        }
        triggerTeemo(victims[i]);
        i++;
        setTimeout(triggerNext, 4500); // 4.5 sec pauze tussen memes
    }
    triggerNext();
}

function proceedToFinal() {
    if (enableDJ) spinDJ();
    else showResults();
}

// === Role wheel (geen Teemo check meer tijdens draaien) ===
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

// === Support reroll & finish ===
function hasSupportButNoADC() {
    return Object.values(assignments).includes('Support') && 
           !Object.values(assignments).includes('ADC');
}

function checkAndHandleSupportReroll() {
    if (!enableSupportReroll || !hasSupportButNoADC()) {
        handlePostRollTeemo();   // ← hier begint de Teemo check
        return;
    }
    performSupportReroll();
}

function performSupportReroll() {
    const supportPlayer = Object.keys(assignments).find(p => assignments[p] === 'Support');
    if (!supportPlayer) return handlePostRollTeemo();

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
            handlePostRollTeemo();   // ← hier ook na reroll
        }
    }, 3000);
}

// DJ en Results blijven precies hetzelfde
function spinDJ() {
    wheelContainer.classList.add('hidden');
    currentPlayerP.classList.add('hidden');
    slotmachineContainer.classList.remove('hidden');
    djMessage.textContent = 'DJ Rolllllllll 🦜';

    slotmachineContainer.innerHTML = '';
    slotmachineContainer.appendChild(djMessage);

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

    let spinInterval = setInterval(() => {
        const randomName = players[Math.floor(Math.random() * players.length)];
        nameDisplay.textContent = randomName;
    }, 90);

    setTimeout(() => {
        clearInterval(spinInterval);
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
