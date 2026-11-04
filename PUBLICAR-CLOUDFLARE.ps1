# Publicacao manual do Worker "site" quando a Cloudflare falha ao clonar o GitHub.
# Nao apaga banco D1 nem altera o nome do Worker.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

foreach ($comando in @('node', 'npm', 'npx')) {
    if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
        throw "Comando ausente: $comando. Instale Node.js 22 ou superior e abra o PowerShell novamente."
    }
}
if (-not (Test-Path -LiteralPath './wrangler.toml')) {
    throw 'Execute este arquivo dentro do projeto AnimeDragon extraido do ZIP.'
}
if (-not (Select-String -Path './wrangler.toml' -Pattern '^\s*name\s*=\s*"site"\s*$' -Quiet)) {
    throw 'Publicacao interrompida: o wrangler.toml nao aponta para o Worker site.'
}
if ((Get-Content -LiteralPath './wrangler.toml' -Raw) -match 'SEUSUBDOMINIO') { throw 'Edite DRAGONGIF_PUBLIC_URL com a URL real do DragonGIF antes de publicar.' }
Write-Host 'Instalando dependencias...' -ForegroundColor Cyan
& npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou. Verifique a internet e tente novamente.' }
Write-Host 'Midias agora sao servidas pelo DragonGIF via R2; sem upload de GIFs neste site.' -ForegroundColor Cyan
Write-Host 'Conferindo sintaxe...' -ForegroundColor Cyan
& npm run check
if ($LASTEXITCODE -ne 0) { throw 'A checagem de sintaxe falhou; deploy cancelado.' }
Write-Host 'Executando a suite completa de testes...' -ForegroundColor Cyan
& npm test
if ($LASTEXITCODE -ne 0) { throw 'Ha testes falhando; deploy cancelado para proteger o site publicado.' }
Write-Host 'Verificando acesso a conta Cloudflare...' -ForegroundColor Cyan
& npx --no-install wrangler whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Conecte sua conta Cloudflare na janela que sera aberta...' -ForegroundColor Yellow
    & npx --no-install wrangler login
    if ($LASTEXITCODE -ne 0) { throw 'Login Cloudflare nao concluido.' }
}
Write-Host 'Publicando no Worker site sem depender do clone GitHub...' -ForegroundColor Cyan
& npx --no-install wrangler deploy
if ($LASTEXITCODE -ne 0) { throw 'Cloudflare nao concluiu o deploy. Confira a mensagem acima.' }
Write-Host 'Deploy solicitado com sucesso. Verifique /api/health no endereco de producao.' -ForegroundColor Green
