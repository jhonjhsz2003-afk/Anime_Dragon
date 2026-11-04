
$ErrorActionPreference = "Stop"

# Repositório oficial
$repo = "https://github.com/jhonjhsz2003-afk/Anime_Dragon.git"

# Pasta atual do projeto atualizado
$source = $PSScriptRoot

# Verificar arquivos principais
if (!(Test-Path "$source/package.json") -or
    !(Test-Path "$source/worker.js")) {
    throw "Pasta do AnimeDragon não encontrada. Execute dentro da pasta do projeto."
}

# Criar pasta temporária
$temp = Join-Path $env:TEMP "AnimeDragon-StreamBetter-Publish"

if (Test-Path $temp) {
    Remove-Item $temp -Recurse -Force
}

Write-Host "Clonando repositório..." -ForegroundColor Cyan

git clone --branch main $repo $temp

if ($LASTEXITCODE -ne 0) {
    throw "Erro ao clonar o repositório."
}

# Limpar arquivos antigos, preservando .git
Get-ChildItem $temp -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force

Write-Host "Copiando novo AnimeDragon..." -ForegroundColor Cyan

# Copiar projeto atualizado sem arquivos secretos
robocopy $source $temp /E /R:2 /W:1 `
    /XD .git node_modules .wrangler .local coverage `
    /XF ".env" ".env.*" ".dev.vars" ".dev.vars.*" `
    "*.pem" "*.key" "*.p12" "*.pfx" "*.zip"

if ($LASTEXITCODE -ge 8) {
    throw "Erro ao copiar os arquivos."
}

Set-Location $temp

Write-Host "Preparando publicação..." -ForegroundColor Cyan

git add -A

git commit -m "Atualiza AnimeDragon para player StreamBetter"

if ($LASTEXITCODE -ne 0) {
    throw "Erro no commit. Verifique se existem alterações."
}

Write-Host "Enviando para GitHub..." -ForegroundColor Cyan

git push origin main

if ($LASTEXITCODE -ne 0) {
    throw "Erro no envio para GitHub."
}

Write-Host "PUBLICADO COM SUCESSO!" -ForegroundColor Green
Write-Host $repo

Set-Location $source
