import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Convert lat/lng to 3D coordinates
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Uniform global illumination points
function GlobalIllumination() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const count = 3000;
    const radius = 2.01;
    
    // Use fibonacci sphere distribution for even coverage
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      pos.push(x, y, z);
      
      // Subtle intensity variation using noise-like pattern
      const noise = Math.sin(theta * 5) * Math.cos(phi * 7) * 0.3 + 0.7;
      const intensity = 0.5 + noise * 0.5;
      
      // Cool blue/cyan color with slight variation
      col.push(
        0.6 + Math.random() * 0.1,  // R
        0.8 + Math.random() * 0.1,  // G
        1.0                          // B
      );
    }
    
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
    };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Slightly faster rotation for more momentum
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.06;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.08 + 0.15;
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
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

// Secondary fine illumination layer
function FineIlluminationLayer() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos: number[] = [];
    const count = 1500;
    const radius = 2.005;
    
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < count; i++) {
      // Offset pattern from main layer
      const theta = 2 * Math.PI * (i + 0.5) / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.25) / count);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      pos.push(x, y, z);
    }
    
    return new Float32Array(pos);
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.06;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.08 + 0.15;
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
        size={0.008}
        color="#93c5fd"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// Subtle grid overlay
function SubtleGrid() {
  const gridRef = useRef<THREE.LineSegments>(null);
  
  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const radius = 2.003;
    
    // Sparse latitude lines
    for (let lat = -60; lat <= 60; lat += 40) {
      const phi = (90 - lat) * (Math.PI / 180);
      const segments = 64;
      
      for (let i = 0; i < segments; i++) {
        const theta1 = (i / segments) * Math.PI * 2;
        const theta2 = ((i + 1) / segments) * Math.PI * 2;
        
        vertices.push(
          radius * Math.sin(phi) * Math.cos(theta1),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta1)
        );
        vertices.push(
          radius * Math.sin(phi) * Math.cos(theta2),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta2)
        );
      }
    }
    
    // Sparse longitude lines
    for (let lon = 0; lon < 360; lon += 40) {
      const theta = lon * (Math.PI / 180);
      const segments = 64;
      
      for (let i = 0; i < segments; i++) {
        const phi1 = (i / segments) * Math.PI;
        const phi2 = ((i + 1) / segments) * Math.PI;
        
        vertices.push(
          radius * Math.sin(phi1) * Math.cos(theta),
          radius * Math.cos(phi1),
          radius * Math.sin(phi1) * Math.sin(theta)
        );
        vertices.push(
          radius * Math.sin(phi2) * Math.cos(theta),
          radius * Math.cos(phi2),
          radius * Math.sin(phi2) * Math.sin(theta)
        );
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.rotation.y = state.clock.elapsedTime * 0.06;
      gridRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.08 + 0.15;
    }
  });

  return (
    <lineSegments ref={gridRef} geometry={gridGeometry}>
      <lineBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.06}
        linewidth={1}
      />
    </lineSegments>
  );
}

// Main globe with atmospheric layers
function IlluminatedGlobe() {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (globeRef.current) {
      // Increased rotation speed for more momentum
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.06;
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.08 + 0.15;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Base globe - deep dark with subtle sheen */}
      <Sphere args={[2, 64, 64]}>
        <meshPhysicalMaterial
          color="#050d1a"
          metalness={0.15}
          roughness={0.85}
          clearcoat={0.15}
          clearcoatRoughness={0.6}
          transparent
          opacity={0.98}
        />
      </Sphere>
      
      {/* Inner glow layer */}
      <Sphere args={[1.99, 32, 32]}>
        <meshBasicMaterial
          color="#1e3a5f"
          transparent
          opacity={0.05}
        />
      </Sphere>
      
      {/* First atmospheric layer */}
      <Sphere args={[2.06, 32, 32]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Second atmospheric layer */}
      <Sphere args={[2.12, 32, 32]}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer atmospheric glow */}
      <Sphere args={[2.2, 32, 32]}>
        <meshBasicMaterial
          color="#1e40af"
          transparent
          opacity={0.015}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// Cinematic lighting setup
function CinematicLighting() {
  return (
    <>
      {/* Key light - soft cool blue from top-right */}
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
      
      {/* Rim light for depth */}
      <directionalLight
        position={[0, -3, -5]}
        intensity={0.1}
        color="#1e40af"
      />
      
      {/* Ambient */}
      <ambientLight intensity={0.06} color="#1e3a5f" />
      
      {/* Accent point light */}
      <pointLight
        position={[3, 2, 4]}
        intensity={0.35}
        color="#60a5fa"
        distance={10}
      />
    </>
  );
}

// Main scene composition
function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle parallax movement
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.06;
      groupRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.08) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      <CinematicLighting />
      <IlluminatedGlobe />
      <SubtleGrid />
      <GlobalIllumination />
      <FineIlluminationLayer />
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
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(222, 47%, 6%) 0%, hsl(222, 47%, 3%) 50%, hsl(222, 47%, 1%) 100%)',
        }}
      />
      
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
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
      
      {/* Top fade for navbar */}
      <div 
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, hsl(222, 47%, 2%) 0%, transparent 100%)',
        }}
      />
      
      {/* Left fade for text readability */}
      <div 
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, hsl(222, 47%, 2% / 0.6) 0%, transparent 70%)',
        }}
      />
      
      {/* Center vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, hsl(222, 47%, 2% / 0.35) 100%)',
        }}
      />
      
      {/* Bottom fade */}
      <div 
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(222, 47%, 3%) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
