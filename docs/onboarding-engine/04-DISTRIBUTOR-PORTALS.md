# Future: per-distributor partner portal management

**Status: idea, not scoped. Zero code footprint.**

## What it is

Rick's ask: every distributor Monti (or a future tenant) works with has their own portal system,
and CST would need to manage/connect to each one individually — a new integration surface
distinct from CST's own multi-tenant client portals (which are CST-controlled; a distributor's
portal is a system CST doesn't own or control).

## Why this is a different problem than CST's existing multi-tenant portals

`../platform-vs-client-canonical.md` and `../cst-domains-and-doors.md` describe CST's own
client-portal architecture (CheeseShop TECH owns/operates it; each client gets an isolated
`<client>.cheeseshoptech.com` door). Distributor portals are the opposite direction: OTHER
companies' own systems that CST would need to integrate with, read from, or write to — likely a
different partner/system per distributor, with no shared schema to assume.

## The nearest real precedent

The **ACE Endico relationship** is the closest thing to a live distributor relationship today
(`../areas/ace-endico-account.md`, `../ace-fall-show-campaign.md`) — Rick's own roadmap already
names ACE Endico as the pilot for this if/when it gets built (see
`../cst-onboarding-engine-scope.md`'s roadmap, Phase 7/8: "distributor portal integration, piloted
with ACE Endico before generalizing").

## What would need to happen before this is buildable

1. A concrete first integration target — ACE Endico is the obvious candidate given the active
   relationship and the 2026-09-15 Fall Show, but nothing about their actual portal/system has
   been investigated (API availability, data format, auth model).
2. A decision on whether this is read-only (pull distributor data into CST) or read/write (push
   orders, pricing, or content out to a distributor's system) — very different integration shapes.

## Status: not started, and deliberately sequenced last

Per `../CST_UNIFIED_DIRECTION_2026-09-07.md`, this comes after e-commerce completion in the
overall roadmap. Don't start scoping the general "every distributor has their own portal" version
of this before the ACE Endico pilot happens — generalizing from zero real integrations would be
speculative.
