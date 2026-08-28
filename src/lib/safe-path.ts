/**
 * Validates that `value` is safe to use as an internal redirect/link target
 * — same-origin, never attacker-controlled. Parses with the WHATWG `URL`
 * constructor against a fixed, non-existent base rather than string-matching
 * a `/` prefix: a prefix check alone still accepts values like `/\evil.com`
 * or `/\t/evil.com`, which `URL` (and every browser) normalizes to
 * `//evil.com` during parsing — a protocol-relative URL that silently
 * redirects off-site. Parsing first and checking the *resulting* origin
 * catches those the same way a naive prefix check can't.
 */
export function safeInternalPath(value: string | null | undefined): string {
  if (!value) return "/";

  const placeholder = "http://internal.invalid";
  let resolved: URL;
  try {
    resolved = new URL(value, placeholder);
  } catch {
    return "/";
  }

  if (resolved.origin !== placeholder) return "/";
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
