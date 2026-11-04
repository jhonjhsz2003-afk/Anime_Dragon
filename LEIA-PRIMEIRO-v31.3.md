# AnimeDragon v31.3 — DragonGIF via navegador

**Mudança principal:** busca e estatísticas consultam `https://dragongif-api.jhonjhszgame2003.workers.dev` diretamente no navegador, não por uma chamada Worker→Worker. As imagens são carregadas pelo domínio DragonGIF (sem arquivo duplicado no AnimeDragon).

## Implantação

1. Extraia este ZIP completo. Não misture com arquivos de versões anteriores.
2. No PowerShell dentro da pasta: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.
3. Espere deploy Cloudflare e abra `/api/health`, confirme `31.3.0`.
4. Abra AnimeDragon e teste a galeria, escolha avatar, salve stickers (máximo 4) e veja um perfil público em aba anônima.

## Diagnóstico

`/api/dragongif/status` e `/api/dragongif/search` agora redirecionam para a API pública (o navegador acessa a API diretamente). A galeria também usa a API direta e exige `Access-Control-Allow-Origin` correto (o DragonGIF está configurado com `ALLOWED_ORIGINS=https://site.anime-dragon.workers.dev`). Se os links mostrarem conteúdo mas a página não mostrar resultados, examine erros CORS no Console.

URL real do DragonGIF: `https://dragongif-api.jhonjhszgame2003.workers.dev`

URLs antigas `/api/dragongif/file/dg_...` ainda podem aparecer nas contas antigas; o navegador tenta resolvê-las pela API pública. Seleções novas ficam armazenadas como URLs completas dos arquivos sob o domínio DragonGIF. A checagem do lado do servidor garante que não seja inserido URL de outro domínio, nem GIF na posição de sticker.

**Limitações:** testes locais com respostas simuladas não comprovam o Cloudflare de produção; o deploy precisa ser testado no navegador real. O conteúdo do DragonGIF deve ser conteúdo que você tenha autorização para hospedar.

## Diagnóstico no navegador

Depois do deploy, abra **https://site.anime-dragon.workers.dev/dragon-status.html**. O relatório testa a versão AnimeDragon, CORS do DragonGIF, contagem do catálogo e exibição de uma mídia. Se houver erro, envie o texto da etapa com falha.

## Problema corrigido na v31.3

O arquivo de cabeçalhos `web/_headers` bloqueava as conexões por `Content-Security-Policy: connect-src 'self'`. Mesmo mudando `server/media-policy.js`, o Cloudflare pode servir assets sem executar o Worker, então os dois arquivos precisavam autorizar a URL DragonGIF.
