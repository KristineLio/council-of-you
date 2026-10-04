import { useEffect, useMemo, useState } from "react";
import { DEMO_DECISION, PERSONAS, PRIORITIES, loadMemory, saveMemory, type MemoryRecord, type UserAction } from "./council";
import { debateTurns, type DebateTurn } from "./debate";
import { deriveInsights, landingMemoryLine, memoryCue, patternFromRecords, personaName, voteLabel } from "./memory";
import { biggestDisagreement, mostPersuasive, tally, uncomfortableTruth, votesFor } from "./verdict";

type Stage = "input" | "debate" | "vote" | "verdict" | "consequence" | "receipt";

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
  const [copied, setCopied] = useState<"result" | "share" | null>(null);
  const [toast, setToast] = useState(false);
  const [ignoreBeat, setIgnoreBeat] = useState(0);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  const insights = useMemo(() => deriveInsights(memory), [memory]);
  const turns = useMemo(
    () => debateTurns(decision, isDemo, memory, priorities, risk),
    [decision, isDemo, memory, priorities, risk],
  );
  const votes = useMemo(() => votesFor(decision, risk, priorities, isDemo), [decision, risk, priorities, isDemo]);
  const result = useMemo(() => tally(votes, isDemo), [votes, isDemo]);
  const truth = useMemo(
    () => uncomfortableTruth({ isDemo, decision, priorities, risk, insights, winner: result.winner }),
    [isDemo, decision, priorities, risk, insights, result.winner],
  );
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
    }, 420);
    return () => window.clearTimeout(first);
  }, [stage, turns]);

  useEffect(() => {
    if (stage !== "debate") return;
    if (visibleTurns === 0 || visibleTurns >= turns.length) return;
    setThinking(true);
    const pause = window.setTimeout(() => {
      setThinking(false);
      setVisibleTurns((n) => Math.min(n + 1, turns.length));
    }, isDemo ? 1550 : 1680);
    return () => window.clearTimeout(pause);
  }, [stage, visibleTurns, turns.length, isDemo]);

  function togglePriority(p: string) {
    setPriorities((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function startDemo() {
    setIsDemo(true);
    setDecision(DEMO_DECISION);
    setPriorities(["Ambition", "Rest"]);
    setRisk(62);
    setAction(null);
    setCopied(null);
    setStage("debate");
  }

  function convene() {
    if (!decision.trim()) return;
    setIsDemo(false);
    setAction(null);
    setCopied(null);
    setStage("debate");
  }

  function persist(chosen: UserAction) {
    const rec: MemoryRecord = {
      decision: decision.trim(),
      priorities,
      risk,
      verdict: result.verdict,
      action: chosen,
      timestamp: new Date().toISOString(),
      votes,
      confidence: result.confidence,
    };
    const next = [rec, ...memory].slice(0, 40);
    setMemory(next);
    saveMemory(next);
    setStage("receipt");
  }

  function choose(chosen: UserAction) {
    setAction(chosen);
    setIgnoreBeat(0);
    setStage("consequence");
    if (chosen === "accepted") {
      window.setTimeout(() => persist(chosen), 900);
      return;
    }
    window.setTimeout(() => setIgnoreBeat(1), 400);
    window.setTimeout(() => setIgnoreBeat(2), 900);
    window.setTimeout(() => persist(chosen), 2200);
  }

  const shareBody = `MY COUNCIL EXPOSED ME

Decision: ${decision}
Council: ${result.verdict} (${result.confidence}%)
Me: ${action === "ignored" ? "IGNORED" : "ACCEPTED"}
Pattern: ${patternLine()}

What would your Council say?`;

  function patternLine() {
    const p = patternFromRecords(memory, insights);
    if (/permission|already chosen|already decided/i.test(truth)) {
      return "I keep asking for permission after I've already decided.";
    }
    return p;
  }

  async function copyText(kind: "result" | "share") {
    const resultText = `MY COUNCIL EXPOSED ME

Decision: ${decision}
Verdict: ${result.verdict}
My choice: ${action === "ignored" ? "IGNORED" : "ACCEPTED"}
Confidence: ${result.confidence}%

Uncomfortable truth:
${truth}

What would your Council say?`;
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
      /* user cancelled */
    }
  }

  const shown = turns.slice(0, visibleTurns);
  const active = shown[shown.length - 1];
  const allShown = visibleTurns >= turns.length && turns.length > 0;
  const cue = memoryCue(insights);
  const landCue = landingMemoryLine(insights);
  const disagreement = biggestDisagreement(priorities, result);
  const pattern = patternFromRecords(memory, insights);
  const nextIgnored = insights.ignoredCount + 1;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 pb-24 pt-10">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">THE COUNCIL OF YOU</p>
          <h1 className="mt-2 font-serif text-4xl leading-none md:text-5xl">Five versions of you. One decision.</h1>
          <p className="mt-3 max-w-lg text-[#9a9488]">They'll argue. They'll vote. And they'll remember when you ignore them.</p>
        </div>
        {landCue && stage === "input" && (
          <div className="rounded-full border border-[#c9a86a]/40 px-3 py-1 text-[10px] tracking-[0.16em] text-[#c9a86a]">
            {landCue}
          </div>
        )}
      </header>

      {stage === "input" && (
        <section className="fade-up space-y-8">
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
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={convene} className="rounded-full bg-[#ece6d8] px-6 py-3 font-medium text-[#08090d]">
              CONVENE THE COUNCIL
            </button>
            <button type="button" onClick={startDemo} className="rounded-full border border-[#c9a86a] px-6 py-3 text-[#c9a86a]">
              TRY A DEMO
            </button>
          </div>
        </section>
      )}

      {stage === "debate" && (
        <section className="fade-up">
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="font-serif text-2xl italic text-[#c9a86a]">{decision}</p>
            <p className="shrink-0 text-[11px] tracking-[0.18em] text-[#9a9488]">
              ARGUMENT {Math.max(visibleTurns, 1)} / {turns.length}
            </p>
          </div>
          {cue && <p className="mb-6 text-[11px] tracking-[0.22em] text-[#e07a5f]">{cue}</p>}
          <div className="mb-5 flex flex-wrap gap-2">
            {PERSONAS.map((p) => (
              <span
                key={p.id}
                className={`rounded-full border px-2.5 py-1 text-[11px] tracking-[0.12em] ${active?.speaker === p.id ? "speaker-ring border-[#c9a86a] text-[#ece6d8]" : "border-white/10 text-[#9a9488]"}`}
              >
                {p.name}
              </span>
            ))}
          </div>
          <div className="grid gap-3">
            {shown.map((turn, i) => (
              <DebateBubble key={i} turn={turn} active={i === shown.length - 1} />
            ))}
            {thinking && !allShown && (
              <p className="pl-4 text-[11px] tracking-[0.2em] text-[#9a9488]">thinking…</p>
            )}
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
          <button type="button" onClick={() => setStage("verdict")} className="w-full rounded-full bg-[#ece6d8] py-3 font-medium text-[#08090d]">
            Hear the verdict
          </button>
        </section>
      )}

      {stage === "verdict" && (
        <section className="fade-up text-center">
          <p className="text-xs tracking-[0.28em] text-[#c9a86a]">COUNCIL VERDICT</p>
          <h2 className="mt-4 font-serif text-5xl">{result.verdict}</h2>
          <p className="mt-3 text-[#c9a86a]">Confidence: {result.confidence}%</p>
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 p-5 text-left">
            <p className="text-[11px] tracking-[0.22em] text-[#e07a5f]">THE UNCOMFORTABLE TRUTH</p>
            <p className="mt-3 font-serif text-2xl leading-snug">{truth}</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => choose("accepted")} className="rounded-full bg-[#ece6d8] px-6 py-3 font-medium text-[#08090d]">
              Accept
            </button>
            <button type="button" onClick={() => choose("ignored")} className="rounded-full border border-[#e07a5f]/50 px-6 py-3 text-[#e07a5f]">
              Ignore
            </button>
          </div>
        </section>
      )}

      {stage === "consequence" && action && (
        <section className={`fade-up py-16 text-center ${action === "ignored" ? "warn-pulse" : ""}`}>
          <p className="text-xs tracking-[0.28em] text-[#c9a86a]">
            {action === "accepted" ? "VERDICT ACCEPTED." : "DECISION IGNORED."}
          </p>
          {action === "accepted" ? (
            <p className="mt-6 font-serif text-3xl text-[#9a9488]">Noted.</p>
          ) : (
            <>
              {ignoreBeat >= 1 && <p className="mt-6 font-serif text-3xl">The Council will remember this.</p>}
              {ignoreBeat >= 2 && (
                <p className="mt-4 text-sm tracking-[0.16em] text-[#e07a5f]">
                  {insights.ignoredCount >= 1 ? `That's ${nextIgnored}.` : `Ignored verdicts: ${nextIgnored}`}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {stage === "receipt" && action && (
        <section className="fade-up rounded-3xl border border-[#c9a86a]/50 bg-black/55 p-6 md:p-8">
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">MY COUNCIL EXPOSED ME</p>
          <p className="mt-3 font-serif text-3xl leading-tight md:text-4xl">{decision}</p>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-white/10 py-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Council Verdict</p>
              <p className="mt-1 text-lg tracking-[0.12em]">{result.verdict}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">My Choice</p>
              <p className={`mt-1 text-lg tracking-[0.12em] ${action === "ignored" ? "text-[#e07a5f]" : ""}`}>
                {action === "ignored" ? "IGNORED" : "ACCEPTED"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Confidence</p>
              <p className="mt-1 text-lg">{result.confidence}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Most Persuasive</p>
              <p className="mt-1 text-lg">{personaName(persuasive)}</p>
            </div>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Biggest Disagreement</p>
          <p className="mt-1 font-serif text-xl">{disagreement}</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Pattern Detected</p>
          <p className="mt-1 text-sm">{pattern}</p>
          <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-[#e07a5f]">The Uncomfortable Truth</p>
          <p className="mt-2 font-serif text-2xl leading-snug">{truth}</p>
          <p className="mt-6 text-center text-[11px] tracking-[0.22em] text-[#c9a86a]">WHAT WOULD YOUR COUNCIL SAY?</p>
          <p className="mt-1 text-center text-[10px] tracking-[0.28em] text-[#9a9488]">THE COUNCIL OF YOU</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => copyText("result")} className="flex-1 rounded-full bg-[#ece6d8] py-3 text-sm font-medium text-[#08090d]">
              {copied === "result" ? "COPIED ✓" : "COPY RESULT"}
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
                setCopied(null);
              }}
              className="w-full rounded-full border border-white/15 py-3"
            >
              NEW DECISION
            </button>
          </div>
          {toast && <p className="mt-3 text-center text-[11px] tracking-[0.18em] text-[#c9a86a]">Copied to clipboard</p>}
        </section>
      )}
    </div>
  );
}

function DebateBubble({ turn, active }: { turn: DebateTurn; active: boolean }) {
  const p = PERSONAS.find((x) => x.id === turn.speaker)!;
  return (
    <article
      className={`fade-up rounded-2xl border p-4 transition ${turn.replyTo ? "ml-4 md:ml-8" : ""} ${
        active ? "speaker-ring border-[#c9a86a] bg-white/8" : "border-white/10 bg-white/4 opacity-70"
      }`}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold" style={{ background: p.color + "33", color: p.color }}>
          {p.mark}
        </span>
        <strong>{p.name}</strong>
        {turn.replyTo && (
          <span className="ml-auto text-[10px] tracking-[0.14em] text-[#9a9488]">→ {personaName(turn.replyTo)}</span>
        )}
      </div>
      <p className="font-serif text-xl leading-snug text-[#ece6d8]">{turn.text}</p>
    </article>
  );
}
