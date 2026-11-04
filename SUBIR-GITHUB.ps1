```powershell
$ErrorActionPreference = "Stop"

# ==========================================
# ANIME_DRAGON - PUBLICAR NO GITHUB
# ==========================================

$Owner  = "jhonjhsz2003-afk"
$Repo   = "Anime_Dragon"
$Branch = "main"

$Folder = Join-Path $env:USERPROFILE "Downloads\Anime_Dragon"
$Api = "https://api.github.com/repos/$Owner/$Repo"

$Token = $null
$SecureToken = $null
$Ptr = [IntPtr]::Zero
$Headers = $null

Write-Host ""
Write-Host "===================================="
Write-Host "     ANIME_DRAGON - GITHUB"
Write-Host "===================================="
Write-Host ""

try {
    # Verificar pasta
    if (!(Test-Path -LiteralPath $Folder)) {
        throw "Pasta nao encontrada: $Folder"
    }

    # Verificar arquivos
    $Files = @(
        Get-ChildItem -LiteralPath $Folder -Recurse -File |
        Where-Object {
            $_.FullName -notmatch '[\\/]\.git[\\/]' -and
            $_.FullName -notmatch '[\\/]node_modules[\\/]' -and
            $_.FullName -notmatch '[\\/]\\.wrangler[\\/]' -and
            $_.FullName -notmatch '[\\/]\\.next[\\/]' -and
            $_.FullName -notmatch '[\\/]dist[\\/]'
        }
    )

    if ($Files.Count -eq 0) {
        throw "Nenhum arquivo encontrado na pasta."
    }

    Write-Host "Pasta encontrada:"
    Write-Host $Folder
    Write-Host ""
    Write-Host "Arquivos encontrados: $($Files.Count)"
    Write-Host ""

    # Solicitar token
    $SecureToken = Read-Host "Cole seu token GitHub" -AsSecureString

    $Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
        $SecureToken
    )

    $Token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
        $Ptr
    )

    # Remover espaços extras
    $Token = $Token.Trim()

    if ([string]::IsNullOrWhiteSpace($Token)) {
        throw "Token vazio."
    }

    # Cabeçalhos
    $Headers = @{
        Authorization = "Bearer $Token"
        Accept = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
        "User-Agent" = "Anime-Dragon-Publisher"
    }

    # Verificar acesso ao repositorio
    Write-Host ""
    Write-Host "Verificando acesso ao GitHub..."

    $Repository = Invoke-RestMethod `
        -Uri $Api `
        -Headers $Headers `
        -Method Get

    Write-Host "Repositorio confirmado: $($Repository.full_name)" `
        -ForegroundColor Green

    # ==========================================
    # VERIFICAR BRANCH
    # ==========================================

    $ParentSHA = $null
    $BaseTree = $null
    $BranchExists = $false

    try {
        $Ref = Invoke-RestMethod `
            -Uri "$Api/git/ref/heads/$Branch" `
            -Headers $Headers `
            -Method Get

        $ParentSHA = $Ref.object.sha
        $BranchExists = $true

        Write-Host "Branch main encontrada."

        $Commit = Invoke-RestMethod `
            -Uri "$Api/git/commits/$ParentSHA" `
            -Headers $Headers `
            -Method Get

        $BaseTree = $Commit.tree.sha
    }
    catch {
        $StatusCode = $null

        if ($_.Exception.Response) {
            try {
                $StatusCode = [int]$_.Exception.Response.StatusCode
            }
            catch {}
        }

        if ($StatusCode -eq 404) {
            Write-Host "Branch main ainda nao existe."
            Write-Host "Preparando primeiro commit..."
        }
        else {
            throw "Erro ao verificar branch: $($_.Exception.Message)"
        }
    }

    # ==========================================
    # CRIAR BLOBS
    # ==========================================

    $TreeItems = @()
    $Updated = 0

    foreach ($File in $Files) {

        $Relative = $File.FullName.Substring(
            $Folder.TrimEnd('\').Length
        ).TrimStart('\','/').Replace('\','/')

        Write-Host "Enviando: $Relative"

        $Bytes = [System.IO.File]::ReadAllBytes(
            $File.FullName
        )

        $Base64 = [Convert]::ToBase64String($Bytes)

        $BlobBody = @{
            content = $Base64
            encoding = "base64"
        } | ConvertTo-Json -Compress

        $Blob = Invoke-RestMethod `
            -Uri "$Api/git/blobs" `
            -Headers $Headers `
            -Method Post `
            -Body $BlobBody `
            -ContentType "application/json"

        $TreeItems += @{
            path = $Relative
            mode = "100644"
            type = "blob"
            sha = $Blob.sha
        }

        $Updated++
    }

    # ==========================================
    # CRIAR ARVORE
    # ==========================================

    Write-Host ""
    Write-Host "Criando arvore de arquivos..."

    $TreeBody = @{
        tree = @($TreeItems)
    }

    if ($BranchExists -and $BaseTree) {
        $TreeBody.base_tree = $BaseTree
    }

    $TreeJson = $TreeBody | ConvertTo-Json -Depth 20 -Compress

    $NewTree = Invoke-RestMethod `
        -Uri "$Api/git/trees" `
        -Headers $Headers `
        -Method Post `
        -Body $TreeJson `
        -ContentType "application/json"

    # ==========================================
    # CRIAR COMMIT
    # ==========================================

    Write-Host "Criando commit..."

    $CommitBody = @{
        message = "Atualizacao Anime Dragon"
        tree = $NewTree.sha
    }

    if ($BranchExists -and $ParentSHA) {
        $CommitBody.parents = @($ParentSHA)
    }
    else {
        $CommitBody.parents = @()
    }

    $CommitJson = $CommitBody | ConvertTo-Json -Depth 10 -Compress

    $NewCommit = Invoke-RestMethod `
        -Uri "$Api/git/commits" `
        -Headers $Headers `
        -Method Post `
        -Body $CommitJson `
        -ContentType "application/json"

    # ==========================================
    # ATUALIZAR OU CRIAR BRANCH
    # ==========================================

    Write-Host "Publicando branch main..."

    $RefBody = @{
        ref = "refs/heads/$Branch"
        sha = $NewCommit.sha
    } | ConvertTo-Json -Compress

    if ($BranchExists) {

        $UpdateBody = @{
            sha = $NewCommit.sha
            force = $false
        } | ConvertTo-Json -Compress

        Invoke-RestMethod `
            -Uri "$Api/git/refs/heads/$Branch" `
            -Headers $Headers `
            -Method Patch `
            -Body $UpdateBody `
            -ContentType "application/json"

    }
    else {

        Invoke-RestMethod `
            -Uri "$Api/git/refs" `
            -Headers $Headers `
            -Method Post `
            -Body $RefBody `
            -ContentType "application/json"
    }

    # ==========================================
    # SUCESSO
    # ==========================================

    Write-Host ""
    Write-Host "===================================="
    Write-Host "       PUBLICADO COM SUCESSO!"
    Write-Host "===================================="
    Write-Host ""
    Write-Host "Repositorio:"
    Write-Host "https://github.com/$Owner/$Repo"
    Write-Host ""
    Write-Host "Arquivos enviados: $Updated"
    Write-Host ""
    Write-Host "Commit:"
    Write-Host $NewCommit.sha
    Write-Host ""

}
catch {

    Write-Host ""
    Write-Host "===================================="
    Write-Host "          ERRO NA PUBLICACAO"
    Write-Host "===================================="
    Write-Host ""

    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Resposta do GitHub:"
        Write-Host $_.ErrorDetails.Message
    }

    Write-Host ""

}
finally {

    if ($Ptr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)
    }

    $Token = $null
    $Headers = $null
    $SecureToken = $null
}

Write-Host ""
Read-Host "Pressione Enter para sair"
```