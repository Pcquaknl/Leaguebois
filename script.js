// Lijst met beschikbare rollen en icon URLs
const roles = [
    { name: 'Top', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Top_icon.png/120px-Top_icon.png?58442' },
    { name: 'Jungle', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Jungle_icon.png/120px-Jungle_icon.png?9225d' },
    { name: 'Mid', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Middle_icon.png/120px-Middle_icon.png?fa3f0' },
    { name: 'ADC', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Bottom_icon.png/120px-Bottom_icon.png?6d4b2' },
    { name: 'Support', icon: 'https://wiki.leagueoflegends.com/en-us/images/thumb/Support_icon.png/120px-Support_icon.png?af1ff' }
];

// Variabelen voor spelstaat
let players = [];
let currentPlayerIndex = 0;
let availableRoles = [...roles]; // Kopie van rollen
let assignments = {}; // Toewijzingen: speler -> role
let enableDJ = false;
let djPlayer = null;

// Elementen ophalen
const playerInputs = document.querySelectorAll('input[type="text"]');
const djCheckbox = document.getElementById('enable-dj');
const startBtn = document.getElementById('start-btn');
const playerInputDiv = document.getElementById('player-input');
const gameDiv = document.getElementById('game');
const wheelContainer = document.getElementById('wheel-container');
const wheel = document.getElementById('wheel');
const wheelIcon = document.getElementById('wheel-icon');
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
    
    enableDJ = djCheckbox.checked;
    if (enableDJ) {
        djPlayer = players[Math.floor(Math.random() * players.length)];
    }
    
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
    currentPlayerP.textContent = `Huidige speler: ${player} (draait voor role...)`;
    
    // Animatie starten: Snel draaien en icons doorlopen
    wheel.style.animation = 'spin 0.5s linear infinite'; // Snelle spin
    
    let spinInterval = setInterval(() => {
        // Willekeurige role icon tonen tijdens spin (voor visueel effect)
        const randomRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
        wheelIcon.src = randomRole.icon;
        wheelIcon.alt = randomRole.name;
    }, 100); // Verander elke 100ms
    
    // Stop na 3 seconden (simuleer spin tijd)
    setTimeout(() => {
        clearInterval(spinInterval);
        wheel.style.animation = 'none'; // Stop animatie
        
        // Willekeurige role kiezen en toewijzen
        const roleIndex = Math.floor(Math.random() * availableRoles.length);
        const chosenRole = availableRoles[roleIndex];
        availableRoles.splice(roleIndex, 1); // Verwijder gekozen role
        
        // Toon gekozen role icon in rad
        wheelIcon.src = chosenRole.icon;
        wheelIcon.alt = chosenRole.name;
        
        // Toewijzing opslaan
        assignments[player] = chosenRole.name;
        
        // Volgende speler
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        
        // Als alle spelers gedaan, wacht 2 seconden en toon resultaten
        if (availableRoles.length === roles.length - players.length) {
            setTimeout(showResults, 2000);
        } else {
            // Wacht 2 seconden en ga naar volgende
            setTimeout(spinWheelForCurrentPlayer, 2000);
        }
    }, 3000); // Spin duur: 3 seconden
}

// Functie om resultaten te tonen
function showResults() {
    wheelContainer.classList.add('hidden'); // Verberg hele wheel container
    currentPlayerP.classList.add('hidden');
    
    resultsDiv.innerHTML = '<h2>Resultaten:</h2>';
    players.forEach(player => {
        const role = assignments[player];
        const iconUrl = roles.find(r => r.name === role).icon;
        resultsDiv.innerHTML += `<p>${player}: ${role} <img src="${iconUrl}" alt="${role}"></p>`;
    });
    if (enableDJ) {
        resultsDiv.innerHTML += `<p>DJ: ${djPlayer}</p>`;
    }
    
    resetBtn.classList.remove('hidden');
}

// Functie om te resetten
function resetGame() {
    // Reset variabelen
    players = [];
    currentPlayerIndex = 0;
    availableRoles = [...roles];
    assignments = {};
    enableDJ = false;
    djPlayer = null;
    
    // UI reset (namen en checkbox blijven behouden)
    playerInputDiv.classList.remove('hidden');
    gameDiv.classList.add('hidden');
    wheelContainer.classList.remove('hidden');
    currentPlayerP.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    resetBtn.classList.add('hidden');
    wheelIcon.src = '';
    wheelIcon.alt = '';
    wheel.style.animation = 'none';
}
