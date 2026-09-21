> Este documento contém instruções de outros formatos de pacote. Para este ZIP completo, siga PUBLICAR-ESTE-PACOTE.md: envie AnimeDragon2 na raiz do repositório.

# GitHub → Cloudflare

Publique este projeto como **Cloudflare Worker com Static Assets**. Ele inclui backend e banco; enviar apenas `web/` ao Pages não disponibiliza cadastro, catálogo e comentários.

## Atualizar seu site

1. Extraia o ZIP e envie os arquivos de `AnimeDragon` ao seu repositório. Mantenha a pasta do projeto configurada no Cloudflare. Envie os arquivos extraídos, não apenas o ZIP.
2. No Worker conectado ao GitHub, configure:

| Campo | Valor |
|---|---|
| Root directory | Pasta que contém wrangler.toml; `/` se está na raiz |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node | 24 |
| Worker name | `anime-dragon` |

3. Confirme o binding D1 **DB**. O `database_id` original permanece no `wrangler.toml`; só funciona se esse banco pertencer à sua conta. Para uma instalação nova, crie um D1 e substitua pelo ID dele.
4. Em Settings → Variables and Secrets, mantenha **TMDB_API_KEY** como Secret. Se já existia **AUTH_SECRET**, mantenha o valor anterior. Trocar esse valor impede a verificação das senhas antigas.
5. Faça commit no branch conectado e acompanhe o deploy.

O nome do Worker no painel deve coincidir com o `name` do Wrangler. A URL de manifesto Stremio original foi preservada. Nenhuma chave de API foi adicionada aos arquivos.

## Banco existente

Na primeira chamada de conta/comunidade, a v9 cria as novas tabelas e copia favoritos/assistir depois uma única vez. Não apaga contas. Depois, coleções novas são gravadas em `anime_library`; a tabela antiga é mantida como referência. Não volte ao código v8 esperando que ele veja alterações de coleção feitas na v9.

## Publicação pelo terminal, se preferir

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## Conferir depois do deploy

- `/api/health` retorna versão `9.3.0`.
- Catálogo e busca carregam dados reais da TMDB.
- Cadastro, login, avatar, favoritos e acompanhando persistem após recarregar.
- Comentários aceitam gostei/desgostei e bloqueiam reenvio do texto pelo autor.
- Confira a reprodução com uma fonte real e disponível do seu provedor.

**Catálogo indisponível:** confira o Secret TMDB_API_KEY e sua validade.

**Banco não conectado:** confira binding DB, database_id e conta proprietária do D1.

**Detalhes funcionam, mas vídeo não:** catálogo e vídeo são serviços diferentes. Confira manifesto, identificação do episódio, HTTPS/CORS e compatibilidade do formato. A disponibilidade dos provedores externos não é garantida por este código.

**Agenda vazia:** é preciso acompanhar um anime e a TMDB informar seu próximo episódio. Datas não são inventadas.

## Documentação oficial consultada

- [Integração GitHub / Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Comandos e diretório de build](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Wrangler e bindings D1](https://developers.cloudflare.com/workers/wrangler/configuration/)

Não houve publicação remota nesta entrega.
