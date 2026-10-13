# AnimeDragon v29.1 — Correção de limite GIPHY

O editor de stickers na v29 resolvia 24 IDs após uma única busca, consumindo até 25 chamadas da API por pesquisa. A galeria e o editor compartilhavam a chave. O GIPHY informa que chaves beta são limitadas a **100 chamadas por hora**.

## Correções

- As prévias dos stickers agora usam as rendições recebidas **na própria resposta da pesquisa**, sem pedir os mesmos 24 IDs individualmente.
- Botão de pesquisa fica desabilitado durante a requisição para evitar envios duplicados.
- Resultados anteriores ficam visíveis quando o GIPHY retorna erro temporário.
- Requisições idênticas simultâneas são agrupadas, sem cache de URLs de mídia.
- Quando a API retorna 429, o cliente respeita `Retry-After` (quando fornecido) e impede novas consultas por um intervalo. **Não contorna cotas**.
- Pode configurar a chave pública `GIPHY_STICKERS_API_KEY` separadamente no Worker para a aba de stickers. Se não configurar, mantém a chave existente `GIPHY_API_KEY` por compatibilidade; para cumprir a orientação do GIPHY, crie a chave própria da seção no painel do provedor.

## Cloudflare

Em Workers & Pages → site → Settings → Variables and Secrets, mantenha `GIPHY_API_KEY` existente. Opcionalmente adicione `GIPHY_STICKERS_API_KEY` com uma **chave pública própria para a seção de stickers**, obtida oficialmente. Salve e publique novamente. Não insira as chaves no repositório.

## Limitações

Não há como garantir pesquisas infinitas com uma chave gratuita. Se a cota horária foi atingida, é necessário aguardar ou solicitar aumento de limite à GIPHY. O sistema não usa proxy, cache persistente de mídias ou troca automática de chaves.

Documentação: https://developers.giphy.com/docs/api/ e https://developers.giphy.com/docs/api/best-practices/
