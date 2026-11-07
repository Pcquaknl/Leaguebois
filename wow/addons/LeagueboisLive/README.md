# Leaguebois Live addon — proefversie

Pak de zip uit in `World of Warcraft/_forever_/Interface/AddOns/`, zodat `AddOns/LeagueboisLive/LeagueboisLive.toc` bestaat. Herstart WoW en schakel de addon in. Gebruik eerst de aparte Relay Test addon om de officiële guildchat–Discord-brug te testen.

De addon staat standaard **uit**. Typ `/lb on` om per personage toestemming te geven voor zichtbare guildchatberichten met de eigen naam, level, klasse en leesbare beroepen. De addon probeert een update na inloggen en bij veranderingen te versturen; berichten worden gebundeld en ten minste 30 seconden uit elkaar gehouden. `/lb sync` probeert één extra update; `/lb off` stopt nieuwe berichten. `/lb` toont de status. De instelling wordt per personage door WoW bewaard.

Berichten zijn normale guildchat en dus zichtbaar voor de hele guild en het gekoppelde Discord-kanaal. De addon heeft geen netwerktoegang, bewaart geen Discord-token en heeft geen pc-programma nodig. Een geslaagde verzendpoging bewijst niet dat het bericht door de game, Discord-bot of website is ontvangen. De bijbehorende online dienst moet afzonderlijk zijn ingesteld; zonder die dienst blijft de website op de Armory werken.

De code is lokaal met gesimuleerde WoW-functies getest, niet in een live WoW Forever-guild. WoW kan skillgegevens tijdens combat of andere situaties verbergen of het automatisch verzenden blokkeren. Verwijder de map `LeagueboisLive` om de addon te verwijderen.
