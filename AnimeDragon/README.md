# AnimeDragon · versão 8

Projeto para **Cloudflare Workers + Static Assets + D1**. Esta entrega atualiza os arquivos; não altera automaticamente o GitHub nem a hospedagem.

## Mudanças

- Dragão vetorial original **inteiro**, articulado em grupos: asas, cauda, cabeça, tórax, braços e olhos. Respiração, piscadas e olhar acompanhando o cursor. Movimento reduzido respeitado. Não utiliza a imagem recortada na tela de cadastro.
- Interface maior: capas, textos, controles e janela de detalhes. Banner do próprio anime no topo dos detalhes.
- Setas maiores **sobre as laterais das capas**, além de rolagem por toque e teclado.
- Destaques rotativos a cada sete segundos, com seleção manual e pausa. Param quando o visitante interage com o destaque ou quando a aba está oculta.
- A home prioriza animes com episódios exibidos nos últimos 120 dias, ordenados por popularidade. Novidades usa estreias do último ano. Séries antigas ainda em exibição podem aparecer quando tiveram episódios recentes; não há lista fixa de títulos antigos.
- Prévias de episódios provenientes do addon ou `still_path` dos metadados. Quando não existe uma prévia, a interface informa isso sem inventar imagens.
- Recomendações de animes parecidos, filtradas para anime.
- Favoritos e assistir depois separados, salvos no D1 por conta.
- Curtir/não curtir com contagens reais, uma reação por conta por anime, possibilidade de alterar/remover a reação.
- Comentários persistentes, respostas, filtro por episódio, spoilers ocultos, edição e exclusão pelo autor, denúncias e paginação. Rascunhos ficam no navegador.
- Cadastro e login com inicialização automática das tabelas do D1. **Novas instalações não dependem de configurar AUTH_SECRET manualmente**.
- Adaptador Stremio configurado para o manifesto FenixFlix solicitado. Player com seleção de fontes HTTPS e suporte HLS via hls.js carregado somente ao reproduzir.

## Como atualizar

Substitua os arquivos pela pasta que contém `worker.js`, `server/`, `web/`, `package.json` e `wrangler.toml`. Eles precisam permanecer juntos.

No Cloudflare Workers Builds:

- Root directory: a pasta do repositório em que está `wrangler.toml`. Se manteve toda a estrutura do ZIP, use `/Anime_Dragon-main/AnimeDragon`; se subiu só o conteúdo dessa pasta, use `/`.
- Build command: vazio.
- Deploy command: `npx wrangler deploy`.
- Binding D1: **DB**. O ID original permanece em `wrangler.toml`; confirme que é o banco da sua conta.
- Secret `TMDB_API_KEY`: mantenha seu token de leitura ou chave v3 já configurado.

**Não publique somente `web/` como site estático.** Isso entrega o formulário, mas não entrega o serviço de contas, comentários ou catálogo. A arquitetura é Workers com Static Assets.

Pelo terminal, com Node 22.13+ (24 recomendado):

```bash
npm install
npx wrangler login
npx wrangler deploy
```

O banco D1 precisa existir e estar vinculado. As tabelas faltantes são criadas automaticamente na primeira chamada de conta/comunidade, sem apagar as tabelas ou contas existentes. O schema manual continua disponível:

```bash
npm run db:remote
```

### Se cadastro/login continuarem falhando

1. Abra `https://SEU-DOMINIO/api/health`. Deve retornar JSON com `service: "AnimeDragon"` e `version: "8.0.0"`.
2. Se retornar HTML, 404 ou a versão antiga, o Worker correto não foi publicado/roteado. Apenas trocar arquivos HTML não atualiza o backend.
3. Verifique que o binding se chama exatamente `DB` e o banco informado em `wrangler.toml` existe na sua conta.
4. Se já havia contas da versão 7 com `AUTH_SECRET`, **preserve o mesmo segredo**. Ele participa da verificação das senhas.
5. Consulte os logs do Worker e teste `/api/auth/me` no mesmo domínio. Não envie tokens, senhas ou valores de segredos para conversas.

A versão 8 cria uma chave aleatória de instalação em `app_config` quando nenhum `AUTH_SECRET` externo existe. A gravação é atômica para que cadastros simultâneos compartilhem a mesma configuração. Um segredo externo existente é preservado. Não altere a chave nem introduza depois um `AUTH_SECRET` diferente: contas anteriores dependem dela.

## FenixFlix / Stremio

O endereço solicitado já está em `[vars]` no `wrangler.toml`, como `STREMIO_MANIFEST_URL`.

**Estado verificado nesta entrega:** a consulta real ao manifesto falhou com conexão TLS/HTTP 502 a partir do ambiente de desenvolvimento. A integração foi testada com respostas Stremio simuladas; a disponibilidade e compatibilidade reais do FenixFlix não foram confirmadas. Não é possível garantir reprodução em produção sem essa validação.

Funcionamento:

