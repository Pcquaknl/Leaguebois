// Updated match-history.js
const apiKey = 'RGAPI-595f14a5-b125-4180-85e6-80d8cb5aee65'; // Vervang dit door je eigen Riot API key (haal er een op https://developer.riotgames.com/)

const players = [
    { gameName: 'CZ7', tagLine: '007' },
    { gameName: 'Hoekuhnees', tagLine: 'EUW' },
    { gameName: 'Kipknots', tagLine: 'EUW' },
    { gameName: 'Principlenl', tagLine: '1994' }
    // Voeg hier makkelijk nieuwe spelers toe, bijv. { gameName: 'Nieuw', tagLine: 'TAG' }
];

const playersList = document.getElementById('players-list');
const matchHistoryDiv = document.getElementById('match-history');

async function getLatestVersion() {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await res.json();
    return versions[0];
}

async function getSummonerData(gameName, tagLine) {
    const accountUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${apiKey}`;
    const accountRes = await fetch(accountUrl);
    if (!accountRes.ok) throw new Error('Account niet gevonden');
    const account = await accountRes.json();
    const puuid = account.puuid;

    const summonerUrl = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${apiKey}`;
    const summonerRes = await fetch(summonerUrl);
    if (!summonerRes.ok) throw new Error('Summoner niet gevonden');
    const summoner = await summonerRes.json();
    const iconId = summoner.profileIconId;

    const version = await getLatestVersion();
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;

    return { puuid, iconUrl, fullName: `${gameName}#${tagLine}` };
}

async function getMatchHistory(puuid) {
    const version = await getLatestVersion();
    const matchesUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20&api_key=${apiKey}`; // Uitgebreid naar 20 matches voor streaks
    const matchesRes = await fetch(matchesUrl);
    if (!matchesRes.ok) throw new Error('Geen matches gevonden');
    const matchIds = await matchesRes.json();

    const matches = [];
    for (let id of matchIds) {
        const matchUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${apiKey}`;
        const matchRes = await fetch(matchUrl);
        if (!matchRes.ok) continue;
        const match = await matchRes.json();
        const participant = match.info.participants.find(p => p.puuid === puuid);
        if (participant) {
            const championIcon = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${participant.championName}.png`;
            const date = new Date(match.info.gameStartTimestamp).toLocaleString('nl-NL');
            matches.push({
                win: participant.win ? 'Win' : 'Loss',
                champion: participant.championName,
                championIcon,
                kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
                date
            });
        }
    }
    return matches;
}

function calculateStreaks(history) {
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    history.forEach(match => {
        if (match.win === 'Win') {
            currentWinStreak++;
            currentLossStreak = 0;
            if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
        } else {
            currentLossStreak++;
            currentWinStreak = 0;
            if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
        }
    });

    return { maxWinStreak, maxLossStreak };
}

function displayPlayers() {
    players.forEach(async (player) => {
        try {
            const data = await getSummonerData(player.gameName, player.tagLine);
            const div = document.createElement('div');
            div.classList.add('player-icon');
            div.innerHTML = `
                <img src="${data.iconUrl}" alt="${data.fullName}">
                <p>${data.fullName}</p>
            `;
            div.addEventListener('click', async () => {
                try {
                    const history = await getMatchHistory(data.puuid);
                    const { maxWinStreak, maxLossStreak } = calculateStreaks(history);

                    matchHistoryDiv.innerHTML = `
                        <div class="streaks-left">
                            <h3>Langste Win Streak</h3>
                            <p>${maxWinStreak}</p>
                        </div>
                        <div class="matches-center">
                            <h2>Match History voor ${data.fullName}</h2>
                            ${history.map((match, index) => `
                                <div class="match-item">
                                    <h3>Match ${index + 1}: <img src="${match.championIcon}" alt="${match.champion}" width="30" style="vertical-align: middle;"> ${match.champion} - ${match.win}</h3>
                                    <p>KDA: ${match.kda}</p>
                                    <p>Datum en tijd: ${match.date}</p>
                                </div>
                            `).join('')}
                        </div>
                        <div class="streaks-right">
                            <h3>Langste Loss Streak</h3>
                            <p>${maxLossStreak}</p>
                        </div>
                    `;
                    matchHistoryDiv.classList.remove('hidden');
                } catch (error) {
                    alert('Fout bij ophalen match history: ' + error.message);
                }
            });
            playersList.appendChild(div);
        } catch (error) {
            console.error('Fout bij ophalen summoner data voor ' + player.gameName);
        }
    });
}

displayPlayers();

