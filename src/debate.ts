import { DEMO_DECISION, PERSONAS, type PersonaId } from "./council";
import { deriveInsights, personaName, type MemoryInsights } from "./memory";
import type { MemoryRecord } from "./council";

export type DebateTone = "calm" | "sharp" | "funny" | "reflective";

export type DebateTurn = {
  speaker: PersonaId;
  text: string;
  replyTo?: PersonaId;
  tone?: DebateTone;
};

export const DEMO_TURNS: DebateTurn[] = [
  { speaker: "safe", text: "You already have unfinished projects. Starting another one is not a plan.", tone: "calm" },
  { speaker: "chaos", text: "That sounds like a Monday problem.", replyTo: "safe", tone: "funny" },
  { speaker: "success", text: "Finish one milestone first. Then earn the right to start another.", tone: "sharp" },
  { speaker: "safe", text: "Thank you. Finally.", replyTo: "success", tone: "calm" },
  { speaker: "chaos", text: "Counterpoint: new repo.", replyTo: "success", tone: "funny" },
  { speaker: "regret", text: "You know you are going to do it anyway.", tone: "sharp" },
  {
    speaker: "later",
    text: "You won't remember the sensible weekend. You will remember what you actually finished.",
    tone: "reflective",
  },
];

function memoryTurns(insights: MemoryInsights): DebateTurn[] {
  const extra: DebateTurn[] = [];
  if (insights.ignoredCount >= 1) {
    extra.push({
      speaker: "safe",
      text: "Last time we told you to slow down. You ignored us.",
      tone: "sharp",
    });
    extra.push({
      speaker: "chaos",
      text: "And yet here we are.",
      replyTo: "safe",
      tone: "funny",
    });
  }
  if (insights.ignoredCount >= 3) {
    extra.push({
      speaker: "regret",
      text: "This is the fourth time you have asked for advice after already deciding.",
      tone: "sharp",
    });
  }
  if (insights.repeatedPriority === "Ambition") {
    extra.push({
      speaker: "success",
      text: "You keep choosing ambition. Stop pretending stability is the deciding factor.",
      tone: "sharp",
    });
  }
  if (insights.repeatedRiskPattern === "high") {
    extra.push({
      speaker: "safe",
      text: "Your risk slider has been above 70 three decisions in a row. At some point this stops being analysis.",
      tone: "calm",
    });
  }
  return extra;
}

export function debateTurns(
  decision: string,
  isDemo: boolean,
  records: MemoryRecord[],
  priorities: string[],
  risk: number,
): DebateTurn[] {
  if (isDemo || decision.trim() === DEMO_DECISION) {
    return DEMO_TURNS;
  }
  const insights = deriveInsights(records);
  const d = decision.trim() || "this";
  const base: DebateTurn[] = [
    { speaker: "safe", text: `You already have unfinished obligations. ${d} is not a plan by itself.`, tone: "calm" },
    { speaker: "chaos", text: "That sounds like a Monday problem.", replyTo: "safe", tone: "funny" },
    {
      speaker: "success",
      text: priorities.includes("Ambition")
        ? "Start only if you can define one thing that ships by Sunday night."
        : "Start only if it compounds. One focused attempt, then stop.",
      tone: "sharp",
    },
    { speaker: "safe", text: "You said that last time.", replyTo: "success", tone: "sharp" },
    { speaker: "chaos", text: "And yet we survived.", replyTo: "safe", tone: "funny" },
    { speaker: "regret", text: "Surviving is a very low bar for ambition.", replyTo: "chaos", tone: "sharp" },
    {
      speaker: "later",
      text: "You will not remember whether you started. You will remember what you finished.",
      tone: "reflective",
    },
  ];
  if (risk < 35) {
    base.splice(3, 0, {
      speaker: "safe",
      text: "Your own risk tolerance is already asking you to wait.",
      tone: "calm",
    });
  } else if (risk > 70) {
    base.splice(2, 0, {
      speaker: "chaos",
      text: "The slider is already daring you. Stop negotiating with it.",
      tone: "funny",
    });
  }
  const mem = memoryTurns(insights);
  const merged = [...mem, ...base];
  return merged.slice(0, 10);
}

export { personaName, PERSONAS };
