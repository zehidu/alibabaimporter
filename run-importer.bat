@echo off
setlocal

set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

node import-alibaba.js

pause
