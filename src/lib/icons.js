// Shared map from config icon names (kebab) -> lucide components, used by the Tools page,
// the featured-tool page, and the nav. Extend as new tools are added.
import { ShoppingBag, Store, Images, Calculator, Wrench } from "lucide-react";

export const TOOL_ICONS = {
  "shopping-bag": ShoppingBag,
  store: Store,
  images: Images,
  calculator: Calculator,
};

export function toolIcon(name) {
  return TOOL_ICONS[name] || Wrench;
}
