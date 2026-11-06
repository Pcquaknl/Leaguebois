# Leaguebois WoW Forever

De statische pagina staat in `wow/` en kan door GitHub Pages worden gepubliceerd. De personages staan op één plek in `characters.json`: voeg daar een object met een unieke `id`, `name`, `region`, `ruleset` en openbare `armoryUrl` toe. De bron ondersteunt momenteel de opgegeven EU/Normal-profielen. De URL moet naar `armorywowforever.com/c/forever/eu/normal/` verwijzen en de naam moet met het ontvangen profiel overeenkomen.

De workflow `.github/workflows/wow-sync.yml` haalt ongeveer elke 15 minuten profielen op (GitHub kan geplande runs vertragen of na langdurige inactiviteit uitschakelen). Ook kan een beheerder de workflow handmatig starten. Er zijn geen Blizzard-sleutels nodig. De gegevens komen uit een onafhankelijke, ongedocumenteerde Armory-dienst; zij kan haar API, beschikbaarheid of informatie aanpassen. Blizzard biedt met deze koppeling geen garantie op real-time gegevens.

De workflow schrijft momentopnames naar de aparte branch `wow-live-data`. Laat deze branch door de workflow beheren. De pagina leest bij elk bezoek de nieuwste beschikbare JSON rechtstreeks van GitHub, omdat commits door `GITHUB_TOKEN` zelf geen GitHub Pages-build starten. Indien die branch niet bereikbaar is, toont de pagina de meegeleverde opname en geeft bij verouderde data een melding. Gegevens worden per profiel gevalideerd; bij een storing blijft de laatst ontvangen opname beschikbaar. Historische waarden worden bewaard bij veranderingen en ten minste per dag wanneer de Armory nieuwere brongegevens levert. Dit is geen garantie op volledigheid of op exacte speeltijden; alleen waargenomen veranderingen worden getoond.

De repository en de gegevensbranch zijn openbaar. Publiceer hier geen secrets, persoonlijke toegangstokens of niet-openbare gegevens. De oorspronkelijke demo is strikt gescheiden van de echte gegevens. Dungeon- en raidstatussen blijven onbekend totdat een betrouwbare bron ze ondersteunt.

Lokaal controleren: `node --test wow/scripts/sync.test.mjs`. Publiceer de bestanden met de root als GitHub Pages-bron. De synchronisatieworkflow heeft schrijfrechten voor repository-inhoud nodig.
