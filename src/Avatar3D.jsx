import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/*
 * GLB-based 3D avatar.
 * Drop any rigged/static character at  public/avatar.glb  and it is loaded, auto-fitted and animated:
 *   • face morph targets (ARKit "jawOpen/mouthFunnel/eyeBlink*" or Ready-Player-Me style "viseme_*") -> real lip-sync
 *   • otherwise a jaw bone, otherwise body motion only
 *   • animation clips inside the GLB (idle / talk / wave) are played automatically
 *   • head follows the cursor, gentle breathing, nods on every spoken word
 * If /avatar.glb is missing or WebGL is unavailable, the static image is shown instead.
 *
 * Shared `ctrl` ref (written by AvatarGuide.jsx):
 *   speaking, word, wordStart, wordDur, lastBoundary, beat, kind ('both'|'right'|'left'|'point'), waveUntil, zoom (0 = full body, 1 = upper body), look {x,y}
 */

const MODEL_URL = "/avatar.glb";
const FALLBACK_IMG = "/ai-avatar.webp";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = THREE.MathUtils.damp;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _qm = new THREE.Quaternion();

// Rotate `bone` so that the direction bone -> child points along world-space `dir`.
function aimBone(bone, child, dir) {
  bone.updateWorldMatrix(true, false);
  child.updateWorldMatrix(true, false);
  bone.getWorldPosition(_v1);
  child.getWorldPosition(_v2);
  _v2.sub(_v1).normalize();
  _q1.setFromUnitVectors(_v2, dir);
  bone.getWorldQuaternion(_q2);
  _q1.multiply(_q2);
  bone.parent.getWorldQuaternion(_q3);
  bone.quaternion.copy(_q3.invert().multiply(_q1));
  bone.updateMatrixWorld(true);
}

// Target directions [upper arm, forearm] in the avatar's own space (+x = its left, +y up, +z toward the viewer).
function armTargets(kind, side, t, pulse, speaking, waving) {
  const right = side > 0; // the arm on the viewer's right
  if (waving && right) return [[side * 0.7, 0.6, 0.1], [side * (0.2 + 0.45 * Math.sin(t * 9)), 0.95, 0.1]];
  if (kind === "point" && speaking) {
    // the arm on the viewer's left reaches toward the page content
    if (!right) return [[side * 0.9, 0.18 + Math.sin(t * 1.5) * 0.04, 0.22], [side * 0.97, 0.2 + Math.sin(t * 2.1) * 0.05 + pulse * 0.1, 0.18]];
    return [[side * 0.14, -1, 0.1], [side * 0.04, -0.8, 0.45]];
  }
  if (!speaking) return [[side * 0.14 + Math.sin(t * 1.1 + side) * 0.008, -1, 0.05], [side * 0.05, -1, 0.25]];
  const both = kind === "both";
  const active = both || (kind === "right" && right) || (kind === "left" && !right);
  if (active && both) {
    // hands held in front of the chest, gently moving as he talks
    return [
      [side * (0.16 + Math.sin(t * 1.9 + side) * 0.03), -0.95, 0.3],
      [side * (-0.04 + Math.sin(t * 2.2) * 0.04), 0.18 + Math.sin(t * 3.1 + side * 1.4) * 0.08 + pulse * 0.16, 0.95],
    ];
  }
  if (active) {
    // one open hand presenting to the side, but not too wide
    return [
      [side * (0.42 + Math.sin(t * 1.7) * 0.05), -0.82, 0.22],
      [side * 0.4, 0.1 + Math.sin(t * 2.7) * 0.07 + pulse * 0.12, 0.82],
    ];
  }
  return [[side * 0.14, -1, 0.1], [side * 0.04, -0.8, 0.45]];
}

// letter -> [Ready-Player-Me viseme, mouth-open amount, lip-width factor]
const LETTER = {
  a: ["viseme_aa", 0.95, 1.05], e: ["viseme_E", 0.55, 1.15], i: ["viseme_I", 0.35, 1.22],
  o: ["viseme_O", 0.75, 0.68], u: ["viseme_U", 0.45, 0.58], w: ["viseme_U", 0.4, 0.58],
  y: ["viseme_I", 0.35, 1.2], h: ["viseme_aa", 0.3, 1],
  m: ["viseme_PP", 0, 1], b: ["viseme_PP", 0, 1], p: ["viseme_PP", 0, 1],
  f: ["viseme_FF", 0.12, 1], v: ["viseme_FF", 0.12, 1],
  n: ["viseme_nn", 0.2, 1], l: ["viseme_nn", 0.25, 1], t: ["viseme_nn", 0.2, 1], d: ["viseme_nn", 0.2, 1],
  s: ["viseme_SS", 0.15, 1.1], z: ["viseme_SS", 0.15, 1.1],
  c: ["viseme_CH", 0.2, 0.9], j: ["viseme_CH", 0.2, 0.9],
  k: ["viseme_kk", 0.25, 1], g: ["viseme_kk", 0.25, 1], q: ["viseme_kk", 0.25, 1], x: ["viseme_kk", 0.25, 1],
  r: ["viseme_RR", 0.25, 0.85],
};
const VISEME_NAMES = [...new Set(Object.values(LETTER).map((v) => v[0]))];
const ARKIT_NAMES = [
  "jawOpen", "mouthOpen", "mouthFunnel", "mouthPucker", "mouthSmile", "mouthSmileLeft", "mouthSmileRight",
  "eyeBlinkLeft", "eyeBlinkRight", "eyesClosed",
];

