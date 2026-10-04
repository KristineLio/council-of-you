import { DEMO_DECISION, PERSONAS, type MemoryRecord, type PersonaId, type Vote } from "./council";
import { debateTurns, dissentLine, type DebateTurn } from "./debate";
import { deriveInsights } from "./memory";
import { uncomfortableTruth, type TallyResult } from "./verdict";

export type AiCouncilResponse = {
  turns: DebateTurn[];
  dissent: { speaker: PersonaId; text: string };
  councilRead: string;
  memoryCallback?: string;
};

export type CouncilInput = {
  decision: string;
  priorities: string[];
  riskTolerance: number;
  voteResult: Vote;
  consensusStrength: number;
  memory: MemoryRecord[];
};

const IDS: PersonaId[] = ["safe", "chaos", "success", "regret", "later"];
const TONES = ["calm", "sharp", "funny", "reflective"] as const;

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtml(s: string) {
  return /<[^>]+>/.test(s);
}

function asId(v: unknown): PersonaId | null {
  return typeof v === "string" && (IDS as string[]).includes(v) ? (v as PersonaId) : null;
}

export function validateAi(raw: unknown, winner: Vote, votes: Record<PersonaId, Vote>): AiCouncilResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.turns)) return null;
  const turns: DebateTurn[] = [];
  const counts: Record<string, number> = {};
  let replies = 0;
  for (const t of o.turns) {
    if (!t || typeof t !== "object") return null;
    const row = t as Record<string, unknown>;
    const speaker = asId(row.speaker);
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!speaker || !text || stripHtml(text) || wordCount(text) > 32) return null;
    const replyTo = row.replyTo === undefined ? undefined : asId(row.replyTo) ?? null;
    if (replyTo === null) return null;
    if (replyTo) replies += 1;
    const tone = row.tone === undefined ? undefined : TONES.includes(row.tone as (typeof TONES)[number]) ? (row.tone as DebateTurn["tone"]) : undefined;
    counts[speaker] = (counts[speaker] ?? 0) + 1;
    if (counts[speaker] > 3) return null;
    turns.push({ speaker, text, replyTo, tone });
  }
  if (turns.length < 7 || turns.length > 9) return null;
  const unique = new Set(turns.map((t) => t.speaker));
  if (unique.size < 4 || replies < 1) return null;
  const d = o.dissent as Record<string, unknown> | undefined;
  const ds = d ? asId(d.speaker) : null;
  const dt = typeof d?.text === "string" ? d.text.trim() : "";
  if (!ds || !dt || stripHtml(dt) || wordCount(dt) > 22) return null;
  const dissenters = PERSONAS.filter((p) => votes[p.id] !== winner);
  const dissentSpeaker = dissenters.some((p) => p.id === ds) ? ds : dissenters[0]?.id ?? ds;
  const councilRead = typeof o.councilRead === "string" ? o.councilRead.trim() : "";
  if (!councilRead || stripHtml(councilRead) || wordCount(councilRead) > 40) return null;
  const memoryCallback = typeof o.memoryCallback === "string" ? o.memoryCallback.trim() : undefined;
  return { turns, dissent: { speaker: dissentSpeaker, text: dt }, councilRead, memoryCallback };
}

export function localCouncil(input: CouncilInput): AiCouncilResponse {
  const isDemo = input.decision.trim() === DEMO_DECISION;
  const turns = debateTurns(input.decision, isDemo, input.memory, input.priorities, input.riskTolerance);
  const votes = {
    safe: "wait",
    chaos: "do_it",
    success: "hybrid",
    regret: "dont",
    later: "hybrid",
  } as Record<PersonaId, Vote>;
  void votes;
  const dummyVotes = PERSONAS.reduce(
    (acc, p) => {
      acc[p.id] = input.voteResult;
      return acc;
    },
    {} as Record<PersonaId, Vote>,
  );
  dummyVotes.safe = input.voteResult === "wait" ? "do_it" : "wait";
  dummyVotes.chaos = input.voteResult === "do_it" ? "wait" : "do_it";
  const dissent = dissentLine(input.voteResult, dummyVotes);
  const insights = deriveInsights(input.memory);
  const councilRead = uncomfortableTruth({
    isDemo,
    decision: input.decision,
    priorities: input.priorities,
    risk: input.riskTolerance,
    insights,
    winner: input.voteResult,
  });
  return { turns, dissent, councilRead };
}

export async function generateCouncil(input: CouncilInput, _votes: Record<PersonaId, Vote>): Promise<AiCouncilResponse> {
  return localCouncil(input);
}

export type { TallyResult };
