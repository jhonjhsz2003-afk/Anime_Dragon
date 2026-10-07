# Validação AnimeDragon v14.0.0

## Verificações locais

- 240 testes passaram em 31 arquivos, executados em processos isolados. Os testes cobrem contas/sessões, banco legado, perfis, catálogo, identidade de episódios, vídeo/fontes, recuperação, legendas, interface, lançamentos e GIPHY.
- Verificação de sintaxe dos 32 módulos JS: passou.
- Bundles esbuild de Worker e app: passaram.
- Cabeçalho com busca aberta: fundo computado totalmente transparente; header terminou em 144px e Voltar começou em 152px. Teste de compactação verifica o offset após rolagem e busca.
- Rótulos EP.x mantêm temporada real nas chamadas de API; a barra branca de rolagem horizontal foi removida sem impedir teclado/toque.
- Teste real do anime The Greatest Demon Lord Is Reborn as a Typical Nobody EP.1, com assets novos e APIs v13 antigas, esgotou três tentativas automaticamente e deixou legendas extras off. A fonte adicional é a diferença necessária para esse caso e será consultada na publicação v14.

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

## GIPHY

- Galeria oficial implementada: busca literal, tendências, paginação, previews animados leves, pausa, download de GIF/foto e seleção de avatar.
- Nove testes cobrem chamadas diretas sem cookies, configuração ausente, URLs intactas, sessão/Origin, IDs/framing seguros, persistência após reinício/login, cancelamento e reprodução só perto da viewport.
- Testes da interface verificam #gifs e cancelamento ao mudar de página. Fixtures são apenas testes; a galeria de produção não contém GIFs fictícios.
- Conteúdo real precisa da chave Web GIPHY_API_KEY do responsável pelo projeto. Sem ela, mostra configuração ainda não ativada. Busca real, download e seleção reais não foram atestados sem uma chave autorizada.
- O Worker guarda apenas ID/enquadramento e não faz proxy nem cópia de mídia GIPHY. O navegador recebe somente a chave Web pública dedicada. Detalhes em GIPHY.md.

## Dados existentes e limites

O binding D1, contas e segredo de autenticação são preservados. O ZIP não contém node_modules, banco local, logs ou segredos. A publicação deve usar o mesmo Worker anime-dragon, sem migração destrutiva nem plano pago. A disponibilidade dos vídeos e o limite GIPHY pertencem aos provedores externos e variam; os testes não demonstram disponibilidade de todos os episódios do catálogo.
