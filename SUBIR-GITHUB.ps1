$ErrorActionPreference='Stop'
$source=$PSScriptRoot
$repo='https://github.com/jhonjhsz2003-afk/Anime_Dragon.git'
$stage=Join-Path $env:TEMP ('AnimeDragon-v31-'+[guid]::NewGuid().ToString('N'))
foreach($item in @('worker.js','wrangler.toml','package.json','web','server')) {if(-not(Test-Path (Join-Path $source $item))){throw "Abra a pasta raiz AnimeDragon: ausente $item"}}
if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git nao instalado.'}
Write-Host 'Atualizando AnimeDragon no GitHub; R2 armazena as midias pesadas.' -ForegroundColor Cyan
try {
 & git clone --branch main --single-branch $repo $stage
 if($LASTEXITCODE -ne 0){throw 'Falha no git clone.'}
 Get-ChildItem -LiteralPath $stage -Force | Where-Object {$_.Name -ne '.git'} | Remove-Item -Recurse -Force
 $gifDir=Join-Path $source 'web\assets\profile-media\GIFs'
 $stickDir=Join-Path $source 'web\assets\profile-media\Stickers'
 & robocopy $source $stage /E /R:1 /W:1 /XD .git node_modules .wrangler coverage test-results $gifDir $stickDir /XF '.env' '.env.*' '.dev.vars' '.dev.vars.*' '*.pem' '*.key' '*.zip' 'rclone.conf' /NFL /NDL /NJH /NJS /NP
 if($LASTEXITCODE -ge 8){throw 'Falha no robocopy.'}
 $ignored=@(git -C $stage status --porcelain)
 Write-Host ('Arquivos alterados: '+$ignored.Count) -ForegroundColor Cyan
 & git -C $stage add -A
 if($LASTEXITCODE -ne 0){throw 'Falha no git add.'}
 & git -C $stage diff --cached --quiet
 if($LASTEXITCODE -eq 0){Write-Host 'Repositorio atualizado.' -ForegroundColor Green;return}
 & git -C $stage commit -m 'AnimeDragon'
 if($LASTEXITCODE -ne 0){throw 'Falha no commit. Configure user.name e user.email.'}
 & git -C $stage push origin main
 if($LASTEXITCODE -ne 0){throw 'Falha no push. Verifique login e protecoes de branch.'}
 Write-Host 'Projeto AnimeDragon atualizado no GitHub.' -ForegroundColor Green
}finally{if(Test-Path $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue}}
