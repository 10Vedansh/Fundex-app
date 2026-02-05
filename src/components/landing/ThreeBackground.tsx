import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Box, Torus, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

// Animated floating particles
function Particles({ count = 200 }) {
  const mesh = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
      sizes[i] = Math.random() * 2 + 0.5;
    }
    
    return { positions, sizes };
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
    mesh.current.rotation.x = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particles.sizes.length}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#3b82f6"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Floating geometric shape
function FloatingShape({ 
  position, 
  scale = 1, 
  color = '#3b82f6',
  speed = 1,
  rotationIntensity = 0.5,
  floatIntensity = 0.5,
  shape = 'sphere'
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
  shape?: 'sphere' | 'box' | 'torus' | 'icosahedron';
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.1 * speed;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.15 * speed;
  });

  const renderShape = () => {
    const material = (
      <MeshDistortMaterial
        color={color}
        transparent
        opacity={0.15}
        distort={0.3}
        speed={2}
        roughness={0.2}
        metalness={0.8}
      />
    );

    switch (shape) {
      case 'torus':
        return (
          <Torus ref={meshRef} position={position} scale={scale} args={[1, 0.3, 16, 32]}>
            {material}
          </Torus>
        );
      case 'box':
        return (
          <Box ref={meshRef} position={position} scale={scale} args={[1, 1, 1]}>
            {material}
          </Box>
        );
      case 'icosahedron':
        return (
          <Icosahedron ref={meshRef} position={position} scale={scale} args={[1, 0]}>
            {material}
          </Icosahedron>
        );
      default:
        return (
          <Sphere ref={meshRef} position={position} scale={scale} args={[1, 32, 32]}>
            {material}
          </Sphere>
        );
    }
  };

  return (
    <Float
      speed={speed}
      rotationIntensity={rotationIntensity}
      floatIntensity={floatIntensity}
    >
      {renderShape()}
    </Float>
  );
}

// Grid plane with glow effect
function GridFloor() {
  const gridRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!gridRef.current) return;
    const material = gridRef.current.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const gridShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#3b82f6') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      
      void main() {
        vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5) / fwidth(vUv * 20.0);
        float line = min(grid.x, grid.y);
        float alpha = 1.0 - min(line, 1.0);
        
        // Add pulse effect
        float pulse = sin(uTime * 0.5 + vUv.y * 10.0) * 0.5 + 0.5;
        alpha *= 0.1 + pulse * 0.05;
        
        // Fade at edges
        float fade = 1.0 - length(vUv - 0.5) * 1.5;
        alpha *= max(fade, 0.0);
        
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  }), []);

  return (
    <mesh 
      ref={gridRef}
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -3, 0]}
    >
      <planeGeometry args={[40, 40, 1, 1]} />
      <shaderMaterial
        {...gridShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Animated connection lines
function ConnectionLines() {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const lineGeometry = useMemo(() => {
    const points: number[] = [];
    const connections = 15;
    
    for (let i = 0; i < connections; i++) {
      const x1 = (Math.random() - 0.5) * 20;
      const y1 = (Math.random() - 0.5) * 10;
      const z1 = (Math.random() - 0.5) * 10 - 5;
      
      const x2 = x1 + (Math.random() - 0.5) * 5;
      const y2 = y1 + (Math.random() - 0.5) * 5;
      const z2 = z1 + (Math.random() - 0.5) * 5;
      
      points.push(x1, y1, z1, x2, y2, z2);
    }
    
    return new Float32Array(points);
  }, []);

  useFrame((state) => {
    if (!linesRef.current) return;
    linesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={lineGeometry.length / 3}
          array={lineGeometry}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

// Mouse-following light
function MouseLight() {
  const light = useRef<THREE.PointLight>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!light.current) return;
    const x = (state.mouse.x * viewport.width) / 2;
    const y = (state.mouse.y * viewport.height) / 2;
    light.current.position.set(x, y, 5);
  });

  return (
    <pointLight
      ref={light}
      color="#3b82f6"
      intensity={2}
      distance={15}
    />
  );
}

// Main scene
function Scene() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8b5cf6" />
      <MouseLight />
      
      <Particles count={150} />
      <ConnectionLines />
      <GridFloor />
      
      {/* Floating shapes */}
      <FloatingShape 
        position={[-5, 2, -8]} 
        scale={1.5} 
        color="#3b82f6" 
        speed={0.5}
        shape="sphere"
      />
      <FloatingShape 
        position={[6, -1, -10]} 
        scale={1.2} 
        color="#8b5cf6" 
        speed={0.7}
        shape="icosahedron"
      />
      <FloatingShape 
        position={[-3, -2, -6]} 
        scale={0.8} 
        color="#06b6d4" 
        speed={0.6}
        shape="torus"
      />
      <FloatingShape 
        position={[4, 3, -12]} 
        scale={1} 
        color="#3b82f6" 
        speed={0.4}
        shape="box"
      />
      <FloatingShape 
        position={[-7, 0, -15]} 
        scale={2} 
        color="#6366f1" 
        speed={0.3}
        shape="sphere"
      />
      <FloatingShape 
        position={[8, 2, -8]} 
        scale={0.6} 
        color="#8b5cf6" 
        speed={0.8}
        shape="icosahedron"
      />
    </>
  );
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Base gradient fallback */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, hsl(222, 47%, 6%) 0%, hsl(222, 47%, 11%) 50%, hsl(222, 47%, 8%) 100%)',
        }}
      />
      
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
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
      
      {/* Overlay gradients for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(222, 47%, 8% / 0.5) 100%)',
        }}
      />
    </div>
  );
}
