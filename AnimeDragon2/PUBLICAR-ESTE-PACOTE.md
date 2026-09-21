# Publicar esta versão no GitHub e Cloudflare

1. Extraia AnimeDragon-v9.4-GitHub.zip.
2. Na RAIZ do repositório Anime_Dragon, envie a pasta AnimeDragon2 extraída. Ela substitui a pasta AnimeDragon2 já existente. Não envie essa pasta dentro de outra AnimeDragon2.
3. Confirme o commit na branch main. Aguarde o NOVO build gerado por esse commit.
4. Na Cloudflare: Root directory = AnimeDragon2; Build command = npm run build; Deploy command = npx wrangler deploy.
5. O código do commit do build deve ser o novo código gerado pelo upload, não o commit antigo 05f6bf5.
6. Após o deploy, /api/health deve informar 9.4.0. Atualize o site com Ctrl+F5.

A estrutura correta é Anime_Dragon/AnimeDragon2/package.json, com worker.js e wrangler.toml na mesma pasta.
Preserve seus segredos e o banco D1 existente na Cloudflare. Este pacote usa o ID de banco do projeto original; não apague o banco.

Inclui o player amplo azul, controles personalizados, interações e correções de cadastro e da faixa preta.
A reprodução de fontes MKV/HEVC depende do navegador e do provedor. O pacote não converte vídeos nem inclui episódios.
