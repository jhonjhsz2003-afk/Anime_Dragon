# AnimeDragon v12 — validação em 5 de outubro de 2026

## Implementação

- Detalhe amplo com herói à esquerda, header persistente e grade responsiva de episódios.
- Temporada única sem seletor; especiais continuam disponíveis. Ordenação por botão e busca na temporada inteira.
- Lotes de 40 episódios, imagens w500 com srcset e layout de cards fora da tela adiado.
- Novo modal de entrar/criar conta em preto e azul com fogo CSS e preferência de movimento reduzido.
- Atmosfera, moldura e título de perfil com prévia instantânea; persistência em tabela profile_identity aditiva no D1.
- Contas, IDs, hashes, AUTH_SECRET, biblioteca e cookie HttpOnly de 30 dias preservados.
- Animações curtas, controles de toque maiores, pausa de fogo em abas ocultas.
- Catálogo inicia detalhes em paralelo, limita espera das listas auxiliares a 2,5 s e recupera respostas parciais com cache de 15 s.

## Verificação local

161 testes passaram em 24 arquivos. No ambiente Windows restrito, cada arquivo foi executado com `node --test --test-isolation=none`; o runner normal usa subprocessos bloqueados pelo ambiente. Todos os arquivos JavaScript foram verificados com `node --check`.

Os testes cobrem autenticação e renovação de sessões, banco legado, personalização após reinicialização, perfil público/privado, header e foco, player, busca, cache, temporadas longas de 1.500 episódios, filtros, comentários e fontes.

Uma prévia com SQLite local verificou cadastro, personalização, logout/login e restauração. A inspeção no Chromium verificou detalhe, login sobre o anime e perfil, além do layout móvel. O catálogo desta prévia é ilustrativo; ela não contém episódios reais.

O Wrangler local foi limitado pelo bloqueio de subprocessos (`spawn EPERM`). O build completo e a publicação devem ser confirmados no GitHub/Workers Builds. `npm ci`, `npm run build` e `npm test` continuam no CI.

## Limites

Desempenho de rede e reprodução externa dependem do dispositivo, da conexão e dos provedores. Os testes não garantem disponibilidade de vídeo em todo o catálogo. As contas de produção ficam no D1 existente; não é necessário recriar banco ou segredos para esta atualização.
