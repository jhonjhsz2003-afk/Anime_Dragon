# AnimeDragon v25 — ranking justo e marca RGB discreta

- O ranking **não usa mais** `episode_progress` nem cliques em “Marcar assistido”.
- Só entram contas autenticadas que aceitam participar. O servidor conta **um dia ativo** após pelo menos 8 minutos de presença periódica no player, com intervalos plausíveis (45–110s); respostas rápidas, repetições e várias abas não multiplicam dias.
- O ranking mostra os **últimos 30 dias**, com máximo de um ponto por dia. Dados são apagados quando o usuário sai da participação.
- **Limitação:** como EmbedMovies é um iframe de terceiros, os sinais de atividade **não comprovam que o vídeo foi reproduzido ou assistido**. A classificação é por **dias de sessão ativa**, não minutos assistidos. Um usuário com automação ainda pode simular presença — prevenção absoluta requer uma API verificável do provedor.
- Marca AnimeDragon: apenas letras com gradiente RGB e brilho suave, sem chamas ou efeito luminoso atrás do texto. Respeita configurações de movimento reduzido.
- Publicação GitHub: `SUBIR-GITHUB.ps1` agora preserva o histórico do repositório, sem `--force` e com mensagens de falha claras.
- Migração D1: tabelas `leaderboard_sessions` e `leaderboard_daily_activity` criadas automaticamente pelo backend.
