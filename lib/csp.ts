/**
 * Content-Security-Policy, built per request (proxy.ts) so scripts can be nonce-guarded.
 *
 *  - scripts: only ours ('self') or tagged with this request's nonce; 'strict-dynamic' lets a
 *    trusted script load its own chunks. No 'unsafe-inline' — an injected <script> won't run.
 *  - styles keep 'unsafe-inline': React/Tailwind emit style="" attributes, which a nonce can't
 *    cover, and style injection is a far smaller risk than script injection.
 *  - images https: (catalogue photos from Supabase Storage), data:/blob: (previews).
 *  - connect: this site + Supabase (REST, Auth, Storage, Realtime).
 *
 * Pure so it is unit-tested.
 */
export interface CspOptions {
  nonce: string;
  isDev: boolean;
  /** hostname of the Supabase project, if configured */
  supabaseHost?: string;
}

export function buildCsp({ nonce, isDev, supabaseHost }: CspOptions): string {
  const supabase = supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : "";
  const directives = [
    "default-src 'self'",
    // dev: React needs eval for debugging info; production doesn't
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${supabase}${isDev ? " ws://localhost:* ws://*:*" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** A fresh, unguessable value per request. */
export function newNonce(): string {
  return btoa(crypto.randomUUID());
}
