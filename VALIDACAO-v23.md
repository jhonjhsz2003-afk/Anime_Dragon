# AnimeDragon v23 — Validação

Mudanças focadas no layout do player externo (sem tentar comandar o iframe remoto):
- Cabeçalho e fechar fora da superfície do iframe.
- Botões redundantes de Vídeo e Legendas ocultados somente no modo externo.
- Iframe do episódio mantém `loading=eager`, com prioridade de carregamento alta.
- Referências do cliente/cache renovadas para v23.

O EmbedMovies informa URL do episódio, mas não documenta API para escolher dublado automaticamente, pular a tela de seleção ou verificar quais servidores realmente reproduzem. Esses recursos dependem do provedor. Não há prova de autoplay sem seleção, nem reprodução testada em navegador real.

Resultados reais no ambiente: `npm run check` OK; `npm run test:embedmovies` OK; a suíte completa apresenta nove falhas devido à instalação incompleta de `linkedom`. Build Cloudflare e reprodução dentro do iframe não verificados.
