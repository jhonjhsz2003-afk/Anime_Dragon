# AnimeDragon v27 — Busca AnimeFire aprimorada + EmbedMovies + ranking por atividade

Site de catálogo exclusivo de **animes** com metadados do **TMDB**, integração de busca/episódios via API **AnimeFire** e player HLS próprio quando a origem permite, mantendo **EmbedMovies** como alternativa opcional.

## Reprodução na v27

- `GET /api/playback?id=30984&season=1&episode=1&provider=auto` pesquisa a API AnimeFire pelo nome principal, variantes e traduções BR/US/JP da obra (com checagem de ano), carrega temporadas/episódios e consulta as fontes disponíveis.
- Fontes diretas compatíveis são ordenadas **dublado → legendado**; o iframe EmbedMovies é a última alternativa quando autorizado. A API AnimeFire pode retornar uma fonte marcada como disponível que não reproduz em outro domínio: o player tenta passar à seguinte.
- `GET /api/playback/providers` lista AnimeFire quando habilitado e EmbedMovies como fallback.
- `ANIMEFIRE_ENABLED = "true"` no `wrangler.toml` ativa o adaptador; use `"false"` se o serviço externo não permitir reprodução. Configurações privadas, quando necessárias, devem ser secrets do Worker.
- Não há contorno de autenticação, bloqueios de origem, CORS ou DRM. Consulte `INTEGRACAO-ANIMEFIRE-v27.md` para testar e configurar com segurança.

## Observações importantes

A URL do iframe pode ser formada mesmo quando o episódio não existe no catálogo do serviço. A confirmação visual da reprodução e a disponibilidade do conteúdo dependem do serviço externo. O player pode incluir publicidade de terceiros que o AnimeDragon não controla. A permissão técnica de incorporar não representa uma licença dos titulares dos animes: avalie os direitos de exibição antes de distribuir obras protegidas.

A v27 mostra `animefireReasonCode` em `/api/playback` para explicar falhas de busca e de episódios. O status HTTP 200 desse endpoint não garante uma fonte AnimeFire; verifique `primaryAvailable`.

O AnimeDragon não remove anúncios dentro de iframes externos, não faz proxy e não tenta contornar proteções de mídia. Fontes HLS exigem suporte CORS e direitos de uso para reprodução no AnimeDragon. Controle de velocidade, legendas e posição do vídeo dentro do iframe dependem do serviço; o AnimeDragon preserva a troca de episódios, histórico e demais telas.

## Instalação e testes

Requisitos: Node.js 22.13+ e dependências do `package-lock.json`.

```bash
npm ci
npm run check
npm test
npm run build
```

Para prévia local: `npm run preview`. Sem `TMDB_API_KEY` esse modo usa um catálogo ilustrativo de demonstração, sem episódios de animes comerciais. Em produção, configure `TMDB_API_KEY` nos segredos/variáveis do Worker. `GIPHY_API_KEY` é opcional. Não é necessária chave de API do EmbedMovies. A API AnimeFire pode exigir chave própria servidor-servidor; veja o guia v27.

## Publicação Cloudflare

O `wrangler.toml` utiliza o Worker `site` e mantém o binding D1 existente. Atualize o repositório GitHub e verifique no Cloudflare **Workers & Pages → site → Builds/Deployments** se a branch `main` está conectada.

```bash
npx wrangler deploy
```

A checagem `https://site.anime-dragon.workers.dev/api/health` deverá informar `version: 27.0.0` após a publicação. Teste Black Clover EP1 no navegador e abra Network para verificar se a API e o CDN HLS aceitam a origem publicada. Se não aceitarem, o EmbedMovies continua como alternativa.

O arquivo `SUBIR-GITHUB.ps1` atualiza o repositório a partir de uma pasta nova extraída. O script atual faz um clone temporário do repositório e publica por commit normal, **sem `--force`**. Se houver um erro de autenticação ou permissão, confira seu login no GitHub e envie a mensagem completa do terminal.

## Outras funcionalidades mantidas

Interface em português, navegação, catálogo de animes, temporadas e miniaturas do TMDB, autenticação, biblioteca, favoritos, comentários, GIPHY, agenda de lançamentos e acompanhamento de episódios assistidos. Recursos como pular abertura e controles nativos só são aplicáveis quando o vídeo pertence ao player do site, não dentro do iframe externo. Para integração de abertura com metadados, veja `ANISKIP.md`.

### v23 — ajuste de reprodução incorporada

Separado o cabeçalho do player externo e removidos controles duplicados do AnimeDragon. Veja `INTEGRACAO-EMBEDMOVIES.md` para as limitações de autoplay e seleção de áudio/servidor do provedor.


## Novidades v24

- Marca AnimeDragon com animação de fogo azul e respeito a preferências de movimento.
- O histórico local registra episódios abertos mesmo quando o EmbedMovies não disponibiliza o tempo de reprodução.
- O ranking da v24 contava episódios marcados; **a v25 removeu essa pontuação** e passou a registrar dias de sessão ativa.
- A função de pular abertura continua disponível para vídeo controlado diretamente, quando houver marcação válida. Ela não funciona dentro do iframe externo do EmbedMovies.

Veja também `MELHORIAS-v24.md`.


## Novidades v26 — API AnimeFire e player HLS

Integração por busca exata do anime no AnimeFire, consulta das temporadas e episódios, prioridade de fontes dubladas e legendadas, e `Intro` fornecido por capítulos para pular abertura em vídeos HTML5. EmbedMovies continua como alternativa. **Não há garantia de disponibilidade para todos os animes ou de CORS no CDN.** Configure a ativação em `wrangler.toml` e leia `INTEGRACAO-ANIMEFIRE-v27.md`.

## Novidades v25 — antiabuso e brilho RGB

- Removido o fundo de chamas azuis do logotipo. O texto agora tem um gradiente RGB e um brilho discreto, sem iluminação atrás das letras.
- O ranking **não utiliza mais** o botão “Marcar assistido” ou a contagem em `episode_progress`.
- Apenas contas autenticadas e participantes entram no ranking. Para pontuar um dia é necessário manter uma sessão ativa do player por **pelo menos 8 minutos**, com sinais periódicos espaçados. São **no máximo 1 ponto por dia**, por conta, em uma janela de 30 dias. A pontuação é registrada pelo servidor D1 e a saída do ranking exclui seus registros.
- **Transparência:** o EmbedMovies não informa ao AnimeDragon se o vídeo está realmente reproduzindo. Por isso, a métrica é “dias com sessão ativa”, não “minutos comprovadamente assistidos”. Não existe garantia absoluta contra automatização sem um provedor com API de reprodução verificável.
- `SUBIR-GITHUB.ps1` faz a publicação preservando o histórico remoto (sem `git push --force`) e informa quando faltam credenciais ou configuração de nome/e-mail do Git.

Ver `MELHORIAS-v25.md` para os detalhes.
