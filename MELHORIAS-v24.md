> **Histórico:** o ranking descrito nesta versão foi substituído pelo sistema de atividade da v25. Consulte `MELHORIAS-v25.md`.

# AnimeDragon v24 — alterações e limitações reais

- **Continuar assistindo:** registra localmente os episódios abertos. Para o iframe do EmbedMovies, não há acesso aos minutos ou ao estado real da reprodução; não há promessa de retomada no segundo exato. Vídeos no player próprio ainda podem registrar o tempo.
- **Ranking:** painel ao lado de sair; até quatro contas que escolheram participar. Ordenado por episódios distintos explicitamente **marcados como assistidos** no banco D1. Não contabiliza simplesmente o clique/abertura e não rastreia minutos dentro do EmbedMovies. A participação é revogável dentro do painel; nome e avatar ficam públicos somente para participantes.
- **Aberturas:** continua disponível o botão de pular abertura quando o vídeo roda no player próprio e existe uma marcação de tempo válida. **Não é possível** pular introduções programaticamente dentro do EmbedMovies (iframe de outro domínio sem API de controle documentada).
- **Marca:** nome AnimeDragon animado em chama/glow azul e reflexos elétricos, com respeito a `prefers-reduced-motion` e à preferência do usuário por reduzir efeitos.
- **Deploy:** o Worker já cria automaticamente a tabela `leaderboard_optin` ao atender uma chamada de comunidade. Em uma instalação nova, `db/schema.sql` também a contém.
- **Teste necessário:** depois do deploy, entrar com conta, abrir episódio externo, voltar à Home e ver o cartão. Marcar episódios como assistidos, ativar participação e abrir o ranking com outra conta. Verificar no navegador real; os vídeos externos não foram testados neste ambiente.
