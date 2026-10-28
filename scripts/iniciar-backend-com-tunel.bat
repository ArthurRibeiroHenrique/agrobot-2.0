@echo off
rem Abre duas janelas: o backend e o túnel do ngrok, que deixa o backend acessível pelo APK.
start "AgroBot - backend" cmd /k "cd /d "%~dp0..\backend" && npm run dev"
start "AgroBot - tunel ngrok" cmd /k "cd /d "%~dp0..\backend" && npm run tunnel"
