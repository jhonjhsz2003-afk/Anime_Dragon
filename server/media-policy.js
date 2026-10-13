/** Política do AnimeDragon para o player público incorporado e serviços de metadados. */
export function contentSecurityPolicy(){
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'frame-src https://myembed.biz',
    "child-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://cdn.jsdelivr.net/npm/shaka-player@5.2.12/dist/shaka-player.compiled.js",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob: https://akumast.net",
    "connect-src 'self' https://akumast.net https://api.giphy.com https://*.giphy.com https://*.giphyusercontent.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ].join('; ');
}
