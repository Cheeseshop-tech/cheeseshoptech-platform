import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { LoginForm } from "@/components/auth/login-screen.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { cldImage } from "@/lib/cloudinary.js";

// Public front door at cheeseshoptech.com / www (the house view, no tenant subdomain).
// Replaced ComingSoon 2026-08-21 (Rick): the apex IS the sign-in page now — one simple door,
// no marketing detail. Client portals still live at <client>.cheeseshoptech.com.
//
// It presents the SAME live Identity form the app uses (LoginForm, extracted from
// auth/login-screen.jsx) rather than a second copy of the auth logic. On success the auth
// context sets `user` and we hand off to ?app=1, which is the staff entry the router already
// understands — see App.jsx's staffEntry check.
//
// Imagery: two verified Media Hub assets from the Monti Trentini library. Per the directive in
// lib/images.js nothing should hand-type a Cloudinary id, but brandAssetUrl() resolves against a
// TENANT manifest and the apex is house (no tenant, so no manifest to resolve against). They are
// therefore pinned here, in one named place, verified live against the sofcvmwa cloud on
// 2026-08-21 — and they should move into a house manifest the moment one exists.
const HOUSE_IMAGERY = {
  // Alpine pasture — the wide atmospheric panel.
  pasture: "monti-trentini/library/fhncmwwacwz2treydvbt",
  // Aged wedge with the producer's flag — the small inset.
  wedge: "monti-trentini/library/qbgjjdrlzpvfdyspzbjh",
};
const img = (id, preset) => cldImage({ publicId: id, preset });

export function SignInPage({ brand }) {
  const { user } = useAuth();

  // Already signed in (or just signed in): hand off to the app. ?app=1 is the existing staff
  // entry flag, so this reuses the router's own path instead of inventing a second one.
  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    url.searchParams.set("app", "1");
    window.location.assign(url);
  }, [user]);

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Imagery panel — decorative, so it is hidden from assistive tech and dropped on small
          screens where the form is the only thing that matters. */}
      <div aria-hidden="true" className="relative hidden overflow-hidden lg:block">
        {/* scale-[1.06] trims ~3% off each edge. The source was captured from a carousel and has
            two slide dots baked into its bottom edge; object-cover alone shows the full height of
            a landscape image in this portrait panel, so they would print on the front door. The
            real fix is a clean re-crop of the asset in the Media Hub — this holds until then. */}
        <img
          src={img(HOUSE_IMAGERY.pasture, "hero")}
          alt=""
          className="absolute inset-0 h-full w-full scale-[1.06] object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        {/* Warm scrim in the HOUSE terracotta, not a neutral black — it keeps the panel on the
            agency's own palette rather than borrowing the client's green. */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(154,59,27,0.10) 0%, rgba(38,22,15,0.30) 55%, rgba(38,22,15,0.72) 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-5 p-10">
          {/* "preview" (c_limit), never "card" — card is c_pad,b_white, which bakes a white box
              into the delivered pixels and letterboxes the wedge inside it. c_limit keeps the
              real frame and CSS object-cover does the cropping. Portrait to match the source. */}
          <img
            src={img(HOUSE_IMAGERY.wedge, "preview")}
            alt=""
            className="h-36 w-28 flex-none rounded-lg border border-white/25 object-cover shadow-xl"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <p className="pb-1 font-heading text-2xl leading-snug text-white/95">
            The tools behind the counter.
          </p>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex min-h-screen items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            {brand?.logo ? (
              <img src={brand.logo} alt={brand?.name || "CheeseShop TECH"} className="h-9 w-auto" />
            ) : (
              <span className="font-heading text-2xl text-brand-primary">
                CheeseShop <span className="font-sans font-bold tracking-widest text-fg">TECH</span>
              </span>
            )}
            <h1 className="mt-5 font-heading text-3xl leading-tight text-fg">
              Cheese Merchant Business Tools
            </h1>
            <p className="mt-2 text-sm text-fg-muted">Sign in to your portal.</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <LoginForm idPrefix="apex-" />
            </CardContent>
          </Card>

          <p className="mt-8 text-xs text-fg-muted">
            Client portals live at{" "}
            <span className="font-mono text-fg">&lt;brand&gt;.cheeseshoptech.com</span>
          </p>
          <p className="mt-2 text-xs text-fg-muted">CheeseShop TECH · Posada &amp; Co.</p>
        </div>
      </div>
    </div>
  );
}
