export const PERSONAS = [
  { id: "safe", name: "Safe You", mark: "S", color: "#7aa2c4" },
  { id: "chaos", name: "Chaos You", mark: "C", color: "#e07a5f" },
  { id: "success", name: "Successful You", mark: "★", color: "#c9a86a" },
  { id: "regret", name: "Regret You", mark: "R", color: "#9b8ec4" },
  { id: "later", name: "One Year Later You", mark: "1", color: "#8fbc8f" },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];
export type Vote = "do_it" | "dont" | "wait" | "hybrid";
export type UserAction = "accepted" | "ignored";

export const PRIORITIES = ["Rest", "Ambition", "Money", "Relationships", "Health", "Pride"] as const;

export const DEMO_DECISION = "Should I start another project this weekend?";

export type MemoryRecord = {
  decision: string;
  priorities: string[];
  risk: number;
  verdict: string;
  action: UserAction;
  timestamp: string;
  votes: Record<PersonaId, Vote>;
  confidence: number;
};

const KEY = "council-of-you-memory-v1";
const VALID_VOTES: Vote[] = ["do_it", "dont", "wait", "hybrid"];
const LEGACY: Record<string, Vote> = { yes: "do_it", no: "dont", abstain: "wait" };

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
      return {
        decision: String(r.decision ?? ""),
        priorities: Array.isArray(r.priorities) ? r.priorities.map(String) : [],
        risk: typeof r.risk === "number" ? r.risk : 50,
        verdict: String(r.verdict ?? "HYBRID"),
        action,
        timestamp: String(r.timestamp ?? new Date().toISOString()),
        votes,
        confidence,
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
