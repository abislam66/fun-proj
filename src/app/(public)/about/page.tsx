import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export default function AboutPage() {
  return (
    <div className="public-page">
      <SiteHeader />
      <main className="about-page">
        <p className="eyebrow">About the guide</p>
        <h1>Campus food, without the guesswork.</h1>
        <p className="about-lede">
          TuEats is a small, community-built guide to food trucks and other
          off-meal-plan food around Temple University&apos;s main campus.
        </p>

        <section>
          <h2>Why it exists</h2>
          <p>
            Campus food changes quickly. A familiar cart moves, posted hours
            drift, and a great lunch can hide one block away. TuEats puts the
            useful details in one place: where to go, what kind of food is
            there, and whether it is usually open.
          </p>
        </section>
        <section>
          <h2>How the information works</h2>
          <p>
            Listings are curated and periodically checked. Hours are always a
            guide, not a promise. If something looks wrong, use the report link
            on the venue page so it can be checked.
          </p>
        </section>
        <aside className="about-note">
          <strong>Independent and unofficial.</strong>
          <p>
            TuEats is not affiliated with, endorsed by, or operated by Temple
            University.
          </p>
        </aside>
        <Link className="button button-primary about-cta" href="/">
          Explore places to eat
        </Link>
      </main>
    </div>
  );
}
