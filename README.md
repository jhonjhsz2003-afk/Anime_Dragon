# AnimeDragon v13.0.0

Projeto para Cloudflare Workers + Static Assets + D1.

## Mudanças desta versão

- Home combina tendências semanais do TMDB, popularidade, avaliações com quantidade de votos e episódios recentes. Séries que voltaram com uma temporada nova podem aparecer mesmo quando a primeira estreia é antiga.
- Seleções principais misturam gêneros. Romance continua disponível, junto de ação, fantasia, comédia, mistério e outros temas.
- Lançamentos ganhou uma página pública própria: novas séries, temporadas e próximos episódios, separados por data e tipo. Só aparecem eventos futuros com data anunciada; temporada e episódio não são inventados quando faltam informações.
- Player compartilhado aguarda a inicialização HLS, protege a transição para o player alternativo e trata erros antigos sem descartar a fonte atual. A correção vale para todos os títulos.
- Fontes MP4 sem extensão podem ser identificadas por GET com poucos bytes. HLS/MP4/WebM têm prioridade; MKV permanece como última alternativa a ser testada pelo navegador.
- Links expirados são renovados; fontes adicionais são consultadas em paralelo. Os erros agora distinguem a indisponibilidade do provedor de problemas de reprodução.
- Mantidos login persistente, perfil personalizável, comentários, biblioteca, progresso, ícone azul e cabeçalho compacto ao rolar.

## Instalar e validar

Node.js 22.13 ou mais recente; Node 24 recomendado.

```bash
npm ci
npm run check
npm test
npm run build
```

## Prévia e desenvolvimento

```bash
npm run preview
```

Sem TMDB_API_KEY, a prévia usa histórias ilustrativas originais, identificadas como demonstração. Os vídeos de animes reais não são incluídos no ZIP. Para desenvolvimento com bindings e variáveis Cloudflare, use `npm run dev` e `.dev.vars.example` como referência local.

## Atualizar o site existente

Substitua o código do repositório por esta versão e publique no mesmo Worker `anime-dragon`. O `wrangler.toml` mantém o binding DB e o banco D1 existentes. Preserve as variáveis/segredos configurados no Cloudflare, inclusive a chave TMDB e o segredo de autenticação quando já utilizado.

```bash
npx wrangler deploy
```

No Cloudflare Builds: build `npm run build && npm test`, deploy `npx wrangler deploy`, branch `main`, diretório raiz `/`. A mudança de versão nos assets e no cache do catálogo atualiza a interface quando o visitante recarrega a página. As contas continuam armazenadas no D1 do projeto existente.

## Validação e limites

Veja `VALIDACAO-v13.md` para os resultados dos testes. A disponibilidade dos vídeos depende das fontes externas e pode mudar. O player tenta as versões disponíveis; uma fonte que não oferece um episódio ou está indisponível não pode ser fabricada pelo site.