function useModelAvailable(url) {
  const [state, setState] = useState("checking"); // checking | yes | no
  useEffect(() => {
    let alive = true;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") || "";
        if (alive) setState(r.ok && !type.includes("text/html") ? "yes" : "no");
      })
      .catch(() => alive && setState("no"));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

function Model({ ctrl, url, reduced, onReady }) {
  const gltf = useGLTF(url);
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  const model = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const holder = useRef();
  const { actions, names } = useAnimations(gltf.animations, holder);

  // ---- auto-fit: measure the model; scale/position are applied every frame (zoom changes while scrolling) ----
  const base = useMemo(() => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const hips = new THREE.Vector3();
    let fullBody = false;
    model.traverse((o) => {
      if (!o.isBone) return;
      const n = o.name.replace(/^mixamorig:?/i, "").toLowerCase();
      if (n === "hips") o.getWorldPosition(hips);
      if (/upleg|thigh/.test(n)) fullBody = true;
    });
    return { top: box.max.y, H: Math.max(box.max.y - box.min.y, 0.001), hx: hips.x, hz: hips.z, fullBody };
  }, [model]);
  const prim = useRef();

  // ---- discover morph targets, bones and animation clips ----
  const info = useMemo(() => {
    const meshes = [];
    const bones = {};
    model.traverse((o) => {
      if (o.isMesh && o.morphTargetInfluences && o.morphTargetDictionary) meshes.push(o);
      if (o.isBone) {
        const n = o.name.replace(/^mixamorig:?/i, "").toLowerCase();
        if (!bones.head && /^head$/.test(n)) bones.head = o;
        if (!bones.neck && /^neck$/.test(n)) bones.neck = o;
        if (!bones.jaw && /jaw/.test(n)) bones.jaw = o;
        if (!bones.spine && /^spine2?$/.test(n)) bones.spine = o;
      }
    });
    const has = new Set();
    meshes.forEach((m) => Object.keys(m.morphTargetDictionary).forEach((k) => has.add(k)));
    Object.values(bones).forEach((b) => (b.userData.rest = b.rotation.clone()));
    return { meshes, bones, has, hasViseme: VISEME_NAMES.some((n) => has.has(n)) };
  }, [model]);

  // ---- arm bones (standard Mixamo-style rig). Posed by aiming bones, so it works with any bone axes ----
  const armBones = useMemo(() => {
    const find = (re) => {
      let f = null;
      model.traverse((o) => {
        if (!f && o.isBone && re.test(o.name.replace(/^mixamorig:?/i, ""))) f = o;
      });
      return f;
    };
    model.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    return [
      { arm: find(/^LeftArm$/i), fore: find(/^LeftForeArm$/i), hand: find(/^LeftHand$/i) },
      { arm: find(/^RightArm$/i), fore: find(/^RightForeArm$/i), hand: find(/^RightHand$/i) },
    ]
      .filter((x) => x.arm && x.fore && x.hand)
      .map((x) => ({ ...x, side: x.arm.getWorldPosition(v).x >= 0 ? 1 : -1 }));
  }, [model]);

  const clips = useMemo(
    () => ({
      idle: names.find((n) => /idle|stand|breath|neutral/i.test(n)) || null,
      talk: names.find((n) => /talk|explain|speak|gestur|present/i.test(n)) || null,
      wave: names.find((n) => /wave|greet|hello/i.test(n)) || null,
      any: names[0] || null,
    }),
    [names]
  );
  const hasClips = names.length > 0;

  const st = useRef({ cur: {}, open: 0, width: 1, pulse: 0, lastBeat: 0, hy: 0, hx: 0, nextBlink: 1.5, blink: 0, playing: null, dirs: null, zoom: 0 });

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const c = ctrl.current;
    const s = st.current;
    const now = performance.now();
    const speaking = !!c.speaking;
    const waving = now < (c.waveUntil || 0);
    const motion = reduced ? 0.3 : 1;

    // ---- framing: full body in the hero, upper body once docked ----
    s.zoom = damp(s.zoom, clamp(c.zoom || 0, 0, 1), 5, dt);
    if (prim.current) {
      const sUp = 2.3 / ((base.fullBody ? 0.56 : 0.9) * base.H);
      const sFull = base.fullBody ? 2.3 / (1.04 * base.H) : sUp;
      const sc = THREE.MathUtils.lerp(sFull, sUp, s.zoom);
      prim.current.scale.setScalar(sc);
      prim.current.position.set(-base.hx * sc, 1.12 - (base.top + 0.04 * base.H) * sc, -base.hz * sc);
    }

    // ---- animation clip state machine ----
    if (hasClips) {
      const want =
        (waving && clips.wave) || (speaking && clips.talk) || clips.idle || clips.talk || clips.any;
      if (want && want !== s.playing && actions[want]) {
        const next = actions[want];
        next.reset().fadeIn(0.35).play();
        if (s.playing && actions[s.playing]) actions[s.playing].fadeOut(0.35);
        next.setLoop(want === clips.wave ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = true;
        s.playing = want;
      }
    }

    // ---- word-emphasis pulse ----
    if (c.beat !== s.lastBeat) {
      s.lastBeat = c.beat;
      s.pulse = 1;
    }
    s.pulse = damp(s.pulse, 0, 5, dt);

    // ---- lip-sync targets ----
    let open = 0;
    let width = 1;
    let letter = null;
    if (speaking) {
      const since = now - (c.lastBoundary || 0);
      if (c.word && since < 520) {
        const p = clamp((now - c.wordStart) / Math.max(c.wordDur, 80), 0, 1);
        const ch = c.word[Math.min(c.word.length - 1, Math.floor(p * c.word.length))].toLowerCase();
        letter = LETTER[ch] || ["viseme_aa", 0.3, 1];
        open = letter[1];
        width = letter[2];
        if (p >= 1) open *= 0.2;
      } else {
        open = 0.14 + 0.5 * Math.abs(Math.sin(t * 9.5)) * (0.65 + 0.35 * Math.sin(t * 3.1));
        width = 0.92 + 0.14 * Math.sin(t * 6.2);
        letter = [["viseme_aa", "viseme_E", "viseme_O", "viseme_I"][Math.floor(t * 9.5) % 4], open, width];
      }
    }
    s.open = damp(s.open, open, 24, dt);
    s.width = damp(s.width, width, 20, dt);

    // ---- blink ----
    if (t > s.nextBlink) {
      s.blink = 1;
      s.nextBlink = t + 2.2 + Math.random() * 3.2;
    }
    s.blink = Math.max(0, s.blink - dt * 7);
    const lid = s.blink > 0 ? Math.abs(Math.sin((1 - s.blink) * Math.PI)) : 0;

    // ---- morph targets ----
    if (info.meshes.length) {
      const target = {};
      if (info.hasViseme) {
        VISEME_NAMES.forEach((n) => (target[n] = 0));
        if (letter) target[letter[0]] = clamp(0.35 + s.open * 0.65, 0, 1);
      } else {
        target.jawOpen = s.open * 0.65;
        target.mouthOpen = s.open * 0.5;
        target.mouthFunnel = clamp((1 - s.width) * 1.6, 0, 0.8);
        target.mouthPucker = clamp((1 - s.width) * 0.8, 0, 0.5);
      }
      const smile = speaking ? clamp((s.width - 1) * 2.5, 0, 0.5) + 0.12 : 0.22;
      target.mouthSmile = smile;
      target.mouthSmileLeft = smile;
      target.mouthSmileRight = smile;
      target.eyeBlinkLeft = lid;
      target.eyeBlinkRight = lid;
      target.eyesClosed = lid;
      [...VISEME_NAMES, ...ARKIT_NAMES].forEach((name) => {
        if (!info.has.has(name)) return;
        const v = damp(s.cur[name] || 0, target[name] || 0, name.startsWith("eye") ? 40 : 24, dt);
        s.cur[name] = v;
        info.meshes.forEach((m) => {
          const i = m.morphTargetDictionary[name];
          if (i !== undefined) m.morphTargetInfluences[i] = v;
        });
      });
    }

    // ---- head / look-at / jaw (only when no clips are driving the skeleton) ----
    const lookX = clamp(c.look?.x || 0, -1, 1);
    const lookY = clamp(c.look?.y || 0, -1, 1);
    s.hy = damp(s.hy, lookX * 0.4 * motion, 4, dt);
    s.hx = damp(s.hx, lookY * 0.2 * motion, 4, dt);
    const nod = speaking ? (Math.sin(t * 2.4) * 0.03 + s.pulse * 0.04) * motion : 0;
    const { head, neck, jaw, spine } = info.bones;
    if (!hasClips) {
      if (head) {
        const r = head.userData.rest;
        head.rotation.set(r.x + s.hx * 0.6 + nod, r.y + s.hy * 0.6, r.z + Math.sin(t * 1.1) * 0.02 * motion);
      }
      if (neck) {
        const r = neck.userData.rest;
        neck.rotation.set(r.x + s.hx * 0.3, r.y + s.hy * 0.3, r.z);
      }
      if (spine) {
        const r = spine.userData.rest;
        spine.rotation.set(r.x + Math.sin(t * 1.6) * 0.01 * motion, r.y + Math.sin(t * 0.6) * 0.03 * motion, r.z);
      }
    }
    if (jaw && !info.meshes.length) {
      const r = jaw.userData.rest;
      jaw.rotation.set(r.x + s.open * 0.3, r.y, r.z);
    }

    // ---- arms: relaxed stance, gestures while talking, wave on load ----
    if (!hasClips && armBones.length) {
      model.updateMatrixWorld(true);
      model.getWorldQuaternion(_qm);
      const k = 1 - Math.exp(-6 * dt);
      if (!s.dirs) {
        s.dirs = armBones.map((ab) => {
          const [u, f] = armTargets(ctrl.current.kind, ab.side, 0, 0, false, false);
          return { u: new THREE.Vector3(...u).normalize(), f: new THREE.Vector3(...f).normalize() };
        });
      }
      armBones.forEach((ab, i) => {
        const [u, f] = armTargets(c.kind || "both", ab.side, t, s.pulse, speaking, waving);
        const d = s.dirs[i];
        d.u.lerp(_tmp.set(...u).normalize(), waving ? Math.min(1, k * 2) : k).normalize();
        d.f.lerp(_tmp.set(...f).normalize(), waving ? Math.min(1, k * 2) : k).normalize();
        aimBone(ab.arm, ab.fore, _dir.copy(d.u).applyQuaternion(_qm));
        aimBone(ab.fore, ab.hand, _dir.copy(d.f).applyQuaternion(_qm));
      });
    }

    // ---- whole-model life (works for any model, even a static mesh) ----
    if (holder.current) {
      holder.current.position.y = Math.sin(t * 1.6) * 0.012 * motion + (speaking ? s.pulse * 0.01 : 0);
      holder.current.rotation.y = hasClips && !head ? s.hy * 0.5 : Math.sin(t * 0.6) * 0.04 * motion + (!head ? s.hy * 0.5 : 0);
      if (!head) holder.current.rotation.x = s.hx * 0.15;
      const squash = 1 + (speaking ? s.pulse * 0.006 : 0) + Math.sin(t * 1.6) * 0.003;
      holder.current.scale.set(1, squash, 1);
    }
  });

  return (
    <group ref={holder}>
      <primitive ref={prim} object={model} />
    </group>
  );
}

class StageBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    // eslint-disable-next-line no-console
    console.warn("3D avatar unavailable, using static fallback:", err);
  }
  render() {
    if (this.state.failed) return <StaticAvatar onReady={this.props.onReady} />;
    return this.props.children;
  }
}

function StaticAvatar({ onReady }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return <img className="stage-fallback" src={FALLBACK_IMG} alt="Sathish's portfolio guide" />;
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch (_) {
    return false;
  }
}

export default function AvatarStage({ ctrl, active = true, url = MODEL_URL, onReady }) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [webgl] = useState(() => (typeof document === "undefined" ? false : webglAvailable()));
  const model = useModelAvailable(url);

  // head follows the cursor
  useEffect(() => {
    function onMove(e) {
      ctrl.current.look = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [ctrl]);

  if (model === "checking") return null;
  if (!webgl || model === "no") return <StaticAvatar onReady={onReady} />;

  return (
    <StageBoundary onReady={onReady}>
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 4.6], fov: 30 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        aria-label="Animated 3D avatar of Sathish"
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[2.5, 3, 4]} intensity={2.8} color="#ffffff" />
        <directionalLight position={[-3, 1.5, -2]} intensity={2.2} color="#8b5cff" />
        <directionalLight position={[3.5, -0.5, 2]} intensity={1.2} color="#4cc9ff" />
        <Suspense fallback={null}>
          <Model ctrl={ctrl} url={url} reduced={!!reduced} onReady={onReady} />
        </Suspense>
      </Canvas>
    </StageBoundary>
  );
}
