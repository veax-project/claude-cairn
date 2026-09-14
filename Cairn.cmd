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

rem The "latest" alias always redirects to the newest release, so cutting one
rem does not mean editing this file, or the four READMEs, and forgetting one.
set "RELEASE=https://github.com/veax-project/claude-cairn/releases/latest/download/cairn.zip"
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
rem The archive is unpacked to one side and then the directory that actually
rem holds src\cli.js is moved into place. Zip tools disagree about whether to
rem include a top-level folder, and guessing wrong leaves a launcher that
rem downloads correctly and then cannot find what it downloaded.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "try {" ^
  "  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "  $tmp = Join-Path $env:TEMP ('cairn-' + [Guid]::NewGuid().ToString('N'));" ^
  "  $zip = $tmp + '.zip';" ^
  "  Invoke-WebRequest -Uri '%RELEASE%' -OutFile $zip -UseBasicParsing;" ^
  "  Expand-Archive -Path $zip -DestinationPath $tmp -Force;" ^
  "  $entry = Get-ChildItem -Path $tmp -Recurse -Filter 'cli.js' | Where-Object { $_.Directory.Name -eq 'src' } | Select-Object -First 1;" ^
  "  if (-not $entry) { throw 'the downloaded archive does not contain src/cli.js' }" ^
  "  $root = $entry.Directory.Parent.FullName;" ^
  "  if (Test-Path '%CAIRN_HOME%') { Remove-Item '%CAIRN_HOME%' -Recurse -Force }" ^
  "  New-Item -ItemType Directory -Path '%CAIRN_HOME%' -Force | Out-Null;" ^
  "  Copy-Item -Path (Join-Path $root '*') -Destination '%CAIRN_HOME%' -Recurse -Force;" ^
  "  Remove-Item $zip, $tmp -Recurse -Force" ^
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
