# Validação — AnimeDragon v13

Verificação realizada em 7 de outubro de 2026.

## Testes automatizados

205 casos passaram, executados por arquivo para manter isolamento dos mocks de rede no ambiente Windows. Abrangem catálogo, diversidade, datas futuras, player HLS e Shaka, renovação de fontes, segurança do relay, contas existentes, restauração de sessões, perfis, biblioteca, comentários e navegação.

Sintaxe dos módulos verificada. Bundles do Worker e da interface compilados com esbuild. O comando Wrangler dry-run local não pôde iniciar seu subprocesso no ambiente restrito (`spawn EPERM`). O pipeline Cloudflare executou o build completo com sucesso, e os checks de envio e de pull request passaram no GitHub.

## Reprodução real observada

O navegador testou os assets v13 em uma prévia local usando as APIs públicas e fontes reais do site, sem copiar credenciais ou alterar contas de usuários. Os testes locais de interface de Lançamentos usam somente histórias ilustrativas marcadas como demonstração.

| Anime | Episódio | Resultado observado |
|---|---|---|
| Jujutsu Kaisen | T1 EP.1 | A versão publicada falhou; a interface corrigida reproduziu além de 50 segundos. |
| Jujutsu Kaisen | T1 EP.3 | Interface corrigida reproduziu além de 40 segundos; troca de episódio funcionou. |
| Kaiju No. 8 | T1 EP.1 | Interface corrigida reproduziu além de 30 segundos. |
| The Exiled Heavy Knight Knows How to Game the System | T1 EP.1 — Elma, o Cavaleiro Pesado | Interface corrigida reproduziu além de 40 segundos. |
| Chainsaw Man | T1 EP.1 | Versão publicada carregou e avançou além de 40 segundos; fonte real também validada. |
| Frieren e a Jornada para o Além | T1 EP.1 | Versão publicada carregou e avançou além de 30 segundos; fonte real também validada. |

Amostras adicionais de Jujutsu, Chainsaw e Frieren T1 EP.3 tiveram manifesto, inicialização e fragmento HLS válidos. A verificação não equivale a assistir todos os episódios até o fim em todos os dispositivos.

## Problemas externos encontrados

- Alguns provedores responderam HTTP 502/402 ou timeout durante a consulta.
- Dan Da Dan devolveu links assinados expirados mesmo após renovação em uma das amostras.
- AnimePahe utiliza identificadores próprios sem correspondência confirmada para os episódios consultados.
- Kaiju teve timeout em uma consulta e reproduziu numa consulta posterior: disponibilidade do provedor varia.

A correção do player é geral, sem lista de exceções por anime. Não foi alterada a proteção contra relay arbitrário, nem foram contornados bloqueios de acesso dos provedores.

## Catálogo e Lançamentos

Testes verificaram tendências semanais reais, retorno de séries com primeira estreia antiga, variedade de gêneros, confiança das avaliações e uso dos caches. A agenda inclui apenas datas posteriores ao dia atual em São Paulo; números desconhecidos ficam desconhecidos. A prévia mostrou séries, temporadas e episódios futuros, filtros, recuperação após erro e ausência de overflow horizontal em 390px.

Referências: [TMDB Discover TV](https://developer.themoviedb.org/reference/discover-tv), [TMDB tendências semanais](https://developer.themoviedb.org/reference/trending-tv), [HTMLMediaElement.play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play).

## Publicação

Atualização integrada no GitHub pela [PR #5](https://github.com/jhonjhsz2003-afk/Anime_Dragon/pull/5) e publicada no mesmo Worker [AnimeDragon](https://anime-dragon.jhonjhsz2003.workers.dev/). `/api/health` confirmou a versão 13.0.0. Consultas de produção verificaram HLS válido para Heavy Knight, Jujutsu EP.1 e EP.3 e Kaiju EP.1; as fontes alternativas retornaram diagnósticos HTTP 502/402 precisos.

A agenda de produção respondeu com 33 eventos na primeira página e 18 na segunda, todos futuros, sem repetições entre essas páginas. A home combinou ação, fantasia, mistério, drama, comédia e esporte. O ajuste final preserva metadados completos quando uma resposta semanal resumida repete o mesmo anime.

O check de prévia da branch falhou por uma configuração de `previews` ausente no projeto; o build e a publicação de produção passaram. O banco e os segredos de produção permaneceram nos bindings existentes.
