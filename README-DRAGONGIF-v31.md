# AnimeDragon v31 — busca via API DragonGIF

**A versão 30 procurava GIFs e stickers em `web/assets/profile-media/catalog.json`**, que permanecia vazio quando milhares de arquivos não eram enviados ao GitHub. A v31 usa a API DragonGIF, paginada e sem dependência de API GIPHY.

## Como publicar

1. Instale e publique **DragonGIF** primeiro usando o outro ZIP. A versao DragonGIF v3.0 usa arquivos estaticos do Cloudflare Workers Free, sem D1/R2. O Worker pode estar em outra conta Cloudflare; o AnimeDragon acessa sua URL publica HTTPS.
2. A URL publica `https://dragongif-api.jhonjhszgame2003.workers.dev` ja esta configurada em `wrangler.toml`. Nao modifique o `database_id` do AnimeDragon nem o nome do Worker `site`.
3. Atualize o GitHub com `powershell -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1` (execute na pasta AnimeDragon extraída). Esse script **exclui os diretórios de GIFs e Stickers** e so publica o codigo. As midias ficam hospedadas no repositorio separado do DragonGIF. O Worker do Cloudflare pode fazer deploy automaticamente se sua integração GitHub estiver ativa.
4. Se necessário, publique manualmente: `powershell -ExecutionPolicy Bypass -File .\PUBLICAR-CLOUDFLARE.ps1`.
5. No DragonGIF v3, envie os arquivos no repositorio do DragonGIF e gere o catalogo durante o build `npm run build`. Confirme `/api/v1/stats` no novo site. Teste a busca do AnimeDragon em `/#gifs` e no perfil > Personalizar > Stickers.

## Funcionamento

- `GET /api/dragongif/search?q=naruto&type=gifs&page=1&limit=36`: busca paginada, sem catálogo local gigantesco.
- `GET /api/dragongif/file/dg_<id>`: arquivo publico verificado pelo DragonGIF; o navegador e redirecionado para os arquivos estaticos no Worker DragonGIF.
- `GET /api/dragongif/status`: contagem do acervo.
- GIFs selecionados como avatar são salvos por ID estável. Perfis públicos e privados mostram o mesmo avatar.
- Até **quatro stickers por perfil**, validados no servidor, com remoção, posição, tamanho, ordem e persistência no D1 existente.
- **O D1 de usuários continua intacto**, sem migração de conta.
- Mídias antigas já salvas por caminhos locais continuam aceitas quando esses arquivos ainda existirem no site, mas a galeria nova usa somente DragonGIF. Se você apagar os arquivos antigos, usuários precisarão selecionar novamente seus GIFs e stickers.

**Importante:** o endpoint de saude do DragonGIF v3.0 ja foi confirmado pelo usuario. A pesquisa efetiva ainda deve ser testada com `/api/v1/media?type=gifs&q=anime` e depois da publicacao da v31 no AnimeDragon.

## Direitos e limites

Hospede somente conteúdo próprio ou licenciado; não presuma que uma imagem baixada do GIPHY pode ser republicada. GitHub e Cloudflare Workers Free possuem limites de tamanho, quantidade e armazenamento de arquivos. O AnimeDragon ainda usa seu D1 existente para as contas.
