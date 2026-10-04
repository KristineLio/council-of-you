import { useEffect, useMemo, useState } from "react";
import {
  DEMO_DECISION,
  PERSONAS,
  PRIORITIES,
  debateFor,
  ignoredCount,
  loadMemory,
  saveMemory,
  tally,
  votesFor,
  type MemoryRecord,
  type UserAction,
} from "./council";

type Stage = "input" | "debate" | "vote" | "verdict" | "receipt";

export default function App() {
  const [stage, setStage] = useState<Stage>("input");
  const [decision, setDecision] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [risk, setRisk] = useState(48);
  const [isDemo, setIsDemo] = useState(false);
  const [speaker, setSpeaker] = useState(0);
  const [memory, setMemory] = useState<MemoryRecord[]>([]);
  const [action, setAction] = useState<UserAction | null>(null);

  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  useEffect(() => {
    if (stage !== "debate") return;
    const t = setInterval(() => setSpeaker((n) => (n + 1) % PERSONAS.length), 2200);
    return () => clearInterval(t);
  }, [stage]);

  const lines = useMemo(() => debateFor(decision, isDemo), [decision, isDemo]);
  const votes = useMemo(() => votesFor(decision, risk, priorities, isDemo), [decision, risk, priorities, isDemo]);
  const result = useMemo(() => tally(votes), [votes]);
  const ignored = ignoredCount(memory);

  function togglePriority(p: string) {
    setPriorities((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function startDemo() {
    setIsDemo(true);
    setDecision(DEMO_DECISION);
    setPriorities(["Ambition", "Rest"]);
    setRisk(62);
    setSpeaker(0);
    setAction(null);
    setStage("debate");
  }

  function convene() {
    if (!decision.trim()) return;
    setIsDemo(false);
    setSpeaker(0);
    setAction(null);
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
    };
    const next = [rec, ...memory].slice(0, 40);
    setMemory(next);
    saveMemory(next);
    setAction(chosen);
    setStage("receipt");
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 pb-24 pt-10">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">THE COUNCIL OF YOU</p>
          <h1 className="mt-2 font-serif text-4xl leading-none md:text-5xl">Five versions of you.</h1>
          <p className="mt-2 max-w-md text-[#9a9488]">One decision. They remember what you ignore.</p>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#c9a86a]">
          Ignored: {ignored}
        </div>
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
              Convene the Council
            </button>
            <button type="button" onClick={startDemo} className="rounded-full border border-[#c9a86a] px-6 py-3 text-[#c9a86a]">
              TRY A DEMO
            </button>
          </div>
        </section>
      )}

      {stage === "debate" && (
        <section className="fade-up">
          <p className="mb-6 font-serif text-2xl italic text-[#c9a86a]">{decision}</p>
          <div className="grid gap-3">
            {PERSONAS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSpeaker(i)}
                className={`rounded-2xl border p-4 text-left transition ${speaker === i ? "speaker-ring border-[#c9a86a] bg-white/8" : "border-white/10 bg-white/4"}`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold" style={{ background: p.color + "33", color: p.color }}>{p.mark}</span>
                  <strong>{p.name}</strong>
                  {speaker === i && <span className="ml-auto text-[10px] tracking-[0.2em] text-[#c9a86a]">SPEAKING</span>}
                </div>
                <p className="font-serif text-xl leading-snug text-[#ece6d8]">{lines[p.id]}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStage("vote")} className="mt-8 w-full rounded-full bg-[#ece6d8] py-3 font-medium text-[#08090d]">
            Call the vote
          </button>
        </section>
      )}

      {stage === "vote" && (
        <section className="fade-up space-y-5">
          <h2 className="font-serif text-4xl">The vote</h2>
          {PERSONAS.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span>{p.name}</span>
              <span className="uppercase tracking-[0.16em] text-[#c9a86a]">{votes[p.id]}</span>
            </div>
          ))}
          <p className="text-sm text-[#9a9488]">{result.yes} yes · {result.no} no · {result.abstain} abstain</p>
          <button type="button" onClick={() => setStage("verdict")} className="w-full rounded-full bg-[#ece6d8] py-3 font-medium text-[#08090d]">
            Hear the verdict
          </button>
        </section>
      )}

      {stage === "verdict" && (
        <section className="fade-up text-center">
          <p className="text-xs tracking-[0.28em] text-[#c9a86a]">VERDICT</p>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">{result.verdict}</h2>
          <p className="mx-auto mt-4 max-w-md text-[#9a9488]">Accept it, or ignore it. Either way, it is written down.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => persist("accepted")} className="rounded-full bg-[#ece6d8] px-6 py-3 font-medium text-[#08090d]">Accept</button>
            <button type="button" onClick={() => persist("ignored")} className="rounded-full border border-white/20 px-6 py-3">Ignore</button>
          </div>
        </section>
      )}

      {stage === "receipt" && action && (
        <section className="fade-up rounded-3xl border border-[#c9a86a]/40 bg-black/40 p-8">
          <p className="text-[11px] tracking-[0.28em] text-[#c9a86a]">DECISION RECEIPT</p>
          <h2 className="mt-3 font-serif text-3xl">{decision}</h2>
          <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-[#9a9488]">Priorities</dt>
            <dd>{priorities.join(", ") || "None named"}</dd>
            <dt className="text-[#9a9488]">Risk</dt>
            <dd>{risk}</dd>
            <dt className="text-[#9a9488]">Verdict</dt>
            <dd>{result.verdict}</dd>
            <dt className="text-[#9a9488]">You</dt>
            <dd className="uppercase tracking-[0.12em]">{action}</dd>
            <dt className="text-[#9a9488]">Ignored to date</dt>
            <dd>{ignoredCount(memory)}</dd>
          </dl>
          <button type="button" onClick={() => { setStage("input"); setDecision(""); setPriorities([]); setIsDemo(false); setAction(null); }} className="mt-8 w-full rounded-full border border-white/15 py-3">
            Another decision
          </button>
        </section>
      )}
    </div>
  );
}
