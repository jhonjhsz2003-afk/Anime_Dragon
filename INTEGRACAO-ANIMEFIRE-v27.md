# AnimeDragon v27 — diagnóstico da integração AnimeFire

## O que mudou

- As buscas por animes usam nome principal e até três variantes/nomes alternativos do TMDB, inclusive traduções PT-BR/EN/JA.
- Quando a primeira página não resolve o anime, consulta até a **segunda página** da pesquisa mantendo o parâmetro `q` original.
- Correspondência continua exigindo **título exato normalizado** e ano de estreia compatível (até dois anos de diferença). Nunca escolhe um filme ou remake com título diferente só pela semelhança.
- Timeout de requisição à API ajustado de 3 para 4,5 segundos, sem insistência ilimitada; o cliente aguarda até 18 segundos no pior caso.
- Falhas recebem um código descritivo, sem expor tokens/URLs privadas.
- EmbedMovies continua como alternativa para o episódio quando a fonte principal está indisponível.

## Como identificar a causa de um anime que não carrega

No domínio publicado, abra a URL do próprio AnimeDragon trocando o ID, temporada e episódio conforme o anime: 

`/api/playback?id=30984&season=1&episode=1&provider=auto`

Observe os campos JSON:

- `primaryAvailable: true`: o Worker encontrou uma fonte direta AnimeFire. **Isso ainda não garante reprodução HLS/CORS**.
- `primaryAvailable: false`: o Worker não encontrou fonte AnimeFire, e o resultado pode conter só EmbedMovies.
- `animefireReasonCode` explica o ponto de falha: `MATCH_NOT_FOUND`, `EPISODE_NOT_FOUND`, `NO_COMPATIBLE_STREAM`, `API_TIMEOUT`, `UPSTREAM_HTTP` ou `API_ERROR`.
- `animefireReason` oferece uma explicação em português.

**Importante:** o endpoint `/api/playback` pode responder HTTP 200 com um iframe EmbedMovies mesmo quando AnimeFire falha. Nunca utilize apenas o status 200 para afirmar que a integração funcionou.

## Limites que ainda existem

- As temporadas e os números de episódios das duas bases precisam coincidir; mapeamentos difíceis ou séries repartidas em partes requerem correspondência validada, não uma substituição arbitrária.
- A API pode não conter todos os títulos do TMDB.
- O CDN deve autorizar a reprodução em `site.anime-dragon.workers.dev`; não há bypass de autenticação, CORS ou DRM.
- Possuir um domínio de API não substitui os direitos de distribuição do conteúdo.
- Tempos de abertura e posição no vídeo são controláveis apenas no player próprio, não no iframe do EmbedMovies.

## Verificar publicação

Após enviar o ZIP e publicar no Cloudflare, `https://site.anime-dragon.workers.dev/api/health` deve indicar `27.0.0`. Teste pelo menos Black Clover, Dragon Ball Super e dois animes que falhavam, verificando o JSON do endpoint `/api/playback` e o Network do HLS.
