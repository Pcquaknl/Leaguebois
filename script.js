// Lijst met beschikbare rollen
const roles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

// Lijst met champions per role (handmatig aanpasbaar)
const champions = {
    'Top': ['Garen', 'Darius', 'Sett', 'Aatrox', 'Ornn'],
    'Jungle': ['Lee Sin', 'Kha\'Zix', 'Vi', 'Amumu', 'Nunu'],
    'Mid': ['Ahri', 'Yasuo', 'Zed', 'Syndra', 'LeBlanc'],
    'ADC': ['Jinx', 'Ashe', 'Caitlyn', 'Ezreal', 'Vayne'],
    'Support': ['Thresh', 'Leona', 'Lulu', 'Soraka', 'Pyke']
};

// Mapping voor champion image filenames (voor speciale namen)
const championImageMap = {
    'Garen': 'Garen',
    'Darius': 'Darius',
    'Sett': 'Sett',
    'Aatrox': 'Aatrox',
    'Ornn': 'Ornn',
    'Lee Sin': 'LeeSin',
    'Kha\'Zix': 'KhaZix',
    'Vi': 'Vi',
    'Amumu': 'Amumu',
    'Nunu': 'Nunu',
    'Ahri': 'Ahri',
    'Yasuo': 'Yasuo',
    'Zed': 'Zed',
    'Syndra': 'Syndra',
    'LeBlanc': 'Leblanc',
    'Jinx': 'Jinx',
    'Ashe': 'Ashe',
    'Caitlyn': 'Caitlyn',
    'Ezreal': 'Ezreal',
    'Vayne': 'Vayne',
    'Thresh': 'Thresh',
    'Leona': 'Leona',
    'Lulu': 'Lulu',
    'Soraka': 'Soraka',
    'Pyke': 'Pyke'
};

// Variabelen voor spelstaat
let players = [];
let currentPlayerIndex = 0;
let phase = 'role'; // 'role' of 'champion'
let availableRoles = [...roles]; // Kopie van rollen
let assignments = {}; // Toewijzingen: speler -> {role, champion}
let enableChampionWheel = false;

// Elementen ophalen
const playerInputs = document.querySelectorAll('input[type="text"]');
const championWheelCheckbox = document.getElementById('enable-champion-wheel');
const startBtn = document.getElementById('start-btn');
const playerInputDiv = document.getElementById('player-input');
const gameDiv = document.getElementById('game');
const wheel = document.getElementById('wheel');
const currentPlayerP = document.getElementById('current-player');
const resultsDiv = document.getElementById('results');
const resetBtn = document.getElementById('reset-btn');

// Start knop event
startBtn.addEventListener('click', startGame);

// Reset knop event
resetBtn.addEventListener('click', resetGame);

// Functie om spel te starten
function startGame() {
    // Spelersnamen verzamelen (negeer lege inputs)
    players = [];
    playerInputs.forEach(input => {
        if (input.value.trim() !== '') {
            players.push(input.value.trim());
        }
    });
    
    if (players.length < 1 || players.length > 5) {
        alert('Voer 1 tot 5 spelers in.');
        return;
    }
    
    enableChampionWheel = championWheelCheckbox.checked;
    
    // Willekeurig eerste speler kiezen
    currentPlayerIndex = Math.floor(Math.random() * players.length);
    
    // Inputs verbergen, game tonen
    playerInputDiv.classList.add('hidden');
    gameDiv.classList.remove('hidden');
    
    // Begin met rollen voor eerste speler
    spinWheelForCurrentPlayer();
}

// Functie om rad te draaien voor huidige speler
function spinWheelForCurrentPlayer() {
    const player = players[currentPlayerIndex];
    let available;
    let spinText;
    let isRolePhase = phase === 'role';
    
    if (isRolePhase) {
        available = availableRoles;
        spinText = 'role';
    } else {
        available = champions[assignments[player].role];
        spinText = 'champion';
    }
    
    currentPlayerP.textContent = `Huidige speler: ${player} (draait voor ${spinText}...)`;
    
    // Animatie starten: Snel draaien en items doorlopen
    wheel.style.animation = 'spin 0.5s linear infinite'; // Snelle spin
    
    let spinInterval = setInterval(() => {
        // Willekeurig item tonen tijdens spin (voor visueel effect)
        const randomItem = available[Math.floor(Math.random() * available.length)];
        wheel.setAttribute('data-display', randomItem);
    }, 100); // Verander elke 100ms
    
    // Stop na 3 seconden (simuleer spin tijd)
    setTimeout(() => {
        clearInterval(spinInterval);
        wheel.style.animation = 'none'; // Stop animatie
        
        // Willekeurig item kiezen en toewijzen
        const itemIndex = Math.floor(Math.random() * available.length);
        const chosenItem = available[itemIndex];
        
        // Toon gekozen item in rad
        wheel.setAttribute('data-display', chosenItem);
        
        if (isRolePhase) {
            assignments[player] = { role: chosenItem };
            availableRoles.splice(itemIndex, 1); // Verwijder voor unieke roles
        } else {
            assignments[player].champion = chosenItem; // Geen verwijdering voor champions
        }
        
        // Volgende speler
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        
        // Check of phase compleet
        if (phase === 'role') {
            if (availableRoles.length === roles.length - players.length) {
                if (enableChampionWheel) {
                    phase = 'champion';
                    currentPlayerIndex = Math.floor(Math.random() * players.length); // Nieuwe random start voor champions
                    setTimeout(spinWheelForCurrentPlayer, 2000);
                } else {
                    // Kies random champions zonder wheel
                    players.forEach(p => {
                        const role = assignments[p].role;
                        const champList = champions[role];
                        assignments[p].champion = champList[Math.floor(Math.random() * champList.length)];
                    });
                    showResults();
                }
            } else {
                setTimeout(spinWheelForCurrentPlayer, 2000);
            }
        } else {
            // Check of alle champions toegewezen
            if (players.every(p => assignments[p].champion)) {
                showResults();
            } else {
                setTimeout(spinWheelForCurrentPlayer, 2000);
            }
        }
    }, 3000); // Spin duur: 3 seconden
}

// Functie om resultaten te tonen
function showResults() {
    wheel.classList.add('hidden'); // Verberg rad
    currentPlayerP.classList.add('hidden');
    
    resultsDiv.innerHTML = '<h2>Resultaten:</h2>';
    players.forEach(player => {
        const { role, champion } = assignments[player];
        const imageFile = championImageMap[champion];
        resultsDiv.innerHTML += `<p>${player}: ${role} - ${champion} <img src="https://ddragon.leagueoflegends.com/cdn/16.2.1/img/champion/${imageFile}.png" alt="${champion}" style="width:50px; height:50px;"></p>`;
    });
    
    resetBtn.classList.remove('hidden');
}

// Functie om te resetten
function resetGame() {
    // Reset variabelen
    players = [];
    currentPlayerIndex = 0;
    phase = 'role';
    availableRoles = [...roles];
    assignments = {};
    
    // UI reset (namen en checkbox blijven behouden)
    playerInputDiv.classList.remove('hidden');
    gameDiv.classList.add('hidden');
    wheel.classList.remove('hidden');
    currentPlayerP.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    resetBtn.classList.add('hidden');
    wheel.setAttribute('data-display', '');
    wheel.style.animation = 'none';
}