import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Html, Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const SceneLabels = createContext(true);

export const palette = {
  compute: "#eab785",
  memory: "#abd8c1",
  data: "#85b9d5",
  muted: "#334247",
  edge: "#677c80",
  warning: "#e7a582",
  ground: "#192326",
};
export type Point = [number, number, number];

export function Part({
  position = [0, 0, 0],
  size = [1, 0.25, 1],
  color = palette.muted,
  name,
  children,
  onClick,
}: {
  position?: Point;
  size?: Point;
  color?: string;
  name?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <group position={position} name={name}>
      <mesh
        castShadow
        receiveShadow
        onClick={
          onClick
            ? (e) => {
                e.stopPropagation();
                onClick();
              }
            : undefined
        }
      >
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.22} />
      </mesh>
      {children}
    </group>
  );
}
export function Label({
  position,
  children,
  tone = "neutral",
  onClick,
}: {
  position: Point;
  children: ReactNode;
  tone?: string;
  onClick?: () => void;
}) {
  const visible = useContext(SceneLabels);
  if (!visible) return null;
  return (
    <Html position={position} center zIndexRange={[8, 0]}>
      <button
        className={`scene-label ${tone}`}
        onClick={onClick}
        tabIndex={onClick ? 0 : -1}
        style={{ pointerEvents: onClick ? "auto" : "none" }}
      >
        {children}
      </button>
    </Html>
  );
}
export function Cubes({
  items,
  size = [0.7, 0.3, 0.7],
  onSelect,
}: {
  items: { id: number; position: Point; color: string }[];
  size?: Point;
  onSelect?: (id: number) => void;
}) {
  return (
    <Instances limit={256} range={items.length} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial roughness={0.42} metalness={0.16} />
      {items.map((item) => (
        <Instance
          key={item.id}
          position={item.position}
          color={item.color}
          onClick={
            onSelect
              ? (e) => {
                  e.stopPropagation();
                  onSelect(item.id);
                }
              : undefined
          }
        />
      ))}
    </Instances>
  );
}
export function Traces({
  segments,
  color = palette.data,
  opacity = 0.4,
}: {
  segments: [Point, Point][];
  color?: string;
  opacity?: number;
}) {
  const geometry = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints(
        segments.flatMap(([a, b]) => [
          new THREE.Vector3(...a),
          new THREE.Vector3(...b),
        ]),
      ),
    [segments],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}
export function Packet({
  from,
  to,
  playing,
  reducedMotion,
  color = palette.data,
}: {
  from: Point;
  to: Point;
  playing: boolean;
  reducedMotion: boolean;
  color?: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  useFrame((_state, delta) => {
    if (!mesh.current) return;
    if (playing && !reducedMotion)
      progress.current = (progress.current + delta * 0.45) % 1;
    else progress.current = 0.5;
    mesh.current.position.lerpVectors(
      new THREE.Vector3(...from),
      new THREE.Vector3(...to),
      progress.current,
    );
  });
  return (
    <mesh ref={mesh} position={from}>
      <sphereGeometry args={[0.11, 10, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}
export function Floor() {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.39, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={palette.ground} roughness={0.9} />
      </mesh>
      <gridHelper
        args={[70, 70, "#354044", "#2b373b"]}
        position={[0, -0.385, 0]}
        material-transparent
        material-opacity={0.22}
      />
    </group>
  );
}
