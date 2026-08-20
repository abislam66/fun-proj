"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { requestPasswordReset, signInAdmin } from "@/actions/auth";
import { Button, Input, Wordmark } from "@/components/ui/primitives";

type Mode = "signin" | "forgot" | "forgot-sent";

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submitSignIn(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const result = await signInAdmin({ email, password });
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Refresh the page and try again.");
      setPending(false);
    }
  }

  async function submitForgotPassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const result = await requestPasswordReset({ email });
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMode("forgot-sent");
    } catch {
      setPending(false);
      setError("Something went wrong. Refresh the page and try again.");
    }
  }

  function backToSignIn() {
    setMode("signin");
    setError("");
    setPassword("");
  }

  return (
    <main className="admin-signin">
      <section className="signin-card">
        <div className="signin-brand">
          <Wordmark />
          <span>Admin</span>
        </div>

        {mode === "forgot-sent" ? (
          <>
            <h1>Check your email</h1>
            <p>
              If {email} has an admin account, a password reset link is on
              its way.
            </p>
            <Button onClick={backToSignIn} variant="ghost">
              Back to sign in
            </Button>
          </>
        ) : mode === "forgot" ? (
          <>
            <h1>Reset your password</h1>
            <p>Enter your admin email and we&rsquo;ll send a reset link.</p>

            <form className="signin-form" noValidate onSubmit={submitForgotPassword}>
              <label className="admin-field">
                <span>Email address</span>
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="email"
                  disabled={pending}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  type="email"
                  value={email}
                />
                {error ? <em className="admin-field-error">{error}</em> : null}
              </label>
              <Button disabled={pending} type="submit">
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <Button onClick={backToSignIn} variant="ghost">
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <h1>Sign in to manage venues</h1>
            <p>Admin access only.</p>

            <form className="signin-form" noValidate onSubmit={submitSignIn}>
              <label className="admin-field">
                <span>Email address</span>
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="email"
                  disabled={pending}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  type="email"
                  value={email}
                />
              </label>
              <label className="admin-field">
                <span>Password</span>
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="current-password"
                  disabled={pending}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  type="password"
                  value={password}
                />
                {error ? <em className="admin-field-error">{error}</em> : null}
              </label>
              <Button disabled={pending} type="submit">
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <Button
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
              variant="ghost"
            >
              Forgot password?
            </Button>
          </>
        )}

        <p className="signin-footnote">
          Browsing TuEats never requires an account. This sign-in is for admin
          venue management only.
        </p>
      </section>
    </main>
  );
}
