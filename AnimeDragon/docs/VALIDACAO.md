# Validação da v9.2

## Testes executados

34 testes de servidor passaram em Node.js 24 com SQLite real em memória. Incluem autenticação, catálogo, IDs de episódios, fontes, votos únicos/troca/remoção, autorização, isolamento entre animes e usuários, texto duplicado normalizado, edição/exclusão, reserva atômica, biblioteca com status exclusivo, progresso persistente, ordenação por votos e migração v8 sem restaurar itens removidos.

Comando: `node --test tests/community-v9.test.js tests/worker.test.js tests/addon.test.js`.

## Navegador real

Inspeção de layout em celular e desktop. Verificados cadastro, avatar animado, detalhes, episódios, marcação de assistido, comentário salvo, incremento do voto e mensagem de rejeição ao repetir a publicação. Os testes locais não publicam no site real. Dados ficam em .local, excluído do ZIP final.

## Limites

Deploy no Cloudflare, D1 remoto e Secrets não foram executados. Catálogo local é ilustrativo; TMDB e fontes externas exigem credenciais/configuração. A reprodução real não foi validada sem fonte disponível; os testes de provedor usam respostas controladas. A suíte LinkeDOM depende de instalação das dependências; não equivale à inspeção em todos os dispositivos.

Também conferidos no navegador: retorno player → episódios → catálogo → início; ausência de Sobre; os 19 gêneros/temas; Isekai com resultado filtrado; layout sem transbordamento horizontal em viewport de 390px. A suíte DOM não foi executada nesta sessão porque o download das dependências foi bloqueado pelo ambiente. Os arquivos da suíte foram atualizados e passaram pela verificação de sintaxe.

Revisão final do player no navegador: 1 botão Voltar no topo, 0 botões Fechar e 0 botões Voltar aos episódios na parte inferior.

Atualização v9.1: testes adicionais de privacidade pública/privada e autorização do proprietário, cor de nome, atividade de reprodução, upload preservando bytes originais, limites/tipos de arquivo, enquadramento e remoção de foto. Conferidos no navegador: editor de foto/GIF, cores de nome, perfil compartilhável e cards com etiquetas diferentes. Os dois cards medidos tiveram altura de 466,406 px e seus seletores ficaram exatamente na mesma coordenada vertical. Nenhum erro de console nessa verificação.

Atualização v9.2: arte celestial azul integrada em cadastro e login. Verificados visualmente ambos os formulários, botão de pausa/retomada e layout com viewport de 390px, sem transbordamento horizontal. Nenhum erro de console na conferência. A animação usa CSS e deslocamento SVG; não é um arquivo GIF ou vídeo.
