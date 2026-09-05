import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { CREAM, RADIUS, RED, TAU } from "./radar-config";

/**
 * RadarBase — the ground instrument: dark disc, concentric range rings that
 * "breathe" on a slow 3s cycle, a radial spoke grid, and the hot centre point.
 */
export function RadarBase({ segments = 96 }: { segments?: number }) {
  const rings = useRef<THREE.Group>(null);

  // Radial spokes built as one BufferGeometry -> a single draw call.
  const spokes = useMemo(() => {
    const pts: number[] = [];
    const count = Math.max(12, Math.round(segments / 4));
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU;
      pts.push(0, 0, 0, Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [segments]);

  // Breathing: scale 1.000 -> 1.015 -> 1.000 every ~3 seconds. Deliberately
  // almost imperceptible; it just stops the grid reading as a static texture.
  useFrame((state) => {
    if (!rings.current) return;
    const t = state.clock.elapsedTime;
    rings.current.scale.setScalar(1 + Math.sin((t / 3) * TAU) * 0.0075);
  });

  const ringOpacity = [0.18, 0.12, 0.08, 0.05];

  return (
    <group rotation-x={-Math.PI / 2}>
      {/* disc floor so the sweep has something to wash over */}
      <mesh position-z={-0.004}>
        <circleGeometry args={[RADIUS, segments]} />
        <meshBasicMaterial color="#070707" transparent opacity={0.95} />
      </mesh>

      <group ref={rings}>
        {[0.25, 0.5, 0.75, 1].map((r, i) => (
          <mesh key={r} renderOrder={1}>
            <ringGeometry args={[RADIUS * r - 0.006, RADIUS * r, segments]} />
            <meshBasicMaterial
              color={CREAM}
              transparent
              opacity={i === 3 ? 0.3 : (ringOpacity[i] ?? 0.1)}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <lineSegments geometry={spokes} rotation-x={Math.PI / 2}>
        <lineBasicMaterial color={CREAM} transparent opacity={0.09} />
      </lineSegments>

      {/* centre origin marker — bright enough to catch the bloom pass */}
      <group rotation-x={Math.PI / 2}>
        <mesh>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={RED} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.1, 0.115, 48]} />
          <meshBasicMaterial color={CREAM} transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}
