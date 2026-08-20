import Link from "next/link";

export function AdminAccessDenied() {
  return (
    <main className="admin-signin">
      <section className="signin-card">
        <p className="eyebrow">Signed in</p>
        <h1>Your account isn&rsquo;t an admin yet</h1>
        <p>
          You&rsquo;re signed in, but this account hasn&rsquo;t been granted
          admin access. Admin roles are only granted by direct database access —
          ask the maintainer to enable it for your account.
        </p>
        <Link className="button button-primary" href="/">
          Back to TuEats
        </Link>
      </section>
    </main>
  );
}
