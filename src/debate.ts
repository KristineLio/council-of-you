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
  { speaker: "safe", text: "You said the last one was your final one.", tone: "calm" },
  { speaker: "chaos", text: "That was before this one existed.", replyTo: "safe", tone: "funny" },
  { speaker: "success", text: "Only if we ship something people remember in ten seconds.", tone: "sharp" },
  { speaker: "safe", text: "You also have other things to finish.", tone: "calm" },
  { speaker: "chaos", text: "Those things do not have a leaderboard.", replyTo: "safe", tone: "funny" },
  { speaker: "regret", text: "You know you'd watch the submissions and wish you'd entered.", tone: "sharp" },
  {
    speaker: "later",
    text: "You won't remember the sensible weekend. You might remember the win.",
    tone: "reflective",
  },
  { speaker: "safe", text: "That is exactly how we got here.", replyTo: "chaos", tone: "sharp" },
  { speaker: "chaos", text: "And yet here we are.", replyTo: "safe", tone: "funny" },
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
  if (insights.lastOverrideReason === "already_decided") {
    extra.push({
      speaker: "safe",
      text: "Last time you overruled us because you'd already decided. Are we doing that again?",
      tone: "sharp",
    });
    extra.push({ speaker: "chaos", text: "To be fair, decisiveness looked good on us.", replyTo: "safe", tone: "funny" });
  } else if (insights.lastOverrideReason === "worth_the_risk") {
    extra.push({
      speaker: "success",
      text: "Last time you chose risk knowingly. This time, define what makes the risk worth taking.",
      tone: "sharp",
    });
  } else if (insights.lastOverrideReason === "missed_something") {
    extra.push({
      speaker: "regret",
      text: "You said we missed something last time. Tell us what you're not saying now.",
      tone: "sharp",
    });
  } else if (insights.lastOverrideReason === "curiosity") {
    extra.push({ speaker: "chaos", text: "Finally. A consistent philosophy.", tone: "funny" });
    extra.push({ speaker: "safe", text: "That is not a philosophy.", replyTo: "chaos", tone: "sharp" });
  } else if (insights.lastAccepted) {
    extra.push({ speaker: "success", text: "Last time you actually listened to us.", tone: "calm" });
    extra.push({ speaker: "chaos", text: "A dark day.", replyTo: "success", tone: "funny" });
  } else if (insights.ignoredCount >= 1) {
    extra.push({ speaker: "safe", text: "Last time we told you to slow down. You overruled us.", tone: "sharp" });
  }
  return extra.slice(0, 2);
}

export function debateTurns(
  decision: string,
  isDemo: boolean,
  records: MemoryRecord[],
  priorities: string[],
  _risk: number,
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
  const mem = memoryTurns(insights);
  const later = themed.find((t) => t.speaker === "later");
  const extra: DebateTurn[] = [];
  if (!themed.some((t) => t.replyTo)) {
    extra.push({
      speaker: "safe",
      text: "That is not how final works.",
      replyTo: "chaos",
      tone: "sharp",
    });
    extra.push({
      speaker: "chaos",
      text: "It is in startups.",
      replyTo: "safe",
      tone: "funny",
    });
  }
  if (priorities.includes("Rest")) {
    extra.push({
      speaker: "regret",
      text: "Rest is on the table. Pretending it is not is already a vote.",
      tone: "sharp",
    });
  }
  const merged = [...mem, ...themed, ...extra];
  if (later && !merged.slice(0, 9).some((t) => t.speaker === "later")) merged.push(later);
  const unique: DebateTurn[] = [];
  for (const t of merged) {
    if (!unique.some((u) => u.speaker === t.speaker && u.text === t.text)) unique.push(t);
  }
  const speakers = new Set(unique.map((t) => t.speaker));
  if (speakers.size < 4) {
    unique.push({ speaker: "regret", text: "Name the cost you are refusing to look at.", tone: "sharp" });
  }
  while (unique.length < 7) {
    unique.push({
      speaker: unique.length % 2 ? "chaos" : "safe",
      text: unique.length % 2 ? "And yet here we are." : "That is exactly how we got here.",
      replyTo: unique.length % 2 ? "safe" : "chaos",
      tone: unique.length % 2 ? "funny" : "sharp",
    });
  }
  return unique.slice(0, 9);
}

export function dissentLine(winner: import("./council").Vote, votes: Record<PersonaId, import("./council").Vote>): { speaker: PersonaId; text: string } {
  const dissenter = PERSONAS.find((p) => votes[p.id] !== winner) ?? PERSONAS[0];
  const lines: Record<string, Partial<Record<PersonaId, string>>> = {
    wait: { chaos: "Fine. But waiting is still a decision." },
    do_it: { safe: "I want it on record that I object." },
    hybrid: { regret: "Hybrid is just fear with better branding." },
    dont: { later: 'Make sure "no" is relief, not avoidance.' },
  };
  const demoSafe = winner === "do_it" && dissenter.id === "safe"
    ? "I want it on record that we have other deadlines."
    : undefined;
  const text =
    demoSafe ??
    lines[winner]?.[dissenter.id] ??
    (winner === "do_it"
      ? "I want it on record that I object."
      : winner === "wait"
        ? "Fine. But waiting is still a decision."
        : winner === "dont"
          ? 'Make sure "no" is relief, not avoidance.'
          : "Hybrid is just fear with better branding.");
  return { speaker: dissenter.id, text };
}

export { personaName, PERSONAS };
