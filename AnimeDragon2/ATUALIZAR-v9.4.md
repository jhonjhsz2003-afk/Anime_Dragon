# Atualização v9.4 — player amplo e reprodução

1. Extraia AnimeDragon-atualizacao-player-v9.4.zip.
2. No GitHub, abra a pasta que já contém package.json, worker.js e wrangler.toml. Na estrutura diagnosticada, ela é AnimeDragon2/AnimeDragon.
3. Envie o CONTEÚDO extraído dentro dessa pasta, mantendo os caminhos server/, web/ e tests/. Substitua os arquivos existentes. Não crie uma nova pasta AnimeDragon dentro dela.
4. Faça o commit na branch main e aguarde o novo deploy da Cloudflare.
5. Confira /api/health: a versão deve ser 9.4.0. Recarregue o site com Ctrl+F5.

Mantenha o Root directory que já funcionou, Build command npm run build e Deploy command npx wrangler deploy. O pacote de atualização não troca wrangler.toml, DB, segredos, mapeamentos ou fontes personalizadas.

## Player

- Ocupa a janela inteira, com tema azul, apenas um Voltar, lista e busca de episódios.
- Controles próprios: reproduzir/pausar, posição, volume, 10 segundos, velocidade, tela cheia e picture-in-picture quando suportado.
- Modo cinema, anterior/próximo, preferência de próximo automático, retomada e histórico local.
- Favoritos, assistir depois, acompanhar, gostei/não gostei, marcar assistido e acesso ao debate real do episódio.
- Fontes reais do provedor, atualização/repetição da busca, troca preservando o ponto atual e mensagens distintas para conexão/decodificação.
- Legendas WebVTT quando fornecidas e permitidas pelo servidor de legendas. Não inventa faixas de áudio, legendas ou resoluções que o provedor não oferece.

## Diagnóstico da fonte de Re:ZERO

A API respondeu e retornou uma fonte. O arquivo recebido foi identificado como video/x-matroska, com vídeo HEVC, áudio AAC e legendas internas ASS. O adaptador antigo rotulava URLs sem extensão como MP4; isso foi corrigido. O elemento de vídeo antigo também exigia CORS, embora o servidor dessa mídia não devolvesse esse cabeçalho; a exigência foi removida da reprodução nativa direta.

O arquivo original continua sendo MKV/HEVC. A compatibilidade depende do navegador, sistema e codec. Esta atualização não converte vídeo e não garante que essa fonte reproduza em todos os dispositivos. Para compatibilidade ampla, o provedor precisa oferecer uma fonte apropriada para web, por exemplo MP4/H.264 com AAC, ou HLS compatível. HLS.js e legendas externas ainda precisam da permissão CORS do servidor que os fornece. Nenhum proxy de vídeo foi adicionado ao Worker.

## Correções anteriores incluídas

Inclui a v9.3: cadastro compatível com o banco antigo de IDs numéricos e sessões token_hash, preservando dados; faixa preta larga removida da página do anime. A migração é automática, sem apagar o D1. O formato das senhas das contas do sistema antigo não foi fornecido: seus hashes são preservados, mas sua autenticação antiga não foi validada.

## Validação

39 testes de servidor passaram, além das verificações de sintaxe. No navegador: player em janela completa, avanço de episódio, modo cinema, layout a 390px e um único botão Voltar. Um teste local separado, com áudio WAV sintético de 60 segundos servido sem CORS, confirmou reprodução nativa, retomada, velocidade, avanço, recuperação após uma fonte inválida preservando a posição e descarte da mídia. Favoritos e votos foram conferidos na interface com dados de teste; persistência real e isolamento entre contas são cobertos pelos testes de servidor. A mídia e o cenário de teste não fazem parte do site distribuído.

A reprodução do episódio real após esta correção ainda precisa ser confirmada no seu navegador depois do deploy. Os testes não equivalem a uma validação de HEVC em todos os dispositivos.
