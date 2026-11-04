# Validação AnimeDragon v22

- `npm run check`: **passou** (sintaxe dos módulos centrais).
- `npm run test:embedmovies`: **10/10 passaram**.
- `node --test tests/worker.test.js tests/performance.test.js tests/sources.test.js tests/embedmovies.test.js tests/player.test.js`: **31/31 passaram**.
- `npm test`: 139/148 passaram; 9 testes de interface existentes falharam por dependência `linkedom` não instalada no ambiente da auditoria. Não são evidência de regressão funcional, mas ficaram sem validação.
- `npm ci --offline`: bloqueado por pacote npm ausente no cache. Tentativa online não terminou a tempo.
- `npm run build`/Wrangler: **não concluído** neste ambiente por falta de dependências instaladas.
- Reprodução real no navegador dentro do iframe: **não verificada** (endpoint do provedor não acessível pelo verificador externo).
- Conferência de código: nenhum módulo ou referência ao provedor anterior permanece nos arquivos entregues.

A geração de um `iframe` com ID TMDB não garante que um vídeo esteja disponível. A API de incorporação é anunciada pelo EmbedMovies em https://embedmovies.org/; o provedor e os titulares dos animes determinam as condições de uso e de exibição. O projeto não contorna restrições nem remove publicidade de players externos.
