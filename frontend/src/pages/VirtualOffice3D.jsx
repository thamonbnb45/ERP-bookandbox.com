import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ─── 3D Character ─── */
function Character({ position, name, color = '#6366f1', role }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.04;
    }
  });
  return (
    <group ref={ref} position={position}>
      <RoundedBox args={[0.35, 0.45, 0.25]} radius={0.08} position={[0, 0.22, 0]}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fcd9b6" />
      </mesh>
      <mesh position={[0, 0.73, -0.02]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.15, 0.75, 0.1]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, 1.1, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>{name}</div>
          {role && <div style={{ color: '#94a3b8', fontSize: '9px' }}>{role}</div>}
        </div>
      </Html>
    </group>
  );
}

/* ─── Desk ─── */
function Desk({ position, width = 1.2, depth = 0.6, color = '#bfdbfe' }) {
  return (
    <group position={position}>
      <RoundedBox args={[width, 0.06, depth]} radius={0.02} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      {[[-width/2+0.05,0.25,-depth/2+0.05],[width/2-0.05,0.25,-depth/2+0.05],[-width/2+0.05,0.25,depth/2-0.05],[width/2-0.05,0.25,depth/2-0.05]].map((p,i)=>(
        <mesh key={i} position={p}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}
      <mesh position={[0, 0.75, -depth/2+0.08]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.02]} />
        <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.6, -depth/2+0.08]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

/* ─── Machine ─── */
function Machine({ position, name, color = '#94a3b8', status, width = 1.5, depth = 1.0 }) {
  const gearRef = useRef();
  useFrame(() => { if (gearRef.current && status === 'running') gearRef.current.rotation.z += 0.02; });
  const sc = status === 'error' ? '#ef4444' : status === 'setup' ? '#f59e0b' : '#22c55e';
  return (
    <group position={position}>
      <RoundedBox args={[width, 0.8, depth]} radius={0.05} position={[0, 0.4, 0]}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.7, depth/2+0.01]}>
        <boxGeometry args={[0.4, 0.2, 0.02]} />
        <meshStandardMaterial color="#1e293b" emissive="#0ea5e9" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={gearRef} position={[width/2-0.2, 0.6, depth/2+0.02]}>
        <torusGeometry args={[0.08, 0.02, 8, 6]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} />
      </mesh>
      <mesh position={[width/2-0.1, 0.85, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={status === 'error' ? 1.5 : 0.5} />
      </mesh>
      <Html position={[0, 1.0, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{name}</div>
      </Html>
    </group>
  );
}

/* ─── Meeting Room ─── */
function MeetingRoom({ position, name, width = 2.5, depth = 2 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#fef08a" />
      </mesh>
      {[[0,0.5,-depth/2,width,1,0.02],[0,0.5,depth/2,width,1,0.02],[-width/2,0.5,0,0.02,1,depth]].map((w,i)=>(
        <mesh key={i} position={[w[0],w[1],w[2]]}>
          <boxGeometry args={[w[3],w[4],w[5]]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.25} />
        </mesh>
      ))}
      <mesh position={[width/2, 0.5, 0]}>
        <boxGeometry args={[0.04, 1, 0.6]} />
        <meshStandardMaterial color="#ca8a04" />
      </mesh>
      <RoundedBox args={[width*0.5, 0.06, depth*0.4]} radius={0.02} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#a78bfa" />
      </RoundedBox>
      <Html position={[0, 1.3, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(0,0,0,0.7)', color: '#fef08a', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{name}</div>
      </Html>
    </group>
  );
}

/* ─── Room boundary ─── */
function Room({ position, width, depth, color, label }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} opacity={0.15} transparent />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.01, depth)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
      <Html position={[0, 0.1, -depth/2+0.3]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
        <div style={{ background: color, color: 'white', padding: '4px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>{label}</div>
      </Html>
    </group>
  );
}

/* ─── SCENE ─── */
function FactoryScene({ factoryZones, activeSessions, machineStatus }) {
  const cc = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
  const objects = useMemo(() => {
    const items = [];
    const addZone = (zoneId, startX, baseZ) => {
      const sts = factoryZones.find(z => z.id === zoneId)?.stations || [];
      let x = startX;
      sts.forEach(st => {
        const isMachine = st.type === 'machine';
        const isMeeting = st.type === 'meeting';
        const z = isMeeting ? baseZ - 3 : baseZ;
        if (isMeeting) items.push({ t: 'meeting', pos: [x, 0, z], name: st.name });
        else if (isMachine) items.push({ t: 'machine', pos: [x, 0, z], name: st.name, status: machineStatus[st.id] || 'running' });
        else items.push({ t: 'desk', pos: [x, 0, z], stType: st.type });
        (activeSessions[st.id] || []).forEach((p, pi) => {
          items.push({ t: 'char', pos: [x + (pi - ((activeSessions[st.id]||[]).length-1)/2) * 0.5, 0, (isMeeting ? z + 0.8 : z + 0.8)], ...p, color: cc[p.id % cc.length] });
        });
        x += 2;
      });
    };
    addZone('zone-sales-admin', -6, -2);
    addZone('zone-prepress', 4, -2);
    addZone('zone-acc-prod', -6, 2);
    addZone('zone-factory-200', 4, 2.5);
    addZone('zone-factory-100', -6, 8);
    addZone('zone-factory-63', 8, 8);
    return items;
  }, [factoryZones, activeSessions, machineStatus]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[2, -0.01, 3]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <Room position={[0, 0, 0]} width={18} depth={8} color="#3b82f6" label="โรงงาน 200 ตร.ว." />
      <Room position={[-2, 0, 8.5]} width={12} depth={4} color="#10b981" label="โรงงาน 100 ตร.ว." />
      <Room position={[9, 0, 8.5]} width={6} depth={4} color="#6366f1" label="ตึก 63 ตร.ว." />
      {objects.map((o, i) => {
        if (o.t === 'char') return <Character key={i} position={o.pos} name={o.name} color={o.color} role={o.role} />;
        if (o.t === 'desk') return <Desk key={i} position={o.pos} color={o.stType === 'computer' ? '#c4b5fd' : '#bfdbfe'} />;
        if (o.t === 'machine') return <Machine key={i} position={o.pos} name={o.name} status={o.status} />;
        if (o.t === 'meeting') return <MeetingRoom key={i} position={o.pos} name={o.name} />;
        return null;
      })}
      <OrbitControls makeDefault minPolarAngle={Math.PI/6} maxPolarAngle={Math.PI/2.5} minDistance={5} maxDistance={25} target={[2, 0, 3]} />
    </>
  );
}

export default function VirtualOffice3DView({ factoryZones, activeSessions, machineStatus }) {
  return (
    <div style={{ width: '100%', height: '70vh', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
      <Canvas camera={{ position: [15, 12, 15], fov: 50 }} style={{ background: 'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)' }}>
        <FactoryScene factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus} />
      </Canvas>
    </div>
  );
}