1. O catálogo próprio continua filtrado para séries anime. Nenhum catálogo geral do addon é importado.
2. O servidor obtém o ID IMDb do anime via `external_ids` ou usa um mapeamento explícito configurado.
3. Lê o manifesto e verifica os recursos, tipos e prefixos declarados.
4. Quando há `meta`, usa seus vídeos e números de temporada/episódio. Na falha, mantém os metadados do catálogo.
5. Ao reproduzir, resolve o ID exato do episódio e consulta `stream/series/{id}.json`.
6. Retorna fontes HTTPS diretas e compatíveis. Torrents, magnet, páginas externas e fontes que exigem cabeçalhos de proxy não são convertidos em vídeo pelo navegador.
7. O player permite trocar de fonte. HLS identificado por `.m3u8` usa suporte nativo ou hls.js 1.6.13 local. O servidor de mídia ainda precisa permitir CORS para seu domínio.

O protocolo Stremio não implica que todo addon use os mesmos IDs ou que seus links possam ser reproduzidos em qualquer navegador. Se FenixFlix usar IDs próprios, preencha `web/addon-mappings.json` com **IDs reais verificados no addon**, por exemplo:

```json
{
  "ID_NUMERICO_DO_ANIME_NO_CATALOGO": {
    "id": "ID_REAL_DO_ANIME_NO_ADDON",
    "episodes": {
      "1/1": "ID_REAL_DO_EPISODIO_NO_ADDON"
    }
  }
}
```

Esse exemplo é estrutural, não é uma correspondência válida. O código não adivinha correspondências pelo título, para não abrir outro anime ou episódio por engano.

`web/video-sources.json` continua disponível como fonte explícita prioritária, com chaves `animeId/temporada/episodio` e valores `{ "url": "https://...", "type": "video/mp4", "subtitles": [] }`. Use somente fontes que você tenha autorização para disponibilizar. Esses arquivos são públicos: não coloque credenciais ou tokens privados.

## Dados da comunidade

D1 armazena:

- contas, perfil, sessões e limites de tentativas;
- `anime_collections`: favoritos e assistir depois, sem duplicações;
- `anime_reactions`: uma reação por usuário/anime;
- `anime_comments`: comentários, autor, contexto do episódio, spoiler, resposta e datas;
- `comment_reports`: denúncias únicas por conta/comentário.

Os totais são calculados no servidor e as respostas de comunidade usam `Cache-Control: no-store`. Não existem números inventados. A interface atualiza após gravar e ao reabrir o anime; não há push/WebSocket em tempo real entre abas.

O autor pode editar/excluir seus comentários. Denúncias são registradas no banco, mas **não há painel de moderação ou revisão automática nesta versão**. Para moderação, o operador pode consultar `comment_reports` com `anime_comments` pelo painel D1 e remover o registro relevante de `anime_comments`. Não há promessa de análise automática.

Histórico de reprodução e preferências continuam locais ao navegador. Coleções da versão anterior armazenadas somente no navegador não são sincronizadas automaticamente com a nova conta. Salve novamente os títulos desejados.

## Segurança das contas

- Senhas com PBKDF2-SHA512, salt individual, chave de instalação e hash versionado; nunca gravadas no navegador.
- Tokens aleatórios de sessão são armazenados como hash no banco. Cookie HttpOnly, SameSite=Lax e Secure em HTTPS. Sessões expiram em sete dias e são revogadas no logout.
- Operações de escrita exigem sessão e mesma origem; edição/exclusão verificam autoria no servidor.
- Consultas SQL parametrizadas e escape de comentários na interface.
- Limites de tentativas para autenticação, comentários e interações.
- A chave automática da instalação fica no mesmo banco. Um `AUTH_SECRET` externo configurado desde o início mantém essa chave separada do banco. Preserve backups e não troque a chave de uma instalação com contas.
- Recuperação de senha por e-mail e confirmação de e-mail ainda não estão implementadas.

## Desenvolvimento e testes

```bash
npm install
cp .dev.vars.example .dev.vars
# Preencha o token de catálogo; não publique .dev.vars.
npm run dev
npm test
```

Os 20 testes verificam servidor, persistência com SQLite, adaptador e interação do DOM. Não alteram seu banco remoto. O relatório `docs/VALIDACAO.md` distingue os testes locais da validação pendente na hospedagem.

O projeto não ativa serviços pagos. Consumo de CPU, D1, requisições e mídia depende do seu plano e precisa ser acompanhado na sua conta Cloudflare.

## Referências e créditos

- [Protocolo de streams Stremio](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/stream.md)
- [Metadados Stremio](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md)
- [Filtros de séries](https://developer.themoviedb.org/reference/discover-tv)
- [Créditos de metadados](https://developer.themoviedb.org/docs/faq)
- [hls.js](https://github.com/video-dev/hls.js), licença Apache-2.0 incluída em `web/js/vendor/hls.LICENSE`.

Créditos do fornecedor de capas/metadados ficam apenas em Sobre. Dragão articulado e avatares são vetores originais da interface.
