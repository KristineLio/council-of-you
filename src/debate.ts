import { DEMO_DECISION, PERSONAS, type MemoryRecord, type PersonaId } from "./council";
import { deriveInsights, personaName, type MemoryInsights } from "./memory";
import { classifyDecision, type DecisionTheme } from "./themes";

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
  { speaker: "chaos", text: "Counterpoint: new repo.", replyTo: "success", tone: "funny" },
  { speaker: "regret", text: "You know you're going to do it anyway.", tone: "sharp" },
  {
    speaker: "later",
    text: "You won't remember the sensible weekend. You will remember what you actually finished.",
    tone: "reflective",
  },
];

const THEME_LINES: Record<DecisionTheme, DebateTurn[]> = {
  career: [
    { speaker: "safe", text: "Quitting is irreversible faster than building is profitable.", tone: "calm" },
    { speaker: "chaos", text: "Counterpoint: new title, new lore.", replyTo: "safe", tone: "funny" },
    { speaker: "success", text: "Don't quit for an idea. Quit for evidence.", tone: "sharp" },
    { speaker: "regret", text: "You are more afraid of wasting two years than losing three months.", tone: "sharp" },
    { speaker: "later", text: "You will remember the leap, not the meeting you stayed for.", tone: "reflective" },
  ],
  move: [
    { speaker: "safe", text: "Adventure has rent, paperwork, and lonely Tuesdays.", tone: "calm" },
    { speaker: "chaos", text: "Counterpoint: new country, new lore.", replyTo: "safe", tone: "funny" },
    { speaker: "success", text: "Go if you can name one thing that gets better only there.", tone: "sharp" },
    { speaker: "later", text: "You will remember whether you went, not whether the timing was perfect.", tone: "reflective" },
    { speaker: "regret", text: "Staying because the timing is never right is still a choice.", tone: "sharp" },
  ],
  relationship: [
    { speaker: "safe", text: "Feelings are data. They are not a plan.", tone: "calm" },
    { speaker: "chaos", text: "Say the true sentence. Then deal with Tuesday.", replyTo: "safe", tone: "funny" },
    { speaker: "regret", text: "You already know how this feels. You are stalling on the cost.", tone: "sharp" },
    { speaker: "success", text: "Clarity is kinder than a slow fade.", tone: "sharp" },
    { speaker: "later", text: "You will remember the honesty, not the delay.", tone: "reflective" },
  ],
  money: [
    { speaker: "safe", text: "The price is not the cost. The cost is what you cannot buy next.", tone: "calm" },
    { speaker: "chaos", text: "Buy the story. Future-you can spreadsheet it.", replyTo: "safe", tone: "funny" },
    { speaker: "success", text: "Spend only if it buys time, skill, or a door that stays open.", tone: "sharp" },
    { speaker: "regret", text: "You have called this 'just this once' before.", tone: "sharp" },
    { speaker: "later", text: "You will remember the trade-off, not the unboxing.", tone: "reflective" },
  ],
  study: [
    { speaker: "safe", text: "The deadline is not a personality test. Finish the course.", tone: "calm" },
    { speaker: "chaos", text: "What if academic comeback arc?", replyTo: "safe", tone: "funny" },
    { speaker: "success", text: "Pass first. Optimize later.", tone: "sharp" },
    { speaker: "regret", text: "You already know the version of this that haunted you.", tone: "sharp" },
    { speaker: "later", text: "You will remember the credential, not the spiral.", tone: "reflective" },
  ],
  health: [
    { speaker: "safe", text: "The body keeps the receipt even when you ignore the invoice.", tone: "calm" },
    { speaker: "chaos", text: "Start ugly. Consistency is a vibe, not a brand.", replyTo: "safe", tone: "funny" },
    { speaker: "success", text: "Pick one boring habit. Repeat it until it is not a debate.", tone: "sharp" },
    { speaker: "later", text: "You will not remember this negotiation. You will remember how you felt in a year.", tone: "reflective" },
    { speaker: "regret", text: "You keep treating rest like a prize instead of a requirement.", tone: "sharp" },
  ],
  generic: [
    { speaker: "safe", text: "If it can wait until Monday, it should. Protection is not cowardice.", tone: "calm" },
    { speaker: "chaos", text: "Do it badly, immediately. Momentum is cheaper than permission.", replyTo: "safe", tone: "funny" },
    { speaker: "success", text: "Start only if you can define one thing that ships.", tone: "sharp" },
    { speaker: "regret", text: "Surviving is a very low bar for ambition.", replyTo: "chaos", tone: "sharp" },
    { speaker: "later", text: "You will not remember whether you started. You will remember what you finished.", tone: "reflective" },
  ],
};

function memoryTurns(insights: MemoryInsights): DebateTurn[] {
  const extra: DebateTurn[] = [];
  if (insights.ignoredCount >= 1) {
    extra.push({ speaker: "safe", text: "Last time we told you to slow down. You ignored us.", tone: "sharp" });
    extra.push({ speaker: "chaos", text: "And yet here we are.", replyTo: "safe", tone: "funny" });
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
  if (isDemo || decision.trim() === DEMO_DECISION) return DEMO_TURNS;
  const insights = deriveInsights(records);
  const theme = classifyDecision(decision);
  const themed = THEME_LINES[theme].map((t) => ({ ...t }));
  if (priorities.includes("Ambition") && theme !== "career") {
    themed[2] = {
      speaker: "success",
      text: "Start only if you can define one thing that ships by Sunday night.",
      tone: "sharp",
    };
  }
  if (risk < 35) {
    themed.splice(1, 0, {
      speaker: "safe",
      text: "Your own risk tolerance is already asking you to wait.",
      tone: "calm",
    });
  }
  const mem = memoryTurns(insights);
  return [...mem, ...themed].slice(0, 7);
}

export { personaName, PERSONAS };
