# AnimeDragon v34 — Perfil e trailers oficiais

## Novidades

- O nome verdadeiro da conta aparece no perfil, sem o rótulo “Nome exibido no perfil”. O destaque do perfil permanece com tamanho preservado.
- Nome próximo ao avatar na barra superior com mais contraste e fonte maior; RGB animado é mantido nas demais áreas do perfil.
- Até **6 stickers**, podendo repetir o mesmo arquivo em quantas posições desejar. Cada ocorrência possui sua própria posição e tamanho.
- Para trocar sem salvar/remover: selecione uma ocorrência na prévia, clique em **Trocar sticker selecionado** e clique em outro sticker no catálogo. Quando as seis posições estiverem ocupadas, clicar em outro sticker substitui a ocorrência selecionada.
- Ajustes de tamanho dos stickers ficam visíveis tanto na prévia quanto no perfil salvo: o limite CSS de 125px foi removido.
- Salvar o perfil ou stickers não volta à primeira aba e não apaga a edição em andamento. Salvar fotos e privacidade também mantém a seção. Ao escolher avatar na biblioteca DragonGIF, volta para a área Foto e avatar.
- Na tela inicial, quando o TMDB oferece trailer oficial do anime no YouTube, o destaque tenta exibir uma prévia de 12 segundos, sem áudio, com fallback automático para imagem quando não houver trailer. Não aparece com economia de dados ou redução de animações. Alguns navegadores e vídeos podem bloquear reprodução automática.

## Limitação conhecida do EmbedMovies

O iframe abre a URL do episódio diretamente, mas o seletor interno Blogger/Premium é controlado pelo EmbedMovies. O AnimeDragon não recebe APIs documentadas que permitam selecionar o player e iniciar vídeo sem essa interface. Esconder os botões seria incorreto e poderia bloquear a reprodução. É necessária uma fonte que disponibilize stream diretamente/autorizado para garantir reprodução sem a seleção.

## Publicação

1. Extraia este pacote.
2. Abra a pasta `AnimeDragon_v34` no PowerShell.
3. Execute:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1

O script publica em `jhonjhsz2003-afk/Anime_Dragon`, sem forçar push e sem alterar o DragonGIF separado.

## Verificações locais

- `npm run check`: passou.
- 174 testes passaram; os outros 6 testes de interface requerem a dependência `linkedom`, que não pôde ser instalada no ambiente de preparação.
- A interface real, a autoplay do YouTube, a presença de trailers e a reprodução via EmbedMovies devem ser conferidas após a publicação.
