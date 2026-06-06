import { ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { toolIcon } from "@/lib/icons.js";

// A featured tool gets its own full page: a hero header with a prominent launch CTA, and
// (when embed=true and the site allows framing) a live in-portal preview of the tool.
export function FeaturedTool({ tool }) {
  const Icon = toolIcon(tool.icon);
  const open = () => tool.url && window.open(tool.url, "_blank", "noopener,noreferrer");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-base bg-brand-primary text-brand-on-primary">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-fg">{tool.label}</h1>
            {tool.description && <p className="mt-1 max-w-2xl text-fg-muted">{tool.description}</p>}
          </div>
        </div>
        {tool.url && (
          <Button variant="primary" size="lg" onClick={open}>
            <ExternalLink className="h-5 w-5" /> Open full store
          </Button>
        )}
      </div>

      {tool.embed && tool.url ? (
        <div className="overflow-hidden rounded-base border border-border bg-surface shadow-md">
          <div className="flex items-center justify-between border-b border-border bg-bg px-4 py-2">
            <span className="font-mono text-xs text-fg-muted">{tool.url}</span>
            <button onClick={open} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <Maximize2 className="h-3.5 w-3.5" /> Full screen
            </button>
          </div>
          <iframe
            src={tool.url}
            title={tool.label}
            className="h-[70vh] w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <p className="border-t border-border px-4 py-2 text-xs text-fg-muted">
            Live preview embedded from the store. If it doesn't load, use “Open full store.”
          </p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-base border border-dashed border-border bg-surface py-16 text-center">
          <div>
            <p className="font-heading text-lg text-fg">Open the store in a new tab</p>
            <p className="mt-1 text-sm text-fg-muted">This tool opens externally.</p>
            {tool.url && <Button variant="primary" className="mt-4" onClick={open}><ExternalLink className="h-4 w-4" /> Open store</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
