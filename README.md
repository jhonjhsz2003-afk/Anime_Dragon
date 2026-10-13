> **Versão 31.3:** Integração DragonGIF diretamente via navegador, documentação em [LEIA-PRIMEIRO-v31.3.md](LEIA-PRIMEIRO-v31.3.md).

# AnimeDragon v30 — Biblioteca local de GIFs e Stickers

A **galeria pública `#gifs`** e o editor **Perfil > Personalizar > Stickers locais** agora usam mídias estáticas do próprio site, sem chave ou conexão com a API do GIPHY. As pastas estão vazias: **você coloca os seus próprios arquivos autorizados** antes de subir para o GitHub.

## Passo a passo (Windows / Opera GX)

1. Extraia o ZIP do AnimeDragon e abra a pasta **AnimeDragon** que contém `package.json`, `wrangler.toml` e os scripts PowerShell.
2. Copie **GIFs** e **Stickers** de `Downloads\gifs` para **`web\assets\profile-media`** (mesclando com as pastas vazias). Ou execute o script **`COPIAR-MIDIAS.ps1`** para copiar automaticamente:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\COPIAR-MIDIAS.ps1
   ```

   Para outra origem, use `-Origem 'D:\MinhaPasta\gifs'`.

3. Na mesma pasta **AnimeDragon**, execute:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1
   ```

   Esse script indexa as mídias, cria `web/assets/profile-media/catalog.json` e `server/local-media-index.js`, prepara a versão completa e faz **commit `AnimeDragon` + push na branch main** do repo `jhonjhsz2003-afk/Anime_Dragon`, **sem `--force`**.

4. Aguarde a publicação via integração Cloudflare/GitHub. Confirme `https://site.anime-dragon.workers.dev/api/health` com `version: 30.0.0`, recarregue com Ctrl+F5 e abra a seção GIFs. Se Cloudflare não publicar, execute `PUBLICAR-CLOUDFLARE.ps1` com Node e npm instalados.

### Estrutura

```text
AnimeDragon/
  web/assets/profile-media/
    GIFs/               <- coloque arquivos .gif, .webp, .png, .apng, .jpg, .avif
      Naruto/            <- pastas opcionais por anime ajudam na pesquisa
    Stickers/           <- coloque os stickers aqui (subpastas também funcionam)
      Sakura/
    catalog.json        <- gerado automaticamente; nao editar
  server/local-media-index.js <- lista permitida usada no servidor
  COPIAR-MIDIAS.ps1
  SUBIR-GITHUB.ps1
  PUBLICAR-CLOUDFLARE.ps1
```

## Funcionalidade do site

- **Busca local** por nomes de arquivo e subpasta, com filtros GIFs / Stickers / Todos, sem chave ou limites de consulta de terceiros.
- Até **quatro stickers por perfil**, com tamanho ajustável, arrastar para reposicionar, setas do teclado, alterar ordem de camadas, remover e substituir.
- **Avatares GIF animados** ficam armazenados como caminhos locais validados no banco D1 e aparecem também para outras pessoas nos perfis públicos, comentários e outros componentes que mostram o avatar.
- Perfis com conta preservada, capa/atmosfera, 30 molduras, cores RGB, coleção, privacidade e tema atuais.
- Filtro que esconde arquivos de conteúdo idêntico dentro da mesma categoria durante a indexação.
- Arquivos não são guardados no D1; somente caminhos e coordenadas são guardados, preservando o banco anterior.

A busca **não consegue descobrir quem aparece dentro de GIFs com nomes aleatórios**: ela usa o nome dos arquivos e das pastas. Organize por nome de anime/personagem para melhores resultados. Nada falso é exibido quando a biblioteca estiver vazia.

## Limites e segurança

Somente publique arquivos criados por você ou com licença/autorização para divulgação pública. Baixar uma mídia não concede automaticamente permissão para redistribuí-la. O site já não depende da API de terceiros, mas **a hospedagem, GitHub e Cloudflare continuam sujeitos aos seus próprios limites**. O indexador interrompe arquivos individuais maiores que 24 MiB; acervos muito grandes podem precisar de Cloudflare R2 ou outro serviço apropriado em vez de assets do Worker/Git. Evite renomear ou excluir arquivos já usados nos perfis, pois isso altera seus caminhos.

Para gerar o catálogo sem subir: `npm run media:index`. Para validar JavaScript: `npm run check`. Para rodar testes: `npm ci` e `npm test`.

A D1 e o nome do Worker continuam os mesmos e não há comando para excluir dados de usuário. 

---

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
