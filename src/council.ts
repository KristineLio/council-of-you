export const PERSONAS = [
  { id: "safe", name: "Safe You", mark: "S", color: "#7aa2c4" },
  { id: "chaos", name: "Chaos You", mark: "C", color: "#e07a5f" },
  { id: "success", name: "Successful You", mark: "★", color: "#c9a86a" },
  { id: "regret", name: "Regret You", mark: "R", color: "#9b8ec4" },
  { id: "later", name: "One Year Later You", mark: "1", color: "#8fbc8f" },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];
export type Vote = "yes" | "no" | "abstain";
export type UserAction = "accepted" | "ignored";

export const PRIORITIES = ["Rest", "Ambition", "Money", "Relationships", "Health", "Pride"] as const;

export const DEMO_DECISION = "Should I start another project this weekend?";

export const DEMO_LINES: Record<PersonaId, string> = {
  safe: "Absolutely not. Your calendar is already a crime scene. Sleep is a strategy.",
  chaos: "Yes. Start two. Steal a domain name at 2am. Future-you can invoice present-you.",
  success: "Ship one small thing. Not a company. A weekend is not a Series A.",
  regret: "Last time you said 'just a weekend' you still have the Figma file open.",
  later: "I am you, twelve months from now. I do not remember this weekend. I remember whether you rested.",
};

export const DEMO_VOTES: Record<PersonaId, Vote> = {
  safe: "no",
  chaos: "yes",
  success: "yes",
  regret: "no",
  later: "abstain",
};

export type MemoryRecord = {
  decision: string;
  priorities: string[];
  risk: number;
  verdict: string;
  action: UserAction;
  timestamp: string;
  votes: Record<PersonaId, Vote>;
};

const KEY = "council-of-you-memory-v1";

export function loadMemory(): MemoryRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemory(records: MemoryRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function ignoredCount(records: MemoryRecord[]) {
  return records.filter((r) => r.action === "ignored").length;
}

export function debateFor(decision: string, isDemo: boolean): Record<PersonaId, string> {
  if (isDemo) return { ...DEMO_LINES };
  const d = decision.trim() || "this";
  return {
    safe: `If ${d.toLowerCase()} can wait until Monday, it should. Protection is not cowardice.`,
    chaos: `${d}? Do it badly, immediately. Momentum is cheaper than permission.`,
    success: `Ask whether this compounds. If it does, one focused attempt. If not, decline.`,
    regret: `You already know the version of this that haunted you. Don't romanticize the rerun.`,
    later: `A year from now, the clever part fades. What remains is whether you were kind to yourself.`,
  };
}

export function votesFor(_decision: string, risk: number, priorities: string[], isDemo: boolean): Record<PersonaId, Vote> {
  if (isDemo) return { ...DEMO_VOTES };
  const ambitious = priorities.includes("Ambition") || priorities.includes("Pride");
  const rest = priorities.includes("Rest") || priorities.includes("Health");
  return {
    safe: risk < 40 || rest ? "no" : "abstain",
    chaos: risk > 35 || ambitious ? "yes" : "abstain",
    success: ambitious || risk >= 50 ? "yes" : "no",
    regret: rest || risk < 45 ? "no" : "abstain",
    later: risk > 70 ? "no" : "abstain",
  };
}

export function tally(votes: Record<PersonaId, Vote>) {
  const yes = PERSONAS.filter((p) => votes[p.id] === "yes").length;
  const no = PERSONAS.filter((p) => votes[p.id] === "no").length;
  const abstain = PERSONAS.filter((p) => votes[p.id] === "abstain").length;
  let verdict: string;
  if (yes > no) verdict = "The Council leans YES — with conditions.";
  else if (no > yes) verdict = "The Council leans NO — protect the week.";
  else verdict = "The Council is split. You still have to choose.";
  return { yes, no, abstain, verdict };
}
