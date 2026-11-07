# Leaguebois Relay Test

Deze kleine **proefaddon** controleert of WoW Forever een door een addon verzonden guildbericht doorzet naar het officieel gekoppelde Discord-kanaal. De addon zelf maakt geen internetverbinding en vereist geen pc-programma. Hij verzamelt geen charactergegevens en verstuurt alleen een bericht wanneer de speler een testcommando uitvoert.

1. Pak de zip uit in `World of Warcraft/_forever_/Interface/AddOns/`. Controleer dat `AddOns/LeagueboisRelayTest/LeagueboisRelayTest.toc` bestaat.
2. Start WoW volledig opnieuw en schakel de addon in op het personageselectiescherm.
3. Controleer dat je personage in een guild zit, dat die guild door een bevoegde leider met een Discord-kanaal is gekoppeld en dat je eigen Battle.net-account met Discord is verbonden.
4. Verstuur eerst zelf een gewoon guildbericht en controleer dat het in Discord verschijnt.
5. Typ `/lbtest direct`. Controleer zowel guildchat als Discord op één bericht met `[LEAGUEBOIS-TEST] direct`.
6. Typ `/lbtest auto`. De addon probeert na vijf seconden één bericht met `[LEAGUEBOIS-TEST] automatisch` te verzenden. Controleer opnieuw beide plekken. De vertraging test of een addon een bericht kan sturen zonder een extra handeling op het moment van verzenden.

Beide testberichten zijn normale guildchat en dus zichtbaar voor guildleden en mogelijk in het gekoppelde Discord-kanaal. De addon verbergt of verwijdert geen berichten, slaat geen persoonsgegevens op en stuurt niets automatisch tijdens het spelen. Een melding dat een poging is gedaan bewijst geen aflevering: controleer altijd beide kanalen. De proef test alleen game → Discord; of een Discord-bot het bericht kan lezen, moet apart worden getest.

Deze code is lokaal getest met gesimuleerde WoW-functies, maar nog niet in de live WoW Forever-client of met een gekoppelde guild. Beperkingen van Blizzard of Discord kunnen de proef blokkeren. Verwijder de map `LeagueboisRelayTest` om de addon te verwijderen.
