# AnimeDragon v12.4.4

Projeto AnimeDragon para Cloudflare Workers + Static Assets + D1.

## O que esta versão inclui

- catálogo/Home com foco em títulos recentes e temporada atual;
- proteção para impedir animes antigos de dominarem os blocos principais;
- player com autoplay, failover de fontes e renovação de URLs assinadas expiradas;
- suporte a recursos Stremio `series` e `anime`;
- integração com FenixFlix via `STREMIO_MANIFEST_URL`;
- histórico real do navegador para Voltar/Avançar;
- retorno à aba sem reconstruir a página automaticamente;
- contas, biblioteca, progresso e comentários no D1;
- suíte de testes e workflow de validação no GitHub Actions.

## Requisitos

- Node.js 22.13+ (Node 24 recomendado)
- npm
- Cloudflare Workers
- D1 configurado no `wrangler.toml`

## Instalar e validar

```bash
npm ci
npm run check
npm test
```

## Desenvolvimento local

```bash
npm run dev
```

## Deploy manual

```bash
npx wrangler deploy
```

## Cloudflare Builds

Use na raiz do repositório:

- Build command: `npm run build && npm test`
- Deploy command: `npx wrangler deploy`
- Branch de produção: `main`
- Diretório raiz: `/`

O Worker precisa manter o binding `DB` para o D1 e a variável `STREMIO_MANIFEST_URL` configurada para o manifesto do provedor usado pelo projeto.

## Estrutura principal

- `worker.js` — entrada do Worker
- `server/` — API, catálogo, autenticação, D1, provedores e relay HLS
- `web/` — interface do AnimeDragon
- `tests/` — testes automatizados
- `db/` — schema do D1
- `.github/workflows/` — validação no GitHub Actions

## Versão

`12.4.4`


## Player alternativo v12.4.4

O player tenta reprodução nativa, Hls.js e, quando necessário, Shaka Player 5.2.12 como fallback para HLS e DASH. Fontes bloqueadas por HTTP/CORS continuam sendo rejeitadas; o fallback serve para ampliar compatibilidade de formato e engine.
