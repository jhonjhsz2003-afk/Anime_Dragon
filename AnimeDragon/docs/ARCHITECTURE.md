# Arquitetura do AnimeDragon

- `web/`: HTML, CSS, JavaScript nativo e avatares SVG. Rotas por hash, inclusive telas próprias de cadastro e login.
- `worker.js`: entrega estática, catálogo restrito a animes, cache público e resolução de fontes de vídeo.
- `server/auth.js`: cadastro, login, sessão e atualização de perfil no D1.
- `db/schema.sql`: schema original compatível, índices de sessão e contadores de tentativas adicionados sem apagar dados.
- `web/video-sources.json`: fontes públicas de mídia configuradas pelo operador, inicialmente vazio.
- `tests/worker.test.js`: testes isolados com SQLite em memória e metadados simulados.

## Fluxos

Catálogo: navegador → `/api/catalog/*` → cache público → API de metadados. O servidor aplica gênero de animação e origem japonesa; filmes são rejeitados inclusive em rotas antigas. Resultados da busca são filtrados antes de chegar à interface.

Capas: navegador → CDN de imagens, com tamanhos 185/342/500 e prioridade de carregamento. Logo e arte do dragão usam WebP local; avatares são SVG locais. Falhas de imagem exibem um placeholder e não repetem requisições indefinidamente.

Contas: navegador → API na mesma origem → D1. Sessão identificada por cookie HttpOnly; catálogo nunca compartilha cache com autenticação ou reprodução. Perfil é buscado no servidor, sem confiar no objeto de usuário da antiga versão demo.

Coleções: localStorage separado por ID do usuário ou visitante. Armazena título completo com ID estável; listas não dependem de o anime estar na página inicial. Sem sincronização entre dispositivos. Migração limitada dos favoritos antigos por nome quando o título aparece no catálogo carregado.

Episódios: detalhes → temporadas fornecidas pelo catálogo → seleção com guardas contra respostas atrasadas → episódios ordenados → busca por número/nome → seleção → fonte configurada → controles nativos de vídeo.

Rotas de calendário/notificações e filmes da versão anterior não são expostas. Calendário/notificações eram conteúdo fictício e não tinham integração real.

O cron limpa sessões e limites expirados. Não há sincronização automática de catálogo no D1 ou dependência R2; os dados vêm do provedor com cache.
