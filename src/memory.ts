import type { MemoryRecord, PersonaId, Vote } from "./council";

export type MemoryInsights = {
  totalDecisions: number;
  ignoredCount: number;
  acceptedCount: number;
  ignoreRate: number;
  repeatedPriority?: string;
  recentIgnoredDecision?: MemoryRecord;
  repeatedRiskPattern?: "low" | "medium" | "high";
};

export function deriveInsights(records: MemoryRecord[]): MemoryInsights {
  const totalDecisions = records.length;
  const ignoredCount = records.filter((r) => r.action === "ignored").length;
  const acceptedCount = records.filter((r) => r.action === "accepted").length;
  const ignoreRate = totalDecisions ? ignoredCount / totalDecisions : 0;
  const recentIgnoredDecision = records.find((r) => r.action === "ignored");

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
    repeatedRiskPattern,
  };
}

export function memoryCue(insights: MemoryInsights): string | null {
  if (insights.totalDecisions === 0) return null;
  if (insights.ignoredCount > 0) {
    return `THE COUNCIL REMEMBERS ${insights.ignoredCount} IGNORED VERDICT${insights.ignoredCount === 1 ? "" : "S"}.`;
  }
  return "THE COUNCIL REMEMBERS YOUR LAST DECISION.";
}

export function landingMemoryLine(insights: MemoryInsights): string | null {
  if (insights.ignoredCount > 0) {
    return `THE COUNCIL REMEMBERS: ${insights.ignoredCount} IGNORED`;
  }
  return null;
}

export function patternDetected(insights: MemoryInsights): string {
  if (insights.totalDecisions === 0) {
    return "Too early to tell. The Council is watching.";
  }
  if (insights.ignoredCount >= 3) {
    return `You have ignored ${insights.ignoredCount} verdict${insights.ignoredCount === 1 ? "" : "s"}.`;
  }
  if (insights.repeatedPriority === "Ambition") {
    return "Ambition keeps showing up as the deciding factor.";
  }
  if (insights.repeatedRiskPattern === "high") {
    return "Your risk tolerance keeps trending high.";
  }
  if (insights.repeatedPriority) {
    return `${insights.repeatedPriority} has appeared across multiple decisions.`;
  }
  if (insights.ignoredCount > 0) {
    return `You have ignored ${insights.ignoredCount} of your verdicts.`;
  }
  return "Too early to tell. The Council is watching.";
}

export function patternFromRecords(records: MemoryRecord[], insights: MemoryInsights): string {
  const last4 = records.slice(0, 4);
  if (last4.length >= 4) {
    const ignored = last4.filter((r) => r.action === "ignored").length;
    if (ignored >= 3) {
      return `You have ignored ${ignored} of your last ${last4.length} verdicts.`;
    }
  }
  const ambitionStreak = consecutivePriority(records, "Ambition");
  if (ambitionStreak >= 4) {
    return `Ambition has appeared in ${ambitionStreak} consecutive decisions.`;
  }
  return patternDetected(insights);
}

function consecutivePriority(records: MemoryRecord[], priority: string) {
  let n = 0;
  for (const r of records) {
    if (r.priorities.includes(priority)) n += 1;
    else break;
  }
  return n;
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
