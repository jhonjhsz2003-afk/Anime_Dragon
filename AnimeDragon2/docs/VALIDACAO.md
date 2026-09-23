# Validação v8

## Executado

20 testes passaram:

- 12 testes de servidor: filtro anime, home recente, busca, gêneros, bloqueio de filmes, temporadas reais, falha do provedor, origem de autenticação, cadastro/login/perfil/logout, limites, criação automática de tabelas sem segredo manual e persistência da comunidade com autoria.
- 5 testes do adaptador: metadados com IDs reais do protocolo, resolução exata do episódio, fontes HTTPS, episódio ausente, identidade não confirmada e rejeição de URLs inválidas/privadas.
- 3 testes de DOM: setas sobre os catálogos e troca de destaque; cadastro com envio ao endpoint e dragão articulado; detalhes com prévias, recomendações e controles de comunidade.

Também foi validada a sintaxe JavaScript e inspecionada uma rasterização do vetor completo do dragão. Os dados do catálogo e as respostas do addon nesses testes são simulados. As contagens e permissões dos testes de comunidade usam o código real e SQLite em memória.

## Pendente ou indisponível

- O manifesto FenixFlix falhou em consulta real com erro TLS/HTTP 502 a partir do ambiente de desenvolvimento. Sua compatibilidade e reprodução em produção não foram confirmadas.
- Não houve acesso ao domínio, GitHub ou conta Cloudflare do proprietário. Nenhuma publicação foi executada.
- Inspeção visual completa desktop/celular: o navegador do Playwright não pôde ser baixado; um navegador alternativo foi obtido, mas encerrou ao iniciar. Os testes de DOM não fazem layout de pixels. Não há captura real da interface nova nem medição Lighthouse.
- Não há confirmação de CORS, disponibilidade ou qualidade das fontes reais de vídeo.
- Cotas e custo de CPU/D1 sob carga precisam ser medidos no plano usado pelo site.

## Conferência após publicação

1. `/api/health` deve responder JSON com versão 8.0.0.
2. Testar cadastro, sair, login e recarregar a página no mesmo domínio.
3. Conferir cadastro em desktop/celular: dragão inteiro, asas/cauda/olhos animados, formulário acessível.
4. Testar setas laterais e troca automática/manual dos destaques.
5. Abrir anime, conferir banner, prévias, troca de temporadas e recomendações.
6. Salvar favorito e assistir depois; abrir a conta em outro navegador para verificar persistência.
7. Curtir, trocar para não curtir, publicar/editar comentário, marcar spoiler e testar debate de episódio.
8. Validar o manifesto FenixFlix, seus prefixos/IDs, fontes de vídeo e CORS. Configurar correspondências explícitas quando o addon não usar IMDb.
