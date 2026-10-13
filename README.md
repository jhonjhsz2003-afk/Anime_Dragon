# AnimeDragon v29.1 — Correção do GIPHY

Consulte `CORRECAO-GIPHY-v29.1.md` para detalhes, limites e configuração opcional da chave de stickers.

# AnimeDragon v29 — Personalização do perfil

- 12 atmosferas, 30 molduras e editor de stickers GIPHY (até 6 stickers por perfil).
- Coleção como primeira aba; Aparência, Foto e Conta em abas próprias.
- Nome RGB aplicado somente às letras; emojis/coroas mantêm as cores originais.
- Capas maiores no perfil compartilhável.
- Stickers armazenados como IDs do GIPHY e coordenadas no D1, não como arquivos ou URLs externos.

**Migração D1:** o Worker cria a tabela `profile_stickers_v29` automaticamente no primeiro acesso ao banco, sem apagar tabelas antigas. Confira credenciais e backup antes de publicar. A chave `GIPHY_API_KEY` já configurada no Worker continua necessária para pesquisar stickers.

**Limitações:** stickers são resolvidos no navegador via GIPHY e podem ficar indisponíveis se o GIF for removido, a API atingir os limites ou a chave deixar de funcionar. Sem chave configurada, as demais opções visuais continuam funcionando.

# AnimeDragon v28 — EmbedMovies e perfil renovado

Site exclusivo para animes. O TMDB fornece metadados, capas, episódios e datas previstas. O EmbedMovies é a única fonte de incorporação de vídeo no projeto.

## Novidades v28

- Retirada completa do adaptador e configurações AnimeFire.
- Episódios já listados pelo TMDB podem ser abertos mesmo antes da data indicada; a disponibilidade depende do EmbedMovies. **Não existe consulta oficial de disponibilidade por episódio no EmbedMovies.**
- Redução do cache de detalhes de temporadas para atualizações mais frequentes; não implica atualização instantânea de publicação do TMDB.
- Perfil com **Favoritos / Minha lista / Acompanhando**, apenas com adições explícitas. O histórico de episódios permanece separado e não altera as listas.
- 30 molduras CSS inéditas (sem imagens externas) e 13 cores fixas + 14 gradientes RGB animados; usuários com molduras antigas recebem equivalente visual sem perder a conta.
- Ranking: cache de 30 segundos no Worker e 25 segundos no navegador, preservando opt-in e limite de um dia ativo pontuado por dia (sem provar a reprodução externa).

## Configuração

Use Node.js >=22.13 e instale com `npm ci`. Execute `npm run check`, `npm test`, `npm run build` para validação, e `npm run deploy` para publicar na Cloudflare.
Configure `TMDB_API_KEY` e `AUTH_SECRET` nos secrets da Cloudflare, e preserve a ligação D1 existente; nunca inclua segredos no repositório.

O nome do Worker no `wrangler.toml` continua `site`, com banco D1 existente. A implantação **atualiza o site AnimeDragon original**; não afeta o Observatório.

`SUBIR-GITHUB.ps1` envia a atualização sem `--force` para o repositório já existente.

## Limites honestos

- O iframe EmbedMovies pode exibir seleção de player ou anúncios. Não há API pública documentada para alterar os controles internos, idioma ou confirmar disponibilidade antecipadamente.
- A data TMDB é informativa; liberar clique não confirma que o vídeo foi publicado.
- Não é possível recuperar posição ou pular abertura dentro do iframe, a menos que o EmbedMovies forneça uma API autorizada de controle.
- Respeite os direitos de distribuição das obras e regras de incorporação do provedor.
