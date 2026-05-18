@echo off
chcp 65001 >nul
cd /d "%~dp0"

node scripts\check-node.mjs
if errorlevel 1 exit /b 1

if not exist "node_modules\" (
    echo 正在安装依赖...
    call npm install
    if errorlevel 1 exit /b 1
)

echo 启动万物开发环境...
call npm run dev
