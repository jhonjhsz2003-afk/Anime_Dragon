# Atualização v9.3 — cadastro e faixa preta

1. Extraia AnimeDragon-correcao-cadastro-e-faixa-v9.3.zip.
2. No GitHub, abra a pasta do projeto que já contém package.json, worker.js e wrangler.toml. Na estrutura diagnosticada, essa pasta é AnimeDragon2/AnimeDragon.
3. Use Add file → Upload files e envie o conteúdo extraído (as pastas server, web, tests e os arquivos na raiz do pacote), substituindo os mesmos caminhos. Não crie outra pasta AnimeDragon dentro do projeto.
4. Confirme o commit na branch main e acompanhe o novo deploy.
5. Depois do deploy, abra /api/health no site: deve mostrar 9.3.0. Atualize o navegador com Ctrl+F5 e tente cadastrar uma conta.

Mantenha o Root directory que finalmente funcionou, Build command npm run build e Deploy command npx wrangler deploy. A atualização não exige apagar o banco, recriar tabelas, trocar AUTH_SECRET ou alterar o binding DB. A adaptação da estrutura acontece automaticamente na primeira chamada de autenticação.

## O que foi corrigido

- Compatibilidade com o banco existente: usuários com ID numérico, display_name e avatar; sessões com token_hash e chave estrangeira numérica.
- Colunas novas adicionadas sem substituir tabelas nem apagar registros. Dados antigos e hashes preservados. Bloqueios continuam sendo respeitados.
- Cadastro, login, logout, perfis, comentários e fotos testados com IDs numéricos e com o banco atual de IDs de texto.
- Removida a faixa preta larga do modal do anime; mantido somente o botão Voltar.

37 testes de servidor passaram. A atualização foi validada localmente com a estrutura exata da imagem do D1. Ainda depende do seu deploy para validação remota.

Limitação das contas anteriores ao AnimeDragon atual: o formato das senhas antigas não foi fornecido, portanto elas não são convertidas e seu login antigo não está validado. Novas contas usam o formato atual e foram testadas. Nenhuma senha existente é alterada pela migração.
