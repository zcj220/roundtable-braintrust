@echo off
setlocal
set "ROOT=%~dp0"
start "Roundtable Braintrust" powershell -NoLogo -ExecutionPolicy Bypass -File "%ROOT%launcher\serve-static.ps1" -Root "%ROOT%dist" -Port 4175
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4175/prototype-ui/index.html"
endlocal