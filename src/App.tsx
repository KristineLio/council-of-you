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
  const [memory, setMemory] = useState<MemoryRecord[]>([]);
  const [action, setAction] = useState<UserAction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  const insights = useMemo(() => deriveInsights(memory), [memory]);
  const turns = useMemo(
    () => debateTurns(decision, isDemo, memory, priorities, risk),
    [decision, isDemo, memory, priorities, risk],
  );
  const votes = useMemo(() => votesFor(decision, risk, priorities, isDemo), [decision, risk, priorities, isDemo]);
  const result = useMemo(() => tally(votes), [votes]);
  const truth = useMemo(
    () => uncomfortableTruth({ isDemo, priorities, risk, insights, winner: result.winner }),
    [isDemo, priorities, risk, insights, result.winner],
  );

  useEffect(() => {
    if (stage !== "debate") return;
    setVisibleTurns(0);
    const first = window.setTimeout(() => setVisibleTurns(1), 500);
    return () => window.clearTimeout(first);
  }, [stage, turns]);

  useEffect(() => {
    if (stage !== "debate") return;
    if (visibleTurns === 0 || visibleTurns >= turns.length) return;
    const t = window.setTimeout(() => setVisibleTurns((n) => Math.min(n + 1, turns.length)), 1600);
    return () => window.clearTimeout(t);
  }, [stage, visibleTurns, turns.length]);

  function togglePriority(p: string) {
    setPriorities((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function startDemo() {
    setIsDemo(true);
    setDecision(DEMO_DECISION);
    setPriorities(["Ambition", "Rest"]);
    setRisk(62);
    setAction(null);
    setCopied(false);
    setStage("debate");
  }

  function convene() {
    if (!decision.trim()) return;
    setIsDemo(false);
    setAction(null);
    setCopied(false);
    setStage("debate");
  }

  function choose(chosen: UserAction) {
    setAction(chosen);
    setStage("consequence");
    window.setTimeout(() => {
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
    }, 800);
  }

  async function copyResult() {
    const text = `MY COUNCIL EXPOSED ME

Decision: ${decision}
Verdict: ${result.verdict}
My choice: ${action === "ignored" ? "IGNORED" : "ACCEPTED"}
Confidence: ${result.confidence}%

Uncomfortable truth:
${truth}

What would your Council say?`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const shown = turns.slice(0, visibleTurns);
  const active = shown[shown.length - 1];
  const allShown = visibleTurns >= turns.length && turns.length > 0;
  const cue = memoryCue(insights);
  const landCue = landingMemoryLine(insights);
  const persuasive = mostPersuasive(votes, result.winner);
  const disagreement = biggestDisagreement(priorities, result);
  const pattern = patternFromRecords(memory, insights);

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
            <span className="text-xs uppercase tracking-[0.18em] text-[#9a9488]">Risk tolerance — {risk}</span>
            <input type="range" min={0} max={100} value={risk} onChange={(e) => setRisk(Number(e.target.value))} className="mt-3 w-full accent-[#c9a86a]" />
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
          <p className="mb-4 font-serif text-2xl italic text-[#c9a86a]">{decision}</p>
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
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {!allShown && (
              <button type="button" onClick={() => { setVisibleTurns(turns.length); setStage("vote"); }} className="rounded-full border border-white/20 px-6 py-3 text-sm tracking-[0.16em]">
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
            <button type="button" onClick={() => choose("accepted")} className="rounded-full bg-[#ece6d8] px-6 py-3 font-medium text-[#08090d]">Accept</button>
            <button type="button" onClick={() => choose("ignored")} className="rounded-full border border-[#e07a5f]/50 px-6 py-3 text-[#e07a5f]">Ignore</button>
          </div>
        </section>
      )}

      {stage === "consequence" && action && (
        <section className={`fade-up text-center ${action === "ignored" ? "warn-pulse" : ""}`}>
          <p className="text-xs tracking-[0.28em] text-[#c9a86a]">{action === "accepted" ? "VERDICT ACCEPTED." : "DECISION IGNORED."}</p>
          <p className="mt-6 font-serif text-3xl">
            {action === "accepted" ? "The Council will remember that you listened." : "The Council will remember this."}
          </p>
        </section>
      )}

      {stage === "receipt" && action && (
        <section className="fade-up rounded-3xl border border-[#c9a86a]/50 bg-black/50 p-8">
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">MY COUNCIL EXPOSED ME</p>
          <div className="mt-6 space-y-5 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Decision</p>
              <p className="mt-1 font-serif text-2xl">{decision}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Council Verdict</p>
                <p className="mt-1 text-lg tracking-[0.12em]">{result.verdict}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">My Choice</p>
                <p className={`mt-1 text-lg tracking-[0.12em] ${action === "ignored" ? "text-[#e07a5f]" : ""}`}>{action === "ignored" ? "IGNORED" : "ACCEPTED"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Council Confidence</p>
                <p className="mt-1 text-lg">{result.confidence}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Most Persuasive</p>
                <p className="mt-1 text-lg">{personaName(persuasive)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Biggest Disagreement</p>
              <p className="mt-1 font-serif text-xl">{disagreement}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a9488]">Pattern Detected</p>
              <p className="mt-1">{pattern}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#e07a5f]">Uncomfortable Truth</p>
              <p className="mt-1 font-serif text-2xl leading-snug">{truth}</p>
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] tracking-[0.22em] text-[#c9a86a]">WHAT WOULD YOUR COUNCIL SAY?</p>
          <p className="mt-2 text-center text-[10px] tracking-[0.28em] text-[#9a9488]">THE COUNCIL OF YOU</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={copyResult} className="flex-1 rounded-full bg-[#ece6d8] py-3 font-medium text-[#08090d]">
              {copied ? "COPIED" : "COPY RESULT"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("input");
                setDecision("");
                setPriorities([]);
                setIsDemo(false);
                setAction(null);
                setCopied(false);
              }}
              className="flex-1 rounded-full border border-white/15 py-3"
            >
              NEW DECISION
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function DebateBubble({ turn, active }: { turn: DebateTurn; active: boolean }) {
  const p = PERSONAS.find((x) => x.id === turn.speaker)!;
  return (
    <article className={`fade-up rounded-2xl border p-4 ${active ? "speaker-ring border-[#c9a86a] bg-white/8" : "border-white/10 bg-white/4"}`}>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold" style={{ background: p.color + "33", color: p.color }}>
          {p.mark}
        </span>
        <strong>{p.name}</strong>
        {turn.replyTo && (
          <span className="ml-auto text-[10px] tracking-[0.14em] text-[#9a9488]">replying to {personaName(turn.replyTo)}</span>
        )}
      </div>
      <p className="font-serif text-xl leading-snug text-[#ece6d8]">{turn.text}</p>
    </article>
  );
}

