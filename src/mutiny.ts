import { DEMO_DECISION, type MemoryRecord, type OverrideReason, type PersonaId } from "./council";
import type { MemoryInsights } from "./memory";

export type DefenseReason = "permission" | "validation" | "excuse" | "dont_know";

export const DEFENSE_CHOICES: { id: DefenseReason; label: string }[] = [
  { id: "permission", label: "Permission" },
  { id: "validation", label: "Validation" },
  { id: "excuse", label: "An excuse" },
  { id: "dont_know", label: "I genuinely don't know" },
];

export function defenseLabel(id: DefenseReason) {
  if (id === "permission") return "Permission";
  if (id === "validation") return "Validation";
  if (id === "excuse") return "An excuse";
  return "I genuinely don't know";
}

export type MutinyLine = { speaker: PersonaId; text: string };

export const DEMO_MUTINY: MutinyLine[] = [
  { speaker: "safe", text: "No." },
  { speaker: "chaos", text: "Oh. This is new." },
  { speaker: "success", text: "You asked for the vote." },
  { speaker: "regret", text: "You got the answer." },
  { speaker: "later", text: "And you're overruling it anyway." },
  { speaker: "safe", text: "We're taking one more vote." },
];

export function shouldMutiny(opts: {
  isDemo: boolean;
  decision: string;
  consensus: number;
  insights: MemoryInsights;
  records: MemoryRecord[];
  lastMutiny?: boolean;
}): boolean {
  if (opts.isDemo || opts.decision.trim() === DEMO_DECISION) return true;
  if (opts.lastMutiny) return false;
  if (opts.insights.ignoredCount >= 2) return true;
  if (opts.consensus >= 80) return true;
  const lastTwo = opts.records.slice(0, 2);
  if (lastTwo.length === 2 && lastTwo.every((r) => r.overrideReason && r.overrideReason === lastTwo[0].overrideReason)) {
    return true;
  }
  return false;
}

export function mutinyLines(insights: MemoryInsights, isDemo: boolean, decision: string): MutinyLine[] {
  if (isDemo || decision.trim() === DEMO_DECISION) return DEMO_MUTINY;
  if (insights.lastOverrideReason === "worth_the_risk") {
    return [
      { speaker: "success", text: "Last time the risk was worth it." },
      { speaker: "regret", text: "You can't use the same sentence forever." },
      { speaker: "chaos", text: "Oh. This is new." },
      { speaker: "safe", text: "We're taking one more vote." },
    ];
  }
  if (insights.ignoredCount >= 2) {
    return [
      { speaker: "safe", text: "This is becoming a pattern." },
      { speaker: "chaos", text: "A fun pattern." },
      { speaker: "regret", text: "Still a pattern." },
      { speaker: "later", text: "And you're overruling it anyway." },
      { speaker: "safe", text: "We're taking one more vote." },
    ];
  }
  return [
    { speaker: "success", text: "Five versions of you got unusually close to agreeing." },
    { speaker: "safe", text: "And you're still overruling us." },
    { speaker: "chaos", text: "Oh. This is new." },
    { speaker: "later", text: "And you're overruling it anyway." },
    { speaker: "safe", text: "We're taking one more vote." },
  ];
}

export function defenseReply(id: DefenseReason): MutinyLine[] {
  if (id === "permission") {
    return [
      { speaker: "regret", text: "There it is." },
      { speaker: "later", text: "You already gave yourself permission. You wanted witnesses." },
    ];
  }
  if (id === "validation") {
    return [
      { speaker: "success", text: "So you weren't asking what to do." },
      { speaker: "safe", text: "You were asking us to agree." },
    ];
  }
  if (id === "excuse") {
    return [
      { speaker: "chaos", text: "Honestly? Respect." },
      { speaker: "regret", text: "At least now we're being honest." },
    ];
  }
  return [
    { speaker: "later", text: "Good." },
    { speaker: "safe", text: "That's the first useful answer you've given us." },
  ];
}

export type { OverrideReason };
