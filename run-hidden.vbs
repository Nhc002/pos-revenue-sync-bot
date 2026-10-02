' ===== VBS Wrapper - Chay bot POS an hoan toan (khong mo CMD) =====
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
cmd = """" & scriptDir & "\run-bot.bat"""
WshShell.Run cmd, 0, True
Set WshShell = Nothing