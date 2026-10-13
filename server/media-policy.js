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
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:", 
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ].join('; ');
}
