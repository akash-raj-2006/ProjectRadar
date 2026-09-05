/**
 * Shared configuration + a tiny mutable bus for the radar scene.
 *
 * The sweep component writes its current world-space bearing into
 * `sweepState` every frame; targets read it to know when the beam has just
 * crossed them. Using a plain module object (instead of React state) keeps
 * this out of the render loop entirely — no re-renders at 60fps.
 */

export const CREAM = "#f4f1ea";
export const RED = "#ff1e1e";
export const SURFACE = "#0f0f0f";

export const RADIUS = 2.6;
export const SWEEP_SPEED = 0.75; // radians / second
export const PING_DECAY = 2.0; // exponential falloff of a detection flash

export type RadarTarget = {
  id: string;
  label: string;
  angle: number; // bearing in radians
  dist: number; // 0..1 of RADIUS
  height: number; // Y offset above the disc — this is what sells the depth
  match: number;
  unique: number;
};

export const TARGETS: RadarTarget[] = [
  { id: "PROJECT_01", label: "EDGE AI // VISION", angle: 0.4, dist: 0.82, height: 0.62, match: 94, unique: 87 },
  { id: "PROJECT_02", label: "FED. LEARNING", angle: 1.35, dist: 0.46, height: 0.24, match: 88, unique: 92 },
  { id: "PROJECT_03", label: "RAG PIPELINE", angle: 2.4, dist: 0.68, height: 0.9, match: 91, unique: 74 },
  { id: "PROJECT_04", label: "SIGNAL FORENSICS", angle: 3.35, dist: 0.92, height: 0.38, match: 96, unique: 95 },
  { id: "PROJECT_05", label: "AGENT SWARM", angle: 4.2, dist: 0.32, height: 0.74, match: 83, unique: 89 },
  { id: "PROJECT_06", label: "ON-DEVICE LLM", angle: 5.1, dist: 0.74, height: 0.3, match: 90, unique: 81 },
  { id: "PROJECT_07", label: "GRAPH ANOMALY", angle: 5.9, dist: 0.55, height: 1.02, match: 87, unique: 93 },
];

/** Live scan state shared between sweep, targets and particles. */
export const sweepState = {
  angle: 0, // 0..2π, leading edge bearing
  speed: 1, // multiplier — drops while the user inspects a target
};

export const TAU = Math.PI * 2;

/** True when the beam moved past `bearing` between the last frame and now. */
export function crossed(prev: number, next: number, bearing: number) {
  const end = next < prev ? next + TAU : next;
  const b = bearing < prev ? bearing + TAU : bearing;
  return b > prev && b <= end;
}
