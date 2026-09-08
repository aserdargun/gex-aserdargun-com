import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { ExplorerState } from "../data/types";
import { laneMask, launchShape, TEACHING_SMS } from "../lib/simulation";
import {
  Cubes,
  Label,
  Packet,
  Part,
  Traces,
  palette,
  type Point,
} from "./primitives";

export const lanePosition = (i: number): Point => [
  ((i % 8) - 3.5) * 1.1,
  0.35,
  (Math.floor(i / 8) - 1.5) * 1.1,
];
export function Warp({
  state,
  onSelect,
  asKernel = false,
}: {
  state: ExplorerState;
  onSelect: (n: number) => void;
  asKernel?: boolean;
}) {
  const mask = asKernel
    ? Array(32).fill(true)
    : laneMask(state.branch, state.step);
  const waiting = asKernel && [8, 9].includes(state.step);
  const items = Array.from({ length: 32 }, (_, id) => ({
    id,
    position: lanePosition(id),
    color: waiting
      ? palette.muted
      : mask[id]
        ? id === state.selectedLane
          ? "#f5d9b0"
          : palette.compute
        : palette.muted,
  }));
  return (
    <group name="GEX_WARP_00">
      <Part position={[0, -0.05, 0]} size={[9.5, 0.18, 5]} color="#263236" />
      <Cubes items={items} size={[0.77, 0.3, 0.77]} onSelect={onSelect} />
      {items.map(({ id, position }) => (
        <Html
          key={id}
          position={[position[0], 0.7, position[2]]}
          center
          zIndexRange={[7, 0]}
        >
          <button
            className={`lane-label ${mask[id] && !waiting ? "active" : ""} ${state.selectedLane === id ? "selected" : ""}`}
            aria-label={`${state.locale === "en" ? "Inspect lane" : "Şeridi incele"} ${id}`}
            onClick={() => onSelect(id)}
          >
            {id.toString().padStart(2, "0")}
          </button>
        </Html>
      ))}
      {state.labels && (
        <Label position={[0, 0.6, -3.15]} tone="compute">
          {asKernel
            ? `${state.locale === "tr" ? "BLOK" : "BLOCK"} 0 / WARP 0`
            : state.branch === "divergent" && state.step === 2
              ? `${state.locale === "tr" ? "A YOLU" : "PATH A"} · 16 / 32`
              : state.branch === "divergent" && state.step === 3
                ? `${state.locale === "tr" ? "B YOLU" : "PATH B"} · 16 / 32`
                : state.branch === "uniform" && state.step === 3
                  ? `${state.locale === "tr" ? "B YOLU" : "PATH B"} · 0 / 32`
                  : "WARP 0 · 32 / 32"}
        </Label>
      )}
    </group>
  );
}
function MovingBlock({
  id,
  target,
  state,
}: {
  id: number;
  target: Point;
  state: ExplorerState;
}) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const from: Point = [
    -4.5 + (id % 4) * 1.05,
    0.4,
    -2.3 + Math.floor(id / 4) * 1.5,
  ];
  useEffect(() => {
    if (state.reducedMotion && group.current)
      group.current.position.set(...target);
  }, [state.reducedMotion, target]);
  useFrame((_scene, dt) => {
    if (!group.current) return;
    const to = new THREE.Vector3(...target);
    if (group.current.position.distanceTo(to) > 0.001) {
      group.current.position.lerp(to, 1 - Math.exp(-dt * 5));
      invalidate();
    }
  });
  return (
    <group
      ref={group}
      position={from}
      name={`GEX_BLOCK_${id.toString().padStart(2, "0")}`}
    >
      <Part size={[0.83, 0.3, 0.92]} color={palette.compute} />
      <Label position={[0, 0.42, 0]}>B{id}</Label>
    </group>
  );
}
export function Kernel({
  state,
  onSelect,
}: {
  state: ExplorerState;
  onSelect: (n: number) => void;
}) {
  const shape = launchShape(state.blocks, state.threads);
  if (state.step >= 5 && state.step <= 12)
    return (
      <group>
        <Warp state={state} onSelect={onSelect} asKernel />
        {state.step >= 7 && (
          <>
            <Part
              position={[0, 0.2, -5]}
              size={[7, 0.4, 1.1]}
              color={palette.memory}
            />
            <Label position={[0, 0.7, -5]}>
              A[i] + B[i] {state.step >= 12 ? "→ C[i]" : ""}
            </Label>
            <Traces
              segments={Array.from(
                { length: 8 },
                (_, i) =>
                  [
                    [i - 3.5, 0.4, -4.5],
                    [i - 3.5, 0.4, -2.3],
                  ] as [Point, Point],
              )}
            />
            {[7, 10, 12].includes(state.step) && (
              <Packet
                from={
                  state.step === 7 || state.step === 12
                    ? [0, 0.6, -2.3]
                    : [0, 0.6, -4.5]
                }
                to={
                  state.step === 7 || state.step === 12
                    ? [0, 0.6, -4.5]
                    : [0, 0.6, -2.3]
                }
                playing={state.playing}
                reducedMotion={state.reducedMotion}
              />
            )}
          </>
        )}
        {state.step === 9 && shape.warpsPerBlock > 1 && (
          <Part
            position={[4.1, 0.6, -3.15]}
            size={[2.2, 0.3, 0.7]}
            color={palette.compute}
          >
            <Label position={[0, 0.55, 0]}>
              WARP 1 · {state.locale === "en" ? "READY WORK" : "HAZIR İŞ"}
            </Label>
          </Part>
        )}
      </group>
    );
  if (state.step === 3 || state.step === 4) {
    const warps = shape.warpsPerBlock;
    const items = Array.from({ length: state.threads }, (_, id) => {
      const warp = Math.floor(id / 32),
        lane = id % 32;
      const separated = state.step === 4;
      return {
        id,
        position: [
          ((lane % 8) - 3.5) * 0.28 +
            ((warp % 2) - 0.5) * (separated ? 3.5 : 2.6),
          0.35,
          (Math.floor(lane / 8) - 1.5) * 0.28 +
            (Math.floor(warp / 2) - (Math.ceil(warps / 2) - 1) / 2) *
              (separated ? 1.8 : 1.3),
        ] as Point,
        color: warp === 0 ? palette.compute : palette.memory,
      };
    });
    return (
      <group name="GEX_BLOCK_00">
        <Part
          size={[7.3, 0.2, Math.max(3, Math.ceil(warps / 2) * 1.9)]}
          color="#263236"
        />
        <Cubes items={items} size={[0.21, 0.24, 0.21]} />
        <Label position={[0, 0.65, -Math.max(2.4, Math.ceil(warps / 2))]}>
          {state.locale === "tr" ? "BLOK" : "BLOCK"} 0 · {state.threads}{" "}
          {state.locale === "en" ? "THREADS" : "İŞ PARÇACIĞI"}
        </Label>
        {state.step === 4 &&
          Array.from({ length: warps }, (_, i) => (
            <Label
              key={i}
              position={[
                ((i % 2) - 0.5) * 3.5,
                0.8,
                (Math.floor(i / 2) - (Math.ceil(warps / 2) - 1) / 2) * 1.8,
              ]}
            >
              WARP {i}
            </Label>
          ))}
      </group>
    );
  }
  return (
    <group name="GEX_EXECUTION">
      <Part position={[-3, 0.0, 0.2]} size={[5.5, 0.2, 7]} color="#263236" />
      <Label position={[-3, 0.5, -4.1]}>
        {state.step === 0 ? "HOST / CPU" : "GRID"} · {state.blocks}{" "}
        {state.locale === "en" ? "BLOCKS" : "BLOK"}
      </Label>
      {state.step === 0 ? (
        <Part
          position={[-3, 0.55, 0]}
          size={[3, 0.65, 2.6]}
          color={palette.edge}
        >
          <Label position={[0, 0.65, 0]}>
            add&lt;&lt;&lt;{state.blocks}, {state.threads}&gt;&gt;&gt;
          </Label>
        </Part>
      ) : (
        Array.from({ length: state.blocks }, (_, id) => {
          const scheduled =
            state.step >= 2 && (state.step >= 13 || id < TEACHING_SMS);
          const target: Point = scheduled
            ? [3.3, 0.65, ((id % 4) - 1.5) * 1.8]
            : [-4.5 + (id % 4) * 1.05, 0.4, -2.3 + Math.floor(id / 4) * 1.5];
          if (state.step >= 13 && id < (shape.waves - 1) * TEACHING_SMS)
            return null;
          return <MovingBlock key={id} id={id} target={target} state={state} />;
        })
      )}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i}>
          <Part
            position={[3.3, 0.0, (i - 1.5) * 1.8]}
            size={[3.3, 0.22, 1.5]}
            color={
              state.step === 14 && i < Math.min(4, state.blocks)
                ? palette.memory
                : palette.muted
            }
          />
          <Label position={[5.45, 0.3, (i - 1.5) * 1.8]}>SM {i}</Label>
        </group>
      ))}
      {state.step === 0 && (
        <Traces
          segments={[
            [
              [-1, 0.4, 0],
              [1.6, 0.4, 0],
            ],
          ]}
          opacity={0.65}
        />
      )}
      {state.step >= 13 && (
        <Label position={[3.3, 0.5, -4.1]} tone="memory">
          {state.step === 14
            ? state.locale === "en"
              ? "RESULT COMPLETE"
              : "SONUÇ TAMAM"
            : `${shape.waves} ${state.locale === "en" ? "WAVES TOTAL" : "DALGA TOPLAM"}`}
        </Label>
      )}
    </group>
  );
}
