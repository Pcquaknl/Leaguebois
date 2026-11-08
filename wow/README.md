# Leaguebois WoW Forever

De statische pagina staat in `wow/` en kan door GitHub Pages worden gepubliceerd. De personages staan op één plek in `characters.json`: voeg daar een object met een unieke `id`, `name`, `region`, `ruleset` en openbare `armoryUrl` toe. De bron ondersteunt momenteel de opgegeven EU/Normal-profielen. De URL moet naar `armorywowforever.com/c/forever/eu/normal/` verwijzen en de naam moet met het ontvangen profiel overeenkomen.

De workflow `.github/workflows/wow-sync.yml` haalt ongeveer elke 15 minuten profielen op (GitHub kan geplande runs vertragen, overslaan of na langdurige inactiviteit uitschakelen). Ook kan een beheerder de workflow handmatig starten. Er zijn geen Blizzard-sleutels nodig. De gegevens komen uit een onafhankelijke, ongedocumenteerde Armory-dienst; zij kan haar API, beschikbaarheid of informatie aanpassen. Blizzard biedt met deze koppeling geen garantie op real-time gegevens.

De workflow schrijft momentopnames naar de aparte branch `wow-live-data`. Laat deze branch door de workflow beheren. De pagina leest bij elk bezoek de beschikbare JSON rechtstreeks van GitHub, omdat commits door `GITHUB_TOKEN` zelf geen GitHub Pages-build starten. Als een ontvangen kopie verouderd lijkt, controleert de pagina via de publieke GitHub-API of er een nieuwere opname is. Dat werkt binnen de limieten van die API; bij een fout blijft de laatst bekende opname zichtbaar. Een bezoek start zelf geen nieuwe Armory-synchronisatie. Zijn de laatste broncontrole of alle beschikbare profielgegevens langer dan 90 minuten oud, dan meldt de pagina dit. Gegevens worden per profiel gevalideerd; bij een storing blijft de laatst ontvangen opname beschikbaar. Historische waarden worden bewaard bij veranderingen en ten minste per dag wanneer de Armory nieuwere brongegevens levert. Dit is geen garantie op volledigheid of op exacte speeltijden; alleen waargenomen veranderingen worden getoond.

De repository en de gegevensbranch zijn openbaar. Publiceer hier geen secrets, persoonlijke toegangstokens of niet-openbare gegevens. De oorspronkelijke demo is strikt gescheiden van de echte gegevens. Dungeon- en raidstatussen blijven onbekend totdat een betrouwbare bron ze ondersteunt.

Lokaal controleren: `node --test wow/scripts/*.test.mjs`. Publiceer de bestanden met de root als GitHub Pages-bron. De synchronisatieworkflow heeft schrijfrechten voor repository-inhoud nodig.

## Ranglijst, bezoeken en mijlpalen

De ranglijst voor vandaag en de afgelopen zeven dagen telt alleen levelstijgingen die tussen beschikbare bronmetingen zijn waargenomen. Een streepje betekent dat er onvoldoende gegevens zijn voor een vergelijking. De bron kan pas na uitloggen bijgewerkte levels tonen; een controle elke 15 minuten garandeert daarom geen actuele ingame-stand of vaste vertraging.

‘Sinds je vorige bezoek’ vergelijkt de laatste beschikbare levels, uitrusting en bekende beroepen met de status die op hetzelfde apparaat in de browser is opgeslagen. Een eerste bezoek toont recente waargenomen groepsactiviteit; bij een later bezoek verschijnen persoonlijke verschillen. Demo- en onbereikbare profielen overschrijven deze opgeslagen livegegevens niet. Door browseropslag te wissen verdwijnt de persoonlijke vergelijking.

De workflow bewaart waargenomen levelgrenzen en voor het eerst vastgelegde Rare- en Epic-items blijvend in `wow-live-data`. De datum duidt aan wanneer de bron of tracker de toestand zag en is niet noodzakelijk het moment waarop deze in de game is bereikt. Een eerder behaalde mijlpaal die de tracker niet kan aantonen wordt niet verzonnen.

