import type { MemoryRecord, OverrideReason, PersonaId, Vote } from "./council";
import { reasonLabel } from "./council";

export type MemoryInsights = {
  totalDecisions: number;
  ignoredCount: number;
  acceptedCount: number;
  ignoreRate: number;
  repeatedPriority?: string;
  recentIgnoredDecision?: MemoryRecord;
  lastOverrideReason?: OverrideReason;
  lastAccepted?: boolean;
  repeatedRiskPattern?: "low" | "medium" | "high";
};

export function deriveInsights(records: MemoryRecord[]): MemoryInsights {
  const totalDecisions = records.length;
  const ignoredCount = records.filter((r) => r.action === "ignored").length;
  const acceptedCount = records.filter((r) => r.action === "accepted").length;
  const ignoreRate = totalDecisions ? ignoredCount / totalDecisions : 0;
  const recentIgnoredDecision = records.find((r) => r.action === "ignored");
  const last = records[0];
  const lastOverrideReason = last?.action === "ignored" ? last.overrideReason : records.find((r) => r.overrideReason)?.overrideReason;
  const lastAccepted = last?.action === "accepted";

  const counts = new Map<string, number>();
  for (const rec of records) {
    for (const p of rec.priorities) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  let repeatedPriority: string | undefined;
  let best = 0;
  for (const [p, n] of counts) {
    if (n >= 2 && n > best) {
      best = n;
      repeatedPriority = p;
    }
  }

  const recent = records.slice(0, 3);
  let repeatedRiskPattern: MemoryInsights["repeatedRiskPattern"];
  if (recent.length >= 3) {
    if (recent.every((r) => r.risk > 70)) repeatedRiskPattern = "high";
    else if (recent.every((r) => r.risk < 40)) repeatedRiskPattern = "low";
    else if (recent.every((r) => r.risk >= 40 && r.risk <= 70)) repeatedRiskPattern = "medium";
  }

  return {
    totalDecisions,
    ignoredCount,
    acceptedCount,
    ignoreRate,
    repeatedPriority,
    recentIgnoredDecision,
    lastOverrideReason,
    lastAccepted,
    repeatedRiskPattern,
  };
}

export function memoryCue(insights: MemoryInsights): string | null {
  if (insights.totalDecisions === 0) return null;
  if (insights.ignoredCount > 0) {
    return `THE COUNCIL REMEMBERS ${insights.ignoredCount} OVERRIDE${insights.ignoredCount === 1 ? "" : "S"}.`;
  }
  return "THE COUNCIL REMEMBERS THAT YOU LISTENED.";
}

export function landingMemoryLine(insights: MemoryInsights, records: MemoryRecord[]): string | null {
  if (insights.totalDecisions === 0) return null;
  const last = records[0];
  if (last?.action === "accepted") return "YOU LISTENED LAST TIME.";
  if (last?.overrideReason === "worth_the_risk") return "LAST TIME: YOU CHOSE RISK.";
  if (insights.ignoredCount > 0) return `THE COUNCIL REMEMBERS ${insights.ignoredCount} OVERRIDE${insights.ignoredCount === 1 ? "" : "S"}.`;
  return "THE COUNCIL REMEMBERS YOUR LAST DECISION.";
}

export function whatTheyRemember(records: MemoryRecord[], insights: MemoryInsights): string {
  const last = records[0];
  if (last?.overrideReason) {
    if (last.overrideReason === "worth_the_risk") return "Last time, you said the risk was worth it.";
    if (last.overrideReason === "already_decided") return "You usually ask after you've already decided.";
    if (last.overrideReason === "missed_something") return "You said they missed something.";
    if (last.overrideReason === "curiosity") return "You wanted to see what happens.";
  }
  if (insights.ignoredCount >= 2) return `You have overruled the Council ${insights.ignoredCount} times.`;
  if (insights.repeatedPriority === "Ambition" && records.some((r) => r.priorities.includes("Rest"))) {
    return "You keep choosing ambition when rest is also on the table.";
  }
  if (insights.lastAccepted) return "Last time you actually listened.";
  if (insights.totalDecisions === 0) return "Too early to tell. They are watching.";
  return "They are still learning your pattern.";
}

export function personaName(id: PersonaId) {
  const map: Record<PersonaId, string> = {
    safe: "Safe You",
    chaos: "Chaos You",
    success: "Successful You",
    regret: "Regret You",
    later: "One Year Later You",
  };
  return map[id];
}

export function voteLabel(v: Vote) {
  const map: Record<Vote, string> = {
    do_it: "DO IT",
    dont: "DON'T",
    wait: "WAIT",
    hybrid: "HYBRID",
  };
  return map[v];
}

export { reasonLabel };
