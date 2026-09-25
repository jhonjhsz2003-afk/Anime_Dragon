# Addons e reprodução — v9.6

Todos os recursos partem de um anime já validado no catálogo. Não importamos os catálogos gerais de filmes, novelas ou doramas desses addons. O TMDB continua sendo a identidade única dos títulos; o addon não substitui a lista de episódios nem cria cópias de animes.

| Serviço | Função no AnimeDragon | Situação verificada em 24/09/2026 |
| --- | --- | --- |
| FenixFlix | Fontes HTTPS de vídeo, consultadas por episódio | Manifesto respondeu; disponibilidade depende do vídeo |
| ThePirateBay+ | Adaptador de resultados torrent (aplicativo externo necessário) | Manifesto respondeu e retornou torrents para Solo Leveling; requer aplicativo com magnet |
| SubSense | Legendas PT-BR, português e inglês | Manifesto configurado e consultas de Solo Leveling responderam; SRT lido no navegador |
| AIO Metadata | Sinopse complementar quando falta no TMDB e elenco | O endereço genérico informado devolveu 404. Precisa de manifesto pessoal configurado |
| Animes BR | Adaptador de fontes, ativado se o serviço recuperar | O endereço informado devolveu HTTP 402 / DEPLOYMENT_DISABLED |
| Nexio Nagare / AnimePahe | Fontes adicionais já integradas | Manifestos responderam; isso não comprova reprodução de todo o acervo |

O site consulta os provedores em paralelo e abre a primeira fonte que chega. As demais ficam disponíveis internamente para recuperação automática, sem reiniciar o vídeo. Há cache curto de links e deduplicação das requisições. Falhas de rede ou decodificação tentam fontes alternativas sem repetir indefinidamente. Um manifesto fora do ar recebe uma pausa de 15 segundos entre novas consultas.

Ao clicar num episódio, o player tenta começar automaticamente. Se o navegador negar áudio automático, tenta iniciar sem som e mostra “Ativar som”. Se o próprio navegador impedir também isso, apresenta um botão de reprodução. A preferência “Próximo automático” controla somente a passagem ao final do episódio. Nenhum site pode prometer ausência de espera quando o servidor de vídeo estiver lento ou fora do ar.

Legendas são buscadas em paralelo. Com “Legendas automáticas em português” ativado nas preferências, o player tenta uma versão portuguesa automaticamente; até três versões são tentadas em caso de falha. SRT é convertido para WebVTT, com limite de 2 MB. Arquivos ASS, HTML de erro e formatos não suportados são recusados com mensagem. Os fornecedores de legenda precisam permitir CORS. Versões distintas do mesmo idioma permanecem disponíveis, pois podem corresponder a cortes diferentes; URLs repetidas são removidas. O seletor de legendas foi retirado da tela do episódio a pedido do usuário.

Torrents não são convertidos em links de vídeo falsos. O link magnet mantém o índice do arquivo (`so`) quando informado pelo addon. Nem todo aplicativo suporta seleção por índice; o adaptador mantém o índice do arquivo para clientes externos. A interface final não exibe links de torrent, nomes de addons, status ou controles de provedores, conforme pedido posterior do usuário. Não foi instalado motor BitTorrent nem contratado serviço de debrid ou transcodificação.

Solo Leveling: o ajuste IMDb 1/13 → 2/1, até 1/25 → 2/13, só vale quando o TMDB 127532 apresenta a primeira temporada com 25 episódios e não apresenta a segunda. Se o catálogo mudar para duas temporadas, o ajuste deixa de ser aplicado. Nagare mantém o mapeamento AniList já verificado. Não usamos busca aproximada por nome para escolher outro anime.

## Configuração do responsável pelo site

Variáveis opcionais, todas no Worker: `STREMIO_MANIFEST_URL`, `NAGARE_MANIFEST_URL`, `ANIMEPAHE_MANIFEST_URL`, `ANIMESBR_MANIFEST_URL`, `TPB_MANIFEST_URL`, `SUBSENSE_MANIFEST_URL`, `AIOMETADATA_MANIFEST_URL`. O valor `disabled` desativa um serviço. URLs pessoais de manifesto permanecem no servidor. Não há painel público de status de addons.

Para AIO, abra https://aiometadata.elfhosted.com/configure, conclua sua configuração e salve o manifesto resultante no segredo `AIOMETADATA_MANIFEST_URL` do Cloudflare. Não publique URLs com chave, senha ou identificador pessoal no GitHub. O endereço `/stremio/manifest.json` sozinho não identifica uma configuração. Sem esse segredo, o site continua usando o catálogo TMDB, sem expor avisos técnicos ao visitante.

O SubSense já usa configuração de idiomas sem chave privada: `pob`, `por`, `eng`, até 5 versões por idioma, sem ASS. Um manifesto personalizado pode substituir esse padrão. APIs de terceiros e seu conteúdo podem variar; o código não reativa uma hospedagem desativada pelo dono.

## Referências

- Catálogo consultado: https://stremio-addons.net/
- SubSense e configuração: https://github.com/NepiRaw/Stremio-SubSense
- AIO Metadata: https://github.com/cedya77/aiometadata
- Manifesto ThePirateBay+: https://thepiratebay-plus.strem.fun/manifest.json
- Manifesto FenixFlix: https://fenixflix.fenixhub.online/manifest.json
- Manifesto Animes BR: https://animes-br-self.vercel.app/manifest.json
- Numeração IMDb de Solo Leveling: https://v3-cinemeta.strem.io/meta/series/tt21209876.json

## Atualização 9.6.1: região das legendas

A configuração padrão agora segue o idioma/região informado pelo navegador e limita a seleção automática ao mesmo idioma. O endpoint `/api/subtitles` recebe `locale`, validado contra os idiomas suportados; valores desconhecidos usam PT-BR. A preferência do site se chama “Legendas automáticas no seu idioma”. Um manifesto pessoal definido em SUBSENSE_MANIFEST_URL continua prevalecendo: ele precisa disponibilizar os idiomas desejados. Legendas incorporadas diretamente na imagem são controladas pela fonte do vídeo.
