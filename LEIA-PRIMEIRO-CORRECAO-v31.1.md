# AnimeDragon 31.1 — Correção da integração com DragonGIF

Este pacote remove o Service Binding `DRAGONGIF`, que exige que o Worker chamado `dragongif-api` esteja na **mesma conta Cloudflare** do Worker `site`. Seus subdomínios workers.dev parecem pertencer a contas diferentes.

A integração agora usa `DRAGONGIF_PUBLIC_URL = "https://dragongif-api.jhonjhszgame2003.workers.dev"` por HTTPS, sem mexer no banco D1, no servidor DragonGIF ou nas mídias já publicadas.

## Publicar

1. Extraia o ZIP. Abra o PowerShell **na pasta que contém `wrangler.toml`**.
2. Rode `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\SUBIR-GITHUB.ps1"`.
3. Confira o log do GitHub Actions **Validar AnimeDragon** e o log de build do Worker **site** no Cloudflare.
4. Após deploy com sucesso, visite `https://site.anime-dragon.workers.dev/api/health` (deve retornar versão `31.1.0`) e `https://site.anime-dragon.workers.dev/api/dragongif/status` (deve retornar números de mídias).

## Validação e diagnóstico

`npm run check` e testes da integração são verificáveis localmente com Node 22+. `npm test` exige `npm ci` concluir antes, inclusive a instalação da biblioteca `linkedom`.

O print anterior mostra apenas a conclusão com código 1 do GitHub Actions; para diagnosticar alguma falha restante, é necessário clicar em **Actions > validate > etapa vermelha** e copiar as últimas 30 linhas. Uma falha do CI não deve ser ocultada nem ignorada.

Esta versão **não** aumenta cotas do Cloudflare ou direitos de uso de GIFs.
