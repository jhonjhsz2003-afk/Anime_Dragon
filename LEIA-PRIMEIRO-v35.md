# AnimeDragon v35 — trailers e banner panorâmico

## Alterações
- YouTube IFrame Player API oficial recebe apenas IDs de trailers obtidos do TMDB; não é necessário adicionar uma chave YouTube Data API ao navegador.
- Ao exibir um anime, o carrossel avança para o próximo após 9 segundos (exceto quando pausado, inativo ou com preferência por movimento reduzido).
- Trailer iniciado sem som, quando disponível e permitido pelo navegador. Em bloqueio, indisponibilidade ou erro, aparece o backdrop do anime.
- Vídeo ajustado como plano de fundo, ocupando toda a área do banner, sem moldura ou faixas laterais criadas pelo layout. Como acontece com capas em `cover`, o vídeo é recortado nas bordas, principalmente em telas verticais.
- Os botões ficam fixos no canto inferior direito, inclusive em telas menores.
- Retirado o nome pequeno repetido nas páginas de perfil, mantendo o nome grande.

## Publicar
1. Extraia o ZIP do projeto.
2. Abra o PowerShell dentro da pasta `AnimeDragon_v35`.
3. Execute `powershell -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.
4. Confira o resultado do deploy no Cloudflare Workers. O script publica no GitHub, não executa manualmente um deploy no Cloudflare.

## Limitações
Autoplay de vídeo do YouTube depende das políticas do navegador e do proprietário do vídeo, e pode demorar para carregar. Trailers não disponibilizados para incorporação terão fallback na imagem do anime. A experiência de reprodução só pode ser validada em navegador online com as configurações reais do serviço.
