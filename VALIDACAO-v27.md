# Validação AnimeDragon v27

- `npm run check`: sintaxe do worker, servidor e JavaScript da interface.
- `node --test tests/animefire-v26.test.js tests/animefire-v27.test.js tests/sources.test.js tests/embedmovies.test.js tests/opening-skip.test.js`: testes específicos de integração, busca paginada, títulos traduzidos e episódios.
- `npm test`: suíte geral. Algumas suítes de interface exigem `linkedom` (`npm ci`); sem dependência instalada, os testes correspondentes não podem executar.
- Publicação no Cloudflare, CORS no CDN e reprodução real de cada título só podem ser confirmados após o deploy e teste no navegador.
- **Não promete funcionamento para todos os animes**; casos sem correspondência ou fonte permitida têm fallback com diagnóstico.
