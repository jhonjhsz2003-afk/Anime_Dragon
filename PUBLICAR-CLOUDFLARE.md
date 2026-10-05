# Publicar AnimeDragon v11.0.0 no Cloudflare

Este pacote usa **Workers + Static Assets + D1**. O `wrangler.toml` está diretamente na raiz do repositório. O caminho de build é `/`; não configure `AnimeDragon2` para esta entrega.

## 1. Enviar o código ao GitHub

Extraia o ZIP e envie todos os arquivos da raiz, incluindo `web/`, `server/`, `db/`, `tests/`, `scripts/`, `.github/`, `package.json`, `package-lock.json` e `wrangler.toml`. Envie `.dev.vars.example`, mas mantenha `.dev.vars`, arquivos `.env`, `node_modules/`, `.local/` e `.wrangler/` fora do repositório.

No terminal, antes do commit:

```bash
npm ci
npm run build
npm test
```

O workflow do GitHub confere esses mesmos passos. Ele valida o código; não executa deploy.

## 2. Conectar um Worker ao repositório

No Cloudflare, abra Workers & Pages, crie ou selecione o Worker e conecte o repositório GitHub usando Workers Builds. Para atualização, mantenha o Worker já existente.

| Configuração | Valor |
| --- | --- |
| Root directory | `/` (raiz do repositório) |
| Build command | `npm run build && npm test` |
| Deploy command | `npx wrangler deploy` |
| Nome | `anime-dragon`, igual ao `name` no Wrangler |
| Node.js | `24` |

Configure `NODE_VERSION=24` nas variáveis do ambiente de build se necessário. O diretório de arquivos estáticos já está definido como `./web` no Wrangler; não é preciso criar uma segunda publicação no Pages.

## 3. Conectar o D1

### Atualização de banco existente

Preserve o `database_id` atual no `wrangler.toml` e confirme que ele pertence à sua conta Cloudflare. Mantenha o binding `DB` e os segredos já configurados. Não apague nem recrie o banco. A inicialização adiciona tabelas e índices de forma idempotente e mantém os registros existentes.

### Primeira instalação em outra conta

Crie um D1 chamado `animedragon-db` na sua conta. Pelo terminal autenticado, o comando é:

```bash
npx wrangler d1 create animedragon-db
```

Copie o ID retornado para `database_id` em `wrangler.toml`; mantenha `binding = "DB"`. O ID incluído no pacote é da configuração anterior e não concede acesso a esse banco em outra conta.

O aplicativo cria seu schema na primeira chamada de contas/comunidade. Em um banco novo, você também pode inicializá-lo explicitamente depois de configurar o ID correto:

```bash
npm run db:remote
```

Esse comando acessa o D1 remoto: confira a conta e o ID antes de executá-lo. Para testar em um D1 local, use `npm run db:local`.

## 4. Configurar Secrets

Em Settings → Variables and Secrets do Worker, use o tipo **Secret** para credenciais:

| Nome | Uso |
| --- | --- |
| `TMDB_API_KEY` | Chave ou token de leitura da TMDB para catálogo real; obrigatório em produção |
| `AUTH_SECRET` | Opcional em instalação nova; preserve o valor anterior em uma instalação existente |
| `AIOMETADATA_MANIFEST_URL` | Opcional, somente se você tiver um manifesto próprio configurado |

O aplicativo gera uma chave de instalação aleatória no D1 quando não há `AUTH_SECRET`. Não adicione um novo segredo a um banco que já recebe contas sem seguir uma migração de senhas. Não substitua, remova ou publique o valor de um segredo existente.

Os manifestos de vídeo existentes foram preservados. Se usar um endereço pessoal que contenha token, configure a variável correspondente como Secret. `.dev.vars.example` contém somente exemplos vazios e URLs reservadas; copiar esse arquivo não configura produção.

## 5. Publicar e conferir

Faça commit no branch conectado e aguarde o build do commit novo. A alternativa pelo terminal autenticado é:

```bash
npx wrangler login
npm run deploy
```

Após a publicação:

1. Abra a URL do Worker e `/api/health`: a versão deve ser `11.0.0`.
2. Confira catálogo, capas, busca e detalhes com sua chave TMDB configurada.
3. Crie uma conta de teste, saia, entre novamente e confirme a persistência da biblioteca após recarregar.
4. Confira comentários, avatar e progresso de episódios.
5. Teste um episódio com uma fonte real disponível e compatível no navegador. O catálogo sozinho não fornece o vídeo.
6. Confira a tela em computador e celular e os logs do Worker e métricas do D1.

`/api/health` confirma que o código responde; não valida a chave TMDB, banco ou provedores externos. O endereço `workers.dev` é gratuito; um domínio próprio é opcional e deve ser configurado separadamente.

## Resolver problemas

- **Catálogo indisponível:** confira `TMDB_API_KEY`, seu tipo Secret, validade e o ambiente em que está configurado.
- **Contas não funcionam:** confira o binding `DB`, ID do D1, conta proprietária e logs. Um banco apenas local não atende produção.
- **Detalhes carregam, vídeo não:** confira a fonte do episódio, HTTPS, CORS, formato e disponibilidade do provedor. A aplicação não inclui vídeos nem transcodificação.
- **Senha antiga deixou de funcionar:** confirme que `AUTH_SECRET` não foi alterado; restaurar o valor anterior é necessário para os hashes anteriores.
- **Arquivos antigos após deploy:** confira o commit usado no build e recarregue com Ctrl+F5.
- **Cota Free atingida:** confira as métricas; Worker e D1 têm limites diários. Não é necessário ativar um plano pago para usar este pacote dentro das cotas.

## Free e documentação oficial

O Free inclui 100.000 requisições de Worker por dia e 10 ms de CPU por execução. Arquivos estáticos têm requisições gratuitas e ilimitadas. D1 inclui 5 milhões de linhas lidas e 100.000 escritas por dia, 500 MB por banco e 5 GB somados na conta. Builds inclui 3.000 minutos por mês e um build simultâneo. Consultado em 4 de outubro de 2026.

Cada segmento HLS que passa por `/api/video` usa uma requisição do Worker. Com segmentos de 6 segundos, uma hora gera aproximadamente 600 chamadas, além de outras APIs. Avatares enviados usam armazenamento D1. Monitore as cotas conforme o público aumentar.

- [Workers Builds e configuração](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Bindings D1](https://developers.cloudflare.com/d1/get-started/)
- [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers: preço e cotas](https://developers.cloudflare.com/workers/platform/pricing/)
- [Static Assets: preço e limitações](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [D1: preços](https://developers.cloudflare.com/d1/platform/pricing/) e [limites](https://developers.cloudflare.com/d1/platform/limits/)
- [Builds: limites](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
