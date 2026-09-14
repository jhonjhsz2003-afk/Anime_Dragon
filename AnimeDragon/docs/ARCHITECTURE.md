# Arquitetura v8

`web/`: aplicação sem framework, roteamento por hash, estilos responsivos e dragão articulado em SVG. hls.js é carregado somente para reprodução HLS que não tenha suporte nativo.

`worker.js`: Static Assets, catálogo filtrado, destaque por exibição recente, recomendações, temporadas e reprodução. Cache público só para metadados; conta, comunidade e reprodução ficam fora desse cache.

`server/database.js`: criação idempotente de tabelas e chave de instalação atômica. Reutiliza o binding D1 `DB` original. O segredo externo original, quando presente, é preservado.

`server/auth.js`: hash de senha, sessão com cookie HttpOnly, perfil e limitação de tentativas. Não confia no usuário da antiga versão localStorage.

`server/community.js`: coleções, reações, totais, comentários, respostas, edição/exclusão com autoria, denúncias e paginação. Operações autenticadas e SQL parametrizado.

`server/addon.js`: manifesto Stremio, capacidades, identificação do anime, metadados e resolução do episódio. Correspondência por ID, nunca por aproximação de título. Fontes HTTPS diretas; sem proxy genérico nem engine torrent. Falhas do provedor não geram streams fictícios.

`web/addon-mappings.json`: correspondências explícitas opcionais para IDs próprios do addon.

`web/video-sources.json`: fontes públicas explícitas opcionais, prioritárias sobre o addon.

Persistência: favoritos, assistir depois, comentários, perfil e reações no D1. Histórico, progresso do último episódio por anime, preferências e rascunhos no navegador.

Testes: servidor com SQLite em memória, protocolo Stremio simulado e DOM via LinkeDOM. Não substituem execução no Cloudflare ou inspeção visual real do navegador.
