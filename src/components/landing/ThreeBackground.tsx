import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { feature } from 'topojson-client';
// @ts-ignore – world-atlas ships raw JSON, no type defs
import landTopology from 'world-atlas/land-110m.json';
import { SymbolGrid } from './SymbolGrid';

// ─── Shader Strings ───────────────────────────────────────────────

const borderVertexShader = `
  varying float vLocalY;
  void main() {
    vLocalY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const borderFragmentShader = `
  uniform float uIgnitionProgress;
  uniform vec3 uColor;
  varying float vLocalY;

  void main() {
    float radius = 2.02;
    float normalizedY = (vLocalY + radius) / (2.0 * radius);
    float distFromTop = 1.0 - normalizedY;

    float wave = uIgnitionProgress * 1.3;
    float revealed = smoothstep(wave, wave - 0.2, distFromTop);

    float frontPos = min(uIgnitionProgress * 1.3, 1.2);
    float frontDist = distFromTop - frontPos;
    float frontGlow = exp(-frontDist * frontDist * 60.0)
      * step(0.001, uIgnitionProgress)
      * (1.0 - step(1.0, uIgnitionProgress));

    float alpha = revealed * 0.65 + frontGlow * 0.9;
    if (alpha < 0.01) discard;

    vec3 finalColor = mix(uColor, uColor + vec3(0.3, 0.3, 0.4), frontGlow);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ─── Constants ────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;

// ─── Continent Borders with Ignition ──────────────────────────────

function ContinentBorders() {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const startTime = useRef(-1);

  const geometry = useMemo(() => {
    const vertices: number[] = [];
    const radius = 2.02;

    // Convert real-world coastline data to 3D line segments
    const topo = landTopology as any;
    const landObject = topo?.objects?.land;
    if (!landObject) {
      console.warn('world-atlas land topology not found, skipping borders');
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      return geo;
    }
    const land = feature(topo, landObject) as any;

    const processRing = (ring: number[][]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lon1, lat1] = ring[i]; // GeoJSON is [lon, lat]
        const [lon2, lat2] = ring[i + 1];

        const colat1 = (90 - lat1) * DEG2RAD;
        const theta1 = lon1 * DEG2RAD;
        const colat2 = (90 - lat2) * DEG2RAD;
        const theta2 = lon2 * DEG2RAD;

        vertices.push(
          radius * Math.sin(colat1) * Math.cos(theta1),
          radius * Math.cos(colat1),
          -radius * Math.sin(colat1) * Math.sin(theta1)
        );
        vertices.push(
          radius * Math.sin(colat2) * Math.cos(theta2),
          radius * Math.cos(colat2),
          -radius * Math.sin(colat2) * Math.sin(theta2)
        );
      }
    };

    const processGeometry = (geom: any) => {
      if (geom.type === 'MultiPolygon') {
        for (const polygon of geom.coordinates) {
          for (const ring of polygon) {
            processRing(ring);
          }
        }
      } else if (geom.type === 'Polygon') {
        for (const ring of geom.coordinates) {
          processRing(ring);
        }
      }
    };

    // feature() returns a FeatureCollection when given a GeometryCollection
    if (land.type === 'FeatureCollection') {
      for (const feat of land.features) {
        processGeometry(feat.geometry);
      }
    } else if (land.geometry) {
      processGeometry(land.geometry);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uIgnitionProgress: { value: 0 },
      uColor: { value: new THREE.Color(0.576, 0.773, 0.992) },
    }),
    []
  );

  useFrame((state) => {
    if (!shaderRef.current) return;
    if (startTime.current < 0) startTime.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTime.current;
    shaderRef.current.uniforms.uIgnitionProgress.value = Math.min(elapsed / 2.0, 1.0);
  });

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        ref={shaderRef}
        transparent
        depthWrite={false}
        depthTest={true}
        uniforms={uniforms}
        vertexShader={borderVertexShader}
        fragmentShader={borderFragmentShader}
      />
    </lineSegments>
  );
}

// ─── Data Points ──────────────────────────────────────────────────

function DataPoints() {
  const positions = useMemo(() => {
    const pos: number[] = [];
    const count = 40;
    const radius = 2.03;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      pos.push(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );
    }
    return new Float32Array(pos);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#60a5fa" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

// ─── Earth Globe ──────────────────────────────────────────────────

function EarthGlobe() {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.06;
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Dark globe surface */}
      <Sphere args={[2, 64, 64]}>
        <meshPhysicalMaterial
          color="#0a1628"
          metalness={0.3}
          roughness={0.7}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
          depthWrite={true}
        />
      </Sphere>

      {/* Inner glow */}
      <Sphere args={[1.95, 32, 32]}>
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.08} />
      </Sphere>

      {/* Continent borders with ignition animation */}
      <ContinentBorders />

      {/* Accent data points on surface */}
      <DataPoints />

      {/* Outer atmospheric glow */}
      <Sphere args={[2.15, 32, 32]}>
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.07} side={THREE.BackSide} />
      </Sphere>
      <Sphere args={[2.3, 32, 32]}>
        <meshBasicMaterial color="#1e40af" transparent opacity={0.05} side={THREE.BackSide} />
      </Sphere>
      <Sphere args={[2.5, 32, 32]}>
        <meshBasicMaterial color="#1e3a5f" transparent opacity={0.03} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}


function OrbitalRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
      <torusGeometry args={[3.2, 0.008, 8, 128]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
    </mesh>
  );
}


// ─── Cinematic Lighting ───────────────────────────────────────────

function CinematicLighting() {
  return (
    <>
      <directionalLight position={[5, 5, 3]} intensity={0.4} color="#93c5fd" />
      <directionalLight position={[-4, 2, 2]} intensity={0.15} color="#3b82f6" />
      <directionalLight position={[0, -3, -5]} intensity={0.1} color="#1e40af" />
      <ambientLight intensity={0.05} color="#1e3a5f" />
      <pointLight position={[3, 2, 4]} intensity={0.3} color="#60a5fa" distance={10} />
    </>
  );
}

// ─── Scene Composition ────────────────────────────────────────────

function Scene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.1;
      groupRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.06) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <CinematicLighting />
      <EarthGlobe />
      <OrbitalRing />
    </group>
  );
}

// ─── Main Export ──────────────────────────────────────────────────

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Deep dark base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(222, 47%, 8%) 0%, hsl(222, 47%, 5%) 50%, hsl(222, 47%, 3%) 100%)',
        }}
      />

      {/* Background symbol grid pattern */}
      <SymbolGrid />

      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* Top fade for navbar */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, hsl(222, 47%, 4%) 0%, transparent 100%)',
        }}
      />

      {/* Center vignette for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, hsl(222, 47%, 4% / 0.3) 100%)',
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(222, 47%, 5%) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
