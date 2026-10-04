import { useEffect, useMemo, useState } from "react";
import {
  DEMO_DECISION,
  OVERRIDE_CHOICES,
  PERSONAS,
  PRIORITIES,
  loadMemory,
  reasonLabel,
  saveMemory,
  type MemoryRecord,
  type OverrideReason,
  type UserAction,
} from "./council";
import { generateCouncil, localCouncil, type AiCouncilResponse } from "./ai";
import { debateTurns, type DebateTurn } from "./debate";
import { deriveInsights, landingMemoryLine, memoryCue, personaName, voteLabel, whatTheyRemember } from "./memory";
import { biggestDisagreement, mostPersuasive, tally, votesFor } from "./verdict";
import {
  DEFENSE_CHOICES,
  defenseLabel,
  defenseReply,
  mutinyLines,
  shouldMutiny,
  type DefenseReason,
} from "./mutiny";

type Stage =
  | "input"
  | "debate"
  | "vote"
  | "dissent"
  | "verdict"
  | "mutiny"
  | "defense"
  | "why"
  | "consequence"
  | "receipt";

export default function App() {
  const [stage, setStage] = useState<Stage>("input");
  const [decision, setDecision] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [risk, setRisk] = useState(48);
  const [isDemo, setIsDemo] = useState(false);
  const [visibleTurns, setVisibleTurns] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [memory, setMemory] = useState<MemoryRecord[]>([]);
  const [action, setAction] = useState<UserAction | null>(null);
  const [overrideReason, setOverrideReason] = useState<OverrideReason | undefined>();
  const [copied, setCopied] = useState<"result" | "share" | null>(null);
  const [toast, setToast] = useState(false);
  const [showNoted, setShowNoted] = useState(false);
  const [aiPack, setAiPack] = useState<AiCouncilResponse | null>(null);
  const [calling, setCalling] = useState("");
  const [mutinyBeat, setMutinyBeat] = useState(0);
  const [mutinyTitle, setMutinyTitle] = useState(false);
  const [didMutiny, setDidMutiny] = useState(false);
  const [lastMutiny, setLastMutiny] = useState(false);
  const [defense, setDefense] = useState<DefenseReason | undefined>();
  const [defenseBeat, setDefenseBeat] = useState(0);
  const [showCustom, setShowCustom] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  const insights = useMemo(() => deriveInsights(memory), [memory]);
  const votes = useMemo(() => votesFor(decision, risk, priorities, isDemo), [decision, risk, priorities, isDemo]);
  const result = useMemo(() => tally(votes, isDemo), [votes, isDemo]);
  const localPack = useMemo(
    () =>
      localCouncil({
        decision,
        priorities,
        riskTolerance: risk,
        voteResult: result.winner,
        consensusStrength: result.confidence,
        memory,
      }),
    [decision, priorities, risk, result.winner, result.confidence, memory],
  );
  const pack = aiPack ?? localPack;
  const turns = pack.turns.length ? pack.turns : debateTurns(decision, isDemo, memory, priorities, risk);
  const dissent = pack.dissent;
  const truth = pack.councilRead;
  const persuasive = useMemo(
    () => mostPersuasive(votes, result.winner, turns, priorities, insights),
    [votes, result.winner, turns, priorities, insights],
  );

  useEffect(() => {
    if (stage !== "debate") return;
    setVisibleTurns(0);
    setThinking(true);
    const first = window.setTimeout(() => {
      setThinking(false);
      setVisibleTurns(1);
    }, isDemo ? 250 : 420);
    return () => window.clearTimeout(first);
  }, [stage, turns, isDemo]);

  useEffect(() => {
    if (stage !== "debate") return;
    if (visibleTurns === 0 || visibleTurns >= turns.length) return;
    setThinking(true);
    const pause = window.setTimeout(() => {
      setThinking(false);
      setVisibleTurns((n) => Math.min(n + 1, turns.length));
    }, isDemo ? 650 : 1500);
    return () => window.clearTimeout(pause);
  }, [stage, visibleTurns, turns.length, isDemo]);

  function goFromDissent() {
    setStage((s) => (s === "dissent" ? "verdict" : s));
  }

  function togglePriority(p: string) {
    setPriorities((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function startDemo() {
    setIsDemo(true);
    setDecision(DEMO_DECISION);
    setPriorities(["Ambition", "Rest"]);
    setRisk(62);
    setAction(null);
    setOverrideReason(undefined);
    setCopied(null);
    setAiPack(null);
    setCalling("");
    setDidMutiny(false);
    setDefense(undefined);
    setMutinyBeat(0);
    setMutinyTitle(false);
    setStage("debate");
  }

  async function convene() {
    if (!decision.trim()) return;
    setIsDemo(false);
    setAction(null);
    setOverrideReason(undefined);
    setCopied(null);
    setAiPack(null);
    setDidMutiny(false);
    setDefense(undefined);
    setMutinyBeat(0);
    setMutinyTitle(false);
    setCalling("Calling the Council…");
    setStage("debate");
    window.setTimeout(() => setCalling((c) => (c ? "Chaos You is already interrupting." : c)), 700);
    const generated = await generateCouncil(
      {
        decision: decision.trim(),
        priorities,
        riskTolerance: risk,
        voteResult: result.winner,
        consensusStrength: result.confidence,
        memory,
      },
      votes,
    );
    setAiPack(generated);
    setCalling("");
  }

  function persist(chosen: UserAction, reason?: OverrideReason) {
    const rec: MemoryRecord = {
      decision: decision.trim(),
      priorities,
      risk,
      verdict: result.verdict,
      action: chosen,
      timestamp: new Date().toISOString(),
      votes,
      confidence: result.confidence,
      overrideReason: chosen === "ignored" ? reason : undefined,
    };
    const next = [rec, ...memory].slice(0, 40);
    setMemory(next);
    saveMemory(next);
    setStage("receipt");
  }

  function listen() {
    setAction("accepted");
    setOverrideReason(undefined);
    setDidMutiny(false);
    setStage("consequence");
    window.setTimeout(() => persist("accepted"), 1100);
  }

  function startOverrule() {
    setAction("ignored");
    setShowNoted(false);
    const fire = shouldMutiny({
      isDemo,
      decision,
      consensus: result.confidence,
      insights,
      records: memory,
      lastMutiny,
    });
    if (!fire) {
      setDidMutiny(false);
      setStage("why");
      return;
    }
    setDidMutiny(true);
    setLastMutiny(true);
    setMutinyBeat(0);
    setMutinyTitle(false);
    setStage("mutiny");
  }

  function pickReason(id: OverrideReason) {
    setOverrideReason(id);
    setShowNoted(true);
    window.setTimeout(() => persist("ignored", id), 1100);
  }

  const mutinyScript = mutinyLines(insights, isDemo, decision);
  const defenseLines = defense ? defenseReply(defense) : [];

  useEffect(() => {
    if (stage !== "mutiny") return;
    setMutinyBeat(0);
    setMutinyTitle(false);
    const mutinyStart = isDemo ? 480 : 600;
    const mutinyGap = isDemo ? 625 : 750;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setMutinyBeat(1), mutinyStart));
    mutinyScript.forEach((_, i) => {
      if (i === 0) return;
      timers.push(window.setTimeout(() => setMutinyBeat(i + 1), mutinyStart + i * mutinyGap));
    });
    timers.push(window.setTimeout(() => setMutinyTitle(true), mutinyStart + mutinyScript.length * mutinyGap));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stage, mutinyScript.length, isDemo]);

  const remembered = whatTheyRemember(memory, insights);
  const dissentSpeaker = PERSONAS.find((p) => p.id === dissent.speaker)!;

  const shareBody = didMutiny
    ? `MY COUNCIL MUTINIED.

${decision}

THEM: ${result.verdict}
ME: I OVERRULED THEM.

Then they asked:
"What answer were you hoping we'd give you?"

Me:
"${defense ? defenseLabel(defense) : ""}."

${dissentSpeaker.name}:
"${dissent.text}"

They'll remember this.

What would your future selves ask you?`
    : `5 VERSIONS OF ME VOTED.

${decision}

THEM: ${result.verdict}
ME: ${action === "ignored" ? "I OVERRULED THEM." : "I LISTENED."}

${dissentSpeaker.name}: "${dissent.text}"

They'll remember why:
"${overrideReason ? reasonLabel(overrideReason) : action === "accepted" ? "I listened." : remembered}"

What would your future selves say?`;

  async function copyText(kind: "result" | "share") {
    const resultText = `5 VERSIONS OF ME VOTED.

Decision: ${decision}
THE COUNCIL: ${result.verdict}
ME: ${action === "ignored" ? "I OVERRULED THEM." : "I LISTENED."}
Confidence: ${result.confidence}%

Council read:
${truth}

What would your future selves say?`;
    try {
      await navigator.clipboard.writeText(kind === "share" ? shareBody : resultText);
      setCopied(kind);
      setToast(true);
      window.setTimeout(() => {
        setCopied(null);
        setToast(false);
      }, 1800);
    } catch {
      setCopied(null);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ text: shareBody, title: "The Council of You" });
    } catch {
      /* cancelled */
    }
  }

  const shown = turns.slice(0, visibleTurns);
  const active = shown[shown.length - 1];
  const allShown = visibleTurns >= turns.length && turns.length > 0;

  useEffect(() => {
    if (!isDemo || stage !== "debate" || !allShown) return;
    const t = window.setTimeout(() => setStage("vote"), 450);
    return () => window.clearTimeout(t);
  }, [isDemo, stage, allShown]);

  useEffect(() => {
    if (!isDemo || stage !== "vote") return;
    const t = window.setTimeout(() => setStage("dissent"), 1500);
    return () => window.clearTimeout(t);
  }, [isDemo, stage]);

  useEffect(() => {
    if (!isDemo || stage !== "dissent") return;
    const t = window.setTimeout(() => setStage("verdict"), 2000);
    return () => window.clearTimeout(t);
  }, [isDemo, stage]);

  const cue = memoryCue(insights);
  const landCue = landingMemoryLine(insights, memory);
  const disagreement = biggestDisagreement(priorities, result);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 pb-24 pt-10">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">THE COUNCIL OF YOU</p>
          <h1 className="mt-2 font-serif text-4xl leading-none md:text-5xl">Five versions of you. One decision.</h1>
          <p className="mt-3 max-w-lg text-[#9a9488]">They'll argue. They'll vote. Overrule them, and they might revolt.</p>
        </div>
        {landCue && stage === "input" && (
          <div className="rounded-full border border-[#c9a86a]/40 px-3 py-1 text-[10px] tracking-[0.16em] text-[#c9a86a]">
            {landCue}
          </div>
        )}
      </header>

      {stage === "input" && (
        <section className="fade-up space-y-8">
          <div className="space-y-3">
            <button type="button" onClick={startDemo} className="w-full rounded-full bg-[#ece6d8] px-6 py-4 text-lg font-semibold tracking-[0.04em] text-[#08090d]">
              TRY THE 20-SECOND DEMO
            </button>
            <p className="text-center text-sm text-[#7a7468]">No setup. See the Council turn on you.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PERSONAS.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 p-2">
                <p className="text-xs font-semibold leading-tight">{p.name}</p>
                <p className="mt-1 text-[10px] leading-snug text-[#9a9488]">{p.subtitle}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] tracking-[0.28em] text-[#9a9488]">
            <span className="h-px flex-1 bg-white/10" />
            OR
            <span className="h-px flex-1 bg-white/10" />
          </div>
          {!showCustom && (
            <button type="button" onClick={() => setShowCustom(true)} className="w-full rounded-full border border-white/20 px-6 py-3 text-sm tracking-[0.12em] text-[#ece6d8]">
              ASK MY OWN DECISION
            </button>
          )}
          {showCustom && (
            <div className="fade-up space-y-8">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-[#9a9488]">The decision</span>
                <textarea
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 font-serif text-2xl outline-none focus:border-[#c9a86a]"
                  placeholder="Should I…?"
                />
                <p className="mt-2 text-sm text-[#7a7468]">Type a real decision, or try the demo first.</p>
              </label>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#9a9488]">Priorities</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePriority(p)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${priorities.includes(p) ? "border-[#c9a86a] bg-[#c9a86a]/15 text-[#ece6d8]" : "border-white/10 text-[#9a9488]"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-[#9a9488]">Risk tolerance</span>
                <div className="mt-3 flex items-center justify-between text-[11px] tracking-[0.2em] text-[#9a9488]">
                  <span>SAFE</span>
                  <span className="text-[#c9a86a]">{risk}</span>
                  <span>RECKLESS</span>
                </div>
                <input type="range" min={0} max={100} value={risk} onChange={(e) => setRisk(Number(e.target.value))} className="mt-2 w-full accent-[#c9a86a]" />
              </label>
              <button type="button" onClick={convene} className="w-full rounded-full bg-[#ece6d8] px-6 py-3 font-medium text-[#08090d]">
                CONVENE THE COUNCIL
              </button>
            </div>
          )}
        </section>
      )}

      {stage === "debate" && (
        <section className="fade-up">
          <CouncilRing activeId={active?.speaker} replyTo={active?.replyTo} decision={decision} />
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="shrink-0 text-[11px] tracking-[0.18em] text-[#9a9488]">
              ARGUMENT {Math.max(visibleTurns, 1)} / {turns.length}
            </p>
          </div>
          {cue && <p className="mb-6 text-[11px] tracking-[0.22em] text-[#e07a5f]">{cue}</p>}
          <div className="grid gap-3">
            {shown.map((turn, i) => (
              <DebateBubble key={i} turn={turn} active={i === shown.length - 1} showSub={i === 0} />
            ))}
            {calling && <p className="pl-4 text-[11px] tracking-[0.2em] text-[#9a9488]">{calling}</p>}
            {thinking && !allShown && !calling && <p className="pl-4 text-[11px] tracking-[0.2em] text-[#9a9488]">thinking…</p>}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {!allShown && (
              <button
                type="button"
                onClick={() => {
                  setVisibleTurns(turns.length);
                  setStage("vote");
                }}
                className="rounded-full border border-white/20 px-6 py-3 text-sm tracking-[0.16em]"
              >
                SKIP TO VOTE
              </button>
            )}
            {allShown && (
              <button type="button" onClick={() => setStage("vote")} className="w-full rounded-full bg-[#ece6d8] py-3 font-medium text-[#08090d]">
                CALL THE VOTE
              </button>
            )}
          </div>
        </section>
      )}

      {stage === "vote" && (
        <section className="fade-up space-y-5">
          <h2 className="font-serif text-4xl">The vote</h2>
          {PERSONAS.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>{p.name}</span>
              <span className="uppercase tracking-[0.16em] text-[#c9a86a]">{voteLabel(votes[p.id])}</span>
            </div>
          ))}
          <button type="button" onClick={() => setStage("dissent")} className="w-full rounded-full bg-[#ece6d8] py-3 font-medium text-[#08090d]">
            Hear the dissent
          </button>
        </section>
      )}

      {stage === "dissent" && (
        <section className="fade-up py-16 text-center">
          <p className="text-xs tracking-[0.28em] text-[#e07a5f]">THE DISSENT</p>
          <p className="mt-6 text-sm tracking-[0.16em] text-[#9a9488]">{dissentSpeaker.name}</p>
          <p className="mx-auto mt-4 max-w-lg font-serif text-3xl">{dissent.text}</p>
          <button type="button" onClick={goFromDissent} className="mt-10 text-xs tracking-[0.2em] text-[#9a9488]">
            Continue
          </button>
        </section>
      )}

      {stage === "verdict" && (
        <section className="fade-up text-center">
          <p className="text-xs tracking-[0.28em] text-[#c9a86a]">THE COUNCIL HAS DECIDED</p>
          <h2 className="mt-4 font-serif text-5xl">{result.verdict}</h2>
          <p className="mt-3 text-[#c9a86a]">Consensus strength: {result.confidence}%</p>
          <p className="mt-1 text-[11px] text-[#9a9488]">How strongly the Council converged on this outcome.</p>
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 p-5 text-left">
            <p className="text-[11px] tracking-[0.22em] text-[#e07a5f]">COUNCIL READ</p>
            <p className="mt-3 font-serif text-2xl leading-snug">{truth}</p>
          </div>
          {isDemo && <p className="mt-8 text-sm text-[#9a9488]">Their vote isn't binding.</p>}
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {isDemo ? (
              <>
                <button type="button" onClick={startOverrule} className="w-full rounded-full bg-[#ece6d8] px-6 py-3 font-semibold text-[#08090d] sm:w-auto">
                  OVERRULE THE COUNCIL →
                </button>
                <button type="button" onClick={listen} className="w-full rounded-full border border-white/20 px-6 py-3 text-sm text-[#9a9488] sm:w-auto">
                  LISTEN TO THEM
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={listen} className="rounded-full bg-[#ece6d8] px-6 py-3 font-medium text-[#08090d]">
                  Listen
                </button>
                <button type="button" onClick={startOverrule} className="rounded-full border border-[#e07a5f]/50 px-6 py-3 text-[#e07a5f]">
                  OVERRULE THE COUNCIL
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {stage === "mutiny" && (
        <section className="fade-up mutiny-vignette py-8 text-center">
          <CouncilRing activeId={mutinyScript[Math.max(0, mutinyBeat - 1)]?.speaker} decision={decision} mutiny />
          {mutinyBeat === 0 && <p className="mt-8 font-serif text-6xl text-[#ece6d8]">&nbsp;</p>}
          {mutinyBeat === 1 && !mutinyTitle && mutinyScript[0] && (
            <div className="mt-10 mb-8">
              <p className="text-xs tracking-[0.28em] text-[#9a9488]">{personaName(mutinyScript[0].speaker).toUpperCase()}</p>
              <p className="mt-6 font-serif text-5xl leading-none md:text-6xl">{mutinyScript[0].text}</p>
            </div>
          )}
          {mutinyBeat > 1 && !mutinyTitle && (
            <div className="mt-4 space-y-3">
              {mutinyScript.slice(0, mutinyBeat).map((line, i) => (
                <p key={i} className={i === mutinyBeat - 1 ? "font-serif text-4xl md:text-5xl" : "text-sm text-[#9a9488]"}>
                  <span className="mr-2 text-[10px] tracking-[0.16em]">{personaName(line.speaker).toUpperCase()}</span>
                  {line.text}
                </p>
              ))}
            </div>
          )}
          {mutinyTitle && (
            <>
              <p className="mt-6 text-xs tracking-[0.24em] text-[#c9a86a]">THE COUNCIL HAS CALLED AN EMERGENCY SESSION</p>
              <p className="mt-4 font-serif text-2xl">One question before you overrule us.</p>
              <button type="button" onClick={() => { setDefenseBeat(0); setStage("defense"); }} className="mt-8 rounded-full bg-[#ece6d8] px-8 py-3 font-medium text-[#08090d]">
                DEFEND YOURSELF
              </button>
            </>
          )}
        </section>
      )}

      {stage === "defense" && (
        <section className="fade-up py-10 text-center">
          {defenseBeat === 0 && !defense && (
            <>
              <h2 className="font-serif text-3xl md:text-4xl">What answer were you hoping we'd give you?</h2>
              <div className="mx-auto mt-8 grid max-w-lg gap-3">
                {DEFENSE_CHOICES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setDefense(c.id);
                      setDefenseBeat(1);
                    }}
                    className="rounded-2xl border border-white/15 px-4 py-3 text-left hover:border-[#c9a86a]"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {defense && defenseBeat >= 1 && (
            <div className="space-y-4">
              {defenseLines.map((line, i) => (
                <p key={i} className="font-serif text-2xl">
                  <span className="mr-2 text-[10px] tracking-[0.16em] text-[#9a9488]">{personaName(line.speaker).toUpperCase()}</span>
                  {line.text}
                </p>
              ))}
              <button type="button" onClick={() => setStage("why")} className="mt-8 rounded-full bg-[#ece6d8] px-8 py-3 font-medium text-[#08090d]">
                Continue
              </button>
            </div>
          )}
        </section>
      )}

      {stage === "why" && (
        <section className="fade-up py-10 text-center">
          <p className="text-xs tracking-[0.28em] text-[#e07a5f]">YOU OVERRULED THEM.</p>
          {!showNoted ? (
            <>
              <h2 className="mt-6 font-serif text-4xl">Why?</h2>
              <div className="mx-auto mt-8 grid max-w-lg gap-3">
                {OVERRIDE_CHOICES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickReason(c.id)}
                    className="rounded-2xl border border-white/15 px-4 py-3 text-left hover:border-[#c9a86a]"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mt-8 font-serif text-3xl">Noted.</p>
              <p className="mt-4 text-[#c9a86a]">They'll remember why.</p>
            </>
          )}
        </section>
      )}

      {stage === "consequence" && action === "accepted" && (
        <section className="fade-up py-16 text-center">
          <p className="text-xs tracking-[0.28em] text-[#c9a86a]">YOU LISTENED.</p>
          <p className="mt-6 font-serif text-3xl text-[#9a9488]">The Council will remember that too.</p>
        </section>
      )}

      {stage === "receipt" && action && (
        <section className="fade-up rounded-3xl border border-[#c9a86a]/50 bg-black/55 p-6 md:p-8">
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">{didMutiny ? "MY COUNCIL MUTINIED." : "5 VERSIONS OF ME VOTED."}</p>
          <p className="mt-3 font-serif text-3xl leading-tight md:text-4xl">{decision}</p>
          <p className="mt-2 text-lg tracking-[0.14em] text-[#e07a5f]">{action === "ignored" ? "I OVERRULED THEM." : "I LISTENED."}</p>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-white/10 py-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">The Council</p>
              <p className="mt-1 text-lg tracking-[0.12em]">{result.verdict}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Your override</p>
              <p className={`mt-1 text-lg tracking-[0.12em] ${action === "ignored" ? "text-[#e07a5f]" : ""}`}>
                {action === "ignored" ? "OVERRULED" : "LISTENED"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Consensus strength</p>
              <p className="mt-1 text-lg">{result.confidence}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Most Persuasive</p>
              <p className="mt-1 text-lg">{personaName(persuasive)}</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">The Dissent</p>
          <p className="mt-1 font-serif text-xl">
            {dissentSpeaker.name} still says: “{dissent.text}”
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Biggest disagreement</p>
          <p className="mt-1 font-serif text-xl">{disagreement}</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">What they remember</p>
          <p className="mt-1 text-sm">{overrideReason ? `Last time, you said ${reasonLabel(overrideReason).toLowerCase()}.` : remembered}</p>
          <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-[#e07a5f]">Council Read</p>
          <p className="mt-2 font-serif text-2xl leading-snug">{truth}</p>
          {didMutiny && defense && (
            <>
              <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Emergency Session</p>
              <p className="mt-1 font-serif text-xl">I wanted {defenseLabel(defense).toLowerCase()}.</p>
            </>
          )}
          <p className="mt-6 text-center text-[11px] tracking-[0.22em] text-[#c9a86a]">
            {didMutiny ? "THEY ASKED WHAT ANSWER I WANTED." : "WHAT WOULD YOUR FUTURE SELVES SAY?"}
          </p>
          {didMutiny && <p className="mt-2 text-center text-[11px] text-[#9a9488]">What would your future selves ask you?</p>}
          <p className="mt-1 text-center text-[10px] tracking-[0.28em] text-[#9a9488]">THE COUNCIL OF YOU</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => copyText("result")} className="flex-1 rounded-full bg-[#ece6d8] py-3 text-sm font-medium text-[#08090d]">
              {copied === "result" ? "COPIED ✓" : "COPY SUMMARY"}
            </button>
            <button type="button" onClick={() => copyText("share")} className="flex-1 rounded-full border border-[#c9a86a] py-3 text-sm text-[#c9a86a]">
              {copied === "share" ? "COPIED ✓" : "COPY SHARE CARD"}
            </button>
            {canNativeShare && (
              <button type="button" onClick={nativeShare} className="w-full rounded-full border border-white/15 py-3 text-sm">
                SHARE
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStage("input");
                setDecision("");
                setPriorities([]);
                setIsDemo(false);
                setAction(null);
                setOverrideReason(undefined);
                setCopied(null);
                setDidMutiny(false);
                setDefense(undefined);
                setShowCustom(false);
              }}
              className="w-full rounded-full border border-white/15 py-3"
            >
              NEW DECISION
            </button>
          </div>
          {toast && (
            <p role="status" className="mt-3 text-center text-[11px] tracking-[0.18em] text-[#c9a86a]">
              Copied to clipboard
            </p>
          )}
        </section>
      )}
    </div>
  );
}

const RING: {
  id: (typeof PERSONAS)[number]["id"];
  label: string;
  normal: string;
  mutiny: string;
}[] = [
  {
    id: "success",
    label: "SUCCESS",
    normal: "left-1/2 top-0 -translate-x-1/2",
    mutiny: "left-1/2 top-[12%] -translate-x-1/2",
  },
  {
    id: "safe",
    label: "SAFE",
    normal: "left-[8%] top-[18%] md:left-[12%]",
    mutiny: "left-[24%] top-[30%] md:left-[28%]",
  },
  {
    id: "later",
    label: "+1 YEAR",
    normal: "right-[8%] top-[18%] md:right-[12%]",
    mutiny: "right-[24%] top-[30%] md:right-[28%]",
  },
  {
    id: "chaos",
    label: "CHAOS",
    normal: "bottom-2 left-[18%] md:left-[22%]",
    mutiny: "bottom-[20%] left-[28%] md:left-[31%]",
  },
  {
    id: "regret",
    label: "REGRET",
    normal: "bottom-2 right-[18%] md:right-[22%]",
    mutiny: "bottom-[20%] right-[28%] md:right-[31%]",
  },
];

function CouncilRing({
  activeId,
  replyTo,
  decision,
  mutiny,
}: {
  activeId?: string;
  replyTo?: string;
  decision: string;
  mutiny?: boolean;
}) {
  return (
    <div className="mb-8">
      <div className={`relative mx-auto max-w-md overflow-hidden ${mutiny ? "h-52 md:h-56" : "h-44 md:h-52"}`}>
        {RING.map((slot) => {
          const p = PERSONAS.find((x) => x.id === slot.id)!;
          const on = activeId === p.id;
          return (
            <div
              key={p.id}
              className={`absolute flex flex-col items-center transition-all duration-700 ease-out ${mutiny ? slot.mutiny : slot.normal}`}
            >
              <span
                title={p.subtitle}
                className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold md:h-12 md:w-12 ${
                  on ? (mutiny ? "speaker-ring scale-[1.08]" : "speaker-ring scale-110") : "opacity-80"
                }`}
                style={{
                  background: p.color + "33",
                  color: p.color,
                  outline: `2px solid ${p.color}${on ? "cc" : "66"}`,
                  boxShadow: on
                    ? `0 0 18px ${p.color}88`
                    : replyTo === p.id
                      ? `0 0 0 3px ${p.color}55`
                      : undefined,
                }}
              >
                {p.mark}
              </span>
              <span className={`mt-1 text-[10px] tracking-[0.14em] ${on ? "text-[#ece6d8]" : "text-[#9a9488]"}`}>
                {slot.label}
              </span>
            </div>
          );
        })}
        <div
          className={`absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700 ease-out ${mutiny ? "mutiny-center scale-[0.96] opacity-75" : ""}`}
        >
          <p className="text-[10px] tracking-[0.22em] text-[#9a9488]">YOUR DECISION</p>
          <p className={`mt-1 font-serif text-lg italic leading-tight md:text-xl ${mutiny ? "text-[#b89658]" : "text-[#c9a86a]"}`}>
            {decision}
          </p>
        </div>
      </div>
    </div>
  );
}

function DebateBubble({ turn, active, showSub }: { turn: DebateTurn; active: boolean; showSub?: boolean }) {
  const p = PERSONAS.find((x) => x.id === turn.speaker)!;
  return (
    <article
      className={`fade-up rounded-2xl border border-white/10 bg-white/4 p-4 transition ${turn.replyTo ? "ml-4 md:ml-8" : ""} ${
        active ? "speaker-ring" : "opacity-75"
      }`}
      style={{
        borderLeft: `3px solid ${p.color}`,
        boxShadow: active ? `0 0 18px ${p.color}33` : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold" style={{ background: p.color + "33", color: p.color }}>
          {p.mark}
        </span>
        <div>
          <strong>{p.name}</strong>
          {showSub && <p className="text-[10px] text-[#9a9488]">{p.subtitle}</p>}
        </div>
        {turn.replyTo && (
          <span className="ml-auto text-[10px] tracking-[0.14em] text-[#9a9488]">→ {personaName(turn.replyTo)}</span>
        )}
      </div>
      <p className="font-serif text-xl leading-snug text-[#ece6d8]">{turn.text}</p>
    </article>
  );
}
