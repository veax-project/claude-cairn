@echo off
rem Double-click launcher for Windows.
title Cairn
rem Windows Terminal handles 24-bit colour; Node cannot detect it on its own.
set COLORTERM=truecolor
cd /d "%~dp0"
node src\cli.js %*
if errorlevel 1 pause
