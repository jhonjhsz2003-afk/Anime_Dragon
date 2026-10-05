# Provedores e correspondência de episódios

server/providers.js define os provedores. Variáveis opcionais do Worker: STREMIO_MANIFEST_URL (principal), NAGARE_MANIFEST_URL e ANIMEPAHE_MANIFEST_URL. O valor literal disabled desativa um provedor. Nenhum catálogo externo é importado para a interface; toda consulta de reprodução passa pela validação de anime no servidor.

web/addon-mappings.json é indexado pelo ID TMDB. Mapeamentos do provedor principal ficam diretamente na entrada. Os outros ficam em providers.nagare ou providers.animepahe. Cada configuração pode ter id e episodes, com chaves temporada/episódio e IDs de vídeo exatos. Nunca reutilize IDs ap de outra obra ou suponha que a temporada de um catálogo corresponde à temporada do outro.

Para Solo Leveling, TMDB 127532 possui 25 episódios na temporada 1. As consultas aos metadados do Nagare confirmaram anilist:151807 (12 episódios, estreia 2024-01-07) e anilist:176496 (13 episódios, estreia 2025-01-05). O pacote inclui o mapa explícito entre essas numerações. Especiais não são associados automaticamente às temporadas regulares.

AnimePahe usa IDs ap exclusivos e precisa de mapeamentos confirmados. Na consulta de 21/09/2026, seu manifesto respondeu, mas a busca de Solo Leveling veio vazia e seu catálogo retornou HTTP 500. Portanto, a presença do adaptador não representa cobertura disponível.

O relay em server/hls.js atende somente os hosts e caminhos aprovados no código, com assinatura HMAC e validade de duas horas. Não aceita URLs arbitrárias, credenciais do visitante ou redirecionamentos externos à lista. Se o provedor mudar seus CDNs, a lista precisa ser revisada com evidências antes de ser ampliada. Alguns CDNs rotulam HLS como JPEG; a detecção do conteúdo é restrita ao host confirmado e limitada em memória.

As fontes e metadados têm cache limitado por quantidade e prazo. Atualizar fontes ignora o cache de reprodução. A lista de fontes não representa teste prévio de todos os segmentos; erros da CDN são tratados no player, com tentativa de outra fonte disponível.
