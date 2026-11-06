# Leaguebois WoW Forever

De statische pagina staat in `wow/` en kan door GitHub Pages worden gepubliceerd. De personages staan op één plek in `characters.json`: voeg daar een object met een unieke `id`, `name`, `region`, `ruleset` en openbare `armoryUrl` toe. De bron ondersteunt momenteel de opgegeven EU/Normal-profielen. De URL moet naar `armorywowforever.com/c/forever/eu/normal/` verwijzen en de naam moet met het ontvangen profiel overeenkomen.

De workflow `.github/workflows/wow-sync.yml` haalt ongeveer elke 15 minuten profielen op (GitHub kan geplande runs vertragen of na langdurige inactiviteit uitschakelen). Ook kan een beheerder de workflow handmatig starten. Er zijn geen Blizzard-sleutels nodig. De gegevens komen uit een onafhankelijke, ongedocumenteerde Armory-dienst; zij kan haar API, beschikbaarheid of informatie aanpassen. Blizzard biedt met deze koppeling geen garantie op real-time gegevens.

De workflow schrijft momentopnames naar de aparte branch `wow-live-data`. Laat deze branch door de workflow beheren. De pagina leest bij elk bezoek de nieuwste beschikbare JSON rechtstreeks van GitHub, omdat commits door `GITHUB_TOKEN` zelf geen GitHub Pages-build starten. Indien die branch niet bereikbaar is, toont de pagina de meegeleverde opname en geeft bij verouderde data een melding. Gegevens worden per profiel gevalideerd; bij een storing blijft de laatst ontvangen opname beschikbaar. Historische waarden worden bewaard bij veranderingen en ten minste per dag wanneer de Armory nieuwere brongegevens levert. Dit is geen garantie op volledigheid of op exacte speeltijden; alleen waargenomen veranderingen worden getoond.

De repository en de gegevensbranch zijn openbaar. Publiceer hier geen secrets, persoonlijke toegangstokens of niet-openbare gegevens. De oorspronkelijke demo is strikt gescheiden van de echte gegevens. Dungeon- en raidstatussen blijven onbekend totdat een betrouwbare bron ze ondersteunt.

Lokaal controleren: `node --test wow/scripts/*.test.mjs`. Publiceer de bestanden met de root als GitHub Pages-bron. De synchronisatieworkflow heeft schrijfrechten voor repository-inhoud nodig.

## Ranglijst, bezoeken en mijlpalen

De ranglijst voor vandaag en de afgelopen zeven dagen telt alleen levelstijgingen die tussen beschikbare bronmetingen zijn waargenomen. Een streepje betekent dat er onvoldoende gegevens zijn voor een vergelijking. De bron kan pas na uitloggen bijgewerkte levels tonen; een controle elke 15 minuten garandeert daarom geen actuele ingame-stand of vaste vertraging.

‘Sinds je vorige bezoek’ vergelijkt de laatste beschikbare levels en uitrusting met de status die op hetzelfde apparaat in de browser is opgeslagen. Een eerste bezoek toont recente waargenomen groepsactiviteit; bij een later bezoek verschijnen persoonlijke verschillen. Demo- en onbereikbare profielen overschrijven deze opgeslagen livegegevens niet. Door browseropslag te wissen verdwijnt de persoonlijke vergelijking.

De workflow bewaart waargenomen levelgrenzen en voor het eerst vastgelegde Rare- en Epic-items blijvend in `wow-live-data`. De datum duidt aan wanneer de bron of tracker de toestand zag en is niet noodzakelijk het moment waarop deze in de game is bereikt. Een eerder behaalde mijlpaal die de tracker niet kan aantonen wordt niet verzonnen.

## Iteminformatie en 3D

Op de personagepagina opent hoveren, toetsenbordfocus of aantikken een tooltip. De eigenschappen worden pas opgevraagd bij gebruik via de publieke WoW Forever-tooltip-API van Warcraft DB. Als die bron niet reageert, blijft de naam uit de Armory zichtbaar. Bij een afwijkende itemnaam geeft de tooltip aan dat willekeurige bonussen kunnen afwijken. Beschikbare itemlevels, betoveringen en edelstenen worden uit de Armory meegenomen. De demo vraagt geen echte itemgegevens op.

Het onderdeel 3D laadt pas na openen een ingesloten personagepagina van Armory WoW Forever. De Armory verzorgt zelf het model; de weergave is afhankelijk van de externe site, de beschikbare personagegegevens en WebGL in de browser. Een link naar het volledige profiel blijft beschikbaar. Wij hebben geen beheer over de weergave of beschikbaarheid van de externe viewer.

