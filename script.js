// Lijst met beschikbare rollen en hun kleuren (voor segmenten)
const roles = [
    { name: 'Top', color: '#ff0000' },
    { name: 'Jungle', color: '#00ff00' },
    { name: 'Mid', color: '#0000ff' },
    { name: 'ADC', color: '#ffff00' },
    { name: 'Support', color: '#ff00ff' }
];

// Variabelen voor spelstaat
let players = [];
let currentPlayerIndex = 0;
let availableRoles = [...roles]; // Kopie van rollen
let assignments = {}; // Toewijzingen: speler -> role

// Elementen ophalen
const playerInputs = document.querySelectorAll('input[type="text"]');
const startBtn = document.getElementById('start-btn');
const playerInputDiv = document.getElementById('player-input');
const gameDiv = document.getElementById('game');
const wheel = document.getElementById('wheel');
const currentPlayerP = document.getElementById('current-player');
const resultsDiv = document.getElementById('results');
const resetBtn = document.getElementById('reset-btn');

// Voeg labels toe aan segmenten
roles.forEach((role, index) => {
    const label = document.createElement('div');
    label.classList.add('segment-label');
    label.textContent = role.name;
    label.style.setProperty('--rotate', `${index * 72 + 36}deg`); // Midden van segment
    wheel.appendChild(label);
});

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
    
    // Reset wheel rotatie
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    
    // Willekeurige role kiezen
    const roleIndex = Math.floor(Math.random() * availableRoles.length);
    const chosenRole = availableRoles[roleIndex];
    
    // Bereken rotatie: Elke segment 72deg, spin 5-10 volle rondes + offset naar gekozen segment
    const segmentAngle = 360 / roles.length;
    const chosenAngle = roleIndex * segmentAngle + (segmentAngle / 2); // Midden van segment, maar invert voor pijl
    const spinRounds = Math.floor(Math.random() * 5) + 5; // 5-10 rondes
    const totalRotation = (spinRounds * 360) + (360 - chosenAngle); // Invert omdat pijl vast is
    
    // Start spin
    setTimeout(() => {
        wheel.style.transition = 'transform 4s ease-out'; // Spin duur
        wheel.style.transform = `rotate(-${totalRotation}deg)`;
    }, 100);
    
    // Wacht op einde spin
    setTimeout(() => {
        // Toewijzing opslaan
        assignments[player] = chosenRole.name;
        
        // Verwijder gekozen role
        availableRoles.splice(roleIndex, 1);
        
        // Volgende speler
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        
        // Als alle spelers gedaan, toon resultaten
        if (availableRoles.length === roles.length - players.length) {
            showResults();
        } else {
            // Wacht 2 seconden en ga naar volgende
            setTimeout(spinWheelForCurrentPlayer, 2000);
        }
    }, 4100); // Spin duur + buffer
}

// Functie om resultaten te tonen
function showResults() {
    wheel.parentElement.classList.add('hidden'); // Verberg wheel container
    currentPlayerP.classList.add('hidden');
    
    resultsDiv.innerHTML = '<h2>Resultaten:</h2>';
    players.forEach(player => {
        resultsDiv.innerHTML += `<p>${player}: ${assignments[player]}</p>`;
    });
    
    resetBtn.classList.remove('hidden');
}

// Functie om te resetten
function resetGame() {
    // Reset variabelen
    players = [];
    currentPlayerIndex = 0;
    availableRoles = [...roles];
    assignments = {};
    
    // UI reset (namen blijven behouden)
    playerInputDiv.classList.remove('hidden');
    gameDiv.classList.add('hidden');
    wheel.parentElement.classList.remove('hidden');
    currentPlayerP.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    resetBtn.classList.add('hidden');
    wheel.style.transform = 'rotate(0deg)';
}
