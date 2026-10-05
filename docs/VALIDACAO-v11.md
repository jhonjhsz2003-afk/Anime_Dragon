# Validação AnimeDragon v11

Atualização de sessão, página do anime, player e comentários sobre a versão v10 já publicada.

- 148 testes aprovados, executados por arquivo com Node.js 24 e `--test-isolation=none` no ambiente local. A separação por arquivo preserva o isolamento dos mocks de rede; o ambiente local restringe a criação de processos filhos.
- Sessões novas de 30 dias; renovação da sessão válida na última semana, sem substituir token ou usuários legados. Falhas temporárias não apagam cookies ou usuário confirmado. Logout invalida consultas antigas.
- Login local conferido no navegador e conta restaurada após recarregar a página.
- Perfil, privacidade e avatar testados contra respostas atrasadas depois de logout. Revalidação não desmonta anime ou player aberto.
- Comentário e resposta publicados no SQLite local pelo navegador; respostas exibidas dentro da conversa e recolhíveis.
- API de conversas testada com paginação de raízes e respostas, aninhamento, votos, spoilers, edição, denúncia e exclusão de pai sem perder filhos.
- Player redesenhado com opções reais de fontes, legendas e velocidade, retomada ao trocar fonte, episódios recolhíveis, acesso aos comentários e destruição da mídia ao sair.
- O catálogo ilustrativo da prévia não inclui vídeos. As fontes reais continuam sendo consultadas somente no ambiente configurado de produção.

A atualização mantém o Worker `anime-dragon`, o D1 existente e os secrets já configurados. O build e os testes da publicação devem ser confirmados no GitHub/Cloudflare após o envio.
