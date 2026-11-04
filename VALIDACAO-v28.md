# AnimeDragon v28 — validação e limitações

## Mudanças

- EmbedMovies é a única fonte configurada. AnimeFire foi removido do fluxo, módulos, variáveis de ambiente e CSP.
- A data do TMDB não bloqueia o clique nos episódios já listados. O iframe pode informar indisponibilidade; não há consulta oficial do EmbedMovies que confirme antecipadamente o vídeo.
- Os detalhes TMDB têm cache mais curto, mas o site não tem acesso antecipado a episódios ainda não cadastrados pelo TMDB.
- Perfil e Minha lista exibem Favoritos, Minha lista, Acompanhando, somente adicionados explicitamente. O histórico de reprodução continua independente.
- 30 molduras CSS; 13 cores fixas e 14 RGB animadas. Preferências antigas preservadas por leitura compatível. Duas tabelas v28 são criadas automaticamente no D1 na inicialização.
- Ranking consultado com cache curto no navegador e Worker. Só pontua um dia de sessão ativa depois de 8 minutos; não comprova vídeo assistido dentro de iframe.

## Testes neste ambiente

- `npm run check`: passou.
- `node --test tests/*.test.js`: 161 testes, 152 passaram; 9 ficaram com erro por falta da dependência de desenvolvimento `linkedom` neste ambiente. Esses 9 testes devem ser executados em ambiente com `npm ci` instalado corretamente, como GitHub Actions.
- 20 testes selecionados de integração, perfil, legados e interface do EmbedMovies: passaram.
- Não houve validação de deploy no Cloudflare nem da reprodução real do iframe em navegador remoto neste ambiente.

## Publicação

1. Faça backup do estado do seu repositório e preserve o D1 e os secrets TMDB_API_KEY e AUTH_SECRET.
2. Extraia o ZIP, entre na pasta `AnimeDragon` e execute `powershell -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.
3. Verifique a compilação no GitHub Actions, implante no Cloudflare e cheque `/api/health` para confirmar `28.0.0`.
4. Confira os episódios já listados do TMDB cujo calendário marca uma estreia futura, o perfil de uma conta existente, a troca de moldura e nome RGB e o ranking.

Não use a incorporação sem verificar autorização para disponibilizar os vídeos.
