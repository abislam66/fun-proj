"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button, Input, Wordmark } from "@/components/ui/primitives";

export function MockSignIn() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid admin email.");
      return;
    }
    setError("");
    setStep("otp");
  }

  function submitOtp(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit mock code.");
      return;
    }
    setError("");
    document.cookie =
      "tueats_phase1_admin_mock=1; Path=/admin; SameSite=Lax; Max-Age=86400";
    router.push("/admin");
  }

  return (
    <main className="admin-signin">
      <section className="signin-card">
        <div className="signin-brand">
          <Wordmark />
          <span>Admin</span>
        </div>
        <span className="mock-badge">Mock authentication</span>
        <h1>{step === "email" ? "Sign in to manage venues" : "Check your email"}</h1>
        <p>
          {step === "email"
            ? "Phase 1 preview only. No email is sent and no account is created."
            : `We pretended to send a one-time code to ${email}. Enter any six digits.`}
        </p>

        {step === "email" ? (
          <form className="signin-form" noValidate onSubmit={submitEmail}>
            <label className="admin-field">
              <span>Email address</span>
              <Input
                aria-invalid={Boolean(error)}
                autoComplete="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="admin@temple.edu"
                type="email"
                value={email}
              />
              {error ? <em className="admin-field-error">{error}</em> : null}
            </label>
            <Button type="submit">Send mock code</Button>
          </form>
        ) : (
          <form className="signin-form" noValidate onSubmit={submitOtp}>
            <label className="admin-field">
              <span>One-time code</span>
              <Input
                aria-invalid={Boolean(error)}
                autoComplete="one-time-code"
                className="otp-input"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                placeholder="123456"
                value={code}
              />
              {error ? <em className="admin-field-error">{error}</em> : null}
            </label>
            <Button type="submit">Enter mock workspace</Button>
            <Button
              onClick={() => {
                setStep("email");
                setCode("");
              }}
              variant="ghost"
            >
              Use another email
            </Button>
          </form>
        )}
        <p className="signin-footnote">
          Backend authentication and server actions are intentionally untouched.
        </p>
      </section>
    </main>
  );
}
