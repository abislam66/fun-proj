"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { updateAdminPassword } from "@/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button, Input, Wordmark } from "@/components/ui/primitives";

type ScreenState = "checking" | "ready" | "invalid";

/**
 * Establishes the recovery session, then lets the user set a new password.
 *
 * Supabase puts recovery tokens in one of two places depending on how the
 * link was generated:
 *  - the URL fragment (#access_token=...&type=recovery) — the current
 *    default for dashboard-triggered resets. Servers never see fragments,
 *    so this has to be read and exchanged client-side.
 *  - a query param (?token_hash=...&type=recovery) — Supabase's newer
 *    template style, if it's ever configured.
 * Either way, once exchanged the session is a normal Supabase session —
 * updateAdminPassword() runs server-side and never touches profiles.role.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    async function establishSession() {
      const query = new URLSearchParams(window.location.search);
      const tokenHash = query.get("token_hash");
      const type = query.get("type");

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (cancelled) return;
        router.replace("/admin/reset-password");
        setState(error ? "invalid" : "ready");
        return;
      }

      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken && hash.get("type") === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        window.history.replaceState(null, "", "/admin/reset-password");
        setState(error ? "invalid" : "ready");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setState(data.session ? "ready" : "invalid");
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const result = await updateAdminPassword({ password });
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }

      router.push("/admin/sign-in");
      router.refresh();
    } catch {
      setError("Something went wrong. Refresh the page and try again.");
      setPending(false);
    }
  }

  return (
    <main className="admin-signin">
      <section className="signin-card">
        <div className="signin-brand">
          <Wordmark />
          <span>Admin</span>
        </div>

        {state === "checking" ? (
          <>
            <h1>Checking your link…</h1>
            <p>One moment.</p>
          </>
        ) : state === "invalid" ? (
          <>
            <h1>Link expired</h1>
            <p>
              This recovery link is invalid or has expired. Request a new one
              from the sign-in page.
            </p>
            <Button onClick={() => router.push("/admin/sign-in")}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p>Choose a new password for your admin account.</p>

            <form className="signin-form" noValidate onSubmit={submit}>
              <label className="admin-field">
                <span>New password</span>
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="new-password"
                  disabled={pending}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  type="password"
                  value={password}
                />
              </label>
              <label className="admin-field">
                <span>Confirm password</span>
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="new-password"
                  disabled={pending}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    setError("");
                  }}
                  type="password"
                  value={confirm}
                />
                {error ? <em className="admin-field-error">{error}</em> : null}
              </label>
              <Button disabled={pending} type="submit">
                {pending ? "Updating…" : "Update password"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
