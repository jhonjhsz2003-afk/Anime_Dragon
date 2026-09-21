# AnimeDragon Studio · v9.3

Plataforma de descoberta e acompanhamento de animes para **Cloudflare Workers + Static Assets + D1**. Interface em português, responsiva, com cadastro, biblioteca e comunidade persistentes.

## Publicar pelo GitHub

1. Envie todo o conteúdo desta pasta ao repositório, mantendo `worker.js`, `wrangler.toml`, `server/`, `web/` e `package.json` juntos.
2. Conecte o repositório a um **Worker** no Cloudflare. Nome: `anime-dragon`, igual ao `wrangler.toml`.
3. Root directory: a pasta que contém `wrangler.toml`. Use `/` se está na raiz do GitHub, ou `/AnimeDragon` se manteve essa pasta.
4. Build command: `npm run build`. Deploy command: `npx wrangler deploy`. Node.js 24 recomendado.
5. Confirme o banco D1 com binding **DB**. O ID do projeto original foi preservado; substitua-o apenas se for publicar com outro banco.
6. Mantenha ou adicione **TMDB_API_KEY** como Secret no Cloudflare. Aceita chave v3 ou token de leitura TMDB. Se já existia **AUTH_SECRET**, preserve exatamente o mesmo valor.

As tabelas v9 e a migração de favoritos/assistir depois são criadas automaticamente na primeira chamada ao banco. Contas, senhas, sessões e comentários anteriores são preservados. Não é preciso apagar ou recriar o banco. Uma instalação nova gera a chave interna de autenticação automaticamente.

Guia detalhado: [PUBLICAR-CLOUDFLARE.md](PUBLICAR-CLOUDFLARE.md).

## Funcionalidades

- Visual escuro azul, destaque cinematográfico, navegação desktop/celular e capas maiores.
- 19 gêneros e temas: isekai, magia, light novel, shounen, romance, vida escolar, slice of life, mecha, sobrenatural, samurai, esportes, ficção científica, mangá e gêneros tradicionais. Filtros temáticos resolvem palavras-chave reais da TMDB; não voltam silenciosamente ao catálogo geral.
- Página e links Sobre removidos; crédito TMDB discreto no rodapé.
- Botão **Voltar** fixo nas janelas, retorno do player aos episódios, histórico entre detalhes de animes e retorno nas páginas internas.
- Biblioteca com favoritos, assistir mais tarde, acompanhando, concluídos, pausados e abandonados; busca e ordenação.
- Favoritos e assistir mais tarde independentes. Os quatro status de acompanhamento são exclusivos entre si.
- Gostei/desgostei nos animes e comentários, um voto por conta, com troca e remoção.
- Comentários reais, respostas, spoilers, edição/exclusão pelo autor, denúncia, rascunho e ordenação por relevância/recência.
- Bloqueio de comentários repetidos do mesmo usuário no mesmo anime, inclusive diferenças de maiúsculas/espaços. Reserva atômica no banco evita duplicação por reenvio simultâneo.
- Episódios assistidos sincronizados por conta. O minuto de retomada fica no navegador.
- Agenda de próximos episódios anunciados dos animes acompanhados.
- Continuar assistindo, escolha aleatória, recomendações relacionadas e link compartilhável por anime.
- Foto ou GIF animado enviado pelo usuário (JPG, PNG, WebP ou GIF, até 1,4 MB), com centralização, posição horizontal/vertical e zoom manual. Arquivo original preservado, sem recompressão; GIF mantém a animação. O enquadramento é aplicado por CSS no perfil, menu e comentários.
- Perfil compartilhável com favoritos, acompanhamentos, episódios assistidos e últimas reproduções. Listas privadas por padrão, com opção pública; e-mail nunca é exibido a visitantes. Nome e foto continuam visíveis nos comentários.
- Oito cores de nome. Organização do acompanhamento diretamente no perfil, com cards e controles alinhados.
- Dragão oriental azul ilustrado nas telas de cadastro e login, com corpo serpentino, escamas detalhadas, ondulação, flutuação, aura e partículas. Movimento acompanha suavemente o cursor, pode ser pausado e respeita a preferência por movimento reduzido. Arte de alta resolução, sem redução de cores de GIF.
- Player com avanço/retrocesso de 10 segundos, velocidade, seleção de fonte, HLS, legendas e opção de próximo episódio automático.

## Catálogo e reprodução

O catálogo de produção usa TMDB, com séries de animação japonesas e imagens reais retornadas pela API. Nenhum comentário, curtida ou usuário fictício é criado em produção.

Os episódios dependem de fontes de vídeo configuradas e disponíveis. A integração Stremio que já estava no projeto foi preservada. `web/video-sources.json` permite indicar fontes HTTPS diretas por anime/temporada/episódio; `web/addon-mappings.json` permite mapear IDs do provedor. A entrega não inclui episódios nem licenças de distribuição. Fontes indisponíveis geram uma mensagem verdadeira no player.

## Prévia local sem instalar dependências

Com Node.js 24:

```bash
node scripts/local.mjs
```

Abra `http://127.0.0.1:8787`. Sem TMDB_API_KEY no ambiente, a prévia usa oito histórias ilustrativas originais, identificadas por uma faixa na tela. Cadastro, votos, comentários e coleções funcionam com SQLite local em `.local/`. Não há vídeos de demonstração. Esses dados não são enviados ao Worker; o módulo de demonstração só é importado pelo servidor local.

Para desenvolver com o ambiente Cloudflare:

```bash
npm install
# Copie .dev.vars.example para .dev.vars e preencha TMDB_API_KEY.
npm run dev
```

## Verificação

```bash
npm run check
npm run test:server
npm test
```

`test:server` usa SQLite nativo e não precisa de instalação. `npm test` inclui DOM e requer LinkeDOM (`npm install`). Veja [docs/VALIDACAO.md](docs/VALIDACAO.md) para os testes efetivamente realizados.

Não suba `.dev.vars`, `.env`, `.local/`, `.wrangler/` ou `node_modules/` ao GitHub. O `.gitignore` já cobre esses caminhos. Esta entrega não publica automaticamente no GitHub ou Cloudflare.

## Compatibilidade com banco antigo

A v9.3 detecta usuários com ID INTEGER e display_name e sessões com token_hash. Adiciona somente as colunas necessárias, preserva IDs, registros, papéis, bloqueios, hashes e relacionamentos, e adapta novos cadastros e sessões. A migração é automática e não exige SQL manual. Senhas de formato desconhecido do sistema anterior não são convertidas: é necessário o verificador original ou um fluxo de recuperação para autenticar essas contas antigas.
