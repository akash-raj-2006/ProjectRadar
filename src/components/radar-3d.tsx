import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { RadarBase } from "./radar/radar-base";
import { RadarParticles } from "./radar/radar-particles";
import { RadarSweep } from "./radar/radar-sweep";
import { TargetBlip } from "./radar/radar-targets";
import { TARGETS, type RadarTarget, sweepState } from "./radar/radar-config";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * ProjectRadar — a volumetric 3D scanning instrument.
 *
 * Composition:
 *   RadarBase      breathing range rings, radial spokes, hot centre
 *   RadarSweep     3-layer beam (glow / body / hot edge) + vertical scan plane
 *   TargetBlip     contacts at real altitudes that flare when the beam hits
 *   RadarParticles single Points cloud of drifting data motes
 *   Bloom          applied only to the bright red emissive elements
 *
 * Motion is all delta-time based and damped with exp(-k * dt), so it behaves
 * identically at 30 or 144 fps.
 */

/** Tilts the whole scope a few degrees toward the pointer. */
function Parallax({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, delta) => {
    if (!group.current) return;
    const k = 1 - Math.exp(-5 * Math.min(delta, 0.05));
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -pointer.y * 0.09,
      k,
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      -pointer.x * 0.09,
      k,
    );
  });
  return <group ref={group}>{children}</group>;
}

export default function Radar3D() {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState<RadarTarget | null>(null);
  const [detected, setDetected] = useState<RadarTarget | null>(null);

  // Inspecting a contact slows the scan — the instrument feels aware of you.
  useEffect(() => {
    sweepState.speed = hovered ? 0.3 : 1;
    return () => {
      sweepState.speed = 1;
    };
  }, [hovered]);

  const onDetect = useCallback((t: RadarTarget) => {
    setDetected((prev) => (prev?.id === t.id ? prev : t));
  }, []);

  const segments = isMobile ? 48 : 96;
  const readout = hovered ?? detected;

  return (
    <div className="relative aspect-square w-full">
      <Canvas
        camera={{ position: [0, 4, 6.6], fov: 40 }}
        dpr={isMobile ? 1 : [1, 1.5]}
        gl={{ antialias: !isMobile, alpha: true }}
      >
        <Parallax>
          <RadarBase segments={segments} />
          <RadarSweep segments={segments} />
          <RadarParticles count={isMobile ? 110 : 320} />
          {TARGETS.map((t) => (
            <TargetBlip
              key={t.id}
              target={t}
              hovered={hovered?.id === t.id}
              onHover={setHovered}
              onDetect={onDetect}
            />
          ))}
        </Parallax>

        {/* Bloom only lifts the already-bright red elements; the grid stays dark */}
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={isMobile ? 0.25 : 0.6}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.2}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* HUD readout layered over the canvas (DOM, not in-scene) */}
      <div className="mono pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-1 pt-1 text-[9px] text-muted-foreground">
        <span>CONTACTS: {TARGETS.length}</span>
        <span className={hovered ? "text-destructive" : ""}>
          {hovered ? "SCAN: HOLD" : "SCAN: 360°"}
        </span>
      </div>
      <div className="mono pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-1 pb-1 text-[9px] text-muted-foreground">
        <span className="truncate">
          {readout ? (
            <>
              <span className="text-destructive">◉</span> {readout.id} ·{" "}
              <span className="text-foreground">{readout.label}</span>
            </>
          ) : (
            "STANDBY"
          )}
        </span>
        <span className="text-foreground">
          {readout ? `${readout.match}% MATCH` : "—"}
        </span>
      </div>
    </div>
  );
}
