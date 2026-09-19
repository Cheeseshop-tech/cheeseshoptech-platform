// Deterministic readiness score — roadmap item 7, Step A of the 2026-09-19 "account-to-campaign
// map" note (Clay's ABM loop mapped onto CST's real modules). Recency-weighted temperature +
// commitment weight + outreach-stage position, computed entirely from data the platform already
// has: booth.js's TEMPERATURES/NEXT_STEP_MODES (synced cross-device via crm-outreach.js as of
// Step A0) and crm.js's OUTREACH_STAGES. Pure function, no I/O, no AI, no new data source — the
// "Stage-0-style build" the note called for, shippable well before the harder "market signals"
// half of item 7 (news/events/social) is anywhere close to real.
//
// Consumed by opportunities.js (rankOpportunities' accountValue factor) and, next, the Campaign
// Manager dashboard tile the note scoped as item 4/step B.

import { TEMPERATURES, NEXT_STEP_MODES } from "./booth.js";
import { OUTREACH_STAGES } from "./crm.js";

const TEMPERATURE_WEIGHT = { hot: 1, warm: 0.6, cold: 0.2 };
// Lost/Not a fit are appended to OUTREACH_STAGES for the funnel bar's benefit, not because they're
// "further along" — treat them as dead (0), not as the highest stage position.
const DEAD_STAGES = new Set(["Lost", "Not a fit"]);
const FORWARD_STAGES = OUTREACH_STAGES.filter((s) => !DEAD_STAGES.has(s));
// A hot lead from 3 weeks ago is worth about half a fresh one — matches booth's own "next-step
// window" scale (reps are asked to commit to a day within a couple weeks, not a quarter out).
const RECENCY_HALF_LIFE_DAYS = 21;

function recencyFactor(updatedAt) {
  if (!updatedAt) return 0.5; // unknown age — sit at the midpoint, don't punish or reward a guess
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0.5;
  const ageDays = ageMs / 86_400_000;
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

function stagePosition(stage) {
  if (!stage || DEAD_STAGES.has(stage)) return 0;
  const i = FORWARD_STAGES.indexOf(stage);
  return i < 0 ? 0 : i / Math.max(FORWARD_STAGES.length - 1, 1);
}

/**
 * @param {{temperature?:string, nextStepMode?:string, status?:string, updatedAt?:string}} entry
 *   — one company's crm-outreach.js overlay entry (temperature/nextStepMode from booth's
 *   check-in sheet, status from the outreach console — same document, different writers).
 * @returns {number} 0..1, higher = more ready to move on right now. 0 for no signal at all.
 */
export function readinessScore(entry) {
  if (!entry) return 0;
  // A dead account is dead regardless of how hot the last booth conversation was before it died —
  // don't let a stale "hot, confirmed time" reading from before the loss outscore a live warm
  // lead. Zero the whole score, not just the stage component.
  if (DEAD_STAGES.has(entry.status)) return 0;
  const temp = TEMPERATURE_WEIGHT[entry.temperature] ?? 0;
  const commitmentWeight = NEXT_STEP_MODES[entry.nextStepMode]?.weight;
  const commitment = typeof commitmentWeight === "number" ? commitmentWeight / 2 : 0; // 0/1/2 → 0..1
  const stage = stagePosition(entry.status);
  if (!temp && !commitment && !stage) return 0; // nothing to weight — don't manufacture a score from recency alone
  const raw = (0.45 * temp + 0.35 * commitment + 0.2 * stage) * recencyFactor(entry.updatedAt);
  return Math.round(Math.min(Math.max(raw, 0), 1) * 100) / 100;
}

/** Build a {companyId: score} lookup from the crm-outreach.js overlay — the shape
 *  rankOpportunities() and the Campaign Manager tile both want. */
export function readinessMap(outreachEntries) {
  const map = {};
  for (const [id, entry] of Object.entries(outreachEntries || {})) {
    const score = readinessScore(entry);
    if (score > 0) map[id] = score;
  }
  return map;
}
