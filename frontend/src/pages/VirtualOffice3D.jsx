import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ─── 3D Character (head + body + name tag) ─── */
function Character({ position, name, color = '#6366f1', role }) {
  const ref = useRef();
  // gentle float animation
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.04;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Body */}
      <RoundedBox args={[0.35, 0.45, 0.25]} radius={0.08} position={[0, 0.22, 0]}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      {/* Head */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fcd9b6" />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 0.73, -0.02]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Name tag floating above */}
      <Text
        position={[0, 1.05, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        font="/fonts/Prompt-Bold.ttf"
      >
        {name}
      </Text>
      {/* Role tag */}
      <Text
        position={[0, 0.9, 0]}
        fontSize={0.08}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {role || ''}
      </Text>
      {/* Online indicator */}
      <mesh position={[0.15, 0.75, 0.1]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ─── Office Desk with Monitor ─── */
function Desk({ position, width = 1.2, depth = 0.6, color = '#bfdbfe' }) {
  return (
    <group position={position}>
      {/* Desktop surface */}
      <RoundedBox args={[width, 0.06, depth]} radius={0.02} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      {/* Legs */}
      {[[-width/2+0.05,0,-depth/2+0.05],[width/2-0.05,0,-depth/2+0.05],[-width/2+0.05,0,depth/2-0.05],[width/2-0.05,0,depth/2-0.05]].map((p,i)=>(
        <mesh key={i} position={[p[0],0.25,p[2]]}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}
      {/* Monitor screen */}
      <mesh position={[0, 0.75, -depth/2+0.08]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.02]} />
        <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.2} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.6, -depth/2+0.08]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

/* ─── Machine (industrial look) ─── */
function Machine({ position, name, color = '#94a3b8', status, width = 1.5, depth = 1.0 }) {
  const gearRef = useRef();
  useFrame((state) => {
    if (gearRef.current && status === 'running') {
      gearRef.current.rotation.z += 0.02;
    }
  });

  const statusColor = status === 'error' ? '#ef4444' : status === 'setup' ? '#f59e0b' : '#22c55e';

  return (
    <group position={position}>
      {/* Machine body */}
      <RoundedBox args={[width, 0.8, depth]} radius={0.05} position={[0, 0.4, 0]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
      </RoundedBox>
      {/* Control panel */}
      <mesh position={[0, 0.7, depth/2+0.01]}>
        <boxGeometry args={[0.4, 0.2, 0.02]} />
        <meshStandardMaterial color="#1e293b" emissive="#0ea5e9" emissiveIntensity={0.3} />
      </mesh>
      {/* Gear decoration */}
      <mesh ref={gearRef} position={[width/2-0.2, 0.6, depth/2+0.02]}>
        <torusGeometry args={[0.08, 0.02, 8, 6]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} />
      </mesh>
      {/* Status light */}
      <mesh position={[width/2-0.1, 0.85, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={status === 'error' ? 1.5 : 0.5} />
      </mesh>
      {/* Name label */}
      <Text
        position={[0, 0.95, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
}

/* ─── Meeting Room (glass box) ─── */
function MeetingRoom({ position, name, width = 2.5, depth = 2 }) {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#fef08a" />
      </mesh>
      {/* Glass walls */}
      {[
        [0, 0.5, -depth/2, width, 1, 0.02],
        [0, 0.5, depth/2, width, 1, 0.02],
        [-width/2, 0.5, 0, 0.02, 1, depth],
      ].map((w, i) => (
        <mesh key={i} position={[w[0], w[1], w[2]]}>
          <boxGeometry args={[w[3], w[4], w[5]]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.25} />
        </mesh>
      ))}
      {/* Door frame */}
      <mesh position={[width/2, 0.5, 0]}>
        <boxGeometry args={[0.04, 1, 0.6]} />
        <meshStandardMaterial color="#ca8a04" />
      </mesh>
      {/* Meeting table */}
      <RoundedBox args={[width*0.5, 0.06, depth*0.4]} radius={0.02} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#a78bfa" />
      </RoundedBox>
      {/* Label */}
      <Text position={[0, 1.2, 0]} fontSize={0.14} color="white" anchorX="center" outlineWidth={0.015} outlineColor="#000000">
        {name}
      </Text>
    </group>
  );
}

/* ─── Room (zone container with walls + floor) ─── */
function Room({ position, width, depth, color, label }) {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} opacity={0.15} transparent />
      </mesh>
      {/* Border lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.01, depth)]} />
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
      {/* Label */}
      <Text position={[0, 0.05, -depth/2+0.2]} fontSize={0.18} color={color} anchorX="center" outlineWidth={0.01} outlineColor="#0f172a">
        {label}
      </Text>
    </group>
  );
}

/* ─── MAIN SCENE ─── */
function FactoryScene({ factoryZones, activeSessions, machineStatus }) {
  const charColors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];

  // Build all 3D objects from data
  const objects = useMemo(() => {
    const items = [];
    // === BUILDING 200 (left block: office zones, right block: production) ===
    
    // Zone 1: Sales & Admin
    const salesStations = factoryZones.find(z=>z.id==='zone-sales-admin')?.stations || [];
    let x = -6;
    salesStations.forEach((st, si) => {
      if (st.type === 'meeting') {
        items.push({ type: 'meeting', pos: [x, 0, -5], name: st.name, id: st.id });
      } else {
        items.push({ type: 'desk', pos: [x, 0, -2], name: st.name, id: st.id, stType: st.type });
      }
      const people = activeSessions[st.id] || [];
      people.forEach((p, pi) => {
        const px = st.type === 'meeting' ? x + (pi - people.length/2) * 0.5 : x + (pi - people.length/2) * 0.5;
        const pz = st.type === 'meeting' ? -4.2 : -1.2;
        items.push({ type: 'char', pos: [px, 0, pz], ...p, color: charColors[p.id % charColors.length] });
      });
      x += 2;
    });

    // Zone 2: Prepress
    const prepressStations = factoryZones.find(z=>z.id==='zone-prepress')?.stations || [];
    x = 4;
    prepressStations.forEach((st, si) => {
      if (st.type === 'meeting') {
        items.push({ type: 'meeting', pos: [x, 0, -5], name: st.name, id: st.id });
      } else if (st.type === 'machine') {
        items.push({ type: 'machine', pos: [x, 0, -2], name: st.name, id: st.id, status: machineStatus[st.id] });
      } else {
        items.push({ type: 'desk', pos: [x, 0, -2], name: st.name, id: st.id, stType: st.type });
      }
      const people = activeSessions[st.id] || [];
      people.forEach((p, pi) => {
        const px = x + (pi - people.length/2) * 0.5;
        items.push({ type: 'char', pos: [px, 0, st.type==='meeting'?-4.2:-1.2], ...p, color: charColors[p.id % charColors.length] });
      });
      x += 2;
    });

    // Zone 3: Accounting & Prod
    const accStations = factoryZones.find(z=>z.id==='zone-acc-prod')?.stations || [];
    x = -6;
    accStations.forEach((st) => {
      items.push({ type: 'desk', pos: [x, 0, 2], name: st.name, id: st.id, stType: st.type });
      const people = activeSessions[st.id] || [];
      people.forEach((p, pi) => {
        items.push({ type: 'char', pos: [x + (pi-people.length/2)*0.5, 0, 2.8], ...p, color: charColors[p.id % charColors.length] });
      });
      x += 2;
    });

    // Zone 4: Factory 200
    const factoryStations = factoryZones.find(z=>z.id==='zone-factory-200')?.stations || [];
    x = 4;
    factoryStations.forEach((st) => {
      items.push({ type: 'machine', pos: [x, 0, 2.5], name: st.name, id: st.id, status: machineStatus[st.id] || 'running' });
      const people = activeSessions[st.id] || [];
      people.forEach((p, pi) => {
        items.push({ type: 'char', pos: [x + (pi-people.length/2)*0.5, 0, 3.8], ...p, color: charColors[p.id % charColors.length] });
      });
      x += 2;
    });

    // Zone 5: Factory 100
    const f100Stations = factoryZones.find(z=>z.id==='zone-factory-100')?.stations || [];
    x = -6;
    f100Stations.forEach((st) => {
      if (st.type === 'machine') {
        items.push({ type: 'machine', pos: [x, 0, 8], name: st.name, id: st.id, status: machineStatus[st.id] });
      } else {
        items.push({ type: 'desk', pos: [x, 0, 8], name: st.name, id: st.id, stType: st.type });
      }
      const people = activeSessions[st.id] || [];
      people.forEach((p, pi) => {
        items.push({ type: 'char', pos: [x + (pi-people.length/2)*0.5, 0, 9], ...p, color: charColors[p.id % charColors.length] });
      });
      x += 2;
    });

    // Zone 6: Building 63
    const f63Stations = factoryZones.find(z=>z.id==='zone-factory-63')?.stations || [];
    x = 8;
    f63Stations.forEach((st) => {
      items.push({ type: 'desk', pos: [x, 0, 8], name: st.name, id: st.id, stType: st.type });
      const people = activeSessions[st.id] || [];
      people.forEach((p, pi) => {
        items.push({ type: 'char', pos: [x + (pi-people.length/2)*0.5, 0, 9], ...p, color: charColors[p.id % charColors.length] });
      });
      x += 2;
    });

    return items;
  }, [factoryZones, activeSessions, machineStatus]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* Ground */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[2, -0.01, 3]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Room boundaries */}
      <Room position={[0, 0, 0]} width={18} depth={8} color="#3b82f6" label="🏢 โรงงาน 200 ตร.ว. (สำนักงาน + โรงพิมพ์หลัก)" />
      <Room position={[-2, 0, 8.5]} width={12} depth={4} color="#10b981" label="🏭 โรงงาน 100 ตร.ว. (หลังพิมพ์)" />
      <Room position={[9, 0, 8.5]} width={6} depth={4} color="#6366f1" label="📦 ตึก 63 ตร.ว." />

      {/* Render all objects */}
      {objects.map((obj, i) => {
        if (obj.type === 'char') return <Character key={`c-${i}`} position={obj.pos} name={obj.name} color={obj.color} role={obj.role} />;
        if (obj.type === 'desk') return <Desk key={`d-${i}`} position={obj.pos} color={obj.stType === 'computer' ? '#c4b5fd' : '#bfdbfe'} />;
        if (obj.type === 'machine') return <Machine key={`m-${i}`} position={obj.pos} name={obj.name} color="#94a3b8" status={obj.status || 'running'} />;
        if (obj.type === 'meeting') return <MeetingRoom key={`r-${i}`} position={obj.pos} name={obj.name} />;
        return null;
      })}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={5}
        maxDistance={25}
        target={[2, 0, 3]}
      />
    </>
  );
}

export default function VirtualOffice3DView({ factoryZones, activeSessions, machineStatus }) {
  return (
    <div style={{ width: '100%', height: '70vh', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
      <Canvas
        camera={{ position: [15, 12, 15], fov: 50 }}
        shadows
        style={{ background: 'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)' }}
      >
        <FactoryScene
          factoryZones={factoryZones}
          activeSessions={activeSessions}
          machineStatus={machineStatus}
        />
      </Canvas>
    </div>
  );
}
