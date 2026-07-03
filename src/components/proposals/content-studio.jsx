import { useAuth } from "@/lib/auth-context.jsx";
import { rolesOf } from "@/lib/auth.js";
import { useToast } from "@/components/ui/toast.jsx";
import { loadCatalog, addEntry, DEFAULT_QUOTA } from "@/lib/presentations-store.js";
import { loadDraft } from "@/lib/proposals.js";
import { SlideStudio } from "@/components/presentations/slide-studio.jsx";

// Content Studio IS the template engine. Opens directly into SlideStudio (type switcher → template gallery →
// filmstrip + slot inspector), painted from the tenant Brand Kit, bound to the Media Hub + brand voice.
// Saves link-based decks to the Content Library (quota + optional review gate).
export function ContentStudio({ resolved }) {
  const { user } = useAuth();
  const isHouse = rolesOf(user).includes("admin");
  const { toast } = useToast();
  // The Director's seed: an Opportunity "Compose" click writes a proposal draft (buyer, headline,
  // storyKeys, skuCodes). Auto-compose reuses it, so wire 5 (market intelligence) feeds the Studio.
  const seed = loadDraft(resolved.id);
  return (
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
  );
}
