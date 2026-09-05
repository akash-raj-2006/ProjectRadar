import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { RADIUS, RED, SWEEP_SPEED, TAU, sweepState } from "./radar-config";

const vertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Alpha = angular falloff (bright leading edge -> transparent tail) multiplied
// by a radial falloff so the beam thins out toward maximum range.
const fragment = /* glsl */ `
  varying vec3 vPos;
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uSpread;
  uniform float uStrength;
  void main() {
    float a = atan(vPos.y, vPos.x);
    if (a < 0.0) a += 6.2831853;
    float tail = 1.0 - smoothstep(0.0, uSpread, a);
    float r = length(vPos.xy) / uRadius;
    float radial = smoothstep(1.02, 0.12, r) * 0.9 + 0.1;
    gl_FragColor = vec4(uColor, pow(tail, 1.6) * radial * uStrength);
  }
`;

/**
 * RadarSweep — three stacked layers so the beam reads as light, not a triangle:
 *   1. a wide, very faint glow wedge
 *   2. the main translucent beam with a fading afterglow tail
 *   3. a sharp hot leading edge, plus a vertical scan plane that gives the
 *      sweep volume above the disc.
 *
 * Every frame the group's Y rotation advances by SWEEP_SPEED * delta (delta-
 * time based, so the speed is identical at 30 or 144 fps) and the resulting
 * bearing is published to `sweepState` for the targets to react to.
 */
export function RadarSweep({ segments = 96 }: { segments?: number }) {
  const group = useRef<THREE.Group>(null);
  const spread = Math.PI / 3;

  const make = (uStrength: number, uSpread: number) => ({
    uColor: { value: new THREE.Color(RED) },
    uRadius: { value: RADIUS },
    uSpread: { value: uSpread },
    uStrength: { value: uStrength },
  });

  const beamUniforms = useMemo(() => make(0.34, spread), [spread]);
  const glowUniforms = useMemo(() => make(0.1, Math.PI * 0.9), [spread]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    group.current.rotation.y -= SWEEP_SPEED * sweepState.speed * dt;
    // world bearing of the leading edge, normalised to 0..2π
    sweepState.angle = ((-group.current.rotation.y % TAU) + TAU) % TAU;
  });

  return (
    <group ref={group}>
      {/* layer 3 — soft wide glow */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
        <circleGeometry args={[RADIUS * 1.02, segments, 0, Math.PI * 0.9]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={glowUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* layer 2 — main translucent beam */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} renderOrder={3}>
        <circleGeometry args={[RADIUS, segments, 0, spread]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={beamUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* vertical scan plane — the sweep gains height, not just floor area */}
      <mesh position={[RADIUS / 2, 0.55, 0]} renderOrder={4}>
        <planeGeometry args={[RADIUS, 0.9]} />
        <meshBasicMaterial
          color={RED}
          transparent
          opacity={0.022}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* layer 1 — sharp hot leading edge, on the floor and up the scan plane */}
      <mesh position={[RADIUS / 2, 0.006, 0]} renderOrder={5}>
        <boxGeometry args={[RADIUS, 0.002, 0.014]} />
        <meshBasicMaterial color={RED} />
      </mesh>
      <mesh position={[RADIUS - 0.01, 0.45, 0]} renderOrder={5}>
        <boxGeometry args={[0.01, 0.9, 0.01]} />
        <meshBasicMaterial color={RED} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}
