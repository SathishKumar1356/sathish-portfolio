import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import AvatarStage from "./Avatar3D.jsx";

const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

/* ---------- text helpers ---------- */
function speakable(text) {
  return text
    .replace(/OutSystems/g, "Out Systems")
    .replace(/\bODC\b/g, "O D C")
    .replace(/\bKYC\b/g, "K Y C")
    .replace(/\bOIA\b/g, "O I A")
    .replace(/UiPath/g, "You I Path")
    .replace(/\.NET/g, "dot net")
    .replace(/\bSQL\b/g, "S Q L")
    .replace(/\bAPIs\b/g, "A P Is")
    .replace(/\bAPI\b/g, "A P I")
    .replace(/\bAI\b/g, "A I")
    .replace(/\s[—–]\s/g, ", ")
    .replace(/&/g, " and ")
    .replace(/\//g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}
const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const ensurePeriod = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : s.trim() + ".");
const listJoin = (items) =>
  items.length <= 1 ? items.join("") : items.slice(0, -1).join(", ") + " and " + items[items.length - 1];

function projectItems(p) {
  const out = [
    { text: `Sure, let me tell you about ${p.name}.`, kind: "both" },
    { text: `${p.name}. ${ensurePeriod(p.tagline)}`, kind: "right" },
    { text: ensurePeriod(p.description), kind: "both" },
  ];
  p.work.forEach((w, i) =>
    out.push({ text: `${i === 0 ? "On this project, " : ""}I ${lcFirst(ensurePeriod(w))}`, kind: i % 2 ? "left" : "right" })
  );
  out.push({ text: `The key technologies here were ${listJoin(p.tech)}.`, kind: "both" });
  return out;
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

/* ---------- scripted lines ---------- */
function introItems() {
  return [
    { text: "Hi there, and welcome to my portfolio!", kind: "both", wave: true },
    { text: "I'm Sathish Kumar, an OutSystems Technical Lead with over six years of experience building enterprise web and mobile applications.", kind: "both" },
    { text: "I deliver OutSystems Developer Cloud solutions, integrate external platforms, and build AI-powered products.", kind: "right" },
    { text: "Scroll down and I'll walk you through the highlights.", kind: "point" },
  ];
}
function sectionItems(id, certCount) {
  switch (id) {
    case "projects":
      return [
        { text: "These are the projects I've worked on.", kind: "point" },
        { text: "Pick a category to explore, then open any card and ask me to explain it.", kind: "point" },
      ];
    case "expertise":
      return [{ text: "Here's my expertise: the platform, integrations, security and AI work I do every day.", kind: "both" }];
    case "certifications":
      return [
        { text: `I hold ${certCount} certifications, including Technical Lead, Architecture Specialist and Security Specialist.`, kind: "right" },
      ];
    case "contact":
      return [
        { text: "Thanks for scrolling all the way down!", kind: "both", wave: true },
        { text: "If you'd like to work together, let's connect.", kind: "both" },
      ];
    default:
      return [];
  }
}
const SECTION_IDS = ["projects", "expertise", "certifications", "contact"];

/* ---------- component ---------- */
export default function AvatarGuide({ projects, certifications, overlayOpen }) {
  const ctrl = useRef({
    speaking: false, word: "", wordStart: 0, wordDur: 300, lastBoundary: 0, beat: 0,
    kind: "both", waveUntil: 0, zoom: 0, look: { x: 0, y: 0 },
  });
  const rootRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [caption, setCaption] = useState("");
  const [bubble, setBubble] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(!synth);
  const [minimized, setMinimized] = useState(false);
  const [voice, setVoice] = useState(null);
  const [needsTap, setNeedsTap] = useState(false);

  const eng = useRef({ run: 0, queue: [], idx: 0, timer: null, watch: null, hide: null, busy: false, mode: "intro" });
  const opts = useRef({ muted, voice });
  opts.current.voice = voice;
  const autoMuted = useRef(false);
  const introDone = useRef(false);
  const seen = useRef(new Set());
  const pending = useRef(null);
  const started = useRef(false);

  /* voices */
  useEffect(() => {
    if (!synth) return undefined;
    const load = () => setVoice(pickVoice(synth.getVoices()));
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  /* scroll: avatar shrinks from the big hero pose to a docked corner pose */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const small = window.innerWidth < 760;
      const t = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.6)));
      const p = small ? 1 : t * t * (3 - 2 * t);
      rootRef.current?.style.setProperty("--p", p.toFixed(3));
      ctrl.current.zoom = p;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const hardStop = useCallback(() => {
    const e = eng.current;
    e.run += 1;
    window.clearTimeout(e.timer);
    window.clearTimeout(e.watch);
    if (synth) synth.cancel();
    ctrl.current.speaking = false;
    setSpeaking(false);
  }, []);
  useEffect(() => () => hardStop(), [hardStop]);

  const scheduleHide = useCallback(() => {
    window.clearTimeout(eng.current.hide);
    eng.current.hide = window.setTimeout(() => setBubble(false), 4200);
  }, []);

  const speakAtRef = useRef(null);

  const finishQueue = useCallback(() => {
    const e = eng.current;
    ctrl.current.speaking = false;
    setSpeaking(false);
    e.busy = false;
    if (e.mode === "intro") introDone.current = true;
    scheduleHide();
    if (pending.current && !seen.current.has(pending.current)) {
      const id = pending.current;
      pending.current = null;
      window.setTimeout(() => runSectionRef.current(id), 700);
    }
  }, [scheduleHide]);

  const speakAt = useCallback(
    (i, run) => {
      const e = eng.current;
      if (run !== e.run) return;
      if (i >= e.queue.length) {
        finishQueue();
        return;
      }
      e.idx = i;
      const item = e.queue[i];
      const c = ctrl.current;
      c.kind = item.kind || "both";
      if (item.wave) c.waveUntil = performance.now() + 2800;
      c.word = "";
      c.lastBoundary = 0;
      window.clearTimeout(e.hide);
      setCaption(item.text);
      setBubble(true);

      const spoken = speakable(item.text);
      const next = () => {
        if (run !== e.run) return;
        c.speaking = false;
        setSpeaking(false);
        window.clearTimeout(e.watch);
        e.timer = window.setTimeout(() => speakAtRef.current(i + 1, run), 320);
      };

      const captionsOnly = () => {
        c.speaking = true;
        setSpeaking(true);
        const words = spoken.split(/\s+/).length;
        e.timer = window.setTimeout(next, Math.max(1500, (words * 60000) / 165));
      };

      if (opts.current.muted || !synth) {
        captionsOnly();
        return;
      }

      const blocked = () => {
        // the browser refused to speak before any click: fall back to captions, ask for a tap
        autoMuted.current = true;
        opts.current.muted = true;
        setMuted(true);
        setNeedsTap(true);
        if (synth) synth.cancel();
        speakAtRef.current(i, run);
      };

      const u = new SpeechSynthesisUtterance(spoken);
      const v = opts.current.voice;
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else u.lang = "en-US";
      u.rate = 0.97;
      let began = false;
      u.onstart = () => {
        began = true;
        window.clearTimeout(e.watch);
        if (run === e.run) {
          c.speaking = true;
          setSpeaking(true);
        }
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
        if (ev.error === "not-allowed") return blocked();
        next();
      };
      // some browsers swallow speech silently before a click: detect and fall back
      e.watch = window.setTimeout(() => {
        if (!began && run === e.run) blocked();
      }, 1800);
      try {
        synth.speak(u);
      } catch (_) {
        next();
      }
    },
    [finishQueue]
  );
  speakAtRef.current = speakAt;

  const play = useCallback(
    (items, mode) => {
      hardStop();
      const e = eng.current;
      e.queue = items;
      e.mode = mode;
      e.busy = true;
      e.run += 1;
      const run = e.run;
      e.timer = window.setTimeout(() => speakAt(0, run), 150);
    },
    [hardStop, speakAt]
  );

  function runSection(id) {
    const e = eng.current;
    if (seen.current.has(id) || minimized) return;
    if (!introDone.current || e.busy) {
      pending.current = id;
      return;
    }
    seen.current.add(id);
    const items = sectionItems(id, certifications.length);
    if (items.length) play(items, "scroll");
  }
  const runSectionRef = useRef(runSection);
  runSectionRef.current = runSection;

  /* intro: starts once the 3D model is on screen */
  useEffect(() => {
    if (!ready) return undefined;
    const t = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      ctrl.current.waveUntil = performance.now() + 2600;
      play(introItems(), "intro");
    }, 1400);
    return () => window.clearTimeout(t);
  }, [ready, play]);
  // safety: if the model never reports ready, still show the guide
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 9000);
    return () => window.clearTimeout(t);
  }, []);

  /* section triggers while scrolling */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && en.intersectionRatio >= 0.35) runSectionRef.current(en.target.id);
        });
      },
      { threshold: [0.35, 0.6] }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  /* the first click/tap lets the browser speak: switch voice on if it was blocked */
  useEffect(() => {
    const unlock = () => {
      if (autoMuted.current) {
        autoMuted.current = false;
        opts.current.muted = false;
        setMuted(false);
        setNeedsTap(false);
        const e = eng.current;
        if (e.busy) {
          hardStop();
          e.run += 1;
          const run = e.run;
          e.timer = window.setTimeout(() => speakAtRef.current(e.idx, run), 150);
        }
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [hardStop]);

  /* "Ask Sathish to explain" from a project modal */
  useEffect(() => {
    function onExplain(ev) {
      const p = projects.find((x) => x.name === ev.detail?.name);
      if (!p) return;
      setMinimized(false);
      play(projectItems(p), "project");
    }
    window.addEventListener("avatar:explain", onExplain);
    return () => window.removeEventListener("avatar:explain", onExplain);
  }, [projects, play]);

  const toggleMute = () => {
    const next = !opts.current.muted;
    autoMuted.current = false;
    opts.current.muted = next;
    setMuted(next);
    setNeedsTap(false);
    const e = eng.current;
    if (e.busy) {
      hardStop();
      e.run += 1;
      const run = e.run;
      e.timer = window.setTimeout(() => speakAtRef.current(e.idx, run), 150);
    }
  };
  const replay = () => {
    seen.current = new Set();
    introDone.current = false;
    pending.current = null;
    ctrl.current.waveUntil = performance.now() + 2600;
    play(introItems(), "intro");
  };
  const hide = () => {
    hardStop();
    eng.current.busy = false;
    introDone.current = true;
    setBubble(false);
    setMinimized(true);
  };

  const node = (
    <div className={`avatar-overlay ${ready ? "is-ready" : ""} ${minimized ? "is-min" : ""} ${overlayOpen ? "over-modal" : ""}`} ref={rootRef}>
      {!minimized && (
        <>
          <div className="avatar-enter">
            <div className="avatar-stage" aria-hidden="true">
              <AvatarStage ctrl={ctrl} active={!minimized} onReady={() => setReady(true)} />
            </div>
          </div>

          <div className={`avatar-bubble ${bubble ? "show" : ""}`} role="status" aria-live="polite">
            <div className="avatar-bubble-head">
              <span className={`avatar-bubble-dot ${speaking ? "live" : ""}`} />
              <strong>Sathish</strong>
              <span className="avatar-bubble-tag"><Sparkles size={11} /> 3D guide</span>
            </div>
            <p>{caption}</p>
            {needsTap && <span className="avatar-tap">Click anywhere to hear me speak</span>}
          </div>

          <div className="avatar-tools">
            <button type="button" onClick={replay} aria-label="Replay introduction" title="Replay introduction"><RotateCcw size={15} /></button>
            <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Turn voice on" : "Captions only"} title={muted ? "Voice off - captions only" : "Voice on"} disabled={!synth}>
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button type="button" onClick={hide} aria-label="Hide guide" title="Hide guide"><X size={15} /></button>
          </div>
        </>
      )}
      {minimized && (
        <button type="button" className="avatar-show" onClick={() => { setMinimized(false); ctrl.current.waveUntil = performance.now() + 2200; }}>
          <Sparkles size={14} /> Show guide
        </button>
      )}
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(node, document.body);
}
