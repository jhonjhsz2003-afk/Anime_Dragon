# AnimeDragon v31 conectado ao DragonGIF v3.0

Este pacote ja contem em `wrangler.toml` o endereco `https://dragongif-api.jhonjhszgame2003.workers.dev` sem Service Binding, consultando a API HTTPS publica.

## Antes da publicacao

1. Abra estes enderecos no navegador para verificar que as midias realmente existem:
   - https://dragongif-api.jhonjhszgame2003.workers.dev/api/v1/health
   - https://dragongif-api.jhonjhszgame2003.workers.dev/api/v1/stats
   - https://dragongif-api.jhonjhszgame2003.workers.dev/api/v1/media?type=gifs&q=anime
   - https://dragongif-api.jhonjhszgame2003.workers.dev/api/v1/media?type=stickers&q=anime
2. Confirme que `https://dragongif-api.jhonjhszgame2003.workers.dev/api/v1/health` retorna ok. As contas Cloudflare podem ser diferentes, pois agora nao usamos Service Binding.

## Publicar AnimeDragon

Abra o PowerShell na pasta AnimeDragon extraida e execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1
```

Este script copia a versao completa para https://github.com/jhonjhsz2003-afk/Anime_Dragon e substitui os arquivos do repositorio, preservando historico e sem --force. Confirme que esta na pasta completa e que nenhum segredo sera enviado. O GitHub nao publica automaticamente no Cloudflare se a integracao estiver desligada.

## Apos publicar

- Teste `https://site.anime-dragon.workers.dev/api/dragongif/status`.
- Teste `https://site.anime-dragon.workers.dev/api/dragongif/search?q=anime&type=gifs&page=1&limit=12`.
- Teste `https://site.anime-dragon.workers.dev/api/dragongif/search?q=anime&type=stickers&page=1&limit=12`.
- Entre no AnimeDragon, abra `#gifs` e Perfil > Personalizar > Stickers.
- O D1 do AnimeDragon existente eh mantido. NAO substitua o `database_id` de `animedragon-db`.

Se a pesquisa ainda falhar, copie a resposta JSON do endpoint `/api/dragongif/status` e o erro do deploy.

Use no acervo compartilhado somente midias que voce tem permissao para hospedar e exibir publicamente.
