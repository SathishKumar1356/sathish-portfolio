import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import AvatarStage from "./Avatar3D.jsx";

const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

/* ---------- text helpers ---------- */

// Make text friendlier for text-to-speech engines.
function speakable(text) {
  return text
    .replace(/OutSystems/g, "Out Systems")
    .replace(/\bODC\b/g, "O D C")
    .replace(/\bKYC\b/g, "K Y C")
    .replace(/\bOIA\b/g, "O I A")
    .replace(/\bGAMI\b/g, "Gami")
    .replace(/\bUCIC\b/g, "U C I C")
    .replace(/\bEET\b/g, "E E T")
    .replace(/\bNST\b/g, "N S T")
    .replace(/UiPath/g, "You I Path")
    .replace(/\.NET/g, "dot net")
    .replace(/\bSQL\b/g, "S Q L")
    .replace(/\bAPIs\b/g, "A P Is")
    .replace(/\bAPI\b/g, "A P I")
    .replace(/\bSSO\b/g, "S S O")
    .replace(/\bAI\b/g, "A I")
    .replace(/\s[—–]\s/g, ", ")
    .replace(/&/g, " and ")
    .replace(/\//g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const ensurePeriod = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : s.trim() + ".");

function projectSentences(p) {
  const out = [
    { text: `${p.name}. ${ensurePeriod(p.tagline)}`, project: p.name },
    { text: ensurePeriod(p.description), project: p.name },
  ];
  p.work.forEach((w, i) => {
    out.push({ text: `${i === 0 ? "On this project, " : ""}I ${lcFirst(ensurePeriod(w))}`, project: p.name });
  });
  out.push({ text: `The key technologies here were ${listJoin(p.tech)}.`, project: p.name });
  return out;
}

function listJoin(items) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

const SEGMENT_LABELS = ["Intro", "Enterprise", "AI", "Integrations", "Mobile", "Maps", "Security", "Wrap-up"];

function buildTour(groups, certifications) {
  const segments = [];
  const intro = [
    "Hi there, and welcome to my portfolio!",
    "I'm Sathish Kumar, an OutSystems Technical Lead with over six years of experience building enterprise web and mobile applications.",
    "I deliver OutSystems Developer Cloud solutions, integrate external platforms, and explore AI-powered products.",
    `I hold ${certifications.length} certifications, including OutSystems Technical Lead, Architecture Specialist, Security Specialist and Agentic AI Specialist, along with Oracle and Red Hat credentials.`,
    "Let me walk you through the kinds of projects I've worked on.",
  ].map((text) => ({ text }));
  segments.push({ label: SEGMENT_LABELS[0], items: intro });

  const seen = new Set();
  groups.forEach((g, gi) => {
    if (!g.projects.length) return;
    // highlight projects that haven't been featured in an earlier group
    const featured = g.projects.filter((p) => !seen.has(p.name)).slice(0, 2);
    featured.forEach((p) => seen.add(p.name));
    const rest = g.projects.length - featured.length;
    const items = [
      {
        text: `${gi === 0 ? "First up" : "Next"}: ${g.category}. This group has ${g.projects.length} project${g.projects.length === 1 ? "" : "s"}${featured.length > 1 ? ", and here are a couple of highlights" : featured.length === 1 ? ", and here is the highlight" : ""}.`,
        category: g.category,
      },
    ];
    featured.forEach((p) => {
      items.push({ text: `${p.name}. ${ensurePeriod(p.tagline)}`, category: g.category, project: p.name });
      items.push({ text: ensurePeriod(p.description), category: g.category, project: p.name });
      items.push({ text: `On this one, I ${lcFirst(ensurePeriod(p.work[0]))}`, category: g.category, project: p.name });
    });
    if (rest > 0) {
      items.push({
        text: `There ${rest === 1 ? "is" : "are"} ${rest} more in this group. Open any project card and press "Ask Sathish to explain" to hear the full story.`,
        category: g.category,
      });
    }
    segments.push({ label: SEGMENT_LABELS[gi + 1] || g.category, items });
  });

  segments.push({
    label: SEGMENT_LABELS[SEGMENT_LABELS.length - 1],
    items: [
      { text: "That's a quick tour of my work. Thanks so much for visiting!" },
      { text: "If you'd like to talk about an opportunity or a project, press Let's connect and get in touch." },
    ],
  });

  // flatten with segment index
  const queue = [];
  const starts = [];
  segments.forEach((seg, si) => {
    starts.push(queue.length);
    seg.items.forEach((it) => queue.push({ ...it, seg: si }));
  });
  return { queue, starts, labels: segments.map((s) => s.label) };
}

function pickVoice(voices) {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  const score = (v) => {
    let sc = 0;
    if (/en[-_]IN/i.test(v.lang)) sc += 6;
    else if (/en[-_]GB/i.test(v.lang)) sc += 3;
    else if (/en[-_]US/i.test(v.lang)) sc += 2;
    if (/ravi|prabhat|rishi|guy|daniel|james|google uk english male|alex|fred|aaron|arthur|male/i.test(v.name)) sc += 4;
    if (/female|zira|samantha|susan|hazel|heera|neerja|aria|jenny/i.test(v.name)) sc -= 3;
    if (/natural|neural|online/i.test(v.name)) sc += 2;
    if (v.localService) sc += 1;
    return sc;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/* ---------- component ---------- */

export default function AvatarGuide({ groups, projects, certifications, overlayOpen, onShowCategory, onFocusProject }) {
  const tour = useMemo(() => buildTour(groups, certifications), [groups, certifications]);

  const ctrl = useRef({
    speaking: false,
    word: "",
    wordStart: 0,
    wordDur: 300,
    lastBoundary: 0,
    beat: 0,
    kind: "both",
    waveUntil: 0,
    look: { x: 0, y: 0 },
  });

  const [status, setStatus] = useState("idle"); // idle | playing | paused | done
  const [mode, setMode] = useState("tour"); // tour | project
  const [caption, setCaption] = useState("");
  const [cur, setCur] = useState({ seg: -1, idx: -1, label: "" });
  const [muted, setMuted] = useState(!synth);
  const [fast, setFast] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const [voice, setVoice] = useState(null);

  const eng = useRef({ run: 0, queue: [], idx: 0, timer: null, labels: [], starts: [], mode: "tour" });
  const opts = useRef({ muted, fast, voice });
  opts.current = { muted, fast, voice };
  const cbs = useRef({ onShowCategory, onFocusProject });
  cbs.current = { onShowCategory, onFocusProject };
  const lastCategory = useRef(null);
  const slotRef = useRef(null);

  /* voices */
  useEffect(() => {
    if (!synth) return undefined;
    const load = () => setVoice(pickVoice(synth.getVoices()));
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  /* is the hero card visible? */
  useEffect(() => {
    const el = slotRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* friendly wave when the page loads */
  useEffect(() => {
    const t = window.setTimeout(() => {
      ctrl.current.waveUntil = performance.now() + 3200;
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  const hardStop = useCallback(() => {
    const e = eng.current;
    e.run += 1;
    window.clearTimeout(e.timer);
    if (synth) synth.cancel();
    ctrl.current.speaking = false;
  }, []);

  useEffect(() => () => hardStop(), [hardStop]);

  const finish = useCallback(
    (completed) => {
      hardStop();
      cbs.current.onFocusProject?.(null);
      lastCategory.current = null;
      setCur({ seg: -1, idx: -1, label: "" });
      setStatus(completed ? "done" : "idle");
      if (!completed) setCaption("");
    },
    [hardStop]
  );

  const speakAt = useCallback(
    (i, run) => {
      const e = eng.current;
      if (run !== e.run) return;
      if (i >= e.queue.length) {
        ctrl.current.speaking = false;
        cbs.current.onFocusProject?.(null);
        setCaption(e.mode === "project" ? "Hope that helped — ask me about any other project!" : "Thanks for visiting! Press replay any time.");
        setCur({ seg: -1, idx: -1, label: "" });
        setStatus("done");
        return;
      }
      e.idx = i;
      const item = e.queue[i];
      const c = ctrl.current;
      c.kind = item.project ? (i % 3 === 0 ? "right" : i % 3 === 1 ? "both" : "left") : "both";
      c.word = "";
      c.lastBoundary = 0;
      setCaption(item.text);
      setCur({ seg: item.seg ?? -1, idx: i, label: e.labels[item.seg] || "" });

      if (item.category && item.category !== lastCategory.current) {
        lastCategory.current = item.category;
        cbs.current.onShowCategory?.(item.category);
      }
      cbs.current.onFocusProject?.(item.project || null);

      const spoken = speakable(item.text);
      const rate = opts.current.fast ? 1.2 : 1;
      const next = () => {
        if (run !== e.run) return;
        c.speaking = false;
        e.timer = window.setTimeout(() => speakAt(i + 1, run), 260);
      };

      if (opts.current.muted || !synth) {
        // captions-only mode: keep the avatar animated for a natural reading pace
        c.speaking = true;
        const words = spoken.split(/\s+/).length;
        e.timer = window.setTimeout(next, Math.max(1300, (words * 60000) / (170 * rate)));
        return;
      }

      const u = new SpeechSynthesisUtterance(spoken);
      const v = opts.current.voice;
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        u.lang = "en-US";
      }
      u.rate = rate * 0.97;
      u.pitch = 1;
      u.onstart = () => {
        if (run === e.run) c.speaking = true;
      };
      u.onboundary = (ev) => {
        if (run !== e.run) return;
        if (ev.name && ev.name !== "word") return;
        const m = /^[A-Za-z0-9'’-]+/.exec(spoken.slice(ev.charIndex));
        const w = m ? m[0] : "";
        if (!w) return;
        const now = performance.now();
        c.word = w;
        c.wordStart = now;
        c.wordDur = Math.max(140, ((ev.charLength || w.length) * 68) / u.rate);
        c.lastBoundary = now;
        c.beat += 1;
      };
      u.onend = next;
      u.onerror = (ev) => {
        if (run !== e.run) return;
        if (ev.error === "canceled" || ev.error === "interrupted") return;
        if (ev.error === "not-allowed") {
          // autoplay blocked: fall back to captions so the demo still works
          setMuted(true);
          opts.current.muted = true;
          speakAt(i, run);
          return;
        }
        next();
      };
      try {
        synth.speak(u);
      } catch (_) {
        next();
      }
    },
    []
  );

  const play = useCallback(
    (queue, startIdx, nextMode, labels = [], starts = []) => {
      hardStop();
      const e = eng.current;
      e.queue = queue;
      e.labels = labels;
      e.starts = starts;
      e.mode = nextMode;
      e.run += 1;
      lastCategory.current = null;
      setMode(nextMode);
      setStatus("playing");
      ctrl.current.waveUntil = nextMode === "tour" && startIdx === 0 ? performance.now() + 1800 : 0;
      const run = e.run;
      // small delay so the wave is visible before the first word
      e.timer = window.setTimeout(() => speakAt(startIdx, run), nextMode === "tour" && startIdx === 0 ? 900 : 120);
    },
    [hardStop, speakAt]
  );

  const startTour = useCallback(() => play(tour.queue, 0, "tour", tour.labels, tour.starts), [play, tour]);

  const explainProject = useCallback(
    (name) => {
      const p = projects.find((x) => x.name === name);
      if (!p) return;
      const items = projectSentences(p).map((it) => ({ ...it, seg: 0 }));
      items.unshift({ text: `Sure — let me tell you about ${p.name}.`, seg: 0, project: p.name });
      play(items, 0, "project", [p.name], [0]);
    },
    [play, projects]
  );

  useEffect(() => {
    function onExplain(ev) {
      if (ev.detail?.name) explainProject(ev.detail.name);
    }
    window.addEventListener("avatar:explain", onExplain);
    return () => window.removeEventListener("avatar:explain", onExplain);
  }, [explainProject]);

  // Restart narration at a given queue index (short delay: some browsers drop
  // speech if cancel() and speak() happen in the same tick).
  const startAt = (i) => {
    const e = eng.current;
    hardStop();
    e.run += 1;
    const run = e.run;
    setStatus("playing");
    e.timer = window.setTimeout(() => speakAt(i, run), 150);
  };
  const pause = () => {
    hardStop();
    setStatus("paused");
  };
  const resume = () => startAt(eng.current.idx);
  const jumpSegment = (dir) => {
    const e = eng.current;
    if (e.mode !== "tour") return;
    const segNow = e.queue[e.idx]?.seg ?? 0;
    const target = Math.min(e.starts.length - 1, Math.max(0, segNow + dir));
    startAt(e.starts[target]);
  };
  const jumpTo = (seg) => {
    const e = eng.current;
    if (status === "idle" || status === "done" || e.mode !== "tour") {
      play(tour.queue, tour.starts[seg] ?? 0, "tour", tour.labels, tour.starts);
      return;
    }
    startAt(e.starts[seg]);
  };

  const speaking = status === "playing";
  const active = status === "playing" || status === "paused";
  const dockVisible = active && (!heroInView || overlayOpen);

  const idleCaption = "Hi! I'm Sathish's 3D guide. Press start and I'll introduce him and walk you through the projects he's worked on.";
  const shown = caption || idleCaption;
  const progress = mode === "tour" && eng.current.queue.length ? Math.max(0, cur.idx) / eng.current.queue.length : 0;

  const controls = (compact) => (
    <div className={`guide-controls ${compact ? "compact" : ""}`}>
      {!active ? (
        <button type="button" className="avatar-play-button guide-primary" onClick={startTour}>
          <span className="avatar-play-icon">{status === "done" ? <RotateCcw size={10} /> : <Play size={10} />}</span>
          {status === "done" ? "Replay tour" : "Start guided tour"}
        </button>
      ) : (
        <>
          {mode === "tour" && (
            <button type="button" className="guide-icon-btn" onClick={() => jumpSegment(-1)} aria-label="Previous section">
              <ChevronLeft size={15} />
            </button>
          )}
          <button
            type="button"
            className="guide-icon-btn guide-icon-main"
            onClick={status === "paused" ? resume : pause}
            aria-label={status === "paused" ? "Resume" : "Pause"}
          >
            {status === "paused" ? <Play size={15} /> : <Pause size={15} />}
          </button>
          {mode === "tour" && (
            <button type="button" className="guide-icon-btn" onClick={() => jumpSegment(1)} aria-label="Next section">
              <ChevronRight size={15} />
            </button>
          )}
          <button type="button" className="guide-icon-btn" onClick={() => finish(false)} aria-label="Stop">
            <Square size={13} />
          </button>
        </>
      )}
      <button
        type="button"
        className={`guide-icon-btn ${fast ? "on" : ""}`}
        onClick={() => setFast((f) => !f)}
        aria-pressed={fast}
        aria-label="Faster speech"
        title="Speech speed"
      >
        <span className="guide-speed">{fast ? "1.2×" : "1×"}</span>
      </button>
      <button
        type="button"
        className={`guide-icon-btn ${muted ? "on" : ""}`}
        onClick={() => setMuted((m) => !m)}
        aria-pressed={muted}
        aria-label={muted ? "Turn voice on" : "Captions only (voice off)"}
        title={muted ? "Voice off — captions only" : "Voice on"}
        disabled={!synth}
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
    </div>
  );

  return (
    <>
      <div className="avatar-slot" ref={slotRef}>
        <aside className={`welcome-avatar guide-card ${speaking ? "is-speaking" : ""}`} aria-label="Interactive 3D avatar guide">
          <div className="guide-stage">
            <span className="guide-stage-glow" aria-hidden="true" />
            <AvatarStage ctrl={ctrl} active={heroInView} />
            <span className={`avatar-status-dot ${speaking ? "live" : ""}`} aria-label={speaking ? "Speaking" : "Ready"} />
          </div>

          <div className="guide-body">
            <div className="avatar-greeting-top">
              <span className="avatar-wave-icon" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </span>
              <div>
                <strong>Meet Sathish</strong>
                <small>
                  {speaking
                    ? mode === "project"
                      ? "Explaining a project…"
                      : "Walking you through my work…"
                    : status === "paused"
                    ? "Paused"
                    : "Your 3D portfolio guide"}
                </small>
              </div>
              <span className="avatar-ai-pill"><Sparkles size={12} /> 3D AI</span>
            </div>

            <p className="guide-caption" aria-live="polite">{shown}</p>

            {mode === "tour" && active && (
              <div className="guide-progress" role="group" aria-label="Tour sections">
                {tour.labels.map((label, i) => (
                  <button
                    key={label + i}
                    type="button"
                    className={`guide-step ${cur.seg === i ? "current" : ""} ${cur.seg > i ? "past" : ""}`}
                    onClick={() => jumpTo(i)}
                    title={label}
                    aria-label={`Jump to ${label}`}
                  />
                ))}
                <span className="guide-step-label">{cur.label}</span>
              </div>
            )}
            {mode === "project" && active && (
              <div className="guide-bar" aria-hidden="true"><span style={{ width: `${Math.round((Math.max(0, cur.idx) / Math.max(1, eng.current.queue.length)) * 100)}%` }} /></div>
            )}

            {controls(false)}
            <small className="avatar-audio-note">
              {muted
                ? "Voice is off — the avatar reads along with captions."
                : voice
                ? "Tip: move your mouse — the avatar follows it."
                : "Voice loading… you can switch to captions-only any time."}
            </small>
          </div>
        </aside>
      </div>

      {dockVisible &&
        createPortal(
          <div className={`guide-dock ${speaking ? "is-speaking" : ""}`} role="region" aria-label="Avatar guide">
            <div className="guide-dock-stage">
              <AvatarStage ctrl={ctrl} active />
            </div>
            <div className="guide-dock-body">
              <div className="guide-dock-head">
                <strong>Sathish</strong>
                <span>{speaking ? (mode === "project" ? "explaining" : "touring") : "paused"}</span>
                <button type="button" className="guide-dock-close" onClick={() => finish(false)} aria-label="Close guide">
                  <X size={14} />
                </button>
              </div>
              <p className="guide-caption">{shown}</p>
              {controls(true)}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
