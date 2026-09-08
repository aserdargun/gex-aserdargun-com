import { useMemo } from "react";
import type { ExplorerState } from "../data/types";
import { memoryAccess, selectedTile, matrixCell } from "../lib/simulation";
import {
  Cubes,
  Label,
  Packet,
  Part,
  Traces,
  palette,
  type Point,
} from "./primitives";

export function Memory({
  state,
  onSelect,
}: {
  state: ExplorerState;
  onSelect: (n: number) => void;
}) {
  const access = memoryAccess(state.pattern, state.stride);
  const lanePos = (id: number): Point => [
    ((id % 16) - 7.5) * 0.55,
    0.3,
    2.5 + Math.floor(id / 16) * 0.7,
  ];
  const groupPos = (id: number): Point => [
    ((id % 16) - 7.5) * 0.55,
    0.3,
    -3.5 + Math.floor(id / 16) * 0.75,
  ];
  const segments = useMemo(
    () =>
      Array.from(
        { length: 32 },
        (_, i) =>
          [lanePos(i), groupPos(Math.floor(access.addresses[i] / 8))] as [
            Point,
            Point,
          ],
      ),
    [access.addresses],
  );
  const selectedGroup = Math.floor(access.addresses[state.selectedLane] / 8);
  const cold = !(state.cacheHit && state.step >= 1);
  return (
    <group name="MEMORY_VIS">
      <Part
        position={[0, -0.06, 2.9]}
        size={[9.4, 0.12, 1.8]}
        color="#263236"
      />
      <Part
        position={[0, -0.06, -3.1]}
        size={[9.4, 0.12, 1.8]}
        color="#263236"
      />
      <Cubes
        items={Array.from({ length: 32 }, (_, id) => ({
          id,
          position: lanePos(id),
          color: id === state.selectedLane ? "#f7d8b0" : palette.compute,
        }))}
        size={[0.42, 0.28, 0.42]}
        onSelect={onSelect}
      />
      <Cubes
        items={Array.from({ length: 32 }, (_, id) => ({
          id,
          position: groupPos(id),
          color: access.groups.includes(id)
            ? id === selectedGroup
              ? "#d7f0df"
              : palette.memory
            : palette.muted,
        }))}
        size={[0.43, 0.27, 0.45]}
      />
      <Traces
        segments={segments}
        opacity={state.pattern === "contiguous" ? 0.35 : 0.18}
      />
      <Traces
        segments={[segments[state.selectedLane]]}
        color="#cde6f4"
        opacity={0.85}
      />
      {state.labels && (
        <>
          <Label position={[0, 0.7, 4.25]} tone="compute">
            32 {state.locale === "en" ? "LOGICAL LANES" : "MANTIKSAL ŞERİT"}
          </Label>
          <Label position={[0, 0.7, -4.5]} tone="memory">
            {access.groups.length} / 32{" "}
            {state.locale === "en"
              ? "ADDRESS GROUPS TOUCHED"
              : "ADRES GRUBUNA ERİŞİLDİ"}
          </Label>
          <Label position={[lanePos(state.selectedLane)[0], 1, 1.2]}>
            lane {state.selectedLane} → A[{access.addresses[state.selectedLane]}
            ]
          </Label>
        </>
      )}
      {[
        ["L1", 0],
        ["L2", 1],
        ["VRAM", 2],
      ].map(([name, index]) => (
        <group key={name}>
          <Part
            position={[6, 0.3, (Number(index) - 1) * 1.6]}
            size={[1.7, 0.25, 1]}
            color={
              state.step === 1 && index === 0
                ? palette.memory
                : state.step === 2 && cold
                  ? palette.memory
                  : palette.muted
            }
          />
          <Label position={[6, 0.68, (Number(index) - 1) * 1.6]}>{name}</Label>
        </group>
      ))}
      {state.step === 1 && (
        <Packet
          from={[0, 0.5, 2.5]}
          to={[6, 0.5, -1.6]}
          playing={state.playing}
          reducedMotion={state.reducedMotion}
        />
      )}
      {state.step === 2 && (
        <Packet
          from={[6, 0.5, -1.6]}
          to={state.cacheHit ? [0, 0.5, 2.5] : [6, 0.5, 1.6]}
          playing={state.playing}
          reducedMotion={state.reducedMotion}
        />
      )}
      {state.step === 3 && (
        <Packet
          from={state.cacheHit ? [6, 0.5, -1.6] : [6, 0.5, 1.6]}
          to={[0, 0.5, 2.5]}
          playing={state.playing}
          reducedMotion={state.reducedMotion}
        />
      )}
    </group>
  );
}

