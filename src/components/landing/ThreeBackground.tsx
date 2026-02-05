import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, GradientTexture } from '@react-three/drei';
import * as THREE from 'three';

// Refined Financial Globe with grid lines
function FinancialGlobe() {
  const globeRef = useRef<THREE.Group>(null);
  const innerGlobeRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.LineSegments>(null);

  // Create latitude/longitude grid geometry
  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const radius = 2.02;
    
    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = (90 - lat) * (Math.PI / 180);
      const segments = 64;
      
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        vertices.push(x, y, z);
        
        if (i < segments) {
          const nextTheta = ((i + 1) / segments) * Math.PI * 2;
          const nx = radius * Math.sin(phi) * Math.cos(nextTheta);
          const ny = radius * Math.cos(phi);
          const nz = radius * Math.sin(phi) * Math.sin(nextTheta);
          vertices.push(nx, ny, nz);
        }
      }
    }
    
    // Longitude lines
    for (let lon = 0; lon < 360; lon += 30) {
      const theta = lon * (Math.PI / 180);
      const segments = 64;
      
      for (let i = 0; i <= segments; i++) {
        const phi = (i / segments) * Math.PI;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        vertices.push(x, y, z);
        
        if (i < segments) {
          const nextPhi = ((i + 1) / segments) * Math.PI;
          const nx = radius * Math.sin(nextPhi) * Math.cos(theta);
          const ny = radius * Math.cos(nextPhi);
          const nz = radius * Math.sin(nextPhi) * Math.sin(theta);
          vertices.push(nx, ny, nz);
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  // Slow, smooth rotation
  useFrame((state) => {
    if (globeRef.current) {
      // Very slow rotation - institutional and calm
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      // Subtle tilt oscillation
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
  });

  return (
    <group ref={globeRef} position={[0, 0, 0]}>
      {/* Main globe sphere - dark with subtle reflection */}
      <Sphere ref={innerGlobeRef} args={[2, 64, 64]}>
        <meshPhysicalMaterial
          color="#0a1628"
          metalness={0.3}
          roughness={0.7}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
          envMapIntensity={0.5}
          transparent
          opacity={0.95}
        />
      </Sphere>
      
      {/* Inner glow sphere */}
      <Sphere args={[1.95, 32, 32]}>
        <meshBasicMaterial
          color="#1e3a5f"
          transparent
          opacity={0.1}
        />
      </Sphere>
      
      {/* Grid lines */}
      <lineSegments ref={gridRef} geometry={gridGeometry}>
        <lineBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
          linewidth={1}
        />
      </lineSegments>
      
      {/* Outer atmospheric glow */}
      <Sphere args={[2.15, 32, 32]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Secondary atmospheric layer */}
      <Sphere args={[2.3, 32, 32]}>
        <meshBasicMaterial
          color="#1e40af"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// Subtle orbital ring
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
      <meshBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.2}
      />
    </mesh>
  );
}

// Accent light points on the globe
function DataPoints() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos: number[] = [];
    const count = 30;
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

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#60a5fa"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Cinematic lighting setup
function CinematicLighting() {
  return (
    <>
      {/* Main key light - soft blue from top-right */}
      <directionalLight
        position={[5, 5, 3]}
        intensity={0.4}
        color="#93c5fd"
      />
      
      {/* Fill light - subtle from left */}
      <directionalLight
        position={[-4, 2, 2]}
        intensity={0.15}
        color="#3b82f6"
      />
      
      {/* Rim light - creates depth */}
      <directionalLight
        position={[0, -3, -5]}
        intensity={0.1}
        color="#1e40af"
      />
      
      {/* Ambient - very subtle */}
      <ambientLight intensity={0.05} color="#1e3a5f" />
      
      {/* Subtle point light for globe highlight */}
      <pointLight
        position={[3, 2, 4]}
        intensity={0.3}
        color="#60a5fa"
        distance={10}
      />
    </>
  );
}

// Main scene composition
function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Gentle camera sway for parallax feel
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      groupRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.08) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <CinematicLighting />
      <FinancialGlobe />
      <OrbitalRing />
      <DataPoints />
    </group>
  );
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Deep dark base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(222, 47%, 8%) 0%, hsl(222, 47%, 5%) 50%, hsl(222, 47%, 3%) 100%)',
        }}
      />
      
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      
      {/* Top fade for navbar area */}
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
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, transparent 0%, hsl(222, 47%, 4% / 0.3) 100%)',
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
