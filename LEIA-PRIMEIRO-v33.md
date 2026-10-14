# AnimeDragon v33.0.0 — ajustes visuais, perfil e player

## O que mudou
- Capas dos trilhos da página inicial discretamente menores, sem deformar as imagens; banner rotativo maior e independente dos trilhos.
- Navegação superior mais legível no desktop: ícones, nome AnimeDragon, links de navegação e avatar do perfil ampliados. Layout mobile preservado.
- A etiqueta do perfil usa o nome real da pessoa, não um título pessoal. O título antigo permanece apenas nos dados para compatibilidade. O nome pode ser alterado em **Conta e privacidade**.
- Corrigida a posição inicial dos seis stickers (os últimos deixaram de ultrapassar 100% na horizontal). O sexto sticker agora pode ser salvo com valores aceitos pelo servidor; teste automatizado cobre seis stickers.
- Ao selecionar um episódio com ID TMDB, temporada e número válidos, abre-se imediatamente o iframe oficial de **episódio direto** do EmbedMovies, antes da confirmação da rota do Worker. A seleção de episódio no AnimeDragon é feita automaticamente. Os botões de trocar de episódio usam o mesmo fluxo.

## Limitação importante do provedor externo
O EmbedMovies pode abrir **uma tela própria com Blogger/Premium/dublado/legendado**. Sua documentação pública só fornece a URL direta do episódio. Não documenta opção de selecionar o servidor interno, remover essa tela ou iniciar o áudio automaticamente. O AnimeDragon não pode clicar dentro do iframe de outro domínio por segurança do navegador. Assim, abrir o episódio está mais rápido, mas **não há garantia de pular o seletor interno nem de reprodução automática com som**. Isso exigiria suporte oficial do serviço ou um provedor controlado por você que disponibilize uma API própria para seleção do player. A disponibilidade dos títulos também depende do serviço.

## Como instalar e publicar
1. Extraia o ZIP.
2. Abra a pasta `AnimeDragon_v33`.
3. Execute o `SUBIR-GITHUB.ps1` no PowerShell **dentro dessa pasta**. É preciso ter Git instalado e estar autenticado no GitHub para acessar o repositório.
4. Se seu Cloudflare Workers não estiver configurado para fazer deploy quando o GitHub atualizar, publique pelo seu fluxo Cloudflare habitual (`PUBLICAR-CLOUDFLARE.ps1` existe no projeto).
5. Após o deploy, verifique `/api/health` (versão `33.0.0`) e atualize a página com `Ctrl+F5` se ainda vir arquivos em cache.

## Testes
Rode `npm ci` seguido de `npm test` usando Node.js 22.13+ para instalar também a dependência de testes `linkedom`. Testes automatizados novos estão em `tests/v33-refinements.test.js`. A prévia local (`npm run preview`) utiliza catálogo ilustrativo e não reproduz vídeos reais.


### Correcao do PowerShell (publicacao)
- `SUBIR-GITHUB.ps1` agora usa `$PSScriptRoot` quando executado como arquivo, ou a pasta atual quando o codigo e colado no terminal.
- Tambem reconhece uma subpasta `AnimeDragon_v33` e exibe a pasta utilizada antes da publicacao.
- Maneira recomendada: abra o PowerShell dentro de `AnimeDragon_v33` e execute `powershell -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.
