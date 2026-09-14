# Validação desta entrega

## Executado localmente

- Sintaxe de `worker.js`, `server/auth.js` e `web/js/app.js` validada com Node.
- Dez testes de servidor passaram com SQLite em memória e respostas controladas do catálogo: filtro anime, consultas de início, busca e gêneros, bloqueio de filmes, temporadas não consecutivas, ordenação de episódios, vídeo ausente, origem de autenticação, cadastro/login/perfil/logout e limitação de tentativas.
- Geradas as onze telas do frontend e a variante de perfil autenticado usando as funções reais de template. Verificados escape de texto, marca AnimeDragon, seis controles de carrossel, doze opções de avatar e formulários.
- HTML gerado verificado quanto a fechamento de elementos, IDs duplicados e associações entre labels e campos. SVGs locais passaram por parsing XML.
- Arte do dragão otimizada: 828.317 bytes no PNG original; 114.508 bytes no WebP da arte; 4.878 bytes no WebP da marca. São medidas dos arquivos, não medições de tempo de carregamento em produção.

## Não verificado neste ambiente

- Inspeção visual em navegador e testes reais de toque/teclado: o Chromium não estava instalado; a tentativa padrão de instalação falhou por timeout de rede. Não há captura de tela pós-alteração nem resultado de Lighthouse.
- A API real de metadados e suas capas dependem de `TMDB_API_KEY`. As respostas de catálogo utilizadas nos testes são simuladas.
- Não houve acesso à sua conta Cloudflare, ao D1 remoto, ao repositório GitHub ou ao domínio publicado. Nada foi publicado.
- Fluxo real de mídia: nenhuma fonte de episódio foi incluída no ZIP original. `video-sources.json` está vazio de propósito.
- Carga/custos de CPU e cotas do plano Cloudflare devem ser medidos na sua conta.

## Após configurar e publicar

1. Abra o site em desktop e celular e percorra as faixas pelas setas e por toque.
2. Confira busca de um anime e busca de uma série não anime; a segunda não deve aparecer.
3. Abra um anime com muitas temporadas, troque rapidamente de temporada e confira a ordem dos episódios. No celular, a janela deve caber na largura e os episódios devem ocupar uma coluna.
4. Cadastre uma conta de teste, saia, entre novamente e atualize nome/bio/avatar.
5. Salve um anime encontrado pela busca e confira Minha lista após recarregar a página.
6. Configure uma fonte de episódio, confira controles do vídeo, legendas e retomada de progresso no mesmo navegador.
7. Confira que Sobre e créditos apresenta a atribuição, e que o catálogo não apresenta rótulos técnicos.
