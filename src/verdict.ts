import { PERSONAS, type PersonaId, type Vote } from "./council";
import type { MemoryInsights } from "./memory";
import { voteLabel } from "./memory";

export type TallyResult = {
  counts: Record<Vote, number>;
  winner: Vote;
  verdict: string;
  split: boolean;
  confidence: number;
};

export const DEMO_VOTES: Record<PersonaId, Vote> = {
  safe: "wait",
  chaos: "do_it",
  success: "hybrid",
  regret: "hybrid",
  later: "hybrid",
};

export function votesFor(_decision: string, risk: number, priorities: string[], isDemo: boolean): Record<PersonaId, Vote> {
  if (isDemo) return { ...DEMO_VOTES };
  const ambitious = priorities.includes("Ambition") || priorities.includes("Pride");
  const rest = priorities.includes("Rest") || priorities.includes("Health");
  const money = priorities.includes("Money");
  return {
    safe: risk < 40 || rest ? "wait" : risk > 70 ? "dont" : "hybrid",
    chaos: risk > 35 || ambitious ? "do_it" : "hybrid",
    success: ambitious && risk >= 50 ? "do_it" : rest && !ambitious ? "wait" : "hybrid",
    regret: rest || risk < 45 ? "dont" : "wait",
    later: money && risk < 50 ? "wait" : risk > 70 ? "hybrid" : "hybrid",
  };
}

export function tally(votes: Record<PersonaId, Vote>): TallyResult {
  const counts: Record<Vote, number> = { do_it: 0, dont: 0, wait: 0, hybrid: 0 };
  for (const p of PERSONAS) counts[votes[p.id]] += 1;
  const entries = (Object.entries(counts) as [Vote, number][]).sort((a, b) => b[1] - a[1]);
  const top = entries[0][1];
  const tied = entries.filter((e) => e[1] === top).map((e) => e[0]);
  let winner: Vote;
  let split = false;
  if (tied.length === 1) winner = tied[0];
  else if (tied.includes("hybrid")) {
    winner = "hybrid";
    split = tied.length > 1;
  } else {
    winner = tied[0];
    split = true;
  }
  const confidence = confidenceFrom(top, split);
  const verdict = split && tied.length > 1 && !tied.includes("hybrid")
    ? `SPLIT — ${tied.map(voteLabel).join(" vs ")}`
    : voteLabel(winner);
  return { counts, winner, verdict, split, confidence };
}

export function confidenceFrom(maxCount: number, split: boolean) {
  if (split) return 62;
  if (maxCount === 5) return 95;
  if (maxCount === 4) return 88;
  if (maxCount === 3) return 76;
  return 58;
}

export function demoTally(): TallyResult {
  return tally(DEMO_VOTES);
}

export function uncomfortableTruth(opts: {
  isDemo: boolean;
  priorities: string[];
  risk: number;
  insights: MemoryInsights;
  winner: Vote;
}): string {
  if (opts.isDemo) return "You're not asking for advice. You're asking for permission.";
  if (opts.insights.ignoredCount >= 3) return "You keep asking the Council after you've already chosen.";
  if (opts.insights.ignoredCount >= 1 && opts.winner !== "wait") {
    return "You keep asking the Council after you've already chosen.";
  }
  if (opts.insights.repeatedPriority === "Ambition") {
    return "You keep calling it uncertainty when the real conflict is ambition versus comfort.";
  }
  if (opts.risk > 70 && opts.winner === "do_it") {
    return "You are less afraid of failure than you are of standing still.";
  }
  if (opts.risk < 40 && opts.winner === "wait") {
    return "You do not need more courage. You need a condition that makes the risk acceptable.";
  }
  if (opts.winner === "hybrid") {
    return "You're not asking for advice. You're asking for permission.";
  }
  if (opts.winner === "dont") {
    return "Protection is not cowardice. Repeating the same leap without a landing is.";
  }
  return "The argument is not the decision. The decision is whether you will listen.";
}

export function mostPersuasive(votes: Record<PersonaId, Vote>, winner: Vote): PersonaId {
  const match = PERSONAS.find((p) => votes[p.id] === winner);
  return match?.id ?? "later";
}

export function biggestDisagreement(priorities: string[], tallyResult: TallyResult): string {
  const { counts } = tallyResult;
  if (counts.do_it && counts.wait) {
    if (priorities.includes("Rest") && priorities.includes("Ambition")) return "Rest vs Ambition";
    return "Certainty vs Momentum";
  }
  if (counts.dont && counts.do_it) {
    if (priorities.includes("Money")) return "Money vs Freedom";
    return "Security vs Opportunity";
  }
  if (priorities.includes("Rest") && priorities.includes("Ambition")) return "Rest vs Ambition";
  if (priorities.includes("Money") && priorities.includes("Pride")) return "Money vs Freedom";
  return "Security vs Opportunity";
}
