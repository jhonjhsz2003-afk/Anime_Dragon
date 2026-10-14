# AnimeDragon v34 - Publicacao no GitHub
# Pode ser executado como .ps1 ou colado no PowerShell aberto na pasta do projeto.
# Nao usar "git push --force": este script preserva o historico do repositorio.
$ErrorActionPreference = 'Stop'

# $PSScriptRoot fica vazio quando o codigo e colado diretamente no terminal.
$baseFolder = if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $PSScriptRoot
} else {
    (Get-Location).Path
}

# Aceita a pasta raiz do projeto ou a pasta onde o ZIP foi extraido.
$candidates = @(
    $baseFolder
    (Join-Path -Path $baseFolder -ChildPath 'AnimeDragon_v34')
    (Join-Path -Path $baseFolder -ChildPath 'AnimeDragon')
)
$required = @('worker.js', 'wrangler.toml', 'package.json', 'web', 'server')
$source = $null
foreach ($folder in $candidates) {
    $valid = $true
    foreach ($item in $required) {
        if (-not (Test-Path -LiteralPath (Join-Path -Path $folder -ChildPath $item))) {
            $valid = $false
            break
        }
    }
    if ($valid) {
        $source = (Resolve-Path -LiteralPath $folder).Path
        break
    }
}

if ([string]::IsNullOrWhiteSpace($source)) {
    throw "Nao encontrei o projeto em '$baseFolder'. Extraia o ZIP, abra a pasta AnimeDragon_v34 (onde existe worker.js) e execute o script novamente."
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git nao instalado. Instale o Git para Windows antes de publicar.'
}
if (-not (Get-Command robocopy -ErrorAction SilentlyContinue)) {
    throw 'Robocopy nao encontrado. Execute este script no Windows.'
}

$repo = 'https://github.com/jhonjhsz2003-afk/Anime_Dragon.git'
$stage = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('AnimeDragon-v34-' + [guid]::NewGuid().ToString('N'))

Write-Host "Pasta encontrada: $source" -ForegroundColor Cyan
Write-Host "Repositorio destino: $repo" -ForegroundColor Cyan
Write-Host 'Publicando AnimeDragon v34 (sem alterar o repositorio separado do DragonGIF)...' -ForegroundColor Cyan

try {
    & git clone --branch main --single-branch $repo $stage
    if ($LASTEXITCODE -ne 0) { throw 'Falha no git clone. Verifique a conexao e o acesso ao repositorio.' }

    # Atualiza o projeto, mantendo o historico Git do repositorio.
    Get-ChildItem -LiteralPath $stage -Force |
        Where-Object { $_.Name -ne '.git' } |
        Remove-Item -Recurse -Force

    # Pastas de stickers/GIFs sao externas; nao enviar arquivos de midia ao GitHub.
    $gifDir = Join-Path -Path $source -ChildPath 'web\assets\profile-media\GIFs'
    $stickDir = Join-Path -Path $source -ChildPath 'web\assets\profile-media\Stickers'
    & robocopy $source $stage /E /R:1 /W:1 /XD .git node_modules .wrangler coverage test-results $gifDir $stickDir /XF '.env' '.env.*' '.dev.vars' '.dev.vars.*' '*.pem' '*.key' '*.zip' '*.p12' '*.pfx' '.npmrc' 'rclone.conf' /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw 'Falha ao copiar arquivos (robocopy).' }

    & git -C $stage add -A
    if ($LASTEXITCODE -ne 0) { throw 'Falha no git add.' }

    & git -C $stage diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'O GitHub ja esta atualizado: nenhum arquivo mudou.' -ForegroundColor Green
    } else {
        & git -C $stage commit -m 'AnimeDragon'
        if ($LASTEXITCODE -ne 0) {
            throw 'Falha no commit. Configure git config --global user.name e user.email.'
        }
        & git -C $stage push origin main
        if ($LASTEXITCODE -ne 0) {
            throw 'Falha no push. Verifique o login no GitHub e a permissao da branch main.'
        }
        Write-Host 'AnimeDragon v34 publicado com sucesso no GitHub!' -ForegroundColor Green
    }
} finally {
    if (Test-Path -LiteralPath $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
}
