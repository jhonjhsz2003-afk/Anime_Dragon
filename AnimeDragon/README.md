# AnimeDragon

Site de animes para Cloudflare Workers com Static Assets e D1. Interface sem framework, sem fontes externas e sem etapa de build do frontend.

## Nesta versão

- Nome unificado: **AnimeDragon**.
- Catálogo só de séries de animação japonesas: `tv`, gênero `16`, origem `JP`, excluindo conteúdo marcado como adulto. Filmes, inclusive filmes de anime, não são incluídos.
- Início, ranking, busca, gêneros e detalhes usam o mesmo filtro no servidor. O critério depende da classificação dos metadados do fornecedor.
- Setas nas faixas horizontais, toque/deslize, foco visível e navegação por teclado.
- Cards responsivos; temporadas reais, inclusive especiais e numeração não consecutiva; episódios em ordem, com busca e ordenação.
- Janela sem transbordamento lateral, adaptada ao celular, fechável por Escape e com foco contido no diálogo.
- Cadastro (`/#cadastro`) e login (`/#entrar`) em telas próprias. Dragão animado com respeito a preferências de movimento reduzido.
- Doze avatares de anime em SVG locais. Fotos externas e upload de avatar removidos.
- Cadastro/login/perfil reais com D1, senha com hash no servidor, cookie de sessão HttpOnly e limite de tentativas.
- Favoritos guardam os objetos completos dos títulos. Histórico registra episódios realmente iniciados e retoma o progresso do último episódio de cada anime.
- Lista, histórico e preferências são **locais ao navegador**, separados por usuário. Não há sincronização dessas coleções entre dispositivos.
- Conteúdo fictício de calendário e notificações foi retirado.
- Metadados com cache, imagens responsivas, lazy loading e logotipo/artwork otimizados em WebP.
- Menções técnicas retiradas da navegação e do catálogo; atribuição do fornecedor fica em **Sobre e créditos**.

## Atualizar no GitHub e Cloudflare

1. Substitua os arquivos do projeto pelos arquivos desta pasta. A pasta de trabalho é a que contém `wrangler.toml`, `package.json` e `worker.js` juntos.
2. Mantenha `server/`, `db/` e `web/` na mesma pasta de `worker.js`.
3. No Cloudflare Workers Builds, selecione essa pasta como **Root directory**:
   - Se `wrangler.toml` está na raiz do repositório: `/`.
   - Se você manteve a pasta `AnimeDragon`: `/AnimeDragon`.
   - Se subiu toda a árvore do ZIP: `/Anime_Dragon-main/AnimeDragon`.
4. Build command: vazio. Deploy command: `npx wrangler deploy`.
5. O projeto usa **Workers + Static Assets**, não um upload estático de `web/` para Pages. Apenas `web/` não executa o catálogo nem o login.

O nome do Worker e o binding D1 do projeto original foram preservados. Confira se o `database_id` em `wrangler.toml` pertence à sua conta; se usar outro banco, substitua pelo ID retornado pelo Cloudflare.

## Configuração necessária (uma vez)

Na pasta do projeto, com Node.js 22.13+ (24 recomendado):

```bash
npm install
npx wrangler login
npx wrangler d1 execute animedragon-db --remote --file=db/schema.sql
npx wrangler secret put TMDB_API_KEY
npx wrangler secret put AUTH_SECRET
npx wrangler deploy
```

- `TMDB_API_KEY`: token de acesso de leitura (Bearer) ou chave v3. O segredo já existente pode ser mantido.
- `AUTH_SECRET`: segredo aleatório com pelo menos 32 bytes, que fica somente no servidor. Você pode gerar um valor com `openssl rand -hex 32` e colá-lo quando o comando `secret put` pedir. Nunca envie o valor para o GitHub ou conversas.
- O schema usa `CREATE TABLE/INDEX IF NOT EXISTS`; pode ser reaplicado no banco original e não apaga usuários.
- Não troque `AUTH_SECRET` casualmente: ele participa do hash de senha; trocá-lo impede o login com hashes anteriores.
- O cadastro da versão original era apenas um nome/e-mail no navegador. Esses perfis locais não eram contas autenticadas: o visitante deve fazer um novo cadastro.

Sem esses segredos ou sem aplicar o schema, o site mantém um estado de erro honesto: não simula sucesso no cadastro nem inventa um catálogo.

