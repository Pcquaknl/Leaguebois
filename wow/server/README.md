# Leaguebois Live: proefversie

Deze optionele dienst ontvangt gekozen WoW-addonberichten via de **officiële guildchat–Discord-koppeling**, bewaart level en beroepen in SQLite, publiceert een leesbare `/api/live` voor de bestaande site en plaatst bevestigde wijzigingen in een apart Discord-kanaal. Een bestaande Armory-opname wordt ingelezen en oude momentopnames worden behouden. Dit is nog niet getest met een echte WoW Forever-guild of Discord-bridge; automatische addonberichten of bottoegang tot het gekoppelde kanaal kunnen door Blizzard/Discord worden beperkt.

Spelers installeren alleen de optionele addon. De bot en API draaien op een **online server**, niet op de pc's van de spelers. Zonder die server en de handmatige configuratie hieronder blijft de website de bestaande Armory-gegevens gebruiken; realtime of Discordberichten staan dan nog niet aan.

## Eerst de echte brug testen

1. Maak de gezamenlijke WoW-guild. Koppel met een bevoegde guildleider en Discord-beheerder de guildchat aan een Discord-kanaal via Blizzard's Discord-instellingen. Iedere speler die doorgegeven wil worden koppelt zelf diens Battle.net-account aan Discord.
2. Gebruik eerst de aparte **Leaguebois Relay Test** addon: `/lbtest direct` en `/lbtest auto`. Controleer dat de berichten in game én in Discord verschijnen. De automatische test is essentieel; een handmatig bericht bewijst niet dat een vertraagd addonbericht door mag.
3. Maak een Discord-app/bot voor de groep. Installeer die in de server met toegang om het gekoppelde kanaal te lezen, berichtgeschiedenis te lezen en berichten te plaatsen in een **apart, niet aan WoW gekoppeld** kanaal. Voeg `applications.commands` toe en zet voor deze app de `Message Content` intent aan. De bot verwerkt alleen berichten in het opgegeven kanaal die met `[LB1]|` beginnen; testberichten kunnen optioneel enkel voor diagnose worden bekeken.
4. Voor diagnose kan `diagnostics: true` en een lege `bindings`-lijst worden gebruikt. De bot logt dan voor `[LEAGUEBOIS-TEST]` alleen de afzender-ID, eventuele webhook-ID en afzendernaam; er worden geen personagegegevens opgeslagen. Controleer met een echte test hoe de officiële koppeling de identiteit in Discord presenteert. Indien de bot de berichten niet kan lezen of de afzender niet betrouwbaar is te koppelen, stop: configureer geen omweg en gebruik de Armory-terugval.

## Veilig configureren

Kopieer `settings.example.json` buiten de publieke repository naar `settings.json`. Vul de eigen Discord-server-ID, het gekoppelde guildchat-kanaal en een apart meldingenkanaal in. Voeg per personage één `bindings`-regel toe met de juiste `characterId` uit `../characters.json` en de **geverifieerde** Discord-gebruikers-ID van de speler. Alternatief, alleen wanneer de eigen test aantoont dat de officiële bridge een vertrouwde webhook gebruikt: stel `bridgeWebhookId` én de exacte `bridgeUsername` in. Een onbekende afzender, ander kanaal, ander personage of ongeldig pakket wordt geweigerd. Een toegestane gebruiker kan eigen chatinhoud zelf aanpassen; dit is geen fraudebestendige Blizzard-bevestiging.

Bewaar `DISCORD_BOT_TOKEN` uitsluitend als servergeheim. Zet het token, webhookgeheimen en de privé-instellingen nooit in GitHub of in de frontend. De REST-API bevat alleen publieke voortgang, geen botinstellingen of token. De site en API zijn publiek toegankelijk zodra deze worden gepubliceerd; deel alleen wat de groep wil laten zien.

## Starten op een server

Vereist: Node.js 24.17 of nieuwer, internet, HTTPS voor bezoekers en een **blijvend opslagvolume** voor de SQLite-database. Vanuit deze map: `npm ci --omit=dev --ignore-scripts`, stel `DISCORD_BOT_TOKEN`, eventueel `LEAGUEBOIS_CONFIG` en `LEAGUEBOIS_DB` veilig in en start `npm start`. Voor een container is `Dockerfile` aanwezig; bouw met `wow/` als buildcontext, mount `settings.json` op `/run/leaguebois/settings.json` en een blijvend volume op `/data`. Maak regelmatig een back-up van de database; stop de dienst of gebruik een consistente SQLite-back-up, zodat ook WAL-gegevens behouden blijven.

Controleer `/health` en `/api/live`, en stel pas na die controle `wow/live-config.json` in op de HTTPS-URL `https://jouw-host/api/live`. Dit bestand is openbaar en mag geen token bevatten. De site controleert de live-API ongeveer iedere 30 seconden en gebruikt de bestaande Armory-kopie als de dienst niet bereikbaar is. Zonder ingestelde URL blijft de site zoals hij was.

De bot registreert `/stand` en `/beroepen` voor de ingestelde Discord-server. Niveau- en beroepswijzigingen gaan naar het aparte meldingenkanaal. Er worden alleen bestaande berichten verwerkt; herhaalde Discord-bericht-ID's worden niet opnieuw opgenomen. Bij herverbinding worden maximaal de laatste 100 kanaalberichten opnieuw gecontroleerd. De meldingenwachtrij probeert mislukte berichten opnieuw; een storing precies tussen verzenden en opslaan kan uitzonderlijk een dubbele melding geven.

## Grenzen van de proef

`/lb on` in de addon is een uitdrukkelijke keuze per personage. Het bericht met naam, level en bekende beroepsrangen verschijnt in **normale guildchat** en kan zichtbaar zijn voor de guild en het gekoppelde Discord-kanaal. Updates worden alleen bij start of verandering geprobeerd, met minimaal 30 seconden tussen pogingen. De game kan informatie verbergen of berichten tegenhouden, bijvoorbeeld tijdens combat; dan blijft de laatst bekende stand zichtbaar. Aflevering wordt niet door de addon bevestigd. Bij een lege/onvolledige vaardigheidsscan worden oudere beroepen niet automatisch gewist; de site vermeldt wanneer een beroepswaarde voor het laatst werd gezien. Uitrusting blijft voorlopig afkomstig uit de Armory en wordt niet realtime door deze addon verstuurd.
