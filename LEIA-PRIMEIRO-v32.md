# AnimeDragon v32.0.0 — Atualização de perfil e DragonGIF

Esta versão foi construída sobre a v31.3, em que a busca direta à API pública DragonGIF funcionava. **Não substitua as pastas do DragonGIF ou o banco D1**: somente o código do AnimeDragon é atualizado.

## O que mudou

- A barra principal do perfil respeita a largura máxima de 1.150 pixels e rola horizontalmente em telas pequenas.
- 12 atmosferas RGB animadas novas, somadas às 12 antigas: 24 opções. As escolhas funcionam no perfil público.
- O editor de stickers foi movido de **Personalizar** para **Foto e avatar**, ocupando o lugar do antigo controle de upload local.
- O GIF de avatar continua sendo escolhido em **Explorar GIFs de avatar no DragonGIF**; upload local foi removido dessa tela.
- Até 6 stickers por perfil; limite aplicado também no servidor. Reposicionar, tamanho, ordem, remover e salvar continuam disponíveis.
- Bio maior, com emojis originais, 6 cores fixas e 6 estilos incluindo RGB animado. Texto e estilo são exibidos nos perfis públicos.
- Cache em memória de curta duração e pré-carregamento da primeira página de GIFs e stickers quando o perfil é aberto; resultados repetidos na mesma chamada são filtrados. Isso reduz consultas, mas não pode garantir download instantâneo de GIFs pesados ou em redes lentas.
- Dados de bio/estilo são gravados no JSON de `profile_stickers_v29`, com leitura retrocompatível das listas antigas. **Não precisa rodar migração D1**.

## Publicar

1. Extraia esta pasta.
2. Abra PowerShell na pasta raiz que contém `worker.js`, `wrangler.toml`, `server` e `web`.
3. Execute `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\SUBIR-GITHUB.ps1`.
4. Confira GitHub Actions e a publicação automática no Cloudflare. Se o Cloudflare estiver desconectado do GitHub, execute `PUBLICAR-CLOUDFLARE.ps1` seguindo as instruções anteriores.
5. Após deploy, veja `/api/health`, que deve mostrar `32.0.0`; limpe o cache com Ctrl+F5 e teste abas, perfil público, pesquisa e salvamento dos 6 stickers.

**Atenção:** O script substitui o conteúdo do repositório por este pacote completo, preservando o histórico do Git e sem `--force`. Ele ignora `node_modules`, segredos comuns, GIFs e stickers locais. Não inclua credenciais em arquivos de código. Antes de publicar, mantenha backup de seus arquivos.

## Validação

`npm run check` passou. Testes direcionados de perfil, integração DragonGIF, API e preservação de dados passaram, incluindo 6 stickers e bio RGB em perfil público. Na suíte geral, 167 testes passaram e 6 testes de interface ficaram sem executar por indisponibilidade de `linkedom` neste ambiente; a instalação local da dependência não terminou. A renderização automática no Chromium também foi bloqueada pelo ambiente. **O deploy e o navegador real não foram testados aqui**.
