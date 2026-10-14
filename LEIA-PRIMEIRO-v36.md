# AnimeDragon v36 — Trailers e catálogo sem repetição

- Banner: mostra o iframe apenas quando a reprodução realmente começar; caso o YouTube bloqueie autoplay ou o trailer não exista, exibe só a imagem.
- Prévia sem som e troca a cada 9 segundos, em até 12 destaques por ciclo.
- Mais detalhes verificados em Novos episódios (até 18 animes atualmente exibidos consultados).
- As categorias distribuem títulos sem repetir a mesma série nas outras vitrines; podem conter menos resultados caso o catálogo disponível seja pequeno.
- Página de detalhes: botão Trailer ao lado do botão Compartilhar, com vídeo incorporado quando disponível e mensagem se não encontrado.
- Busca: TMDB pt-BR, en-US, ja-JP. Fallback adicional de busca por trailer via YouTube Data API v3 se `YOUTUBE_API_KEY` estiver configurada no servidor como segredo Cloudflare (não incluir a chave no código).

## Limitações honestas

Nem todos os animes possuem trailers confirmados ou disponíveis para incorporação. A API do YouTube pode bloquear a reprodução automática e pode mostrar elementos próprios. O botão abre vídeo quando houver ID real; não inventa trailers.

## Publicação

No PowerShell aberto na pasta AnimeDragon_v36, execute `powershell -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.

Para habilitar a busca opcional no YouTube configure `YOUTUBE_API_KEY` em Workers Secrets no Cloudflare, sem colocá-la no GitHub. A busca possui cotas e não substitui os dados do TMDB.
