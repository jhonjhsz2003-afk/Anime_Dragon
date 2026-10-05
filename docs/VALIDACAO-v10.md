# Validação AnimeDragon v10.0.0

Conferência em 4 de outubro de 2026.

## Resultado

- 103 testes aprovados em 16 arquivos, com requisições externas desabilitadas durante a execução.
- Sintaxe verificada em 24 arquivos JavaScript, incluindo o Worker, servidor, interface e player.
- Empacotamento do Worker pelo esbuild aprovado: 71,0 kB antes de compressão.
- Interface JavaScript empacotada pelo esbuild sem erros: 135,5 kB antes de compressão.
- CSS novo processado pelo esbuild sem erros: 35,1 kB minificado.
- Dependências instaladas e fixadas em `package-lock.json`; instalação via `npm ci` no CI.

## Interface

A prévia foi aberta no navegador em tela ampla e em uma largura de celular de 390 px. Foram conferidos o banner, menu expansível, cabeçalho compacto, busca ao digitar, capas e abas de episódios/comentários. A busca encontrou um título da demonstração; a troca de aba atualizou o painel exibido.

Os testes de interface usam os módulos reais de busca e verificam foco/Escape, resultado ao digitar, navegação por teclado nas abas, cadastro pela API e salvamento que atualiza o destaque. O pacote preserva autenticação, privacidade, comentários, progresso e fontes de reprodução existentes.

## Catálogo e publicação

A produção consulta o TMDB com o Secret `TMDB_API_KEY`; não usa as histórias ilustrativas da prévia. Novos episódios representam datas de exibição cadastradas, não uma promessa de vídeo disponível. Próximas estreias e os mais bem avaliados têm consultas próprias. A home faz até 18 consultas TMDB em uma execução sem cache.

O banco continua D1 com binding `DB`. O índice de reações foi reaplicado em teste sem apagar registros. O ID do banco anterior foi preservado; uma instalação em outra conta precisa usar seu próprio ID.

`npm run build` inclui verificação de sintaxe e `wrangler deploy --dry-run`. Neste ambiente, o Wrangler não concluiu porque o sistema bloqueia criação de subprocessos (`spawn EPERM`). O empacotamento com o executável oficial do esbuild foi conferido separadamente. O CI Linux e a publicação Cloudflare ainda não foram executados remotamente.

Nenhum Secret foi alterado e nenhum deploy foi feito. A reprodução de episódios por serviços externos não foi validada com credenciais de produção. O plano Free continua sujeito às cotas documentadas no guia Cloudflare.
