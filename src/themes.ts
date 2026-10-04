export type DecisionTheme =
  | "career"
  | "move"
  | "relationship"
  | "money"
  | "study"
  | "health"
  | "generic";

const RULES: { theme: DecisionTheme; words: string[] }[] = [
  { theme: "career", words: ["career", "job", "quit", "startup", "business", "project", "promo", "boss", "offer"] },
  { theme: "move", words: ["move", "country", "city", "travel", "abroad", "relocat", "visa", "apartment"] },
  { theme: "relationship", words: ["relationship", "date", "breakup", "partner", "marry", "divorce", "love"] },
  { theme: "money", words: ["money", "buy", "invest", "expensive", "salary", "rent", "loan", "spend"] },
  { theme: "study", words: ["study", "university", "course", "exam", "school", "degree", "thesis"] },
  { theme: "health", words: ["health", "gym", "run", "diet", "sleep", "workout", "doctor"] },
];

export function classifyDecision(text: string): DecisionTheme {
  const t = text.toLowerCase();
  let best: DecisionTheme = "generic";
  let score = 0;
  for (const rule of RULES) {
    const n = rule.words.filter((w) => t.includes(w)).length;
    if (n > score) {
      score = n;
      best = rule.theme;
    }
  }
  return best;
}
