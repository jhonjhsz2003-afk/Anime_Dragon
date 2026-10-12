# Execute este arquivo na pasta AnimeDragon extraida do ZIP.
# ATENCAO: --force substitui o historico da branch main no GitHub.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path 'package.json')) { throw 'Execute na pasta do projeto AnimeDragon.' }

git init
if ($LASTEXITCODE -ne 0) { throw 'Falha no git init' }
git add -A
if ($LASTEXITCODE -ne 0) { throw 'Falha no git add' }
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m 'AnimeDragon'
    if ($LASTEXITCODE -ne 0) { throw 'Falha no git commit (confira seu user.name/user.email)' }
}
git branch -M main
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar branch main' }
$repo = 'https://github.com/jhonjhsz2003-afk/Anime_Dragon.git'
$remote = @(git remote)
if ($remote -contains 'origin') { git remote set-url origin $repo }
else { git remote add origin $repo }
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar origin' }
git push -u origin main --force
if ($LASTEXITCODE -ne 0) { throw 'Falha no envio ao GitHub' }
Write-Host 'AnimeDragon enviado ao GitHub!' -ForegroundColor Green
