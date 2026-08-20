@echo off
rem Double-click launcher for Windows.
rem
rem Downloaded on its own, this fetches the released code into a folder of its
rem own and runs it: no npm account, no git, nothing to install but Node.
rem Sitting in a clone, it runs the code next to it instead, so the same file
rem serves someone trying Cairn and someone changing it.
rem
rem This file is deliberately pure ASCII. cmd.exe re-reads a batch file as it
rem executes, so switching the code page below while a multi-byte character
rem waits further down desynchronises its parser and it starts running the
rem comments as commands.

setlocal
title Cairn

rem A console opened by double-clicking still defaults to a legacy code page,
rem which turns every box-drawing character into unreadable noise.
chcp 65001 >nul 2>nul

cd /d "%~dp0"

rem Windows Terminal handles 24-bit colour; Node cannot detect that on its own.
set COLORTERM=truecolor

set "RELEASE=https://github.com/veax-project/claude-cairn/releases/download/v1.0.0-beta.1/cairn.zip"
set "CAIRN_HOME=%LOCALAPPDATA%\Cairn"

where node >nul 2>nul
if errorlevel 1 goto noNode

if exist "%~dp0src\cli.js" (
  node "%~dp0src\cli.js" %*
  goto done
)

if not exist "%CAIRN_HOME%\src\cli.js" (
  call :download
  if errorlevel 1 goto noDownload
)

node "%CAIRN_HOME%\src\cli.js" %*
goto done


:download
echo.
echo   Fetching Cairn...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "try {" ^
  "  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "  $zip = Join-Path $env:TEMP 'cairn-download.zip';" ^
  "  Invoke-WebRequest -Uri '%RELEASE%' -OutFile $zip -UseBasicParsing;" ^
  "  if (Test-Path '%CAIRN_HOME%') { Remove-Item '%CAIRN_HOME%' -Recurse -Force }" ^
  "  Expand-Archive -Path $zip -DestinationPath '%CAIRN_HOME%' -Force;" ^
  "  Remove-Item $zip -Force" ^
  "} catch { Write-Host ('  ' + $_.Exception.Message); exit 1 }"
exit /b %errorlevel%


:noNode
echo.
echo   Cairn needs Node.js, and it is not installed on this computer.
echo.
echo   Get it from   https://nodejs.org
echo   Choose the version marked LTS, install it, then run this file again.
echo.
pause
exit /b 1


:noDownload
echo.
echo   Could not download Cairn.
echo.
echo   Check that you are online. If a company network blocks the download,
echo   fetch the code by hand instead:
echo   https://github.com/veax-project/claude-cairn
echo.
pause
exit /b 1


:done
rem On success the window closes, which is what someone who just pressed q
rem expects. On failure it stays open: a window that vanishes before the error
rem can be read is the whole reason this file exists.
if errorlevel 1 (
  echo.
  echo   Cairn stopped with an error. The message above says why.
  echo.
  pause
)
endlocal
