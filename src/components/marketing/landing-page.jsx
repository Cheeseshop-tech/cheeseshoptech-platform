// Public apex landing page for CheeseShop TECH (the house/agency front door at cheeseshoptech.com / www).
// Invite-only, outcome-led — built from docs/CST_POSITIONING_BRIEF.md. Client portals live at
// <client>.cheeseshoptech.com; staff/house reach the app at ?app=1 (the quiet "Log in" below).
// NOTE: the "Request an invitation" CTA is a mailto placeholder (hello@cheeseshoptech.com) — wire a real
// form/inbox before launch.

const APPLY = "mailto:hello@cheeseshoptech.com?subject=Brand-to-Sales%20Engine%20%E2%80%94%20invitation%20request";

const PILLARS = [
  { t: "One voice, everywhere it sells", d: "Your brand kit and voice, consistent across every customer and prospect touch — enforced by the system, not re-remembered per project." },
  { t: "Owns the outcome, not the busywork", d: "We're judged on sales impact, not clicks or impressions. The whole engine points at one scoreboard: revenue." },
  { t: "Full stack, small senior team", d: "Strategy, a production studio, and the tech — the Content Engine wired into your CRM — under one roof. A big team's output from a small one." },
  { t: "Curated, not mass", d: "By invitation. We take a limited number of partner brands at a time, so you get senior attention and total focus." },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-heading text-2xl text-brand-primary">
          CheeseShop <span className="font-sans font-bold tracking-widest text-fg">TECH</span>
        </span>
        <a href="/?app=1" className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline">Log in</a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center">
        <p className="cs-eyebrow text-brand-accent">By invitation</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight text-fg sm:text-5xl">
          The brand power of a big team. The focus of a small one.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
          We don't run campaigns. We run your <span className="text-fg">brand-to-sales engine</span> —
          one voice, every channel, built to sell.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href={APPLY} className="rounded-base bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90">
            Request an invitation
          </a>
          <a href="/?app=1" className="rounded-base border border-border px-6 py-3 text-sm font-medium text-fg transition-colors hover:border-brand-primary">
            Partner &amp; staff log in
          </a>
        </div>
        <p className="mt-5 text-xs text-fg-muted">By application — a limited number of partner brands.</p>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.t} className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-heading text-xl text-fg">{p.t}</h3>
              <p className="mt-2 leading-relaxed text-fg-muted">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof band */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface px-8 py-12 text-center">
          <p className="font-heading text-3xl text-brand-primary">10–20% revenue growth</p>
          <p className="mt-2 text-fg-muted">is what brands with strong, consistent brand presence tend to see. Consistency isn't cosmetic — it sells.</p>
          <div className="mx-auto mt-8 h-px w-16 bg-border" />
          <p className="mx-auto mt-8 max-w-2xl leading-relaxed text-fg">
            Built by a seller, for sellers. Our founder has taken brands <span className="font-semibold">from
            unknown to national — even tripling sales</span>, and built and led the teams to do it. Along the way
            he mapped the real obstacles that keep good brands from their full market impact, and built the
            solutions into the platform behind CheeseShop TECH.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 pb-24 text-center">
        <h2 className="font-heading text-3xl text-fg">A few brands. Total focus. Real sales.</h2>
        <p className="mx-auto mt-3 max-w-xl text-fg-muted">If that's the partner you've been looking for, request an invitation.</p>
        <a href={APPLY} className="mt-8 inline-block rounded-base bg-brand-primary px-7 py-3 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90">
          Request an invitation
        </a>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-fg-muted">
        CheeseShop TECH · cheeseshoptech.com
      </footer>
    </div>
  );
}
