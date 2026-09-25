# AnimeDragon Studio · v9.6

Plataforma de animes para Cloudflare Workers + Static Assets + D1, com interface em português, contas, comentários, reações, coleções e perfis públicos ou privados.

Nesta versão: menu no topo, catálogo em largura total, capas responsivas em maior resolução, início automático do episódio, tentativa de outra fonte em caso de falha e addons separados por função. Os episódios recentes e as estreias continuam em destaque no início.

## Publicar pelo GitHub

Leia PUBLICAR-ESTE-PACOTE.md. O ZIP contém a pasta AnimeDragon2: envie essa pasta para a raiz do repositório Anime_Dragon, sem criar outra pasta AnimeDragon2 dentro dela.

Cloudflare: Root directory `AnimeDragon2`, Build command `npm run build`, Deploy command `npx wrangler deploy`. Preserve o banco `DB` e o segredo `TMDB_API_KEY`. O endpoint `/api/health` deve exibir `9.6.0` depois da publicação.

## Addons

- FenixFlix, Nagare, AnimePahe e adaptador Animes BR: fontes de vídeo para IDs confirmados de animes.
- SubSense: legendas portuguesas automáticas, com conversão SRT/VTT e preferência de ativação fora do player.
- ThePirateBay+: adaptador de torrents para clientes compatíveis; não reproduzem no HTML video. Os controles e nomes dos addons não aparecem na interface.
- AIO Metadata: complemento de sinopse e elenco, condicionado ao segredo AIOMETADATA_MANIFEST_URL com um manifesto configurado.

Consulte docs/ADDONS-v9.6.md para funções, configuração e limites. Na verificação de 24/09/2026, Animes BR estava desativado pelo provedor e o endereço genérico do AIO devolvia 404. Ter um manifesto que responde não garante vídeos disponíveis ou compatíveis em todo o acervo.

## Desenvolvimento e validação

Requer Node.js 22.13 ou superior. Instale as dependências com `npm install`. Comandos: `npm run preview`, `npm run build`, `npm run test:server` e `npm test` (inclui os testes de DOM com linkedom). A prévia sem TMDB_API_KEY usa histórias ilustrativas e não fornece episódios reais.

Os vídeos vêm dos servidores dos provedores. O aplicativo não inclui arquivos de episódios, motor de torrents ou transcodificação. Autoplay depende das regras do navegador: tenta áudio, depois modo sem som, e apresenta um botão se necessário. Os recursos do Worker Free continuam sujeitos às cotas, inclusive as requisições de segmentos HLS.
