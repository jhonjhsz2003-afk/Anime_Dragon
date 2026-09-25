# Publicar AnimeDragon v9.6

1. Extraia AnimeDragon-v9.6-GitHub.zip. A pasta do site se chama AnimeDragon2.
2. No GitHub, abra a RAIZ do repositório Anime_Dragon. Envie a pasta AnimeDragon2 inteira para substituir os arquivos correspondentes. Não envie só o ZIP e não aninhe AnimeDragon2/AnimeDragon2.
3. Confirme o novo commit. No Cloudflare, use esse commit novo; repetir um build antigo pode publicar arquivos antigos.
4. Root directory: AnimeDragon2
5. Build command: npm run build
6. Deploy command: npx wrangler deploy
7. Mantenha o D1 existente, binding DB, e o segredo TMDB_API_KEY. Não apague contas nem recrie o banco.
8. Após o deploy, /api/health deve retornar version 9.6.0. Recarregue o site com Ctrl+F5.

## O que mudou

Menu lateral substituído por navegação superior, incluindo perfil e preferências. Catálogo ocupa a largura disponível, com layout responsivo. Capas usam versões de 342, 500 e 780 pixels conforme a tela; destaques e prévias usam a imagem original quando a economia de dados está desativada. Não é possível reconstruir detalhes que não existam na imagem do fornecedor.

O clique em um episódio inicia uma tentativa automática de reprodução, independentemente de “Próximo automático”. Se o navegador bloquear áudio, o player tenta sem som e mostra Ativar som. Fontes chegam em paralelo; erro de uma fonte tenta as demais. O carregamento das legendas é independente, e a legenda portuguesa é escolhida automaticamente quando essa preferência estiver ativada.

Os cinco addons pedidos estão representados por suas funções reais. SubSense configurado para idiomas português/inglês; o adaptador ThePirateBay+ identifica torrents para clientes compatíveis. Nomes e controles de addons não aparecem no site. AIO requer seu manifesto pessoal no segredo AIOMETADATA_MANIFEST_URL. Animes BR está integrado, mas o servidor informado estava desativado. Instruções e evidências em docs/ADDONS-v9.6.md.

Player simplificado: removidos modo cinema, janela flutuante, fontes, velocidade, seletor de legendas e atualização manual de fontes. Barras de progresso e volume personalizadas em azul; marcar como assistido e comentários com curtidas diretamente abaixo do vídeo.

## Verificação

71 testes de servidor/unidade passaram e a sintaxe do build foi verificada. No navegador: menu superior conferido em desktop e celular, sem transbordamento horizontal da página; reprodução automática testada com mídia sintética local, recuperação após uma fonte inválida, troca de episódio e leitura de legenda SRT externa. A suíte antiga de DOM que requer linkedom não foi executada neste ambiente.

Os testes não equivalem a reprodução integral do acervo em produção. Fontes, direitos de acesso, codecs, disponibilidade e velocidade dependem também dos provedores e do navegador. Nenhum serviço pago foi ativado.

Navegação: cache de catálogo público entre recarregamentos, preparação das páginas ao apontar/focar o destino, limite de duas preparações simultâneas e renderização adiada de seções fora da tela. Não armazena contas, comentários, perfis privados nem links de vídeo no cache de catálogo. Respeita economia de dados. Fontes torrent não atrasam a busca por vídeo nativo.
