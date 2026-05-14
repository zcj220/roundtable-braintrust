@echo off
setlocal
set "ROOT=%~dp0"
echo [开发模式] 启动服务器（项目根目录），端口 4173，含搜索代理...
start "Roundtable Dev Server" powershell -NoLogo -ExecutionPolicy Bypass -File "%ROOT%launcher\serve-static.ps1" -Root "%ROOT%" -Port 4173
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/prototype-ui/"
endlocal
