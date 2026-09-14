/**
 * Builds the final redirect target for `src/app/auth/callback/route.ts`:
 * `next` plus an `auth_error=1` flag when the sign-in attempt failed.
 * `authFailed` is the only source of truth for that flag — any `auth_error`
 * already present in `next` (safeInternalPath passes an existing query
 * string through) is explicitly cleared on the success path, so a crafted
 * `next` can never spoof or suppress it.
 *
 * Pulled out of the route module itself because Next's typed route
 * handlers only permit HTTP-method exports (plus a small config allow-list)
 * from a `route.ts` file — any other export fails the generated route type
 * check.
 */
export function buildCallbackRedirectUrl(
  origin: string,
  next: string,
  authFailed: boolean,
): URL {
  const redirectUrl = new URL(next, origin);
  if (authFailed) {
    redirectUrl.searchParams.set("auth_error", "1");
  } else {
    redirectUrl.searchParams.delete("auth_error");
  }
  return redirectUrl;
}