## Vídeos dos episódios

O ZIP original não continha arquivos de episódios nem um provedor de reprodução. O catálogo entrega informações e capas; os vídeos precisam ser fornecidos separadamente.

O player agora usa `<video>` com controles nativos, tela cheia, áudio, progresso e legendas WebVTT. Para disponibilizar um episódio, configure `web/video-sources.json` usando o ID do anime, o número real da temporada e o episódio:

```json
{
  "153312/1/1": {
    "url": "https://SEU-DOMINIO-DE-VIDEO/solo-leveling/t1/e1.mp4",
    "type": "video/mp4",
    "subtitles": [
      {
        "src": "https://SEU-DOMINIO-DE-VIDEO/solo-leveling/t1/e1.pt.vtt",
        "language": "pt",
        "label": "Português"
      }
    ]
  }
}
```

O exemplo é ilustrativo e não aponta para um vídeo disponível. Substitua os endereços por fontes que você tenha autorização para disponibilizar.

- Use MP4/H.264 ou WebM compatível com os navegadores pretendidos. HLS só funciona se o navegador oferecer suporte nativo; não há biblioteca HLS/MPEG-DASH incluída.
- Configure CORS no servidor de vídeo/legendas para o domínio do site e suporte a requisições Range. O player usa `crossorigin="anonymous"`.
- O arquivo de fontes é público, adequado a vídeos públicos. Não coloque tokens privados, credenciais ou URLs que concedam acesso indevido. Acesso pago/privado requer autorização e geração de URL assinada no servidor, não implementadas aqui.
- Sem fonte, aparece “Este episódio ainda não está disponível”. Episódios futuros não são reproduzíveis pela lista.
- Vídeos grandes devem ficar no seu serviço de mídia/CDN; não dentro deste repositório ou no pacote de Static Assets.

## Desenvolvimento e testes

```bash
cp .dev.vars.example .dev.vars
# Preencha os dois segredos em .dev.vars (arquivo ignorado pelo git).
npm install
npm run db:local
npm run dev
npm test
```

Os testes usam `node:sqlite`, fetch simulado para o catálogo e o código real de autenticação. Não consomem a API nem alteram seu banco remoto. Verificam filtro de anime em todas as rotas, bloqueio de filmes, temporadas reais, ordem dos episódios, indisponibilidade de vídeo, cadastro, login, perfil, cookies, logout e limite de tentativas.

A consulta real ao catálogo, os limites do plano Cloudflare, a reprodução do seu provedor e o funcionamento no domínio final precisam ser verificados com suas configurações de produção. Esta entrega não publica automaticamente no GitHub ou Cloudflare.

O relatório `docs/VALIDACAO.md` detalha o que foi executado e o que precisa ser validado na hospedagem. A inspeção visual em navegador não pôde ser executada neste ambiente.

## Limites da conta

- Não há e-mail de confirmação nem recuperação de senha por e-mail nesta versão; nenhum envio é simulado.
- O D1 armazena perfil, e-mail e hash de senha. As senhas não são gravadas no navegador.
- PBKDF2-SHA512 com 100.000 iterações, salt individual e pepper HMAC obrigatório (`AUTH_SECRET`); prefixo `v1$` permite migração de algoritmo. O limite de iterações segue o WebCrypto do Worker. Tokens de sessão aleatórios são guardados no D1 apenas como SHA-256, expiram em sete dias e podem ser revogados pelo logout.
- Login/cadastro têm limites por IP e e-mail em janelas de 15 minutos; alterações exigem origem igual à do site. Cookies usam HttpOnly, SameSite=Lax e Secure no HTTPS.
- Teste o custo de autenticação no seu plano. Esta versão não exige plano pago por configuração, mas o funcionamento sob carga depende dos limites da sua conta.

## Dados e atribuição

O problema original era a consulta a `/trending/all` e `/search/multi` sem filtro, não a simples presença do TMDB. Manter o fornecedor preserva seus IDs e integração existente. Os créditos permanecem somente em Sobre, como previsto na documentação.

Referências oficiais:
- [Filtros de séries](https://developer.themoviedb.org/reference/discover-tv)
- [Atribuição de dados e imagens](https://developer.themoviedb.org/docs/faq)
- [WebCrypto no Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/)
