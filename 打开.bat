@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 双击 index.html 无法运行 Next 静态包，请先安装 Node.js
  pause
  exit /b 1
)
node server.cjs
pause
