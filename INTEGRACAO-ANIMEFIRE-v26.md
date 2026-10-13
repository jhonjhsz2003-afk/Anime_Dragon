# AnimeDragon v26 — integração opcional AnimeFire + EmbedMovies

## O que foi feito

- `GET /api/playback?id=<TMDB>&season=<N>&episode=<N>&provider=auto` procura uma correspondência **exata** de título/ano na API AnimeFire, abre `/anime/{id}` para obter temporadas e episódios, depois `/episode/{id}` para consultar as fontes de reprodução.
- Seleção automática por prioridade: **dublado**, depois **legendado**; EmbedMovies é **alternativa**, somente se autorizado e quando a fonte direta falhar ou faltar. A janela interna do EmbedMovies continuará aparecendo se o fallback for necessário.
- Fonte HLS da API aceita exclusivamente HTTPS de `akumast.net` por padrão. O fato de o endpoint terminar em `/h.jpg` não impede o HLS: o cliente respeita o tipo `application/vnd.apple.mpegurl` (a resposta real do CDN precisa ser playlist HLS válida). Não há decodificação, proxy de mídia, bypass de CORS ou extração protegida.
- Quando a API oferece `chapters` com `Intro`, o botão **Pular abertura** procura esse intervalo para o vídeo HTML5 e avança ao fim; quando não há capítulo, preserva AniSkip. Em iframes o botão não pode controlar o vídeo.
- O player HTML5 já registra a posição assistida e volta ao ponto salvo. Se a reprodução usar iframe externo, só é possível saber o episódio aberto.
- As credenciais opcionais da API devem ficar em segredo no Cloudflare, jamais no JavaScript ou no GitHub.

## Configurar Cloudflare

`wrangler.toml` já traz `ANIMEFIRE_ENABLED = "true"` para ativar a busca na API. Para desativar imediatamente, altere para `"false"`, publique novamente e o player usará apenas EmbedMovies. O Worker nunca solicita rota `/user`.

Se a API exigir token de acesso servidor-servidor, configure **via segredo do Worker**: `npx wrangler secret put ANIMEFIRE_API_TOKEN` (não adicione valores reais neste repositório). O código envia um cabeçalho Bearer apenas quando a configuração existe e jamais expõe o segredo ao cliente.

Se a hospedagem dos arquivos HLS mudar de domínio, valide que o novo domínio é seu/autorizado e ajuste **juntos** o allowlist no servidor, a validação `isAnimeFireStream()` no cliente e as diretivas `connect-src`/`media-src` da CSP. Não configure proxies para contornar recusas de acesso.

## Limitações honestas

1. Uma resposta `200 OK` da API em `animefire.one` não comprova que `akumast.net` permite reproduzir em `site.anime-dragon.workers.dev`. Os cabeçalhos CORS do HLS, disponibilidade do CDN e compatibilidade do browser têm de ser confirmados no navegador publicado.
2. A lista da API pode não conter todo anime do TMDB; o site só associa títulos coincidentes com segurança. Títulos alternativos, remakes, filmes e diferentes numerações de temporadas podem exigir mapeamentos explícitos. Não afirma funcionamento em todos os animes.
3. `is_offline: false` é apenas um sinal da API e não é verificação da mídia. O player tenta reproduzir e, se falhar, usa outra opção; sem garantias de que a alternativa exista ou funcione.
4. A integração técnica requer direitos de distribuição/reprodução dos vídeos nos dois domínios. Possuir o servidor ou a API não concede direitos sobre os animes por si só.
5. A API privada pode aplicar autenticação/limites. Não removemos nem contornamos tais proteções.

## Testes

`npm run check` e `node --test tests/animefire-v26.test.js tests/embedmovies.test.js tests/sources.test.js tests/opening-skip.test.js`. Para suíte completa: `npm ci` e `npm test`. Para confirmar implantação: abra `/api/health` (esperado `26.0.0`), `/api/playback/providers` e depois teste o EP1 de Black Clover em navegador real com DevTools Network aberto. Verifique CORS/CDN e a opção de áudio efetivamente reproduzida. Essas verificações externas não são substituídas por testes com simulações.
