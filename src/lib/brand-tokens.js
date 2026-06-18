import { getBrandKit } from "./brandKit.js";

// Resolve template paint TOKENS ($accent, $display, $logo, …) against the active tenant's Brand Kit.
// Manifests stay brand-agnostic — one template paints any tenant. This is the "smart brand-kit plug-in".
export function brandTokens(resolved) {
  const kit = getBrandKit(resolved) || {};
  const id = kit.identity || {};
  const c = id.colors || {};
  const sec = c.secondary || [];
  const neu = c.neutrals || [];
  const t = id.type || {};
  const logo = id.logo || {};
  return {
    colors: {
      primary: c.primary?.hex || "#064E22",
      accent: c.accent?.hex || "#009640",
      sage: sec[0]?.hex || "#70C883",
      mint: sec[1]?.hex || "#C8E2C5",
      cream: neu[0]?.hex || "#FFFBDC",
      paper: neu[1]?.hex || "#FAF9F5",
      charcoal: neu[2]?.hex || "#716A6A",
      ink: neu[3]?.hex || "#141413",
      "on-primary": neu[0]?.hex || "#FFFBDC",
    },
    fonts: {
      display: t.display?.cssStack || '"Cora","Fraunces",Georgia,serif',
      ui: t.ui?.cssStack || '"Futura PT","Futura",Inter,system-ui,sans-serif',
    },
    assets: {
      logo: logo.primary || "",
      seal: logo.seal || kit.imagery?.seal || "",
      sprig: "",
    },
  };
}

// $token → resolved value; literals pass through unchanged (hybrid-safe).
export function resolveTok(v, tk) {
  if (typeof v !== "string" || v[0] !== "$") return v;
  const k = v.slice(1);
  return tk.colors[k] ?? tk.fonts[k] ?? tk.assets[k] ?? v;
}

// Brand-voice options for copy slots: story blocks, ready phrases, and key lines.
export function voiceOptions(resolved) {
  const kit = getBrandKit(resolved) || {};
  const v = kit.voice || {};
  const lines = [];
  if (v.motto) lines.push({ label: "Motto", text: v.motto });
  if (v.mantra) lines.push({ label: "Mantra", text: v.mantra });
  if (v.positioningHook) lines.push({ label: "Hook", text: v.positioningHook });
  if (v.heritage) lines.push({ label: "Heritage", text: v.heritage });
  return {
    phrases: v.readyPhrases || [],
    stories: (kit.storyBlocks || []).map((b) => ({ title: b.title, body: b.body })),
    lines,
  };
}
