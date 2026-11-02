import React, { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * Procedural 3D avatar — no external model files needed.
 * All animation is driven by a shared, mutable `ctrl` ref (see AvatarGuide.jsx):
 *   ctrl.speaking      true while a sentence is being narrated
 *   ctrl.word          the word currently being spoken (for lip-sync shapes)
 *   ctrl.wordStart     performance.now() when that word began
 *   ctrl.wordDur       estimated duration of that word in ms
 *   ctrl.lastBoundary  performance.now() of the last word boundary event
 *   ctrl.beat          counter that increments on every word (eyebrow/hand emphasis)
 *   ctrl.kind          gesture style: "both" | "right" | "left"
 *   ctrl.waveUntil     performance.now() until which the avatar waves
 *   ctrl.look          { x, y } pointer position in -1..1 (head follows the cursor)
 */

const SKIN = "#c98f6a";
const SKIN_DARK = "#b87b58";
const HAIR = "#17101c";
const HAIR_LIGHT = "#2a1c33";
const HOODIE = "#171c4a";
const HOODIE_DARK = "#10143a";
const SHIRT = "#0e0f1c";
const NEON_BLUE = "#4cc9ff";
const NEON_PURPLE = "#a678ff";

// [mouth open amount, mouth width factor] per letter
const VISEMES = {
  a: [0.95, 1.05], e: [0.55, 1.15], i: [0.35, 1.22], o: [0.75, 0.68], u: [0.45, 0.58],
  w: [0.4, 0.58], m: [0, 1], b: [0, 1], p: [0, 1], f: [0.12, 1], v: [0.12, 1],
};
const DEFAULT_VISEME = [0.3, 1];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = THREE.MathUtils.damp;

// Ellipsoid head helper: z coordinate of the face surface at (x, y)
const HEAD = { a: 0.36, b: 0.43, c: 0.38 };
function faceZ(x, y) {
  const t = 1 - (x / HEAD.a) ** 2 - (y / HEAD.b) ** 2;
  return HEAD.c * Math.sqrt(Math.max(t, 0.02));
}

function Material({ color, rough = 0.75, metal = 0, emissive, emissiveIntensity = 1 }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={rough}
      metalness={metal}
      emissive={emissive || "#000000"}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
    />
  );
}

