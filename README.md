# AnimeDragon · v11.0.0

Site de animes em português para **Cloudflare Workers + Static Assets + D1**, com catálogo, busca, temporadas, player, contas, biblioteca, progresso e comentários.

O pacote entregue coloca `package.json`, `package-lock.json` e `wrangler.toml` diretamente na raiz. Envie os arquivos extraídos para a raiz do repositório GitHub; não envie somente o ZIP nem crie outra pasta dentro da raiz.

## Atualização v11

A sessão permanece conectada por 30 dias e é renovada durante o uso. A página restaura a conta ao abrir e repete a consulta após falhas temporárias, sem salvar senha ou token em localStorage. Sessões já expiradas precisam de um novo login no AnimeDragon.

A página do anime tem fundo amplo, ações centrais e prévias dos episódios. O player usa uma janela preta imersiva com controles sobre o vídeo, menus de fontes/legendas/velocidade, lista recolhível de episódios e acesso aos comentários do episódio. As opções disponíveis dependem das fontes de vídeo configuradas.

Os comentários têm respostas aninhadas recolhíveis, paginação, votos, spoilers, edição, exclusão e denúncia. São comentários da comunidade do AnimeDragon; comentários e contas de outros sites não são importados.

## Começar

Requer Node.js 24 recomendado (mínimo 22.13) e npm.

```bash
npm ci
npm run build
npm test
npm run preview
```

Abra `http://127.0.0.1:8787`. Sem `TMDB_API_KEY`, a prévia usa um catálogo ilustrativo identificado na tela. Contas e interações usam SQLite local em `.local/`; vídeos reais não estão incluídos nessa demonstração. O banco local não é o banco D1 de produção.

Para testar o ambiente Cloudflare localmente, copie `.dev.vars.example` para `.dev.vars`, preencha sua chave TMDB e execute `npm run dev`. O arquivo `.dev.vars` é ignorado pelo Git. A prévia `npm run preview` lê variáveis do processo; ela não carrega esse arquivo automaticamente.

## Publicar no Cloudflare Free

Leia [PUBLICAR-CLOUDFLARE.md](PUBLICAR-CLOUDFLARE.md) para instalar ou atualizar e [PUBLICAR-ESTE-PACOTE.md](PUBLICAR-ESTE-PACOTE.md) para enviar esta entrega ao GitHub.

| Campo no Workers Builds | Valor |
| --- | --- |
| Diretório raiz | `/` — raiz direta do repositório |
| Nome do Worker | `anime-dragon` (igual ao `name` de `wrangler.toml`) |
| Build command | `npm run build && npm test` |
| Deploy command | `npx wrangler deploy` |
| Node.js | `24` |
| Binding do banco | `DB` |

O front-end e a API são publicados juntos. Enviar apenas `web/` ao Pages não disponibiliza cadastro, catálogo ou comentários. A URL inicial pode ser a gratuita `workers.dev`; domínio próprio é opcional.

Para um banco existente, preserve o ID D1 e todos os segredos configurados, incluindo o `AUTH_SECRET` anterior quando houver. Para uma instalação nova, crie seu D1 e substitua apenas o `database_id` pelo ID do banco na sua conta. Não recrie o banco para atualizar o visual.

## Catálogo e reprodução

- **TMDB_API_KEY:** Secret obrigatório em produção para catálogo, capas, busca e temporadas reais. Configure no Cloudflare; não coloque a chave no GitHub.
- **Vídeos:** os dados da TMDB não incluem os arquivos dos episódios. O player depende de fontes HTTPS compatíveis, disponíveis e configuradas separadamente. Os manifestos existentes foram preservados; eles não garantem vídeo para todo o catálogo.
- **Fontes próprias:** `web/video-sources.json` aceita fontes por chave `ID_TMDB/temporada/episódio`. URLs nesse arquivo são públicas; não inclua tokens privados.
- **Contas:** o D1 persiste contas, biblioteca e comentários. O aplicativo cria as tabelas necessárias e um segredo de instalação quando necessário. Trocar um `AUTH_SECRET` já usado impede validar as senhas anteriores.

## Limites úteis do Free

Segundo a documentação oficial consultada em 4 de outubro de 2026:

| Recurso | Cota |
| --- | --- |
| Requisições que executam o Worker/API | 100.000 por dia |
| CPU por execução do Worker | 10 ms |
| Requisições a arquivos estáticos | Gratuitas e ilimitadas |
| D1: linhas lidas / escritas | 5 milhões / 100.000 por dia |
| D1: tamanho de cada banco | 500 MB |
| D1: armazenamento total da conta | 5 GB |
| Workers Builds | 3.000 minutos por mês; 1 build simultâneo |

As cotas são compartilhadas pela conta. Ao atingir cotas gratuitas, as APIs podem ficar indisponíveis até a renovação da cota. Segmentos de HLS transmitidos por `/api/video` contam como requisições do Worker: segmentos de 6 segundos geram cerca de 600 chamadas por hora de reprodução, além das playlists. Avatares enviados ficam no D1 e podem ocupar até 1,9 MB cada.

Fontes oficiais: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [D1: preços](https://developers.cloudflare.com/d1/platform/pricing/), [D1: limites](https://developers.cloudflare.com/d1/platform/limits/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).

## Validação e histórico

O workflow `.github/workflows/ci.yml` executa `npm ci`, build e a suíte completa de testes em Linux a cada push e pull request. Não publica o site e não precisa de segredos Cloudflare ou TMDB. O build verifica a sintaxe e prepara o Worker com `wrangler deploy --dry-run`, sem publicar. Os testes verificam os comportamentos cobertos. Reprodução externa e configuração real devem ser conferidas após o deploy.

Os detalhes da conferência desta entrega estão em [docs/VALIDACAO-v11.md](docs/VALIDACAO-v11.md). Documentos de atualização v9.3/v9.4 foram mantidos em `docs/historico/` como registro das versões anteriores.

Os arquivos `ATUALIZAR-v9.3.md`, `ATUALIZAR-v9.4.md` e notas técnicas de versões v9 em `docs/` são históricos. Instruções antigas sobre a pasta `AnimeDragon2`, versões ou números de testes não se aplicam a este pacote na raiz. Use os documentos principais deste pacote v11 como referência para publicar.
