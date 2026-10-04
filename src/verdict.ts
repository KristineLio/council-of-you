import { PERSONAS, type PersonaId, type Vote } from "./council";
import type { DebateTurn } from "./debate";
import type { MemoryInsights } from "./memory";
import { voteLabel } from "./memory";
import { classifyDecision, type DecisionTheme } from "./themes";

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
  success: "do_it",
  regret: "do_it",
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
    later: money && risk < 50 ? "wait" : "hybrid",
  };
}

export function tally(votes: Record<PersonaId, Vote>, isDemo = false): TallyResult {
  const counts: Record<Vote, number> = { do_it: 0, dont: 0, wait: 0, hybrid: 0 };
  for (const p of PERSONAS) counts[votes[p.id]] += 1;
  const entries = (Object.entries(counts) as [Vote, number][]).sort((a, b) => b[1] - a[1]);
  const top = entries[0][1];
  const second = entries[1][1];
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
  const close = top - second === 1;
  const confidence = isDemo ? 88 : confidenceFrom(top, split, close);
  const verdict =
    split && tied.length > 1 && !tied.includes("hybrid")
      ? `SPLIT — ${tied.map(voteLabel).join(" vs ")}`
      : voteLabel(winner);
  return { counts, winner, verdict, split, confidence };
}

export function confidenceFrom(maxCount: number, split: boolean, close: boolean) {
  let n: number;
  if (split) n = 62;
  else if (maxCount === 5) n = 95;
  else if (maxCount === 4) n = 88;
  else if (maxCount === 3) n = 76;
  else n = 58;
  if (close && n > 76) n = 76;
  if (n >= 100) n = 96;
  return n;
}

const THEME_TRUTH: Record<DecisionTheme, string> = {
  career:
    "You are not deciding whether you want the change. You are deciding how much proof you need before you permit yourself to make it.",
  move: "You are not choosing between home and adventure. You are choosing which discomfort you are willing to live with.",
  relationship: "You are not confused about how this feels. You are confused about what you are willing to lose.",
  money: "The purchase is not the decision. The trade-off is.",
  study: "You do not need a better plan. You need to finish the one already in front of you.",
  health: "You keep negotiating with a habit that only works when it becomes boring.",
  generic: "You're not asking for advice. You're asking for permission.",
};

export function uncomfortableTruth(opts: {
  isDemo: boolean;
  decision: string;
  priorities: string[];
  risk: number;
  insights: MemoryInsights;
  winner: Vote;
}): string {
  if (opts.isDemo) return "You weren't deciding whether to enter. You were deciding whether this one was worth caring about.";
  if (opts.insights.ignoredCount >= 3) return "You keep asking the Council after you've already chosen.";
  if (opts.insights.ignoredCount >= 1) return "You keep asking the Council after you've already chosen.";
  if (opts.insights.repeatedPriority === "Ambition") {
    return "You keep calling it uncertainty when the real conflict is ambition versus comfort.";
  }
  if (opts.risk > 70 && opts.winner === "do_it") {
    return "You are less afraid of failure than you are of standing still.";
  }
  if (opts.risk < 40 && opts.winner === "wait") {
    return "You do not need more courage. You need a condition that makes the risk acceptable.";
  }
  return THEME_TRUTH[classifyDecision(opts.decision)];
}

const TIEBREAK: PersonaId[] = ["later", "success", "regret", "safe", "chaos"];

export function mostPersuasive(
  votes: Record<PersonaId, Vote>,
  winner: Vote,
  turns: DebateTurn[],
  priorities: string[],
  insights: MemoryInsights,
): PersonaId {
  const scores = new Map<PersonaId, number>();
  for (const p of PERSONAS) scores.set(p.id, 0);
  for (const p of PERSONAS) {
    if (votes[p.id] === winner) scores.set(p.id, (scores.get(p.id) ?? 0) + 2);
  }
  turns.forEach((turn, i) => {
    let s = scores.get(turn.speaker) ?? 0;
    if (turn.replyTo) s += 1;
    if (priorities.some((pr) => turn.text.toLowerCase().includes(pr.toLowerCase()))) s += 1;
    if (
      insights.ignoredCount > 0 &&
      /ignored|last time|fourth time|already deciding/i.test(turn.text)
    )
      s += 1;
    if (turn.tone === "reflective" || i === turns.length - 1) s += 1;
    scores.set(turn.speaker, s);
  });
  let best = TIEBREAK[0];
  let bestScore = -1;
  for (const id of TIEBREAK) {
    const s = scores.get(id) ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = id;
    }
  }
  return best;
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
