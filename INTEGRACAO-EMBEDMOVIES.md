# Integração EmbedMovies — AnimeDragon v23

**Origem documentada:** https://embedmovies.org/ (consulte a documentação e termos atualizados).

**Host do iframe:** `https://myembed.biz` — não deve ser substituído por um domínio retornado por dados externos.

- O anime é localizado pelo TMDB no catálogo do AnimeDragon.
- Ao selecionar o episódio, `GET /api/playback?id=ID&season=T&episode=E` gera um único endereço `https://myembed.biz/serie/ID/T/E`.
- O navegador incorpora o endereço num iframe responsivo. Não há busca por título, scraping, nem chave de API.
- As URLs são checadas no servidor e novamente no cliente. Não se aceitam destinos arbitrários ou vídeos MP4/M3U8 enviados por parâmetros.

Exemplo de estrutura com um ID TMDB usado na documentação do serviço:

```text
https://myembed.biz/serie/30984/1/1
```

**Limitações:** o EmbedMovies anuncia uso gratuito básico por iframe; não fornece vídeos diretos e não garante disponibilidade de cada episódio. Os titulares dos animes retêm seus direitos. A incorporação do iframe por si só não autoriza redistribuição de obras. Anúncios, player, legendas e estabilidade dependem de terceiros. Não há bloqueio garantido de publicidade interna.

## Verificação

```bash
npm ci
npm run test:embedmovies
npm run check
```

Na publicação, abra `/api/health` e confirme versão `23.0.0`. Depois abra um anime, escolha o episódio, confirme que a rede carrega `myembed.biz` e verifique o resultado no próprio iframe. A URL construída não é prova de que o vídeo exista.

## Interface de vídeo — v23

- O título, o número do episódio e o botão **Fechar** aparecem numa faixa separada acima do iframe, sem cobrir os botões internos.
- Os controles **Vídeo** e **Legendas** do AnimeDragon não são exibidos quando o player é EmbedMovies, pois não controlam o áudio/servidores desse provedor.
- O episódio continua abrindo diretamente no endereço `serie/ID/temporada/episodio`. O `iframe` carrega em prioridade alta quando a pessoa escolhe um episódio.
- A interface de escolha **Dublado / Legendado** e a seleção de **Blogger / VIP Player / Premium** são feitas dentro do player de terceiros. **A documentação pública não especifica parâmetro de seleção automática, lista de fontes válidas ou controle de reprodução**, por isso a v23 não promete removê-las ou iniciar vídeos automaticamente.
- O `iframe` não fornece confirmação confiável de que um vídeo está de fato rodando; detectar que a página carregou não significa confirmar a disponibilidade de um episódio.