function Arm({ side, refs }) {
  // side: +1 (screen right) or -1 (screen left)
  return (
    <group ref={refs.shoulder} position={[side * 0.58, -0.3, 0]}>
      <mesh>
        <sphereGeometry args={[0.135, 24, 18]} />
        <Material color={HOODIE} />
      </mesh>
      <mesh position={[0, -0.26, 0]}>
        <capsuleGeometry args={[0.112, 0.28, 6, 18]} />
        <Material color={HOODIE} />
      </mesh>
      <group ref={refs.elbow} position={[0, -0.52, 0]}>
        <mesh>
          <sphereGeometry args={[0.108, 20, 16]} />
          <Material color={HOODIE} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.1, 0.22, 6, 18]} />
          <Material color={HOODIE} />
        </mesh>
        {/* glowing cuff */}
        <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.108, 0.02, 10, 32]} />
          <Material color={NEON_PURPLE} emissive={NEON_PURPLE} emissiveIntensity={1.6} />
        </mesh>
        {/* hand */}
        <group position={[0, -0.5, 0.01]}>
          <mesh scale={[1, 1.12, 0.7]}>
            <sphereGeometry args={[0.082, 20, 16]} />
            <Material color={SKIN} rough={0.6} />
          </mesh>
          <mesh position={[side * -0.07, 0.0, 0.03]} rotation={[0, 0, side * 0.6]} scale={[0.6, 1, 0.7]}>
            <sphereGeometry args={[0.04, 14, 12]} />
            <Material color={SKIN} rough={0.6} />
          </mesh>
          {[-0.04, -0.013, 0.013, 0.04].map((x, i) => (
            <mesh key={x} position={[x, -0.075 - (i === 1 || i === 2 ? 0.012 : 0), 0]} scale={[0.5, 1.4, 0.55]}>
              <sphereGeometry args={[0.028, 10, 10]} />
              <Material color={SKIN} rough={0.6} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

// Arm pose targets: [shoulder.x, shoulder.z, elbow.x, elbow.z]
function armPose(kind, side, t, pulse, speaking, waving) {
  const isRight = side > 0;
  if (waving && isRight) {
    return [-0.25, 2.05, -0.35, 0.55 * Math.sin(t * 9)];
  }
  if (!speaking) {
    const sway = Math.sin(t * 1.1 + side) * 0.02;
    return [0.04 + sway, side * 0.13, -0.18, 0];
  }
  const both = kind === "both";
  const active = both || (kind === "right" && isRight) || (kind === "left" && !isRight);
  if (active) {
    if (both) {
      return [
        -0.5 + Math.sin(t * 2.6 + side) * 0.07 - pulse * 0.1,
        side * (0.3 + Math.sin(t * 1.9 + side) * 0.07),
        -1.3 + Math.sin(t * 3.1 + side * 1.4) * 0.18 - pulse * 0.28,
        side * Math.sin(t * 2.2) * 0.12,
      ];
    }
    // open-palm "presenting" sweep
    return [
      -0.45 + Math.sin(t * 2.2) * 0.06,
      side * (0.78 + Math.sin(t * 1.7) * 0.1),
      -0.95 + Math.sin(t * 2.7) * 0.16 - pulse * 0.2,
      side * 0.2,
    ];
  }
  return [0.0, side * 0.16, -0.5 + Math.sin(t * 1.4) * 0.05, 0];
}

function Avatar({ ctrl, reduced }) {
  const root = useRef();
  const headRef = useRef();
  const mouthRef = useRef();
  const teethRef = useRef();
  const smileRef = useRef();
  const eyesRef = useRef();
  const pupilL = useRef();
  const pupilR = useRef();
  const browL = useRef();
  const browR = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const armR = { shoulder: useRef(), elbow: useRef() };
  const armL = { shoulder: useRef(), elbow: useRef() };

  const s = useRef({
    open: 0,
    width: 1,
    nextBlink: 1.5,
    blink: 0,
    pulse: 0,
    lastBeat: 0,
    headY: 0,
    headX: 0,
  });

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    const c = ctrl.current;
    const st = s.current;
    const now = performance.now();
    const speaking = !!c.speaking;
    const waving = now < (c.waveUntil || 0);
    const motion = reduced ? 0.25 : 1;

    // ---- beat pulse (emphasis on each spoken word) ----
    if (c.beat !== st.lastBeat) {
      st.lastBeat = c.beat;
      st.pulse = 1;
    }
    st.pulse = damp(st.pulse, 0, 5, dt);

    // ---- lip sync ----
    let open = 0;
    let width = 1;
    if (speaking) {
      const sinceBoundary = now - (c.lastBoundary || 0);
      if (c.word && sinceBoundary < 520) {
        const p = clamp((now - c.wordStart) / Math.max(c.wordDur, 80), 0, 1);
        const idx = Math.min(c.word.length - 1, Math.floor(p * c.word.length));
        const ch = c.word[idx].toLowerCase();
        const v = VISEMES[ch] || DEFAULT_VISEME;
        open = v[0];
        width = v[1];
        if (p >= 1) open *= 0.2;
      } else {
        // fallback: syllable-like motion when the browser gives no word events
        open = 0.14 + 0.5 * Math.abs(Math.sin(t * 9.5)) * (0.65 + 0.35 * Math.sin(t * 3.1));
        width = 0.92 + 0.14 * Math.sin(t * 6.2);
      }
    }
    st.open = damp(st.open, open, 24, dt);
    st.width = damp(st.width, width, 20, dt);
    if (mouthRef.current) {
      mouthRef.current.scale.set(0.066 * st.width, 0.006 + 0.058 * st.open, 0.022);
      mouthRef.current.position.y = -0.205 - st.open * 0.014;
      mouthRef.current.visible = st.open > 0.025;
    }
    if (teethRef.current) {
      teethRef.current.scale.set(0.052 * st.width, 0.011 * Math.min(1, st.open * 3), 0.012);
      teethRef.current.position.y = -0.205 + 0.006 + st.open * 0.004;
      teethRef.current.visible = st.open > 0.22;
    }
    if (smileRef.current) {
      smileRef.current.scale.set(st.width, 1 - st.open * 0.5, 1);
      smileRef.current.position.y = -0.2 - st.open * 0.02;
    }

    // ---- blinking ----
    if (t > st.nextBlink) {
      st.blink = 1;
      st.nextBlink = t + 2.2 + Math.random() * 3.2;
    }
    st.blink = Math.max(0, st.blink - dt * 7);
    const lid = st.blink > 0 ? Math.abs(Math.sin((1 - st.blink) * Math.PI)) : 0;
    if (eyesRef.current) eyesRef.current.scale.y = Math.max(0.08, 1 - lid * 0.95);

    // ---- head / gaze ----
    const lookX = clamp(c.look?.x || 0, -1, 1);
    const lookY = clamp(c.look?.y || 0, -1, 1);
    const targetY = lookX * 0.42 * motion;
    const targetX = lookY * 0.22 * motion;
    st.headY = damp(st.headY, targetY, 4, dt);
    st.headX = damp(st.headX, targetX, 4, dt);
    if (headRef.current) {
      const talk = speaking ? 1 : 0;
      headRef.current.rotation.y = st.headY + Math.sin(t * 0.8) * 0.04 * motion;
      headRef.current.rotation.x =
        st.headX + talk * (Math.sin(t * 2.4) * 0.035 + st.pulse * 0.045) * motion;
      headRef.current.rotation.z = Math.sin(t * 1.1) * 0.025 * motion + talk * Math.sin(t * 1.7) * 0.02;
    }
    [pupilL, pupilR].forEach((p) => {
      if (p.current) {
        p.current.position.x = damp(p.current.position.x, lookX * 0.014, 8, dt);
        p.current.position.y = damp(p.current.position.y, -lookY * 0.01, 8, dt);
      }
    });
    const browLift = (speaking ? 0.006 + st.pulse * 0.012 : 0) + (waving ? 0.012 : 0);
    if (browL.current) browL.current.position.y = 0.152 + browLift;
    if (browR.current) browR.current.position.y = 0.152 + browLift;

    // ---- body ----
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.6) * 0.012 * motion;
      root.current.rotation.y = Math.sin(t * 0.6) * 0.05 * motion;
      root.current.scale.y = 1 + Math.sin(t * 1.6) * 0.004;
    }

    // ---- arms ----
    const kind = c.kind || "both";
    [[armR, 1], [armL, -1]].forEach(([arm, side]) => {
      const pose = armPose(kind, side, t, st.pulse, speaking, waving);
      const sh = arm.shoulder.current;
      const el = arm.elbow.current;
      if (!sh || !el) return;
      const k = waving && side > 0 ? 9 : 5;
      sh.rotation.x = damp(sh.rotation.x, pose[0] * (reduced ? 0.6 : 1), k, dt);
      sh.rotation.z = damp(sh.rotation.z, pose[1], k, dt);
      el.rotation.x = damp(el.rotation.x, pose[2] * (reduced ? 0.6 : 1), k, dt);
      el.rotation.z = damp(el.rotation.z, pose[3], waving && side > 0 ? 14 : k, dt);
    });

    // ---- background rings ----
    if (ringA.current) ringA.current.rotation.z = t * 0.25;
    if (ringB.current) ringB.current.rotation.z = -t * 0.18;
  });

  const eyeY = 0.06;
  const eyeX = 0.14;
  const eyeZ = faceZ(eyeX, eyeY) - 0.012;
  const noseZ = faceZ(0, -0.05) + 0.018;
  const mouthZ = 0.372;

  return (
    <>
      {/* decorative rings + glow behind the avatar */}
      <group position={[0, -0.1, -0.9]}>
        <mesh position={[0, 0, -0.1]}>
          <circleGeometry args={[1.25, 48]} />
          <meshBasicMaterial color="#6d4cff" transparent opacity={0.12} />
        </mesh>
        <mesh ref={ringA} rotation={[0.5, 0.2, 0]}>
          <torusGeometry args={[1.12, 0.006, 8, 96]} />
          <meshBasicMaterial color={NEON_BLUE} transparent opacity={0.7} />
        </mesh>
        <mesh ref={ringB} rotation={[-0.35, -0.4, 0]}>
          <torusGeometry args={[0.95, 0.005, 8, 96]} />
          <meshBasicMaterial color={NEON_PURPLE} transparent opacity={0.7} />
        </mesh>
      </group>

      <group ref={root} position={[0, -0.05, 0]}>
        {/* ---------- torso (hoodie) ---------- */}
        <mesh position={[0, -0.78, 0]} scale={[1.15, 1, 0.75]}>
          <capsuleGeometry args={[0.42, 0.56, 10, 28]} />
          <Material color={HOODIE} rough={0.85} />
        </mesh>
        {/* t-shirt panel between zip lines */}
        <mesh position={[0, -0.88, 0.312]}>
          <boxGeometry args={[0.2, 0.7, 0.008]} />
          <Material color={SHIRT} rough={0.9} />
        </mesh>
        {/* glowing zip lines */}
        {[-0.105, 0.105].map((x) => (
          <mesh key={x} position={[x, -0.88, 0.314]}>
            <boxGeometry args={[0.013, 0.72, 0.01]} />
            <Material color={x < 0 ? NEON_BLUE : NEON_PURPLE} emissive={x < 0 ? NEON_BLUE : NEON_PURPLE} emissiveIntensity={1.8} />
          </mesh>
        ))}
        {/* drawstrings */}
        {[-0.14, 0.14].map((x) => (
          <group key={x}>
            <mesh position={[x, -0.62, 0.31]}>
              <capsuleGeometry args={[0.008, 0.2, 4, 8]} />
              <Material color="#2b3166" />
            </mesh>
            <mesh position={[x, -0.74, 0.31]}>
              <cylinderGeometry args={[0.012, 0.012, 0.035, 10]} />
              <Material color="#aab3d6" metal={0.8} rough={0.3} />
            </mesh>
          </group>
        ))}
        {/* planet badge */}
        <group position={[0.29, -0.66, 0.262]}>
          <mesh>
            <sphereGeometry args={[0.052, 20, 16]} />
            <Material color="#5b6cff" emissive="#5b6cff" emissiveIntensity={0.9} />
          </mesh>
          <mesh rotation={[1.25, 0.15, 0.45]}>
            <torusGeometry args={[0.085, 0.007, 8, 40]} />
            <Material color="#e8ecff" emissive="#e8ecff" emissiveIntensity={0.6} />
          </mesh>
        </group>

        {/* hood around the neck */}
        <group position={[0, -0.24, -0.03]} rotation={[1.3, 0, 0]} scale={[1.18, 1, 1]}>
          <mesh>
            <torusGeometry args={[0.3, 0.1, 18, 44]} />
            <Material color={HOODIE_DARK} rough={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.075]}>
            <torusGeometry args={[0.345, 0.009, 8, 64]} />
            <Material color={NEON_BLUE} emissive={NEON_BLUE} emissiveIntensity={1.8} />
          </mesh>
        </group>

        {/* neck */}
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.105, 0.12, 0.3, 20]} />
          <Material color={SKIN_DARK} rough={0.7} />
        </mesh>

        {/* ---------- arms ---------- */}
        <Arm side={1} refs={armR} />
        <Arm side={-1} refs={armL} />

        {/* ---------- head ---------- */}
        <group ref={headRef} position={[0, 0.33, 0]}>
          {/* skull + jaw */}
          <mesh scale={[HEAD.a, HEAD.b, HEAD.c]}>
            <sphereGeometry args={[1, 40, 32]} />
            <Material color={SKIN} rough={0.62} />
          </mesh>
          <mesh position={[0, -0.22, 0.045]} scale={[0.285, 0.26, 0.3]}>
            <sphereGeometry args={[1, 32, 24]} />
            <Material color={SKIN} rough={0.62} />
          </mesh>

          {/* ears */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.362, -0.01, -0.01]} scale={[0.4, 1, 0.75]}>
              <sphereGeometry args={[0.07, 16, 14]} />
              <Material color={SKIN_DARK} rough={0.65} />
            </mesh>
          ))}

          {/* beard: lower shell of the head */}
          <mesh
            position={[0, 0, 0]}
            scale={[HEAD.a * 1.045, HEAD.b * 1.03, HEAD.c * 1.06]}
          >
            <sphereGeometry args={[1, 40, 28, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44]} />
            <Material color={HAIR} rough={0.95} />
          </mesh>
          {/* chin extension of the beard */}
          <mesh position={[0, -0.225, 0.05]} scale={[0.3, 0.27, 0.31]}>
            <sphereGeometry args={[1, 32, 24, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
            <Material color={HAIR} rough={0.95} />
          </mesh>
          {/* moustache */}
          {[-1, 1].map((sd) => (
            <mesh
              key={sd}
              position={[sd * 0.052, -0.148, 0.386]}
              rotation={[0, sd * -0.25, sd * 0.28]}
              scale={[1, 0.55, 0.55]}
            >
              <capsuleGeometry args={[0.02, 0.07, 4, 10]} />
              <Material color={HAIR} rough={0.95} />
            </mesh>
          ))}
          {/* sideburn connection */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.325, -0.06, 0.1]} scale={[0.35, 1, 0.7]}>
              <sphereGeometry args={[0.1, 14, 12]} />
              <Material color={HAIR} rough={0.95} />
            </mesh>
          ))}

          {/* cheeks (soft warmth above the beard line) */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.19, -0.03, faceZ(0.19, -0.03) - 0.01]} scale={[1, 0.7, 0.35]}>
              <sphereGeometry args={[0.055, 14, 12]} />
              <meshStandardMaterial color="#d1805f" roughness={0.8} transparent opacity={0.35} />
            </mesh>
          ))}

          {/* eyes */}
          <group ref={eyesRef} position={[0, eyeY, 0]}>
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * eyeX, 0, eyeZ - 0.0]}>
                <mesh scale={[1.12, 0.88, 0.5]}>
                  <sphereGeometry args={[0.052, 20, 16]} />
                  <meshStandardMaterial color="#f6f4f2" roughness={0.3} />
                </mesh>
                <group ref={sd < 0 ? pupilL : pupilR} position={[0, 0, 0.012]}>
                  <mesh position={[0, 0, 0.008]} scale={[1, 1, 0.5]}>
                    <sphereGeometry args={[0.032, 18, 14]} />
                    <meshStandardMaterial color="#3a2012" roughness={0.25} />
                  </mesh>
                  <mesh position={[0, 0, 0.018]} scale={[1, 1, 0.5]}>
                    <sphereGeometry args={[0.018, 14, 12]} />
                    <meshStandardMaterial color="#0a0506" roughness={0.2} />
                  </mesh>
                  <mesh position={[0.011, 0.012, 0.026]}>
                    <sphereGeometry args={[0.006, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              </group>
            ))}
          </group>

          {/* eyebrows */}
          <mesh
            ref={browL}
            position={[-eyeX, 0.152, faceZ(eyeX, 0.15) + 0.004]}
            rotation={[0, 0.2, 0.12]}
            scale={[1, 0.6, 0.5]}
          >
            <capsuleGeometry args={[0.017, 0.085, 4, 10]} />
            <Material color={HAIR} rough={0.9} />
          </mesh>
          <mesh
            ref={browR}
            position={[eyeX, 0.152, faceZ(eyeX, 0.15) + 0.004]}
            rotation={[0, -0.2, -0.12]}
            scale={[1, 0.6, 0.5]}
          >
            <capsuleGeometry args={[0.017, 0.085, 4, 10]} />
            <Material color={HAIR} rough={0.9} />
          </mesh>

          {/* nose */}
          <mesh position={[0, -0.05, noseZ]} scale={[0.9, 1.15, 0.9]}>
            <sphereGeometry args={[0.046, 16, 14]} />
            <Material color={SKIN_DARK} rough={0.6} />
          </mesh>
          <mesh position={[0, 0.02, faceZ(0, 0.02) + 0.004]} scale={[0.55, 1.5, 0.6]}>
            <sphereGeometry args={[0.03, 12, 10]} />
            <Material color={SKIN} rough={0.6} />
          </mesh>

          {/* mouth */}
          <group position={[0, 0, mouthZ]}>
            {/* resting smile line */}
            <mesh ref={smileRef} position={[0, -0.2, 0]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.052, 0.0085, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#8a4040" roughness={0.6} />
            </mesh>
            {/* open mouth (dark inside) */}
            <mesh ref={mouthRef} position={[0, -0.205, 0.004]} visible={false}>
              <sphereGeometry args={[1, 20, 14]} />
              <meshStandardMaterial color="#2a0c10" roughness={0.9} />
            </mesh>
            {/* teeth */}
            <mesh ref={teethRef} position={[0, -0.199, 0.012]} visible={false}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#f5f1ee" roughness={0.4} />
            </mesh>
          </group>

          {/* ---------- hair ---------- */}
          {/* top cap */}
          <mesh position={[0, 0.02, -0.02]} scale={[HEAD.a * 1.07, HEAD.b * 1.1, HEAD.c * 1.12]}>
            <sphereGeometry args={[1, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.34]} />
            <Material color={HAIR} rough={0.85} />
          </mesh>
          {/* back + sides, leaving ears clear */}
          <mesh position={[0, 0.01, -0.03]} scale={[HEAD.a * 1.06, HEAD.b * 1.06, HEAD.c * 1.1]}>
            <sphereGeometry args={[1, 40, 28, Math.PI * 1.08, Math.PI * 0.84, 0, Math.PI * 0.6]} />
            <Material color={HAIR} rough={0.85} />
          </mesh>
          {/* swept-up quiff volume */}
          {[
            [0.0, 0.5, 0.12, 0.2, 0.11, 0.17, 0.0],
            [0.13, 0.49, 0.06, 0.16, 0.1, 0.15, -0.35],
            [-0.13, 0.48, 0.07, 0.16, 0.1, 0.15, 0.35],
            [0.06, 0.55, -0.04, 0.17, 0.1, 0.16, -0.2],
            [-0.08, 0.54, -0.05, 0.16, 0.1, 0.15, 0.25],
            [0.0, 0.46, -0.2, 0.2, 0.12, 0.16, 0],
          ].map(([x, y, z, sx, sy, sz, rz], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[-0.35, 0, rz]} scale={[sx, sy, sz]}>
              <sphereGeometry args={[1, 18, 14]} />
              <Material color={i % 2 ? HAIR_LIGHT : HAIR} rough={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </>
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
    if (this.state.failed) {
      return <img className="stage-fallback" src="/ai-avatar.webp" alt="Sathish's AI portfolio guide" />;
    }
    return this.props.children;
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch (_) {
    return false;
  }
}

export default function AvatarStage({ ctrl, active = true }) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [ok] = React.useState(() => (typeof document === "undefined" ? false : webglAvailable()));

  // head follows the cursor (shared across stages, so only bind once per stage)
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

  if (!ok) {
    return <img className="stage-fallback" src="/ai-avatar.webp" alt="Sathish's AI portfolio guide" />;
  }

  return (
    <StageBoundary>
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, -0.3, 4.6], fov: 30 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        aria-label="Animated 3D avatar of Sathish"
      >
        <ambientLight intensity={1.25} />
        <directionalLight position={[2.5, 3, 4]} intensity={2.6} color="#ffffff" />
        <directionalLight position={[-3, 1.5, -2]} intensity={3.2} color="#8b5cff" />
        <directionalLight position={[3.5, -0.5, 2]} intensity={1.6} color="#4cc9ff" />
        <Avatar ctrl={ctrl} reduced={!!reduced} />
      </Canvas>
    </StageBoundary>
  );
}
