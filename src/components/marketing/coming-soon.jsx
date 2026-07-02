// Public apex landing page. Served at cheeseshoptech.com / www (the "house" view, no tenant
// subdomain) — ONE address for everything (2026-07-02 consolidation): the public face, sign-in,
// and the unlisted /tools/* + /series/* rooms all ride this one site. Client portals live at
// <client>.cheeseshoptech.com. Sign in = the staff door (?app=1 → passcode gate).
export function ComingSoon() {
  function signIn() {
    const url = new URL(window.location.href);
    url.searchParams.set("app", "1");
    window.location.assign(url);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="max-w-xl">
        <span className="font-heading text-3xl text-brand-primary">
          CheeseShop <span className="font-sans font-bold tracking-widest text-fg">TECH</span>
        </span>

        <h1 className="mt-8 font-heading text-4xl leading-tight text-fg">
          Sales-led growth for specialty &amp; perishable food brands
        </h1>
        <p className="mt-4 text-lg text-fg-muted">
          Coordinated campaigns, an in-house content studio, and the storefront to capture it —
          one partner instead of four.
        </p>

        <div className="mt-10 inline-flex items-center gap-2 rounded-base border border-border bg-surface px-4 py-2 text-sm text-fg-muted">
          <span className="h-2 w-2 rounded-full bg-brand-accent" />
          Launching soon
        </div>

        <p className="mt-10 text-sm text-fg-muted">
          Client portals are live at <span className="font-mono text-fg">&lt;brand&gt;.cheeseshoptech.com</span>
        </p>
      </div>

      <footer className="absolute bottom-6 flex items-center gap-5 text-xs text-fg-muted">
        <span>CheeseShop TECH · Posada &amp; Co.</span>
        <button
          onClick={signIn}
          className="cs-eyebrow border-b border-transparent uppercase tracking-widest text-fg-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
        >
          Sign in
        </button>
      </footer>
    </div>
  );
}
