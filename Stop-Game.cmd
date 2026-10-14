@echo off
setlocal
chcp 65001 >nul
title 久留美模拟器 - Stop Local Game
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-Game.ps1"
set "GAME_EXIT=%ERRORLEVEL%"
if not defined YENFX_NO_PAUSE pause
exit /b %GAME_EXIT%
