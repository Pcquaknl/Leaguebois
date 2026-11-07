-- One-message guild bridge test. No data is sent unless the player runs a command.
local prefix = "|cffd6b56b[Leaguebois test]|r "
local pending = false

local function say(message)
    print(prefix .. message)
end

local function inGuild()
    if IsInGuild() then return true end
    say("Je personage zit niet in een guild; er is niets verstuurd.")
    return false
end

local function sendTest(kind)
    if not inGuild() then return end
    local sender = SendChatMessage or (C_ChatInfo and C_ChatInfo.SendChatMessage)
    if type(sender) ~= "function" then
        say("Chat verzenden is niet beschikbaar in deze client.")
        return
    end
    local ok = pcall(sender, "[LEAGUEBOIS-TEST] " .. kind, "GUILD")
    if ok then
        say("Verzendpoging gedaan. Controleer de guildchat en het gekoppelde Discord-kanaal.")
    else
        say("De verzendpoging is door de game geweigerd of niet beschikbaar.")
    end
end

SLASH_LEAGUEBOISRELAYTEST1 = "/lbtest"
SlashCmdList.LEAGUEBOISRELAYTEST = function(message)
    local option = string.lower((message or ""):match("^%s*(.-)%s*$"))
    if option == "direct" then
        if pending then say("Wacht op de lopende automatische test."); return end
        say("Deze test plaatst nu een zichtbaar bericht in je guildchat.")
        sendTest("direct")
    elseif option == "auto" then
        if pending then say("Er loopt al een automatische test."); return end
        if not inGuild() then return end
        if not C_Timer or type(C_Timer.After) ~= "function" then
            say("De timer is niet beschikbaar in deze client.")
            return
        end
        pending = true
        say("Over 5 seconden probeert de addon één zichtbaar bericht in je guildchat te plaatsen.")
        C_Timer.After(5, function()
            pending = false
            sendTest("automatisch")
        end)
    else
        say("/lbtest direct - verstuur één zichtbaar guildbericht via deze opdracht.")
        say("/lbtest auto - probeer één guildbericht na 5 seconden, zonder extra handeling.")
        say("Berichten zijn zichtbaar voor je guild en mogelijk voor het gekoppelde Discord-kanaal.")
    end
end
