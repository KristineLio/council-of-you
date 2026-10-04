export const PERSONAS = [
  { id: "safe", name: "Safe You", mark: "S", color: "#7aa2c4", subtitle: "protects what you already have" },
  { id: "chaos", name: "Chaos You", mark: "C", color: "#e07a5f", subtitle: "chooses momentum" },
  { id: "success", name: "Successful You", mark: "★", color: "#c9a86a", subtitle: "optimizes for the outcome" },
  { id: "regret", name: "Regret You", mark: "R", color: "#9b8ec4", subtitle: "remembers what avoidance costs" },
  { id: "later", name: "One Year Later You", mark: "1", color: "#8fbc8f", subtitle: "has to live with it" },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];
export type Vote = "do_it" | "dont" | "wait" | "hybrid";
export type UserAction = "accepted" | "ignored";
export type OverrideReason = "already_decided" | "worth_the_risk" | "missed_something" | "curiosity";

export const OVERRIDE_CHOICES: { id: OverrideReason; label: string }[] = [
  { id: "already_decided", label: "I already knew what I wanted" },
  { id: "worth_the_risk", label: "The risk is worth it" },
  { id: "missed_something", label: "They missed something" },
  { id: "curiosity", label: "I just want to see what happens" },
];

export const PRIORITIES = ["Rest", "Ambition", "Money", "Relationships", "Health", "Pride"] as const;

export const DEMO_DECISION = "Should I enter another hackathon?";

export type MemoryRecord = {
  decision: string;
  priorities: string[];
  risk: number;
  verdict: string;
  action: UserAction;
  timestamp: string;
  votes: Record<PersonaId, Vote>;
  confidence: number;
  overrideReason?: OverrideReason;
};

const KEY = "council-of-you-memory-v1";
const VALID_VOTES: Vote[] = ["do_it", "dont", "wait", "hybrid"];
const LEGACY: Record<string, Vote> = { yes: "do_it", no: "dont", abstain: "wait" };
const REASONS: OverrideReason[] = ["already_decided", "worth_the_risk", "missed_something", "curiosity"];

function normalizeVote(v: unknown): Vote {
  if (typeof v === "string" && VALID_VOTES.includes(v as Vote)) return v as Vote;
  if (typeof v === "string" && LEGACY[v]) return LEGACY[v];
  return "hybrid";
}

export function loadMemory(): MemoryRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r: Record<string, unknown>) => {
      const votesIn = (r.votes ?? {}) as Record<string, unknown>;
      const votes = {
        safe: normalizeVote(votesIn.safe),
        chaos: normalizeVote(votesIn.chaos),
        success: normalizeVote(votesIn.success),
        regret: normalizeVote(votesIn.regret),
        later: normalizeVote(votesIn.later),
      };
      const action: UserAction = r.action === "ignored" ? "ignored" : "accepted";
      const confidence = typeof r.confidence === "number" && r.confidence > 0 && r.confidence < 100 ? r.confidence : 76;
      const overrideReason = REASONS.includes(r.overrideReason as OverrideReason)
        ? (r.overrideReason as OverrideReason)
        : undefined;
      return {
        decision: String(r.decision ?? ""),
        priorities: Array.isArray(r.priorities) ? r.priorities.map(String) : [],
        risk: typeof r.risk === "number" ? r.risk : 50,
        verdict: String(r.verdict ?? "HYBRID"),
        action,
        timestamp: String(r.timestamp ?? new Date().toISOString()),
        votes,
        confidence,
        overrideReason,
      };
    });
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

export function reasonLabel(id: OverrideReason) {
  return OVERRIDE_CHOICES.find((c) => c.id === id)?.label ?? id;
}
