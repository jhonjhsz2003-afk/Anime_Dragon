# AnimeDragon v27 - publica por clone limpo, preservando histórico e evitando git push --force.
$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/jhonjhsz2003-afk/Anime_Dragon.git'
$source = $PSScriptRoot
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("AnimeDragon-Publicacao-" + [guid]::NewGuid().ToString('N'))

if (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) {
    throw 'Execute SUBIR-GITHUB.ps1 de dentro da pasta AnimeDragon extraida do ZIP.'
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git nao encontrado. Instale Git for Windows e abra o PowerShell novamente.'
}

try {
    Write-Host 'Clonando o repositorio atual do GitHub (sem --force)...' -ForegroundColor Cyan
    & git clone --branch main --single-branch $repo $stage
    if ($LASTEXITCODE -ne 0) {
        throw 'Nao foi possivel clonar o GitHub. Verifique a conexao, a URL e o login/permissoes da sua conta GitHub.'
    }
    Write-Host 'Preparando arquivos do AnimeDragon v27...' -ForegroundColor Cyan
    Get-ChildItem -LiteralPath $stage -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
    $ignore = @('.git', 'node_modules', '.wrangler', '.dev.vars', '.env', '.env.local', 'test-results', 'coverage')
    Get-ChildItem -LiteralPath $source -Force | Where-Object { $ignore -notcontains $_.Name } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force }

    & git -C $stage add -A
    if ($LASTEXITCODE -ne 0) { throw 'Falha no git add. Veja as mensagens acima.' }
    & git -C $stage diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'Nenhuma alteracao detectada. O GitHub ja esta atualizado.' -ForegroundColor Green
        return
    }
    if ($LASTEXITCODE -ne 1) { throw 'Falha ao comparar as alteracoes.' }
    $gitName = & git -C $stage config user.name
    $gitEmail = & git -C $stage config user.email
    if (-not $gitName -or -not $gitEmail) {
        throw 'O Git ainda nao tem nome/e-mail. Configure com: git config --global user.name "Seu nome" ; git config --global user.email "seu-email@exemplo.com"'
    }
    & git -C $stage commit -m 'AnimeDragon'
    if ($LASTEXITCODE -ne 0) { throw 'Falha no git commit. Confira seu nome/e-mail do Git.' }
    & git -C $stage push origin main
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha no git push. Se aparecer rejected/non-fast-forward, houve alteracoes simultaneas no GitHub; execute o script novamente. Se aparecer Authentication failed/403, confira o login e as permissoes.'
    }
    Write-Host 'AnimeDragon v27 publicado no GitHub com sucesso!' -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue }
}
