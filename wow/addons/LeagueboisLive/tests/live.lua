local log, sent, tasks = {}, {}, {}
local clock, guild, skill = 100, true, 42
local realprint = print
print = function(message) log[#log + 1] = message end
SlashCmdList = {}
GetTime = function() return clock end
GetUnitName = function() return "Sylvex Stormcoast" end
UnitFullName = function() return "Sylvex", "Stormcoast" end
UnitLevel = function() return 12 end
UnitClass = function() return "Rogue", "ROGUE" end
GetProfessions = function() return 1, 2, nil, nil, nil, nil end
GetProfessionInfo = function(index)
    if index == 1 then return "Mining", 0, skill, 75 end
    return "Blacksmithing", 0, 18, 75
end
IsInGuild = function() return guild end
SendChatMessage = function(message, channel) sent[#sent + 1] = {message, channel} end
C_Timer = {After = function(delay, fn) tasks[#tasks + 1] = {delay, fn} end}
local frame = {RegisterEvent = function() end, SetScript = function(_, _, fn) frameHandler = fn end}
CreateFrame = function() return frame end
dofile((arg and arg[1]) or "addon/LeagueboisLive/LeagueboisLive.lua")
local cmd = assert(SlashCmdList.LEAGUEBOISLIVE)
frameHandler(nil, "PLAYER_LOGIN")
assert(#tasks == 0 and #sent == 0)
cmd("on")
assert(#tasks == 1 and #sent == 0)
local task = table.remove(tasks, 1); assert(task[1] == 5); task[2]()
assert(#sent == 1 and sent[1][2] == "GUILD")
assert(sent[1][1] == "[LB1]|Sylvex%20Stormcoast|12|ROGUE|1|Mining~42~75;Blacksmithing~18~75")
frameHandler(nil, "SKILL_LINES_CHANGED")
task = table.remove(tasks, 1); assert(task[1] == 30); clock = 130; task[2]()
assert(#sent == 1, "unchanged skills must not create duplicate messages")
skill = 43
frameHandler(nil, "SKILL_LINES_CHANGED")
task = table.remove(tasks, 1); clock = 135; task[2]()
assert(#sent == 2 and sent[2][1]:find("Mining~43~75", 1, true))
cmd("sync"); assert(#tasks == 1)
cmd("off"); task = table.remove(tasks, 1); task[2]()
assert(#sent == 2, "turning off must cancel pending sends")
guild = false
cmd("on"); task = table.remove(tasks, 1); task[2]()
assert(#sent == 2, "no guild must not send")
realprint("Leaguebois Live addon checks passed")
