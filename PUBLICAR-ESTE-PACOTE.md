# AnimeDragon v10.0.0 — enviar este pacote

O ZIP desta entrega contém o projeto **diretamente na raiz**: ao extrair, você deve encontrar `package.json`, `package-lock.json`, `worker.js` e `wrangler.toml` junto às pastas `web/`, `server/`, `db/`, `tests/` e `scripts/`.

## Atualizar o GitHub

1. Extraia o ZIP. Abra a raiz do seu repositório.
2. Copie os arquivos extraídos para essa raiz, substituindo os arquivos correspondentes. Envie o código; não envie somente o ZIP.
3. Confirme que `wrangler.toml` e `package.json` ficaram na raiz, sem uma pasta `AnimeDragon2/AnimeDragon2` ou outro nível adicional.
4. Preserve o ID D1 e os Secrets do site existente. Não recrie seu banco nem troque `AUTH_SECRET` para atualizar esta versão.
5. Faça commit e confira a validação do GitHub. Use o commit novo na publicação Cloudflare.

A pasta `.github/` faz parte da entrega. Arquivos locais e credenciais estão cobertos por `.gitignore`: não envie `.dev.vars`, `.env`, `.local/`, `.wrangler/` ou `node_modules/`.

## Configurar o build

No **Workers Builds**, use:

| Campo | Valor |
| --- | --- |
| Root directory | `/` |
| Build command | `npm run build && npm test` |
| Deploy command | `npx wrangler deploy` |
| Node.js | `24` |
| Worker | `anime-dragon` |
| Binding D1 | `DB` |

Se a configuração anterior apontava para `AnimeDragon2`, altere o diretório raiz para `/` para este pacote. Confirme que o nome do Worker coincide com `name` de `wrangler.toml`. As instruções antigas v9 são históricas.

Para primeira instalação, crie um D1 na sua conta e substitua o ID de banco no Wrangler. Para atualização, preserve o banco atual. O guia [PUBLICAR-CLOUDFLARE.md](PUBLICAR-CLOUDFLARE.md) explica os dois casos e a configuração dos Secrets.

## Conferir a entrega

```bash
npm ci
npm run build
npm test
npm run preview
```

A prévia sem chave TMDB é uma demonstração identificada, com catálogo ilustrativo e banco SQLite local. Produção precisa do Secret `TMDB_API_KEY` para catálogo real. Vídeos dependem de fontes separadas; o ZIP não contém episódios.

Depois de publicar, `/api/health` deve responder com `version: "10.0.0"`. Confira o catálogo com sua chave, cadastro/login, biblioteca, comentários e uma reprodução real. O health não testa banco ou serviços externos.

## Prontidão técnica

- Worker, arquivos estáticos e D1 mantêm a arquitetura existente.
- O índice `anime_reactions_by_anime` permite somar as reações de um anime sem varrer todas as reações. Ele é criado de forma idempotente no arquivo SQL e na inicialização, mantendo os dados existentes.
- Os testes de migração do índice verificam reaplicação, preservação dos registros, resultados das reações e o plano de consulta indexado.
- O CI em Linux instala pelo lockfile, verifica build e executa todos os testes; não faz deploy nem depende de credenciais de produção.
- Configurações locais têm um exemplo sem credenciais em `.dev.vars.example`.

Validação local em 4 de outubro de 2026: **103 testes passaram em 16 arquivos**, incluindo busca, abas acessíveis, menu, coleção, catálogo, autenticação, banco e player. A sintaxe de 24 arquivos JavaScript foi conferida e o Worker foi empacotado pelo esbuild. No ambiente restrito, cada arquivo foi executado com `node --test --test-isolation=none`; o CI usa o runner normal do Node no Linux. A execução completa do Wrangler foi impedida pelo bloqueio local de subprocessos. O workflow remoto e o deploy ainda precisam executar na sua conta. Veja [docs/VALIDACAO-v10.md](docs/VALIDACAO-v10.md).

Nenhuma publicação remota ou alteração de segredos é feita pela preparação do pacote. O plano Free está sujeito às cotas descritas no [README](README.md) e no guia Cloudflare; streaming HLS pelo Worker consome requisições por segmento.
