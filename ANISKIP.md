# Abertura dos episódios

O botão usa os intervalos de abertura do [AniSkip v2](https://api.aniskip.com/api-docs), consultados com o ID de MyAnimeList, número do episódio e duração real do vídeo. Apenas `op` é aceito: encerramentos, recapitulações e aberturas misturadas com cenas não são pulados.

A correspondência entre o catálogo TMDB e MyAnimeList vem do [AniBridge Mappings](https://github.com/anibridge/anibridge-mappings), por temporada e intervalo de episódios. `web/opening-mappings.json` contém somente as relações `tmdb_show:<id>:s<temporada> -> mal:<id>` do arquivo oficial [mappings.min.json v3](https://github.com/anibridge/anibridge-mappings/releases/download/v3/mappings.min.json). A cópia foi gerada em **2026-10-07T08:01:27Z**, schema **3.0.3**, e contém **6.418** temporadas. Não há busca aproximada por título.

Temporadas divididas em partes usam o ID e número de episódio correspondentes em MAL. Mapeamentos conflitantes, relações de episódios combinados/divididos e temporadas cuja quantidade atual de episódios diverge de um intervalo fechado da cópia são recusados. Isso evita reaproveitar a abertura de outra temporada ou numeração antiga.

Os intervalos precisam ter início/fim válidos e duração original com diferença de até **1 segundo** para o vídeo atual. Não são escalados nem deslocados para compensar outra edição. Dados ausentes, inválidos, divergentes ou indisponíveis deixam o botão oculto e a reprodução continua normalmente. A precisão e a cobertura dependem dos registros comunitários do AniSkip; não é reconhecimento de áudio/vídeo e não garante intervalos para todos os episódios. A consulta ocorre separadamente da reprodução, tem prazo de 2,5 segundos, cache limitado e no máximo oito consultas simultâneas por instância.

Para atualizar o arquivo, baixe novamente a publicação oficial e preserve `$meta.schema_version` e `$meta.generated_on` nos campos `sourceSchema` e `generatedOn`. Filtre somente as chaves `tmdb_show:\d+:s\d+` e seus alvos `mal:\d+`, preservando integralmente os intervalos publicados. Mantenha esta licença junto da cópia.

## Licença dos mapeamentos AniBridge

MIT License

Copyright (c) 2026 AniBridge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
