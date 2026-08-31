/**
 * Post-auth redirect targets are attacker-influenced (they ride in the URL as
 * `?next=`). Only ever send the user to a path on our own site, and never back
 * into the auth screens.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/home",
): string {
  if (!next) return fallback;
  // Must be a single-slash absolute path: "/foo" ok, "//evil" and "/\evil" not.
  if (!/^\/[^/\\]/.test(next)) return fallback;
  const path = next.split(/[?#]/)[0];
  if (path === "/login" || path === "/register") return fallback;
  return next;
}
