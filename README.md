# AnimeDragon v22 — EmbedMovies

Site de catálogo exclusivo de **animes** com capas, títulos, detalhes, temporadas e episódios do **TMDB**, e player externo do **EmbedMovies**.

## O que foi alterado

- Eliminados os adaptadores antigos de reprodução, os scripts de busca HTML, configurações e documentação de provedores anteriores.
- `GET /api/playback?id=30984&season=1&episode=1` retorna **somente** um iframe EmbedMovies, gerado a partir do ID numérico TMDB e dos números de temporada/episódio. O endpoint mantém o contrato utilizado pela interface.
- `GET /api/playback/providers` retorna somente `embedmovies`.
- O player da interface usa um `<iframe>` isolado com `sandbox`, sem autorização para pop-ups, navegação da janela superior nem downloads. Os botões do AnimeDragon para trocar episódios continuam disponíveis.
- CSP do Worker permite `frame-src https://myembed.biz` e não libera CDNs de vídeo genéricas. CSS, navegação, autenticação, GIPHY e banco D1 foram preservados.

A documentação pública de <https://embedmovies.org/> anuncia a incorporação gratuita, sem API key, em `https://myembed.biz/serie/{tmdb_id}/{temporada}/{episodio}`. **É uma API de incorporação por URL, não uma API JSON de links diretos de vídeo.**

## Observações importantes

A URL do iframe pode ser formada mesmo quando o episódio não existe no catálogo do serviço. A confirmação visual da reprodução e a disponibilidade do conteúdo dependem do serviço externo. O player pode incluir publicidade de terceiros que o AnimeDragon não controla. A permissão técnica de incorporar não representa uma licença dos titulares dos animes: avalie os direitos de exibição antes de distribuir obras protegidas.

O AnimeDragon não remove anúncios dentro de iframes externos, não faz proxy e não tenta contornar proteções de mídia. Controle de velocidade, legendas e posição do vídeo dentro do iframe dependem do serviço; o AnimeDragon preserva a troca de episódios, histórico e demais telas.

## Instalação e testes

Requisitos: Node.js 22.13+ e dependências do `package-lock.json`.

```bash
npm ci
npm run check
npm test
npm run build
```

Para prévia local: `npm run preview`. Sem `TMDB_API_KEY` esse modo usa um catálogo ilustrativo de demonstração, sem episódios de animes comerciais. Em produção, configure `TMDB_API_KEY` nos segredos/variáveis do Worker. `GIPHY_API_KEY` é opcional. Não é necessária chave de API do EmbedMovies.

## Publicação Cloudflare

O `wrangler.toml` utiliza o Worker `site` e mantém o binding D1 existente. Atualize o repositório GitHub e verifique no Cloudflare **Workers & Pages → site → Builds/Deployments** se a branch `main` está conectada.

```bash
npx wrangler deploy
```

A checagem `https://site.anime-dragon.workers.dev/api/health` deverá informar `version: 22.0.0` após a publicação. Teste um episódio no navegador e abra o Console para identificar eventuais indisponibilidades do serviço incorporado.

O arquivo `SUBIR-GITHUB.ps1` atualiza o repositório a partir de uma pasta nova extraída. O `--force` sobrescreve o histórico remoto: use só se concordar com isso.

## Outras funcionalidades mantidas

Interface em português, navegação, catálogo de animes, temporadas e miniaturas do TMDB, autenticação, biblioteca, favoritos, comentários, GIPHY, agenda de lançamentos e acompanhamento de episódios assistidos. Recursos como pular abertura e controles nativos só são aplicáveis quando o vídeo pertence ao player do site, não dentro do iframe externo. Para integração de abertura com metadados, veja `ANISKIP.md`.

### v23 — ajuste de reprodução incorporada

Separado o cabeçalho do player externo e removidos controles duplicados do AnimeDragon. Veja `INTEGRACAO-EMBEDMOVIES.md` para as limitações de autoplay e seleção de áudio/servidor do provedor.


## Novidades v24

- Marca AnimeDragon com animação de fogo azul e respeito a preferências de movimento.
- O histórico local registra episódios abertos mesmo quando o EmbedMovies não disponibiliza o tempo de reprodução.
- Ranking opcional de até quatro contas, baseado exclusivamente em episódios marcados como assistidos.
- A função de pular abertura continua disponível para vídeo controlado diretamente, quando houver marcação válida. Ela não funciona dentro do iframe externo do EmbedMovies.

Veja também `MELHORIAS-v24.md`.