## Iteminformatie en 3D

Op de personagepagina opent hoveren, toetsenbordfocus of aantikken een tooltip. De eigenschappen worden pas opgevraagd bij gebruik via de publieke WoW Forever-tooltip-API van Warcraft DB. Als die bron niet reageert, blijft de naam uit de Armory zichtbaar. Bij een afwijkende itemnaam geeft de tooltip aan dat willekeurige bonussen kunnen afwijken. Beschikbare itemlevels, betoveringen en edelstenen worden uit de Armory meegenomen. De demo vraagt geen echte itemgegevens op.

Het onderdeel 3D laadt pas na openen een ingesloten personagepagina van Armory WoW Forever. De Armory verzorgt zelf het model; de weergave is afhankelijk van de externe site, de beschikbare personagegegevens en WebGL in de browser. Een link naar het volledige profiel blijft beschikbaar. Wij hebben geen beheer over de weergave of beschikbaarheid van de externe viewer.



## Optionele live-addon en Discord

Er staat een proefversie van de addon in `addons/LeagueboisLive/` en van de online Discord- en API-dienst in `server/`. De addon staat standaard uit en verstuurt optioneel level en bekende beroepen via zichtbare guildchat. De dienst bewaart gemeten veranderingen en kan die op Discord en de site tonen. Installeer op de pc's alleen de addon; de Discord-dienst draait op een eigen online server.

De WoW–Discord-guildchat, automatische addonberichten en bottoegang moeten eerst in een echte guild worden getest. De dienst vereist configuratie, een Discord-app, een token als servergeheim en blijvende opslag. `live-config.json` is standaard leeg: de gepubliceerde pagina blijft de bestaande Armory gebruiken tot een beheerder een werkende HTTPS-API instelt. Zie `server/README.md` voor installatie, beveiliging en beperkingen.

## Discord-meldingen zonder WoW-guild

De bestaande Armory-synchronisatie kan optioneel via een Discord-webhook berichten plaatsen wanneer twee opgeslagen profielen een hoger level of een nieuw Rare/Epic/Legendary-item in dezelfde uitrustingspositie tonen. De meldingscode ondersteunt ook beroepsstijgingen zodra een betrouwbare gegevensbron deze standen levert. De huidige Armory-import bevat **geen** beroepsstanden; die verschijnen dus nog niet. Een eerste stand of een ontbrekend profiel wordt niet als vooruitgang gepresenteerd. GitHub Actions wordt gepland om de 15 minuten, maar kan later of helemaal niet starten en de Armory kan zelf pas na uitloggen een nieuwere stand tonen. Er is voor deze route geen guild, addon, afzonderlijke bot of pc-programma nodig. Een webhook ondersteunt alleen berichten, geen slashcommando's.

1. Maak in het gewenste Discord-kanaal onder **Kanaal bewerken → Integraties → Webhooks** een webhook. Beheerrechten voor webhooks zijn nodig.
2. Sla de webhook-URL uitsluitend op als GitHub Actions repository secret met de naam `WOW_DISCORD_WEBHOOK_URL`: repository → **Settings → Secrets and variables → Actions → New repository secret**. De URL bevat een geheim en hoort niet in chat, bestanden, commits of de website.
3. Start optioneel in **Actions → WoW Forever Armory synchronisatie → Run workflow** een controle. Er worden alleen nieuwe waargenomen verschillen sinds de vorige opname gemeld; de eerste bekende stand levert geen meldingen op.

Zonder secret zijn de meldingen uitgeschakeld en blijft de website normaal werken. Mislukte berichten blijven in `wow-live-data` als wachtrij staan voor een volgende controle. Bij een storing tussen Discord-verzending en het wegschrijven van de bevestiging kan een melding dubbel verschijnen. De data en wachtrij bevatten alleen de openbare voortgang, nooit de webhook-URL. Kijk voor de huidige bronstatus in de workflow; een wachtende of vertraagde GitHub-run biedt geen tijdsgarantie.

