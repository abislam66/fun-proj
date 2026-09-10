import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export default async function AboutPage() {
  return (
    <div className="public-page">
      <SiteHeader />
      <main className="about-page">
        <p className="eyebrow">About the guide</p>
        <h1>Discover food options with ease.</h1>
        <p className="about-lede">
          TuEats is a community-built guide to food trucks, cafes and
          restaurants around Temple University&apos;s main campus.
        </p>

        <section>
          <h2>Why we built it</h2>
          <p>
            Within a few weeks on being on campus, everybody has a favorite
            place to eat and you end up not trying new places. We built TuEats
            to help you discover all the cuisines available on campus.
          </p>
        </section>
        <section>
          <h2>How the information works</h2>
          <p>
            Listings are curated and periodically checked. Rate the places
            you've been to and share your thoughts with the class! If something
            looks wrong, use the report link on the venue page so we can check
            it.
          </p>
        </section>
        <section>
          <h2>Signing in</h2>
          <p>
            Everyone can create an account using their Google account. Accounts
            are needed to rate, comment, and add photos to places.
          </p>
        </section>
        <section>
          <h2>Hosting an event with free food?</h2>
          <p>
            Student orgs, clubs, and anyone putting out free food on campus can
            get featured here. Email{" "}
            <a href="mailto:rafiat.amir@temple.edu">rafiat.amir@temple.edu</a>{" "}
            with what, when, and where — we&apos;ll take a look.
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