export function Tensor({
  state,
  onSelect,
}: {
  state: ExplorerState;
  onSelect: (n: number) => void;
}) {
  const tile = selectedTile(state.selectedCell, state.tileSize);
  const full = state.step >= 5;
  const contribution =
    state.step >= 4
      ? matrixCell(
          Math.floor(state.selectedCell / 8),
          state.selectedCell % 8,
          full ? 8 : state.tileSize,
        )
      : 0;
  const positions: Point[] = [
    [-4.9, 0.3, -0.6],
    [0, 0.3, -0.6],
    [4.9, 0.3, -0.6],
  ];
  return (
    <group name="TENSOR_VIS">
      {["A", "B", "C"].map((matrix, which) => (
        <group
          key={matrix}
          position={positions[which]}
          name={`GEX_MATRIX_${matrix}`}
        >
          <Part
            position={[0, -0.24, 0]}
            size={[3.95, 0.15, 3.95]}
            color="#263236"
          />
          <Cubes
            items={Array.from({ length: 64 }, (_, id) => {
              const row = Math.floor(id / 8),
                col = id % 8;
              const active =
                which === 0
                  ? row >= tile.row &&
                    row < tile.row + state.tileSize &&
                    (full || col < state.tileSize)
                  : which === 1
                    ? col >= tile.col &&
                      col < tile.col + state.tileSize &&
                      (full || row < state.tileSize)
                    : row >= tile.row &&
                      row < tile.row + state.tileSize &&
                      col >= tile.col &&
                      col < tile.col + state.tileSize;
              return {
                id,
                position: [
                  (col - 3.5) * 0.45,
                  which === 2 && active && state.step >= 4 ? 0.15 : 0,
                  (row - 3.5) * 0.45,
                ] as Point,
                color:
                  active && state.step > 0
                    ? which === 2
                      ? palette.compute
                      : palette.memory
                    : palette.muted,
              };
            })}
            size={[0.37, 0.22, 0.37]}
            onSelect={which === 2 ? onSelect : undefined}
          />
          <Label
            position={[0, 0.3, -2.75]}
            tone={which === 2 ? "compute" : "memory"}
          >
            {matrix} · 8 × 8
          </Label>
        </group>
      ))}
      <Label position={[-2.4, 0.6, -0.6]}>×</Label>
      <Label position={[2.45, 0.6, -0.6]}>=</Label>
      <Part
        position={[-3.8, 0.15, 4]}
        size={[3, 0.3, 1.2]}
        color={
          state.step === 2 || state.step === 3 ? palette.memory : palette.muted
        }
      />
      <Label position={[-3.8, 0.65, 4]}>
        {state.locale === "en" ? "SHARED WORKING SET" : "ORTAK ÇALIŞMA KÜMESİ"}
      </Label>
      <Part
        position={[0, 0.15, 4]}
        size={[2.6, 0.3, 1.2]}
        color={
          state.step === 4 || state.step === 5 ? palette.compute : palette.muted
        }
      />
      <Label position={[0, 0.65, 4]}>
        {state.tensorPath ? "MATRIX / MMA" : "SCALAR / FMA"}
      </Label>
      <Part
        position={[4, 0.15, 4]}
        size={[2.8, 0.3, 1.2]}
        color={state.step >= 4 ? palette.compute : palette.muted}
      />
      <Label position={[4, 0.65, 4]}>
        C[{Math.floor(state.selectedCell / 8)},{state.selectedCell % 8}] ={" "}
        {contribution}
      </Label>
      {state.step >= 2 && (
        <Traces
          segments={[
            [
              [-4.9, 0.4, 1.4],
              [-3.8, 0.4, 3.3],
            ],
            [
              [0, 0.4, 1.4],
              [-3.8, 0.4, 3.3],
            ],
            [
              [-2.3, 0.4, 4],
              [-1.3, 0.4, 4],
            ],
            [
              [1.3, 0.4, 4],
              [2.6, 0.4, 4],
            ],
          ]}
          opacity={0.6}
        />
      )}
      {(state.step === 2 || state.step === 4 || state.step === 5) && (
        <Packet
          from={state.step === 2 ? [-4.9, 0.5, 1.4] : [-2.3, 0.5, 4]}
          to={state.step === 2 ? [-3.8, 0.5, 3.3] : [2.6, 0.5, 4]}
          playing={state.playing}
          reducedMotion={state.reducedMotion}
        />
      )}
      {state.step === 3 && (
        <Label position={[0, 1, 2]} tone="memory">
          {state.locale === "en"
            ? "BLOCK BARRIER · ALL PARTICIPATING THREADS"
            : "BLOK BARİYERİ · KATILAN TÜM THREAD’LER"}
        </Label>
      )}
    </group>
  );
}
