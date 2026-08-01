import { useState } from "react";
import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";
import { useToast } from "@/components/ui/toast.jsx";
import { loadCatalog, addEntry, DEFAULT_QUOTA } from "@/lib/presentations-store.js";
import { loadDraft } from "@/lib/proposals.js";
import { SlideStudio } from "@/components/presentations/slide-studio.jsx";
import { ProposalBuilder } from "./proposal-builder.jsx";

// Compose — one shell over every content format. Compose (the pitch + range + pricing proposal
// builder) is the default tab; Slide deck is the template engine (gallery → filmstrip + slot
// inspector), painted from the tenant Brand Kit and bound to the Media Hub + brand voice.
// Saves link-based decks to the Content Library (quota + optional review gate).
const CONTENT_TYPES = [
  { id: "compose", label: "Compose" },
  { id: "slide-deck", label: "Slide deck" },
  { id: "blog", label: "Blog" },
  { id: "email", label: "Email" },
  { id: "social-post", label: "Social post" },
  { id: "social-carousel", label: "Social carousel" },
];

export function ContentStudio({ resolved }) {
  const { user } = useAuth();
  const isHouse = rolesOf(user).includes("admin");
  const { toast } = useToast();
  const [ctype, setCtype] = useState("compose");
  // The Director's seed: an Opportunity "Compose" click writes a proposal draft (buyer, headline,
  // storyKeys, skuCodes). Auto-compose reuses it, so wire 5 (market intelligence) feeds the Studio.
  const seed = loadDraft(resolved.id);
  const active = CONTENT_TYPES.find((t) => t.id === ctype);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 border-b border-border pb-2">
        {CONTENT_TYPES.map((t) => (
          <button key={t.id} onClick={() => setCtype(t.id)}
            className={"rounded-full border px-4 py-1.5 text-sm transition " + (t.id === ctype ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-border bg-bg text-fg hover:bg-fg/5")}>
            {t.label}
          </button>
        ))}
      </div>

      {ctype === "compose" ? (
        <ProposalBuilder resolved={resolved} />
      ) : ctype === "slide-deck" ? (
        <SlideStudio
          resolved={resolved}
          opportunity={seed && (seed.headline || (seed.skuCodes || []).length) ? seed : undefined}
          onSave={(entry) => {
            if (loadCatalog(resolved.id).length >= (resolved.contentQuota || DEFAULT_QUOTA)) {
              toast({ title: "Content Library full", description: "Delete or download an item in the Library to add more.", tone: "error" });
              return;
            }
            const needsReview = resolved.reviewRequired && !isHouse;
            addEntry(resolved.id, { ...entry, status: needsReview ? "submitted" : "posted" });
            toast({ title: needsReview ? "Deck submitted for review" : "Saved to Content Library", tone: "success" });
          }}
        />
      ) : (
        <div className="rounded-base border border-dashed border-border bg-bg p-12 text-center">
          <h2 className="font-heading text-2xl text-brand-primary">{active.label} templates</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-fg-muted">
            Coming soon — built on the same engine: slots + Brand-Kit paint + Media Hub / Cloudinary bindings, sized for {active.label.toLowerCase()}. The slide-deck builder proves the model; each type ships as manifests wired to the image selector.
          </p>
        </div>
      )}
    </div>
  );
}
