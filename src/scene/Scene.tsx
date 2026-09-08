import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import type { ComponentId, ExplorerState } from "../data/types";
import { Hardware } from "./Hardware";
import { Kernel, Warp } from "./Execution";
import { Memory, Tensor } from "./MemoryTensor";
import { Floor, type Point } from "./primitives";

function SceneLifecycle({
  onReady,
  onContextLost,
}: {
  onReady: () => void;
  onContextLost: () => void;
}) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    onReady();
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onReady, onContextLost]);
  return null;
}

function Camera({ state }: { state: ExplorerState }) {
  const { camera, size, invalidate } = useThree();
  const control = useRef<Controls>(null);
  const target = useRef(new THREE.Vector3());
  const eye = useRef(new THREE.Vector3(2, 13, 17));
  const zoom = useRef(40);
  const moving = useRef(true);
  const stage =
    state.mode === "anatomy"
      ? state.step
      : state.mode === "kernel"
        ? state.step >= 5 && state.step <= 12
          ? "lanes"
          : state.step === 3 || state.step === 4
            ? "block"
            : "grid"
        : state.mode;
  useEffect(() => {
    let point: Point = [0, 0, 0],
      position: Point = [2, 13, 17],
      width = 13.8,
      height = 8.2;
    if (state.mode === "anatomy") {
      if (stage === 1) {
        position = [4, 13, 17];
        width = 15;
        height = 12;
      }
      if (stage === 2) {
        position = [3, 13, 14];
        width = 12;
        height = 10;
        point = [0, 0.4, 0];
      }
      if (stage === 3) {
        position = [-1, 7, 9];
        width = 7;
        height = 6;
        point = [-2.5, 0.7, -1.2];
      }
      if (stage === 4) {
        position = [0, 10, 12];
        width = 12;
        height = 9;
      }
    } else if (state.mode === "sm") {
      position = [3, 12, 13];
      width = 13;
      height = 11;
    } else if (state.mode === "warp") {
      position = [0, 16, 10];
      width = 10.5;
      height = 8;
    } else if (state.mode === "kernel") {
      position = [2, 13, 16];
      width = 16;
      height = 11;
      if (stage === "block") {
        position = [0, 14, 14];
        width = 12;
        height = 10;
      }
      if (stage === "lanes") {
        position = [0, 13, 13];
        width = 12;
        height = 11;
        point = [0, 0, -0.7];
      }
    } else if (state.mode === "memory") {
      position = [1, 16, 15];
      width = 17;
      height = 13;
      point = [0.7, 0, 0];
    } else if (state.mode === "tensor") {
      position = [1, 16, 16];
      width = 18;
      height = 12;
      point = [0, 0, 1];
    }
    target.current.set(...point);
    eye.current.set(...position);
    zoom.current = Math.min(size.width / width, size.height / height);
    moving.current = true;
    invalidate();
  }, [state.mode, stage, state.viewReset, size.width, size.height, invalidate]);
  useFrame((_s, delta) => {
    if (!moving.current || !control.current) return;
    const rate = state.reducedMotion
      ? 1
      : 1 - Math.exp(-Math.min(delta, 0.1) * 5);
    camera.position.lerp(eye.current, rate);
    control.current.target.lerp(target.current, rate);
    camera.zoom = THREE.MathUtils.lerp(camera.zoom, zoom.current, rate);
    camera.updateProjectionMatrix();
    control.current.update();
    if (
      camera.position.distanceTo(eye.current) < 0.008 &&
      Math.abs(camera.zoom - zoom.current) < 0.02
    )
      moving.current = false;
    else invalidate();
  });
  return (
    <OrbitControls
      ref={control}
      makeDefault
      enableDamping={!state.reducedMotion}
      dampingFactor={0.12}
      minZoom={12}
      maxZoom={150}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.08}
      enablePan={false}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}

export default function Scene({
  state,
  onComponent,
  onLane,
  onCell,
  onReady,
  onContextLost,
}: {
  state: ExplorerState;
  onComponent: (id: ComponentId) => void;
  onLane: (id: number) => void;
  onCell: (id: number) => void;
  onReady: () => void;
  onContextLost: () => void;
}) {
  return (
    <Canvas
      orthographic
      shadows="percentage"
      dpr={[1, 1.5]}
      frameloop={state.playing && !state.reducedMotion ? "always" : "demand"}
      camera={{ position: [8, 13, 17], zoom: 40, near: 0.1, far: 250 }}
      gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#192326");
        gl.domElement.setAttribute(
          "aria-label",
          "GEX interactive educational 3D viewport",
        );
      }}
    >
      <color attach="background" args={["#192326"]} />
      <fog attach="fog" args={["#192326", 35, 75]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#d2e2e7", "#202a2e", 0.9]} />
      <directionalLight
        position={[-5, 12, 8]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />
      <directionalLight position={[8, 6, -8]} intensity={1.6} color="#bdd2ca" />
      <Suspense fallback={null}>
        <SceneLifecycle onReady={onReady} onContextLost={onContextLost} />
        {state.mode === "anatomy" &&
          (state.step === 4 ? (
            <Warp state={state} onSelect={onLane} asKernel />
          ) : (
            <Hardware kind="gpu" state={state} onSelect={onComponent} />
          ))}
        {state.mode === "sm" && (
          <Hardware kind="sm" state={state} onSelect={onComponent} />
        )}
        {state.mode === "kernel" && <Kernel state={state} onSelect={onLane} />}
        {state.mode === "warp" && <Warp state={state} onSelect={onLane} />}
        {state.mode === "memory" && <Memory state={state} onSelect={onLane} />}
        {state.mode === "tensor" && <Tensor state={state} onSelect={onCell} />}
      </Suspense>
      <Floor />
      <Camera state={state} />
    </Canvas>
  );
}
