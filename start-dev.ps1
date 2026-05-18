# 万物 - 开发模式启动脚本
Set-Location $PSScriptRoot

node scripts/check-node.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path "node_modules")) {
    Write-Host "正在安装依赖..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "启动万物开发环境..." -ForegroundColor Green
npm run dev
