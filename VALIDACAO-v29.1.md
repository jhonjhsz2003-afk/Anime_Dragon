# Validação v29.1

- `npm run check`: passou (checagem de sintaxe).
- Suíte completa `npm test`: **160 passaram, 9 falharam** porque `linkedom` está incompleto neste ambiente (arquivo do pacote ausente).
- Novos testes: deduplicação de chamadas simultâneas, `Retry-After` 429, chave separada e renderização de stickers a partir da resposta de pesquisa: passaram.
- Teste real contra GIPHY/Cloudflare: **não executado**; não foi possível confirmar recuperação imediata da cota.
- Build e deploy no Cloudflare: **não executados**.

O provedor mantém seu próprio limite: não contornar, não usar proxy e não guardar URLs de mídia.
