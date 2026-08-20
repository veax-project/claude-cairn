@echo off
rem Double-click launcher for Windows.
rem
rem Downloaded on its own, this fetches and runs the published beta. Sitting in
rem a clone, it runs the code next to it instead, so the same file works for
rem someone trying Cairn and for someone changing it.

title Cairn
setlocal
cd /d "%~dp0"

rem Windows Terminal handles 24-bit colour; Node cannot detect that on its own.
set COLORTERM=truecolor

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Cairn needs Node.js, and it is not installed on this computer.
  echo.
  echo   Get it from   https://nodejs.org
  echo   Pick the version marked LTS, install it, then run this file again.
  echo.
  pause
  exit /b 1
)

if exist "src\cli.js" (
  node src\cli.js %*
) else (
  npx --yes claude-cairn@beta %*
)

if errorlevel 1 pause
endlocal
