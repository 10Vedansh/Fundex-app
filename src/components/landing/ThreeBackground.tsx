import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

// Major financial centers with lat/lng coordinates
const financialCenters = [
  { name: 'New York', lat: 40.7128, lng: -74.006, size: 1.2 },
  { name: 'London', lat: 51.5074, lng: -0.1278, size: 1.2 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, size: 1.1 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, size: 1.0 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, size: 1.0 },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, size: 1.0 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777, size: 0.9 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, size: 0.9 },
  { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, size: 0.9 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, size: 0.8 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, size: 0.8 },
  { name: 'Zurich', lat: 47.3769, lng: 8.5417, size: 0.8 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, size: 0.8 },
  { name: 'Seoul', lat: 37.5665, lng: 126.978, size: 0.8 },
  { name: 'Sao Paulo', lat: -23.5505, lng: -46.6333, size: 0.7 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, size: 0.7 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, size: 0.7 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, size: 0.8 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, size: 0.7 },
  { name: 'Milan', lat: 45.4642, lng: 9.19, size: 0.6 },
];

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

// Connection arcs between financial centers
function ConnectionArcs() {
  const arcsRef = useRef<THREE.Group>(null);
  
  const connections = useMemo(() => {
    const pairs: [number, number][] = [
      [0, 1], // NY - London
      [1, 3], // London - Singapore
      [2, 4], // Tokyo - Hong Kong
      [3, 6], // Singapore - Mumbai
      [0, 15], // NY - Chicago
      [1, 8], // London - Frankfurt
      [5, 2], // Shanghai - Tokyo
      [7, 6], // Dubai - Mumbai
      [9, 3], // Sydney - Singapore
      [1, 12], // London - Paris
    ];
    
    return pairs.map(([i, j]) => {
      const start = latLngToVector3(
        financialCenters[i].lat,
        financialCenters[i].lng,
        2.02
      );
      const end = latLngToVector3(
        financialCenters[j].lat,
        financialCenters[j].lng,
        2.02
      );
      
      // Create curved arc
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(2.3); // Arc height
      
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(32);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      return geometry;
    });
  }, []);

  useFrame((state) => {
    if (arcsRef.current) {
      arcsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      arcsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
  });

  const arcPoints = useMemo(() => {
    return connections.map(geometry => {
      const positions = geometry.attributes.position.array as Float32Array;
      const points: [number, number, number][] = [];
      for (let i = 0; i < positions.length; i += 3) {
        points.push([positions[i], positions[i + 1], positions[i + 2]]);
      }
      return points;
    });
  }, [connections]);

  return (
    <group ref={arcsRef}>
      {arcPoints.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="#60a5fa"
          lineWidth={1}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  );
}

// Financial center nodes
function DataNodes() {
  const nodesRef = useRef<THREE.Group>(null);
  const pulsesRef = useRef<THREE.Group>(null);
  
  const nodePositions = useMemo(() => {
    return financialCenters.map(center => ({
      position: latLngToVector3(center.lat, center.lng, 2.02),
      size: center.size,
    }));
  }, []);

  useFrame((state) => {
    if (nodesRef.current) {
      nodesRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      nodesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
    if (pulsesRef.current) {
      pulsesRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      pulsesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
      
      // Animate pulse rings
      pulsesRef.current.children.forEach((child, i) => {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + i * 0.5) * 0.3;
        child.scale.setScalar(scale);
      });
    }
  });

  return (
    <>
      <group ref={nodesRef}>
        {nodePositions.map((node, i) => (
          <mesh key={i} position={node.position}>
            <sphereGeometry args={[0.025 * node.size, 16, 16]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
      
      {/* Pulse rings for major centers */}
      <group ref={pulsesRef}>
        {nodePositions.slice(0, 8).map((node, i) => (
          <mesh key={i} position={node.position}>
            <ringGeometry args={[0.04, 0.055, 32]} />
            <meshBasicMaterial 
              color="#60a5fa" 
              transparent 
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

// Secondary data points for city lights effect
function CityLights() {
  const lightsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos: number[] = [];
    const count = 200;
    
    // Distribute points with higher density in populated regions
    const regions = [
      { lat: [25, 55], lng: [-130, -70], weight: 3 }, // North America
      { lat: [35, 60], lng: [-10, 40], weight: 4 }, // Europe
      { lat: [10, 45], lng: [70, 145], weight: 4 }, // Asia
      { lat: [-35, 5], lng: [110, 155], weight: 1 }, // Australia
      { lat: [-35, 10], lng: [-70, -35], weight: 1 }, // South America
    ];
    
    for (let i = 0; i < count; i++) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const lat = region.lat[0] + Math.random() * (region.lat[1] - region.lat[0]);
      const lng = region.lng[0] + Math.random() * (region.lng[1] - region.lng[0]);
      
      const point = latLngToVector3(lat, lng, 2.015);
      pos.push(point.x, point.y, point.z);
    }
    
    return new Float32Array(pos);
  }, []);

  useFrame((state) => {
    if (lightsRef.current) {
      lightsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      lightsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
  });

  return (
    <points ref={lightsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#bfdbfe"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Main illuminated globe
function IlluminatedGlobe() {
  const globeRef = useRef<THREE.Group>(null);
  
  // Create latitude/longitude grid
  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const radius = 2.005;
    
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
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
    
    // Longitude lines
    for (let lon = 0; lon < 360; lon += 30) {
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
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.03;
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.05 + 0.1;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Base globe - dark with subtle sheen */}
      <Sphere args={[2, 64, 64]}>
        <meshPhysicalMaterial
          color="#0a1628"
          metalness={0.2}
          roughness={0.8}
          clearcoat={0.2}
          clearcoatRoughness={0.5}
          transparent
          opacity={0.97}
        />
      </Sphere>
      
      {/* Inner glow layer */}
      <Sphere args={[1.98, 32, 32]}>
        <meshBasicMaterial
          color="#1e3a5f"
          transparent
          opacity={0.08}
        />
      </Sphere>
      
      {/* Grid lines */}
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.08}
          linewidth={1}
        />
      </lineSegments>
      
      {/* Atmospheric glow */}
      <Sphere args={[2.08, 32, 32]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer atmosphere */}
      <Sphere args={[2.2, 32, 32]}>
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

// Cinematic lighting
function CinematicLighting() {
  return (
    <>
      {/* Key light - soft cool blue from top-right */}
      <directionalLight
        position={[5, 5, 3]}
        intensity={0.5}
        color="#93c5fd"
      />
      
      {/* Fill light - subtle from left */}
      <directionalLight
        position={[-4, 2, 2]}
        intensity={0.2}
        color="#3b82f6"
      />
      
      {/* Rim light for depth */}
      <directionalLight
        position={[0, -3, -5]}
        intensity={0.15}
        color="#1e40af"
      />
      
      {/* Ambient */}
      <ambientLight intensity={0.08} color="#1e3a5f" />
      
      {/* Accent point light */}
      <pointLight
        position={[3, 2, 4]}
        intensity={0.4}
        color="#60a5fa"
        distance={12}
      />
    </>
  );
}

// Main scene
function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle parallax sway
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
      groupRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.06) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <CinematicLighting />
      <IlluminatedGlobe />
      <DataNodes />
      <CityLights />
      <ConnectionArcs />
    </group>
  );
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Deep dark base */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(222, 47%, 7%) 0%, hsl(222, 47%, 4%) 50%, hsl(222, 47%, 2%) 100%)',
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
          background: 'linear-gradient(to bottom, hsl(222, 47%, 3%) 0%, transparent 100%)',
        }}
      />
      
      {/* Left fade for text readability */}
      <div 
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, hsl(222, 47%, 3% / 0.7) 0%, transparent 80%)',
        }}
      />
      
      {/* Center vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, hsl(222, 47%, 3% / 0.4) 100%)',
        }}
      />
      
      {/* Bottom fade */}
      <div 
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(222, 47%, 4%) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
