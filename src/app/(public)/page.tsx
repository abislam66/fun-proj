export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[40rem] flex-col justify-center px-md py-xl">
      <p className="text-small font-medium text-ink-secondary">
        Temple&apos;s unofficial off-meal-plan food guide
      </p>
      <h1 className="font-display text-display mt-sm">
        Tu<span className="text-cherry">Eats</span>
      </h1>
      <p className="mt-md text-ink-secondary">
        The venue explorer is coming next. This foundation intentionally ships
        without map or directory UI.
      </p>
      <p className="text-micro mt-xl text-ink-muted">
        Unofficial and not affiliated with Temple University.
      </p>
    </main>
  );
}
