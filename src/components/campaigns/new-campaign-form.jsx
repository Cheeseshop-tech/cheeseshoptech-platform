import { useState } from "react";
import { Mail, Share2, PhoneCall, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { useAuth } from "@/lib/auth-context.jsx";
import { CAMPAIGN_TYPES, CHANNELS, templateFor, createCampaign } from "@/lib/campaigns.js";

const TYPE_ICON = { email: Mail, social: Share2, enrichment: PhoneCall };

/**
 * "New Campaign" tab (2026-08-21, Rick: "lets add a template form and tab for create a
 * campaign"). Picking a type shows a live preview of that type's checklist template
 * (CHECKLIST_TEMPLATES in lib/campaigns.js) — the "template" the request asked for: what gets
 * created is a campaign whose launch-readiness checklist is already seeded from the type,
 * exactly like every seeded campaign's checklist is.
 *
 * On success, hands the new campaign back to CampaignsPage, which opens it straight into detail
 * view — Rick can start ticking the checklist immediately instead of hunting for the new card.
 */
export function NewCampaignForm({ resolved, allCampaigns, onCreated }) {
  const { user } = useAuth();
  const [type, setType] = useState(CAMPAIGN_TYPES[0].id);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [channels, setChannels] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [owner, setOwner] = useState(user?.user_metadata?.full_name || user?.email || "");
  const [strategy, setStrategy] = useState("");
  const [audienceLabel, setAudienceLabel] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [serves, setServes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const template = templateFor(type);
  const requiredCount = template.filter((t) => t.required).length;
  // Enrichment campaigns can name the send they unblock (scopeOf() in lib/campaigns.js). Only
  // non-enrichment campaigns make sense as a target.
  const servableCampaigns = (allCampaigns || []).filter((c) => c.type !== "enrichment");

  function toggleChannel(key) {
    setChannels((cur) => (cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]));
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) { setError("Campaign name is required."); return; }
    setBusy(true);
    setError("");
    const campaign = {
      type,
      name: trimmed,
      goal: goal.trim(),
      channels,
      start: start || null,
      end: end || null,
      owner: owner.trim(),
      strategy: strategy.trim(),
      audience: (audienceLabel.trim() || audienceSize)
        ? { label: audienceLabel.trim(), ...(audienceSize ? { size: Number(audienceSize) } : {}) }
        : null,
      ...(type === "enrichment" && serves ? { serves } : {}),
    };
    const existingIds = (allCampaigns || []).map((c) => c.id);
    const result = await createCampaign(resolved, campaign, existingIds);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.status === 401 || result.status === 403
          ? "You don't have write access to create a campaign."
          : result.error || "Couldn't create the campaign — try again."
      );
      return;
    }
    onCreated?.(result.campaign);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New campaign</CardTitle>
          <CardDescription>
            Pick a type to seed its launch-readiness checklist, fill in the basics, and it's added
            to the {CAMPAIGN_TYPES.find((t) => t.id === type)?.label.toLowerCase()} tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            <div>
              <Label>Campaign type</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {CAMPAIGN_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t.id] || PlusCircle;
                  const active = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`flex flex-col items-start gap-1 rounded-base border px-3 py-2.5 text-left transition-colors ${
                        active ? "border-brand-primary bg-bg" : "border-border bg-surface hover:bg-bg"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                        <Icon className="h-4 w-4" /> {t.label}
                      </span>
                      <span className="text-xs text-fg-muted">{t.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                Checklist template: {template.length} tasks, {requiredCount} required to reach "Ready to launch".
              </p>
            </div>

            <div>
              <Label htmlFor="nc-name">Campaign name</Label>
              <Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Winter Holiday Gift Boxes" className="mt-1.5" required />
            </div>

            <div>
              <Label htmlFor="nc-goal">Goal</Label>
              <Textarea id="nc-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What this campaign is trying to achieve." className="mt-1.5" rows={2} />
            </div>

            <div>
              <Label>Channels</Label>
              <div className="mt-1.5 flex flex-wrap gap-4">
                {Object.entries(CHANNELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-fg">
                    <Checkbox checked={channels.includes(key)} onCheckedChange={() => toggleChannel(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nc-start">Start date</Label>
                <Input id="nc-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="nc-end">End date (optional)</Label>
                <Input id="nc-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label htmlFor="nc-owner">Owner</Label>
              <Input id="nc-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1.5" />
            </div>

            {type === "enrichment" && (
              <div>
                <Label htmlFor="nc-serves">Clears contacts for (optional)</Label>
                <Select value={serves} onValueChange={setServes}>
                  <SelectTrigger id="nc-serves" className="mt-1.5">
                    <SelectValue placeholder="No specific campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {servableCampaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-fg-muted">
                  Which send or push this call pass unblocks — the enrichment tab scopes its call list to that campaign's audience.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nc-aud-label">Audience (optional)</Label>
                <Input id="nc-aud-label" value={audienceLabel} onChange={(e) => setAudienceLabel(e.target.value)} placeholder="e.g. NE qualified shops" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="nc-aud-size">Audience size</Label>
                <Input id="nc-aud-size" type="number" min="0" value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label htmlFor="nc-strategy">Strategy summary (optional)</Label>
              <Textarea id="nc-strategy" value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="What's the plan, in a paragraph." className="mt-1.5" rows={3} />
            </div>

            {error && (
              <p className="rounded-base border border-error bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create campaign"}
              </Button>
              {type && <Badge variant="muted">Starts as Draft</Badge>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
