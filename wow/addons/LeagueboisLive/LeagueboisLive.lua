-- Leaguebois Live: opt-in guildchat relay for WoW Forever.
-- No external connections, no background desktop app and no automatic gameplay.
local PREFIX = "|cffd6b56b[Leaguebois]|r "
local WIRE = "[LB1]"
local MAX_WIRE_BYTES = 240
local MIN_SECONDS = 30
local lastAttempt = nil
local lastPayload = nil
local scheduled = false
local forcePending = false

local function notice(message)
    print(PREFIX .. message)
end

local function readable(value)
    if type(issecretvalue) == "function" and issecretvalue(value) then return false end
    return true
end

local function encode(value)
    return (value:gsub("([^A-Za-z0-9._-])", function(char)
        return string.format("%%%02X", string.byte(char))
    end))
end

local function characterName()
    if type(GetUnitName) == "function" then
        local ok, name = pcall(GetUnitName, "player", false)
        if ok and readable(name) and type(name) == "string" and name:find(" ", 1, true) then return name end
    end
    if type(UnitFullName) ~= "function" then return nil end
    local ok, first, surname = pcall(UnitFullName, "player")
    if not ok or not readable(first) or type(first) ~= "string" or first == "" then return nil end
    if readable(surname) and type(surname) == "string" and surname ~= "" and not first:find(" ", 1, true) then
        return first .. " " .. surname
    end
    return first
end

-- Returns up to six current profession skills and whether the scan was complete.
local function professions()
    local skills = {}
    if type(GetProfessions) ~= "function" or type(GetProfessionInfo) ~= "function" then return skills, false end
    local ok, p1, p2, p3, p4, p5, p6 = pcall(GetProfessions)
    if not ok then return skills, false end
    local indices = {p1, p2, p3, p4, p5, p6}
    local complete = true
    for i = 1, 6 do
        local index = indices[i]
        if not readable(index) then
            complete = false
        elseif index ~= nil then
            if type(index) ~= "number" then
                complete = false
            else
                local success, name, _, rank, cap = pcall(GetProfessionInfo, index)
                if success and readable(name) and readable(rank) and type(name) == "string"
                    and name ~= "" and type(rank) == "number" and rank >= 0 and rank <= 1000 then
                    local capText = "-"
                    if readable(cap) and type(cap) == "number" and cap >= 1 and cap <= 1000 then
                        capText = tostring(math.floor(cap))
                    end
                    skills[#skills + 1] = encode(name) .. "~" .. tostring(math.floor(rank)) .. "~" .. capText
                else
                    complete = false
                end
            end
        end
    end
    return skills, complete
end

local function makePayload()
    local name = characterName()
    local level = type(UnitLevel) == "function" and UnitLevel("player") or nil
    local class = nil
    if type(UnitClass) == "function" then
        local _, value = UnitClass("player")
        class = value
    end
    if not readable(name) or not readable(level) or not readable(class)
        or type(name) ~= "string" or name == "" or type(level) ~= "number"
        or level < 1 or level > 60 or type(class) ~= "string" then return nil end
    local skills, complete = professions()
    local head = WIRE .. "|" .. encode(name) .. "|" .. tostring(math.floor(level)) .. "|" .. class .. "|"
    local selected = {}
    for i = 1, #skills do
        selected[#selected + 1] = skills[i]
        if #head + 2 + #table.concat(selected, ";") > MAX_WIRE_BYTES then
            selected[#selected] = nil
            complete = false
            break
        end
    end
    return head .. (complete and "1" or "0") .. "|" .. table.concat(selected, ";")
end

local function enabled()
    return type(LeagueboisLiveDB) == "table" and LeagueboisLiveDB.enabled == true
end

local function trySend()
    scheduled = false
    if not enabled() then return end
    if type(IsInGuild) ~= "function" or not IsInGuild() then
        notice("Geen guild gevonden; er is niets verstuurd.")
        return
    end
    local success, payload = pcall(makePayload)
    if not success or not payload then
        notice("Level of beroep is nu niet leesbaar; probeer later /lb sync.")
        return
    end
    if payload == lastPayload and not forcePending then return end
    local sender = SendChatMessage or (C_ChatInfo and C_ChatInfo.SendChatMessage)
    if type(sender) ~= "function" then
        notice("Guildchat versturen is niet beschikbaar in deze client.")
        return
    end
    local ok = pcall(sender, payload, "GUILD")
    if ok then
        lastAttempt = GetTime()
        lastPayload = payload
        forcePending = false
        notice("Update geprobeerd in guildchat. Aflevering via Discord is niet bevestigd.")
    else
        notice("WoW weigerde de verzendpoging; de website is niet bijgewerkt.")
    end
end

local function queue(force)
    if not enabled() or type(C_Timer) ~= "table" or type(C_Timer.After) ~= "function" then return end
    if force then forcePending = true end
    if scheduled then return end
    local delay = 5
    if lastAttempt then delay = math.max(delay, MIN_SECONDS - (GetTime() - lastAttempt)) end
    scheduled = true
    C_Timer.After(delay, trySend)
end

SLASH_LEAGUEBOISLIVE1 = "/leaguebois"
SLASH_LEAGUEBOISLIVE2 = "/lb"
SlashCmdList.LEAGUEBOISLIVE = function(input)
    local command = string.lower((input or ""):match("^%s*(.-)%s*$"))
    if command == "on" then
        LeagueboisLiveDB = LeagueboisLiveDB or {}
        LeagueboisLiveDB.enabled = true
        notice("Aan. Level en beroepen gaan als zichtbare berichten naar de guildchat. /lb off schakelt dit uit.")
        queue(true)
    elseif command == "off" then
        LeagueboisLiveDB = LeagueboisLiveDB or {}
        LeagueboisLiveDB.enabled = false
        forcePending = false
        notice("Uit. Er worden geen nieuwe updates verstuurd.")
    elseif command == "sync" then
        if enabled() then queue(true) else notice("Eerst /lb on. Updates zijn zichtbaar in je guildchat.") end
    else
        notice("Status: " .. (enabled() and "aan" or "uit"))
        notice("/lb on, /lb off, /lb sync. De proefversie verzendt alleen naar gewone guildchat.")
    end
end

local frame = CreateFrame("Frame")
frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("PLAYER_LEVEL_UP")
frame:RegisterEvent("SKILL_LINES_CHANGED")
frame:RegisterEvent("TRADE_SKILL_SHOW")
frame:SetScript("OnEvent", function(_, event)
    if event == "PLAYER_LOGIN" or event == "PLAYER_LEVEL_UP" or event == "SKILL_LINES_CHANGED" or event == "TRADE_SKILL_SHOW" then
        queue(false)
    end
end)
