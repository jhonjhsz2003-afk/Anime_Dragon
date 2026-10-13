# Validação v26

- Código de servidor e web verificado via `npm run check`.
- Testes direcionados de adaptação, seleção de áudio, fontes bloqueadas, episódios e intro passaram.
- Suíte completa depende da instalação de `linkedom`: a tentativa de `npm ci --offline` não completou porque faltava pacote no cache do ambiente. A versão implantada deve passar por CI com `npm ci` disponível.
- Publicação Cloudflare, disponibilidade real da API, autorização de distribuição, HLS e CORS **não foram validadas** neste ambiente.
- Desligamento seguro: `ANIMEFIRE_ENABLED = "false"` em wrangler.toml e nova publicação.
