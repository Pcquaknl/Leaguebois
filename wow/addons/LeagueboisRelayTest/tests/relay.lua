local log, sent, timer = {}, {}, nil
local guild = false
local realprint = print
print = function(message) log[#log+1] = message end
SlashCmdList = {}
IsInGuild = function() return guild end
SendChatMessage = function(message, channel) sent[#sent+1] = {message, channel} end
C_Timer = {After = function(seconds, callback) assert(seconds == 5); timer = callback end}
dofile("LeagueboisRelayTest/LeagueboisRelayTest.lua")
local command = assert(SlashCmdList.LEAGUEBOISRELAYTEST)
command("")
assert(#sent == 0)
command("direct")
assert(#sent == 0)
guild = true
command("direct")
assert(#sent == 1 and sent[1][1] == "[LEAGUEBOIS-TEST] direct" and sent[1][2] == "GUILD")
command("auto")
assert(#sent == 1 and type(timer) == "function")
command("auto")
assert(#sent == 1)
timer()
assert(#sent == 2 and sent[2][1] == "[LEAGUEBOIS-TEST] automatisch" and sent[2][2] == "GUILD")
SendChatMessage = function() error("blocked") end
assert(pcall(command, "direct"))
realprint("Relay test: all simulated checks passed")
