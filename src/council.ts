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
