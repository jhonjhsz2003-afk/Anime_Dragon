# Validação AnimeDragon v25

## Resultado dos testes neste ambiente

- `npm run check`: passou (checagem de sintaxe dos arquivos JS principais).
- `node --test tests/ranking-v25.test.js`: passou. O teste exercita registro, participação voluntária, rejeição de batidas imediatas, validação de token, limite de um dia, opt-out, proteção CSRF e marcações manuais sem pontuação.
- `node --test tests/v24-features.test.js`: passou após atualizar os cenários para o design v25.
- `node --test tests/*.test.js`: 147 passaram, 9 falharam porque a dependência de testes `linkedom` não estava instalada neste ambiente.
- `npm ci --offline`: não concluído: pacotes não estavam em cache. Portanto o build com Wrangler não foi validado aqui.
- GitHub/Cloudflare: publicação real ainda depende de execução do usuário.

## Limites do ranking

Contamos somente **dias de sessão ativa no player** nos últimos 30 dias, com autenticação e opção de participar. Cada dia vale no máximo um ponto; episódio marcado manualmente não pontua. São exigidos ao menos 8 minutos de sinais de atividade espaçados e aceitos pelo servidor, com proteção contra chamadas rápidas, sessões repetidas e tentativas sem token válido. Ao sair do ranking, os dados da pontuação são excluídos.

**O EmbedMovies não fornece prova de reprodução por iframe.** Portanto, essa pontuação é uma medida de presença na tela do player, não prova de que um vídeo foi assistido. Não se pode garantir proteção total contra automação. Para contabilizar minutos realmente vistos, é preciso um provedor com API autenticada de eventos de reprodução confiáveis.

## GitHub — solução para falhas frequentes

O novo `SUBIR-GITHUB.ps1` executa `git clone` da branch `main` para uma pasta temporária, substitui os arquivos do projeto nesse clone e faz commit + push normal. Não usa `git init` nem `--force` e preserva o histórico do GitHub.

Se aparecer **Git não encontrado**, instale Git for Windows e reabra o PowerShell.
Se aparecer **nome ou e-mail ausente**, execute os comandos de configuração exibidos na mensagem.
Se aparecer **Authentication failed/403**, faça login na sua conta GitHub e confirme que pode gravar nesse repositório.
Se aparecer **rejected/non-fast-forward**, execute o script novamente: ele fará um clone novo.
Se a execução do `.ps1` for bloqueada pelo Windows, consulte a política de execução e permita scripts confiáveis para a sessão ou cole manualmente comandos revisados.
Se persistir um erro, envie o texto **completo** das linhas vermelhas do PowerShell, removendo tokens ou informações privadas.
