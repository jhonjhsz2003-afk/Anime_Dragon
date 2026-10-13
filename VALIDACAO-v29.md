# Validação AnimeDragon v29

## Alterações implementadas
- 12 atmosferas selecionáveis com prévia instantânea.
- 30 molduras existentes preservadas e agrupadas em sua própria aba.
- Sticker editor: pesquisa da API oficial GIPHY Stickers, resultados com prévia, adicionar até 6, arrastar (mouse/toque), setas do teclado, redimensionar/remover, salvar no D1.
- Somente IDs e coordenadas de stickers são salvos. Nenhuma URL de mídia nem chave GIPHY entra na tabela.
- Exibição com CSS RGB limitada às letras, sem recolorir emojis/coroas.
- Coleção como primeiro painel; personalização, foto e privacidade em abas separadas.
- Cartazes ampliados no perfil público, títulos e capas mantidos.

## Testes locais
- `npm run check`: aprovado.
- `node --test tests/*.test.js`: 165 testes, 156 aprovados, 9 impedidos pela instalação incompleta de `linkedom` neste ambiente. Os 9 erros de dependência são anteriores às alterações v29; não são testes executados com resultado positivo.
- `node --test tests/profile-identity.test.js tests/profile-stickers-ui.test.js`: 8/8 aprovados.
- Testes v29 verificam persistência real do D1, perfis públicos, limite de seis stickers, posição/tamanho, rejeição de URLs e IDs inválidos, nova pesquisa GIPHY e estrutura das abas.
- Prévia automatizada Chromium: bloqueada pelo ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR` no endereço localhost). O layout final de produção não foi confirmado.
- Deploy Cloudflare: não executado. O Worker `site` e o banco D1 existentes não foram alterados fora da cópia local.

## Publicação e conferência manual
1. Faça backup do banco D1. Publique em um commit GitHub separado, executando o script `SUBIR-GITHUB.ps1`.
2. Aguarde o GitHub Actions. Se a Cloudflare falhar em `Cloning repository`, trate a integração Git separadamente ou use `PUBLICAR-CLOUDFLARE.ps1` depois de passar nos testes no computador.
3. Abra `/#profile`, vá em **Personalizar**, escolha Atmosfera, Moldura e Stickers GIPHY. Arraste os stickers e clique **Salvar alterações**.
4. Faça logout/login e confira a preservação. Abra `/#profile?user=SEU_ID` para conferir o perfil compartilhável e o tamanho dos cartazes.
5. A pesquisa de stickers usa a mesma variável `GIPHY_API_KEY` da galeria de GIFs. Se estiver ausente ou houver limite de API, a busca exibirá mensagem de erro sem quebrar o restante do perfil.
