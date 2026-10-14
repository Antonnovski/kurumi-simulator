@echo off
setlocal
chcp 65001 >nul
title 久留美模拟器 - Local Launcher
echo 久留美模拟器 - Starting local game...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Game.ps1" %*
set "GAME_EXIT=%ERRORLEVEL%"
echo.
if not "%GAME_EXIT%"=="0" echo START FAILED - Read the error above or .local\startup.log
if "%GAME_EXIT%"=="0" echo The game server is running. Closing this window will NOT stop the game.
if not defined YENFX_NO_PAUSE pause
exit /b %GAME_EXIT%
