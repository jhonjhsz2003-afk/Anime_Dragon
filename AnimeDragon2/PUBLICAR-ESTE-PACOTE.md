# Atualizar AnimeDragon para 9.5

1. Extraia AnimeDragon-v9.5-GitHub.zip. Ele contém a pasta AnimeDragon2.
2. Abra a RAIZ do repositório Anime_Dragon no GitHub. Envie a pasta AnimeDragon2 inteira, substituindo os arquivos existentes. Não coloque uma AnimeDragon2 dentro da outra e não envie apenas o ZIP.
3. Confirme o commit dos arquivos. A publicação deve usar esse NOVO commit, não Retry de uma compilação antiga.
4. No Cloudflare, mantenha Root directory: AnimeDragon2; Build command: npm run build; Deploy command: npx wrangler deploy.
5. Preserve o banco D1 DB e o segredo TMDB_API_KEY existentes. Não precisa apagar contas, recriar o banco ou contratar um plano.
6. Depois do deploy, /api/health deve mostrar version 9.5.0. Recarregue a página com Ctrl+F5.

O pacote foi testado localmente, mas ainda precisa ser publicado. Na última verificação, o navegador integrado estava desconectado do GitHub.

## Mudanças

- Início prioriza episódios exibidos nos últimos sete dias, ordenados pela data mais recente, e estreias. O destaque principal acompanha essa prioridade.
- O catálogo canônico mantém todos os episódios, mesmo que um provedor tenha uma lista incompleta ou esteja fora do ar.
- Provedores são consultados em paralelo: a primeira fonte pode abrir antes de as demais terminarem. Alternativas chegam sem reiniciar a reprodução.
- Cache curto, requisições simultâneas deduplicadas e preparação dos links do próximo episódio perto do fim ou ao focar o botão Próximo. Não baixa antecipadamente o vídeo; respeita economia de dados.
- Falhas tentam outra fonte disponível, sem repetir indefinidamente a mesma fonte.
- FenixFlix mantido; integração Nexio Nagare adicionada. Adaptador AnimePahe incluído, dependente de correspondência confirmada de IDs e da disponibilidade do serviço.
- Solo Leveling mantém os 25 episódios do catálogo. Para Nagare, episódios 1–12 apontam para a primeira parte; 13–25, para os episódios 1–13 da segunda parte.
- Compatibilidade HLS para os endereços de mídia verificados, usando links temporários assinados, lista restrita de domínios e streaming sem carregar o vídeo inteiro na memória.

## Limites reais

Adicionar um addon não garante todos os animes. AnimePahe apresentou falha em seu catálogo durante a consulta; Animes BR e AnilistStream estavam indisponíveis e não foram adicionados como fontes funcionais. Não há correspondência automática de títulos por nome aproximado.

Alguns servidores de mídia retornaram erro mesmo quando a lista de fontes respondeu. O site trata isso e tenta alternativas, mas não consegue recuperar um vídeo ausente no servidor externo. Não foi comprovada reprodução integral de todos os episódios em produção. MKV/HEVC continua dependente do navegador e dos codecs do dispositivo.

O relay HLS usa requisições do seu próprio Worker, incluindo segmentos do vídeo. Não foi ativado serviço pago, mas o plano Free tem cotas; o pacote não oferece hospedagem de vídeo ilimitada nem transcodificação.

## Verificação

54 testes automatizados passaram, incluindo cadastro legado, privacidade, comentários, coleções, ordenação dos lançamentos, cache, falha isolada de provedores, correspondência de episódios e proteção do relay. Todas as verificações de sintaxe do build passaram. Player conferido no navegador com mídia sintética local: primeira fonte chega antes das demais, reprodução e troca de episódio preservadas. A suíte antiga de DOM que depende de linkedom não foi executada neste ambiente.

Referências dos provedores: https://github.com/johnneerdael/nexio-nagare e https://github.com/93Pd9s8Jt/stremio-addon-animepahe. Catálogo consultado: https://stremio-addons.net/ . Cotas: https://developers.cloudflare.com/workers/platform/limits/ .
