import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { CREAM, RADIUS } from "./radar-config";

/**
 * RadarParticles — faint data motes drifting inside the scan volume.
 * Rendered as a single Points object (one draw call) rather than hundreds of
 * meshes, so it stays cheap on phones and integrated GPUs.
 */
export function RadarParticles({ count = 300 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * RADIUS;
      data[i * 3] = Math.cos(angle) * radius;
      data[i * 3 + 1] = Math.random() * 1.3;
      data[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return data;
  }, [count]);

  // Very slow counter-rotation: enough to feel alive, not enough to distract.
  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += Math.min(delta, 0.05) * 0.04;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={CREAM}
        size={0.014}
        sizeAttenuation
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </points>
  );
}
