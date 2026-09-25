# Publicar AnimeDragon v9.6.1

1. Extraia AnimeDragon-v9.6.1-GitHub.zip. A pasta do site se chama AnimeDragon2.
2. No GitHub, abra a RAIZ do repositório Anime_Dragon. Envie a pasta AnimeDragon2 inteira para substituir os arquivos correspondentes. Não envie só o ZIP e não aninhe AnimeDragon2/AnimeDragon2.
3. Confirme o novo commit. No Cloudflare, use esse commit novo; repetir um build antigo pode publicar arquivos antigos.
4. Root directory: AnimeDragon2
5. Build command: npm run build
6. Deploy command: npx wrangler deploy
7. Mantenha o D1 existente, binding DB, e o segredo TMDB_API_KEY. Não apague contas nem recrie o banco.
8. Após o deploy, /api/health deve retornar version 9.6.1. Recarregue o site com Ctrl+F5.

## O que mudou

Menu lateral substituído por navegação superior, incluindo perfil e preferências. Catálogo ocupa a largura disponível, com layout responsivo. Capas usam versões de 342, 500 e 780 pixels conforme a tela; destaques e prévias usam a imagem original quando a economia de dados está desativada. Não é possível reconstruir detalhes que não existam na imagem do fornecedor.

O clique em um episódio inicia uma tentativa automática de reprodução, independentemente de “Próximo automático”. Se o navegador bloquear áudio, o player tenta sem som e mostra Ativar som. Fontes chegam em paralelo; erro de uma fonte tenta as demais. O carregamento das legendas é independente, e a legenda portuguesa é escolhida automaticamente quando essa preferência estiver ativada.

Os cinco addons pedidos estão representados por suas funções reais. SubSense configurado para idiomas português/inglês; o adaptador ThePirateBay+ identifica torrents para clientes compatíveis. Nomes e controles de addons não aparecem no site. AIO requer seu manifesto pessoal no segredo AIOMETADATA_MANIFEST_URL. Animes BR está integrado, mas o servidor informado estava desativado. Instruções e evidências em docs/ADDONS-v9.6.md.

Player simplificado: removidos modo cinema, janela flutuante, fontes, velocidade, seletor de legendas e atualização manual de fontes. Barras de progresso e volume personalizadas em azul; marcar como assistido e comentários com curtidas diretamente abaixo do vídeo.

## Verificação

83 testes de servidor/unidade passaram e a sintaxe do build foi verificada. No navegador: menu superior conferido em desktop e celular, sem transbordamento horizontal da página; reprodução automática testada com mídia sintética local, recuperação após uma fonte inválida, troca de episódio e leitura de legenda SRT externa. A suíte antiga de DOM que requer linkedom não foi executada neste ambiente.

Os testes não equivalem a reprodução integral do acervo em produção. Fontes, direitos de acesso, codecs, disponibilidade e velocidade dependem também dos provedores e do navegador. Nenhum serviço pago foi ativado.

Navegação: cache de catálogo público entre recarregamentos, preparação das páginas ao apontar/focar o destino, limite de duas preparações simultâneas e renderização adiada de seções fora da tela. Não armazena contas, comentários, perfis privados nem links de vídeo no cache de catálogo. Respeita economia de dados. Fontes torrent não atrasam a busca por vídeo nativo.

## Correções 9.6.1

- Busca automática desde uma letra, com sugestões, teclado e cancelamento das consultas anteriores.
- Player encerra áudio/vídeo ao voltar, mudar de página e remover a janela. A limpeza não depende do salvamento de histórico.
- Troca antecipada de uma fonte opaca que ainda não iniciou para uma alternativa de formato identificado. O prazo fixo foi substituído por detecção de inatividade (8 segundos), com limite total de inicialização de 30 segundos por tentativa. Não interrompe um carregamento que avança aos 10 segundos.
- Preparação do episódio ao apontar/focar nele, respeitando economia de dados.
- Legendas seguem idioma e região do navegador. PT-BR e PT-PT têm preferências distintas; espanhol, inglês e outros idiomas suportados são enviados ao serviço de legendas. Não usa IP nem localização GPS. Se não houver legenda no idioma, não escolhe outro idioma sem preferência correspondente. Legendas gravadas na imagem do vídeo não podem ser alteradas.

Verificação adicional: 83 testes passaram. No navegador, uma fonte sintética travada foi substituída e começou em cerca de 1,25 segundo; isso é um teste local, não promessa para provedores externos. Sair antes da resposta deixou o vídeo pausado, sem URL e sem nenhuma reprodução tardia. Remover a janela durante a reprodução também encerrou a mídia, mesmo simulando falha ao salvar o histórico. Busca conferida com uma letra e refinamento posterior.

Diagnóstico público: Solo Leveling T1E1 reproduziu no site 9.6.0 durante a verificação. A fonte inicial devolveu Matroska e a alternativa HLS apresentou latência. Não é possível garantir que todos os episódios e servidores externos estarão disponíveis. Esta correção não transcodifica MKV nem contrata serviços pagos.
