# Correção do GitHub Actions — AnimeDragon v28

Esta entrega contém uma **correção dos testes da v28**, sem mudar o código de reprodução, contas, ranking ou banco de dados. A API `/api/health` continua retornando a versão **28.0.0** depois de um deploy bem-sucedido.

## O que foi corrigido

1. `tests/detail-layout.test.js` executa apenas parte de `web/js/app.js` dentro de uma VM. Ele agora fornece um *stub* `stopRankingPresence` no contexto isolado. O site real já define essa função em `app.js` e continua encerrando a presença normalmente.
2. O teste da ação **Continuar** agora exige que o botão retome o **EP.2 salvo no histórico**, em vez de esperar que volte ao EP.1 apenas porque o EP.2 foi marcado manualmente como assistido.
3. O teste do cartão de histórico da **temporada 2** agora espera a indicação `T2 · EP.3` e confere o atributo `data-season="2"`, que faz parte do visual atual.

Os testes não foram desativados; suas expectativas foram alinhadas ao comportamento intencional da v28.

## Verificação desta entrega

- `npm run check`: passou.
- `npm test`: 152 passaram; 9 não puderam carregar `linkedom` neste ambiente, pois o registro npm estava inacessível (`EAI_AGAIN`). Assim, a suíte com DOM precisa ser executada no GitHub Actions após `npm ci`.
- O ZIP foi gerado sem `node_modules`, `.local`, segredos ou dados de teste.

## Como atualizar

1. Extraia o ZIP em uma pasta nova.
2. Execute `SUBIR-GITHUB.ps1` dentro dela; o script cria o commit **AnimeDragon**, sem `--force`.
3. Confira o novo workflow **Validar AnimeDragon** no GitHub Actions.
4. Se **Workers Builds: site** continuar falhando em `Cloning repository`, isso é **outro problema**, na conexão/obtenção do repositório pela Cloudflare. Confira a integração Git no painel ou use `PUBLICAR-CLOUDFLARE.ps1` para fazer um deploy manual pelo seu PC **somente depois de os testes passarem**. O script confirma que o `wrangler.toml` usa `name="site"`.

Não exclua o Worker `site` nem o banco D1; isso não resolve um erro de clonagem.
