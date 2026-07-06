import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input, Textarea } from "@/components/ui/input.jsx";

// "Don't have a passcode? Request access" — for brokers/sales reps who hit the portal gate with
// nothing to enter (Rick, 2026-07-06). NOT a self-serve account system: this just gets a request
// in front of admin@cheeseshoptech.com, who reviews it and hands out the right passcode tier
// (client viewer today; client-admin/admin are never given out this way) by whatever means he
// prefers — email, text, etc. No auto-grant, no new credentials minted by this form.
//
// Delivery: Netlify Forms (the static <form name="access-request"> in index.html registers the
// schema at build time; this component submits to it via fetch — the standard SPA+Netlify-Forms
// pattern, since a React-rendered form is invisible to Netlify's build-time crawler). Enable an
// email notification for the "access-request" form in the Netlify dashboard to actually receive
// these — see the comment in index.html. No new backend/secret required.
const ROLES = ["Sales rep", "Broker", "Distributor contact", "Other"];

export function RequestAccessForm({ resolved, onBack }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", role: ROLES[0], note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = new URLSearchParams({
        "form-name": "access-request",
        ...form,
        tenant: resolved?.subdomain || resolved?.id || "",
      }).toString();
      const res = await fetch("/", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      // Netlify Forms accepts the submission with a 200 even in a plain fetch; dev has no forms
      // backend at all, so treat that as "can't verify, but don't block the person" rather than
      // a hard failure.
      if (!res.ok && !import.meta.env.DEV) throw new Error(`Submit failed (${res.status})`);
      setSent(true);
    } catch {
      setError("Couldn't send — please try again, or email admin@cheeseshoptech.com directly.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <div>
          <h2 className="cs-display text-lg text-fg">Request sent</h2>
          <p className="mt-1 text-sm text-fg-muted">
            admin@cheeseshoptech.com will follow up with access. Reach out there directly if it's urgent.
          </p>
        </div>
        <Button variant="ghost" className="w-full" onClick={onBack}>Back to passcode entry</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-6">
      <div>
        <h2 className="cs-display text-lg text-fg">Request access</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          For brokers, distributors, and sales reps without a passcode. Sent straight to admin@cheeseshoptech.com for review.
        </p>
      </div>
      <input type="hidden" name="form-name" value="access-request" />
      <p hidden>
        <label>Don't fill this out: <input name="bot-field" onChange={() => {}} /></label>
      </p>
      <Input placeholder="Your name" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
      <Input type="email" placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
      <Input placeholder="Company / broker name" value={form.company} onChange={(e) => set("company", e.target.value)} />
      <select
        value={form.role}
        onChange={(e) => set("role", e.target.value)}
        className="flex h-10 w-full rounded-base border border-border bg-surface px-3 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <Textarea placeholder="Anything else useful (optional)" rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy || !form.name.trim() || !form.email.trim()}>
        <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send request"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>Back to passcode entry</Button>
    </form>
  );
}
