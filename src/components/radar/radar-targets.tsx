import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import {
  CREAM,
  PING_DECAY,
  RADIUS,
  RED,
  type RadarTarget,
  crossed,
  sweepState,
} from "./radar-config";

const SPARKS = 6;

/**
 * TargetBlip — a contact floating at its own altitude above the disc.
 *
 * Detection choreography, driven entirely by the shared sweep bearing:
 *   beam crosses bearing -> ping = 1 -> core flares and dims, detection ring
 *   expands across the floor, a small spark burst fires outward, then
 *   everything decays exponentially (frame-rate independent: exp(-k * dt)).
 */
export function TargetBlip({
  target,
  hovered,
  onHover,
  onDetect,
}: {
  target: RadarTarget;
  hovered: boolean;
  onHover: (t: RadarTarget | null) => void;
  onDetect: (t: RadarTarget) => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Group>(null);
  const ping = useRef(0);
  const prevAngle = useRef(0);

  const x = Math.cos(target.angle) * RADIUS * target.dist;
  const z = Math.sin(target.angle) * RADIUS * target.dist;
  // bearing in the sweep's own frame (sweep angle grows the opposite way)
  const bearing = (Math.PI * 2 - target.angle) % (Math.PI * 2);

  const sparkDirs = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, i) => {
        const a = (i / SPARKS) * Math.PI * 2;
        return [Math.cos(a), Math.sin(a)] as const;
      }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = sweepState.angle;
    if (crossed(prevAngle.current, now, bearing)) {
      ping.current = 1;
      onDetect(target);
    }
    prevAngle.current = now;
    ping.current *= Math.exp(-PING_DECAY * dt);
    const p = ping.current;

    if (coreMat.current) coreMat.current.opacity = 0.3 + p * 0.7;
    if (core.current) {
      core.current.scale.setScalar((hovered ? 1.7 : 1) * (1 + p * 0.8));
    }
    if (halo.current) {
      const idle = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.06;
      halo.current.scale.setScalar(idle * (hovered ? 1.5 : 1) + p * 0.8);
    }
    if (ring.current && ringMat.current) {
      ring.current.scale.setScalar(0.4 + (1 - p) * 2.8);
      ringMat.current.opacity = p * 0.5;
    }
    if (sparks.current) {
      sparks.current.visible = p > 0.02;
      sparks.current.children.forEach((child, i) => {
        const dir = sparkDirs[i];
        if (!dir) return;
        const d = (1 - p) * 0.34;
        child.position.set(dir[0] * d, dir[1] * d, 0);
        child.scale.setScalar(p);
      });
    }
  });

  return (
    <group position={[x, target.height, z]}>
      {/* altitude stalk down to the scope floor — reads as depth */}
      <mesh position={[0, -target.height / 2, 0]}>
        <boxGeometry args={[0.005, target.height, 0.005]} />
        <meshBasicMaterial color={CREAM} transparent opacity={0.22} />
      </mesh>

      <mesh
        ref={core}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(target);
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshBasicMaterial ref={coreMat} color={RED} transparent opacity={0.6} />
      </mesh>

      {/* pulsing detection halo around the core */}
      <mesh ref={halo}>
        <ringGeometry args={[0.085, 0.098, 40]} />
        <meshBasicMaterial
          color={hovered ? CREAM : RED}
          transparent
          opacity={hovered ? 0.8 : 0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* spark burst fired on detection */}
      <group ref={sparks} visible={false}>
        {sparkDirs.map((d) => (
          <mesh key={`${d[0]}-${d[1]}`}>
            <sphereGeometry args={[0.011, 6, 6]} />
            <meshBasicMaterial color={CREAM} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>

      {/* expanding contact ring on the floor */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={-target.height}>
        <ringGeometry args={[0.06, 0.075, 48]} />
        <meshBasicMaterial ref={ringMat} color={RED} transparent opacity={0} />
      </mesh>

      {hovered ? (
        <>
          {/* thin connection line from the blip up to its label */}
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.003, 0.28, 0.003]} />
            <meshBasicMaterial color={CREAM} transparent opacity={0.5} />
          </mesh>
          <Html center distanceFactor={6} position={[0, 0.42, 0]}>
            <div className="mono w-40 whitespace-nowrap border border-destructive bg-black px-2 py-1.5 text-[9px] leading-relaxed text-cream">
              <div>{target.id}</div>
              <div className="my-1 h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">MATCH</span>
                <span>{target.match}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UNIQUE</span>
                <span>{target.unique}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STATUS</span>
                <span className="text-destructive">LOCK</span>
              </div>
            </div>
          </Html>
        </>
      ) : null}
    </group>
  );
}
