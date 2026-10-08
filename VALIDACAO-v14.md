# Validação mais recente: AnimeDragon v14.1.0

- 87 testes passaram em sete arquivos: opening-skip (6), opening-times (10), player-v11 (19), worker (17), ui (28), player (2), playback-recovery (5).
- Sintaxe dos 33 módulos: passou. Bundles do Worker e app via esbuild: passaram. Wrangler dry-run local indisponível porque o sandbox bloqueia subprocessos; a publicação será validada pelo build do GitHub/Cloudflare.
- Prévia local com catálogo/fontes públicas reais: Jujutsu Kaisen EP.3, vídeo 1434.975627 s, marcação 191.727–282.077 s. Botão visível em 217.343964 s; clique avançou exatamente para 282.077 s, ocultou o botão e preservou a pausa. Screenshot em outputs/AnimeDragon-v14.1-abertura-qa.png.
- Kaiju EP.2 recebeu cortes com duração ~1420.044 s, enquanto o registro é 1421.046 s; diferença acima de 1 s oculta o botão. Isso confirma a recusa de outro corte, sem estimar/ajustar a abertura.
- Marcações comunitárias dependem da cobertura e qualidade do AniSkip. Correspondência explícita inclui 6.418 temporadas, sem garantir marcações para todos os episódios. Licença/proveniência em ANISKIP.md.

## Validações anteriores

# Validação AnimeDragon v14.0.1

## Verificações locais

- 242 testes passaram em 31 arquivos, executados em processos isolados. Os testes cobrem contas/sessões, banco legado, perfis, catálogo, identidade de episódios, vídeo/fontes, recuperação, legendas, interface, lançamentos e GIPHY.
- Verificação de sintaxe dos 32 módulos JS: passou.
- Bundles esbuild de Worker e app: passaram.
- Cabeçalho com busca aberta: fundo computado totalmente transparente. Voltar agora ocupa a própria masthead; as abas do anime ficam no fluxo da página e não cobrem a busca de episódios. Prévia de390px não apresentou overflow; botão permanece44px. Voltar de um link direto fecha para#home e Voltar da busca conserva a pesquisa, sem abrir about:blank.
- Rótulos EP.x mantêm temporada real nas chamadas de API; a barra branca de rolagem horizontal foi removida sem impedir teclado/toque.
- Teste inicial com APIs v13 antigas confirmou três tentativas automáticas sem cliques repetidos. Na produção v14 publicada pela PR6, The Greatest Demon Lord Is Reborn as a Typical Nobody EP.1 reproduziu20 segundos pela alternativa italiana; Kaiju No.8 EP.1 reproduziu36 segundos e EP.2 reproduziu32 segundos pela FenixFlix PT-BR. Todos mantiveram legendas extras off e readyState4. O refinamento14.0.1 altera somente navegação/layout e versão, preservando esse player.

## Reprodução e fontes

- Recuperação por episódio: até 3 consultas, esperas 900/2400 ms e teto 45 s. Resultados vazios, erros de API e falhas de mídia compartilham o limite; fechamento e troca cancelam requests/timers. Autoplay bloqueado conserva a fonte válida e permite play manual.
- Faixas nativas/HLS/Shaka e legendas externas começam desligadas. Seleção manual continua disponível. Texto branco com sombra/contorno e fundo transparente; estilos de legenda que criavam caixa preta são removidos.
- Italian HTTPS: adapter usa TMDB, temporada e episódio exatos. Greatest Demon Lord120155 EP.1, Kaiju207468 EP.1 e Solo Leveling127532 EP.1 retornaram MP4 direto GET206, video/mp4 e assinatura ftyp. A fonte está identificada IT, sem promessa de áudio/legenda PT-BR. Heavy Knight270603 não respondeu nessa fonte extra.
- Provedores anteriores podem continuar indisponíveis: Nagare respondeu502 e Animes BR402. Essas falhas externas não são contornadas nem convertidas em falsos vídeos.
- Fonte adicional: https://github.com/jappoman/stremio-italian-https . Não exige cookies, cabeçalhos especiais ou instalação no dispositivo para os streams observados.

## Lançamentos

- Resumo: só duas consultas de descoberta e zero detalhes por título. Primeiras estreias confirmadas aparecem antes da etapa de datas detalhadas.
- Consulta completa: orçamento4 s, no máximo 42 requests / 6 simultâneos, respeitando o orçamento do Worker gratuito. Consolidação preserva filtro, remove duplicatas e conserva cards se a segunda etapa falhar.
- Cache curto: 15 s para resposta parcial/resumo e 60 s para completa. Só datas futuras são mostradas; data de chegada do vídeo não é inventada.
- Produção v14: resumo entregou13 estreias em543ms e a etapa completa entregou33 eventos em2828ms (séries, temporadas e episódios), todos futuros. Medidas pontuais, sujeitas à rede e aos provedores.

## GIPHY

- Galeria oficial implementada: busca literal, tendências, paginação, previews animados leves, pausa, download de GIF/foto e seleção de avatar.
- Nove testes cobrem chamadas diretas sem cookies, configuração ausente, URLs intactas, sessão/Origin, IDs/framing seguros, persistência após reinício/login, cancelamento e reprodução só perto da viewport.
- Testes da interface verificam #gifs e cancelamento ao mudar de página. Fixtures são apenas testes; a galeria de produção não contém GIFs fictícios.
- Conteúdo real precisa da chave Web GIPHY_API_KEY do responsável pelo projeto. Sem ela, mostra configuração ainda não ativada. Busca real, download e seleção reais não foram atestados sem uma chave autorizada.
- O Worker guarda apenas ID/enquadramento e não faz proxy nem cópia de mídia GIPHY. O navegador recebe somente a chave Web pública dedicada. Detalhes em GIPHY.md.

## Dados existentes e limites

O binding D1, contas e segredo de autenticação são preservados. O ZIP não contém node_modules, banco local, logs ou segredos. A publicação deve usar o mesmo Worker anime-dragon, sem migração destrutiva nem plano pago. A disponibilidade dos vídeos e o limite GIPHY pertencem aos provedores externos e variam; os testes não demonstram disponibilidade de todos os episódios do catálogo.
# Ajuste visual v14.0.2

O selo isolado do rodapé foi removido de todas as páginas. A galeria e a prévia conservam apenas a atribuição oficial compacta e transparente, junto aos controles. Os nove testes de GIPHY passaram novamente; sintaxe do aplicativo validada. A integração foi ativada na produção e a busca Naruto, prévias animadas e download de um GIF real foram conferidos no navegador.

A personalização do nome aceita de 1 a 80 caracteres visíveis, incluindo emojis com combinação, símbolos e letras estilizadas. E-mail, ID, senha e sessões são preservados. A bio mantém um limite independente de 300 caracteres; entradas vazias, linhas adicionais e controles invisíveis são recusados.

Após esse ajuste, 44 testes de perfil, compatibilidade de contas antigas, interface e GIPHY passaram. A validação cobre nome de um caractere, texto estilizado persistindo após login, contagem de emojis compostos, limite independente da bio, atualização atômica e exibição de símbolos como texto sem injetar elementos HTML.
