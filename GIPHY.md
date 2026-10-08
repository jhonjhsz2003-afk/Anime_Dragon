# Galeria de GIFs

A rota `#gifs` usa a API oficial GIPHY: pesquisa literal, anime como consulta inicial, tendências, paginação, prévias animadas leves, pausa de animações, download de GIF/foto e escolha para o perfil. A marca oficial Powered By GIPHY está incluída.

Na v14.0.2, o selo repetido do rodapé foi removido. A atribuição oficial aparece somente na galeria e na prévia, em formato de texto transparente e compacto, junto aos controles. Downloads de imagens estáticas conservam a extensão correspondente ao tipo real do arquivo.

Para ativar conteúdo real, crie uma chave **Web API** própria em https://developers.giphy.com/dashboard/. Configure `GIPHY_API_KEY` em Settings → Variables and Secrets do Worker `site` e salve a nova configuração. Não é necessário editar o código nem alterar o banco. Na prévia Node local, defina a variável no ambiente antes de executar `npm run preview`; em Wrangler local, use `.dev.vars`, nunca versionado.

Essa chave Web fica acessível ao navegador por definição da API. Não configure nela uma credencial de autenticação, de TMDB ou de outro serviço. Não reutilize chaves do site GIPHY ou de aplicativos de terceiros.

Sem a chave, a galeria informa que ainda não foi ativada. Não existem GIFs fictícios nem um fallback por scraping.

A chave beta possui limite de 100 consultas por hora. O limite é do GIPHY, separado do plano gratuito Cloudflare. Uma eventual mudança de plano GIPHY deve ser avaliada pelo responsável pelo site.

As consultas e cargas de mídia são feitas diretamente no navegador. O Worker não busca nem armazena os GIFs. O perfil guarda apenas o identificador e o enquadramento; o navegador resolve a mídia novamente pela API. URLs recebidas conservam seus parâmetros e não entram no cache do catálogo. Downloads são iniciados pela ação da pessoa e entregues ao dispositivo, sem cópia persistida no servidor. GIF removido ou serviço indisponível mantém o avatar padrão como alternativa.

Documentação: https://developers.giphy.com/docs/api/ — inclui atribuição, rendições, uso direto pelo cliente e limites da chave.
