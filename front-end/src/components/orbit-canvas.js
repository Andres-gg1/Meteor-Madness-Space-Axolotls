import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from "three";

// --- NUEVO: Componente para dibujar los nÃºmeros de la escala ---
function AxisScaleLabels({ scale = 4 }) {
  const labels = [];
  for (let i = 1; i <= scale; i++) {
    labels.push(i);
    labels.push(-i);
  }

  return (
    <group>
      {/* Etiquetas para el eje X */}
      {labels.map((val) => (
        <Text
          key={`x-${val}`}
          position={[val, -0.2, 0]} // Un poco abajo para no chocar con el eje
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {val}
        </Text>
      ))}
      {/* Etiquetas para el eje Y */}
      {labels.map((val) => (
        <Text
          key={`y-${val}`}
          position={[0.2, val, 0]} // Un poco a la derecha para que se lean
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {val}
        </Text>
      ))}
      {/* Etiquetas para el eje Z */}
      {labels.map((val) => (
        <Text
          key={`z-${val}`}
          position={[0, -0.2, val]} // Un poco abajo
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, 0]} // Rotar para que queden planas sobre la rejilla
        >
          {val}
        </Text>
      ))}
    </group>
  );
}


function OrbitLine({ points }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p.x, p.y, p.z))
    );
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(360));
  }, [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial attach="material" color={'#00ffff'} linewidth={2} />
    </line>
  );
}

export default function OrbitCanvas({ orbitalData }) {
  if (!orbitalData) return null;

  const orbitPoints = orbitalData.orbit_path.x.map((x, i) => ({
    x: orbitalData.orbit_path.x[i],
    y: orbitalData.orbit_path.y[i],
    z: orbitalData.orbit_path.z[i]
  }));

  const asteroidPos = [
    orbitalData.asteroid_position.x,
    orbitalData.asteroid_position.y,
    orbitalData.asteroid_position.z
  ];
  
  const AXIS_SCALE = 4;

  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={150} color="#FFDAB9" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
      <OrbitControls />

      <axesHelper args={[AXIS_SCALE]} />
      <gridHelper args={[AXIS_SCALE * 2, AXIS_SCALE * 2]} />
      
      <Text position={[AXIS_SCALE + 0.3, 0, 0]} fontSize={0.15} color="white">
        X (AU)
      </Text>
      <Text position={[0, AXIS_SCALE + 0.3, 0]} fontSize={0.15} color="white">
        Y (AU)
      </Text>
      <Text position={[0, 0, AXIS_SCALE + 0.3]} fontSize={0.15} color="white" rotation={[0, Math.PI / 2, 0]}>
        Z (AU)
      </Text>

      {/* --- NUEVO: Llamada al componente de las escalas --- */}
      <AxisScaleLabels scale={AXIS_SCALE} />

      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial emissive="yellow" />
      </mesh>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={361}
            array={new Float32Array(
              Array.from({ length: 361 }, (_, i) => [
                Math.cos(i * Math.PI / 180), Math.sin(i * Math.PI / 180), 0
              ]).flat()
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="dodgerblue" transparent opacity={0.5} />
      </line>

      <OrbitLine points={orbitPoints} />
      
      <mesh position={asteroidPos}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </Canvas>
  );
}