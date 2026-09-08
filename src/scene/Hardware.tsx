import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ComponentId, ExplorerState } from "../data/types";
import { components } from "../data/components";
import { Label, Packet, Part, palette, type Point } from "./primitives";

function identify(obj: THREE.Object3D): ComponentId | null {
  for (
    let current: THREE.Object3D | null = obj;
    current;
    current = current.parent
  ) {
    const n = current.name;
    if (/GEX_SM_\d/.test(n)) return "sm";
    if (/GLOBAL_/.test(n)) return "global";
    if (/MEMORY_L2|L2_/.test(n)) return "l2";
    if (/CONTROLLER/.test(n)) return "controller";
    if (/HOST_INTERFACE/.test(n)) return "host";
    if (/GPU_DIE/.test(n)) return "die";
    if (/CLUSTER/.test(n)) return "cluster";
    if (/PACKAGE/.test(n)) return "package";
    if (/BOARD/.test(n)) return "board";
    if (/WARP_SCHEDULER/.test(n)) return "scheduler";
    if (/REGISTER/.test(n)) return "registers";
    if (/SHARED/.test(n)) return "shared";
    if (/LOAD_STORE/.test(n)) return "loadstore";
    if (/TENSOR|MATRIX_RESOURCE/.test(n)) return "tensor";
    if (/EXECUTION/.test(n)) return "arithmetic";
  }
  return null;
}
export function Hardware({
  kind,
  state,
  onSelect,
}: {
  kind: "gpu" | "sm";
  state: ExplorerState;
  onSelect: (id: ComponentId) => void;
}) {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/gex-${kind}.glb`);
  const scene = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.material = Array.isArray(object.material)
          ? object.material.map((m) => m.clone())
          : object.material.clone();
      }
    });
    return model;
  }, [gltf]);
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const selected = identify(object) === state.selectedComponent;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.set(selected ? "#526b5f" : "#000000");
            mat.emissiveIntensity = selected ? 0.16 : 0;
          }
        });
      }
    });
  }, [scene, state.selectedComponent]);
  useEffect(
    () => () => {
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
      });
    },
    [scene],
  );
  const label = (id: ComponentId, position: Point) =>
    state.labels && (
      <Label
        key={id}
        position={position}
        onClick={() => onSelect(id)}
        tone={
          ["sm", "arithmetic", "tensor"].includes(id) ? "compute" : "memory"
        }
      >
        {components[id].name[state.locale]}
      </Label>
    );
  return (
    <group name={kind === "gpu" ? "GPU_SYSTEM" : "SM_MASTER"}>
      <primitive
        object={scene}
        onClick={(event: {
          stopPropagation: () => void;
          object: THREE.Object3D;
        }) => {
          const id = identify(event.object);
          if (id) {
            event.stopPropagation();
            onSelect(id);
          }
        }}
      />
      {kind === "gpu" ? (
        <>
          {label("global", [-5.25, 1.55, -2.4])}
          {label("die", [0, 2.1, -2.8])}
          {label("sm", [2.7, 2.3, 1.9])}
        </>
      ) : (
        <>
          {label("scheduler", [0, 1.15, -2.8])}
          {label("registers", [-2.3, 1.05, -1.4])}
          {label("shared", [0, 1.15, 2.75])}
          {label("arithmetic", [-2.2, 1.1, 0.35])}
          {label("tensor", [1.2, 1.15, 0.35])}
          {label("loadstore", [4, 1.2, -0.8])}
          {Array.from({ length: 4 }, (_, i) => (
            <Part
              key={i}
              position={[-2.5 + i * 1.65, 1, -3.5]}
              size={[1.2, 0.15, 0.6]}
              color={
                state.step === 3
                  ? i === 1
                    ? palette.compute
                    : palette.muted
                  : i === 0
                    ? state.step === 2
                      ? palette.muted
                      : palette.compute
                    : palette.muted
              }
            />
          ))}
          {state.step > 0 && (
            <Packet
              from={state.step === 3 ? [-0.85, 1, -3.5] : [-2.5, 1, -3.5]}
              to={state.step === 1 ? [3.6, 1, 0.5] : [-2.1, 1, 0.4]}
              playing={state.playing}
              reducedMotion={state.reducedMotion}
            />
          )}
        </>
      )}
    </group>
  );
}
