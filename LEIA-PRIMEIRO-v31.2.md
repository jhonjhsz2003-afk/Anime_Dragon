# AnimeDragon v31.2 — Correção Worker→DragonGIF

## O que foi corrigido

O site AnimeDragon 31.1 respondia /api/health, porém /api/dragongif/status e /api/dragongif/search retornavam 503.

A configuração em `wrangler.toml` passou a incluir `compatibility_flags = ["global_fetch_strictly_public"]`. A documentação do Cloudflare explica que `fetch()` entre Workers pode exigir Service Bindings **ou** essa compatibilidade. Usar a URL pública é necessário neste projeto porque o DragonGIF pode estar em outra conta Cloudflare.

O backend agora retorna mensagens de diagnóstico mais úteis em caso de erro de rede ou resposta HTTP não JSON. Isso é uma correção da causa mais provável, **não prova** que a conexão real funcionará antes de implantar.

## Publicação

1. Extraia o ZIP, entre na pasta `AnimeDragon_v31_2_Conexao_DragonGIF_Corrigida` e execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.
2. Espere o build no Cloudflare ficar verde. Se falhar, copie as últimas linhas do log.
3. Confirme `/api/health` com `version: 31.2.0`.
4. Confira `/api/dragongif/status`; se estiver OK, teste `/api/dragongif/search?q=anime&type=gifs&page=1&limit=12`.
5. Se continuar com erro, envie o JSON do status + log do Worker AnimeDragon (Cloudflare > Workers & Pages > site > Logs). Verifique também se o DragonGIF responde `/api/v1/stats`.

## Dados

O D1 original do AnimeDragon é preservado. Nada do DragonGIF precisa ser enviado ao GitHub do AnimeDragon, e não há mudança de senhas, banco nem perfil.

Fonte: https://developers.cloudflare.com/workers/runtime-apis/fetch/

Use apenas mídias para as quais você tenha autorização de hospedagem e distribuição.

## Verificações locais

- `npm run check`: aprovado.
- 20 testes direcionados: passaram.
- Suíte completa: 162 de 168 passaram; 6 arquivos de teste não puderam carregar `linkedom` porque a dependência não está disponível neste ambiente. Nenhuma conexão ao Cloudflare de produção foi executada.
