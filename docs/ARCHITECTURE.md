# Arquitetura v9

Interface sem framework em `web/`, roteamento por hash, base original em app.css e tema Studio em studio.css. O Worker serve assets e API na mesma origem.

`server/database.js` cria tabelas idempotentemente. A migração transacional copia anime_collections para anime_library e grava app_config.library_v9. A condição de migração impede restauração futura de itens removidos. Segredos existentes são preservados.

anime_library separa favoritos/assistir depois dos quatro status; um índice parcial impede múltiplos status por usuário/anime. comment_reactions registra um voto por usuário/comentário. comment_keys reserva o hash normalizado por usuário/anime, atomicamente com a publicação. Editar troca a reserva na mesma transação. Excluir remove votos, reserva e denúncias; respostas são preservadas e desvinculadas.

episode_progress sincroniza assistido por conta/anime/temporada/episódio. O minuto de reprodução permanece local. A agenda consulta detalhes completos para obter a próxima data anunciada.

Autenticação mantém PBKDF2, segredo de instalação, cookie HttpOnly/SameSite, validação de origem, SQL parametrizado e limite de tentativas. Cache público apenas de metadados.

O adaptador Stremio original permanece. O bundle de produção não importa server/demo.js nem scripts/local.mjs, usados exclusivamente pela prévia local com SQLite. .local está excluído do Git e do ZIP de distribuição.

Filtros temáticos resolvem correspondências exatas via /search/keyword e aplicam with_keywords a /discover/tv, mantendo with_genres=16 e origem JP. Metadados ausentes resultam em lista vazia, nunca em substituição silenciosa pelo catálogo geral. Documentação: https://developer.themoviedb.org/reference/search-keyword e https://developer.themoviedb.org/reference/discover-tv.

## Perfis e fotos (v9.1)

`profile_privacy` controla acesso às listas (privado por padrão); `playback_activity` registra a última reprodução iniciada, sem indicar presença ao vivo. `user_appearance` guarda uma cor de nome da lista permitida. `profile_media` guarda a imagem original em base64 e seu enquadramento. O limite de 1.400.000 bytes mantém o registro dentro do limite do D1; não exige R2. O endpoint de foto serve o tipo validado com nosniff, CSP e sem cache. Só o proprietário pode enviar, remover ou reenquadrar sua foto. Não há redimensionamento ou recompressão. `server/media.js` implementa esses endpoints.
