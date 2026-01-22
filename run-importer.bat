@echo off
setlocal

set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

if not exist node_modules (
  echo Installing dependencies...
  npm install
)

npm start

pause
