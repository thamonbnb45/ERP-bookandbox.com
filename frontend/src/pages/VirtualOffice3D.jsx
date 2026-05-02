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

/* ─── Individual Desk (small rectangle per person) ─── */
function PersonDesk({ position, name, role, color, label }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.03;
  });
  return (
    <group position={position}>
      {/* Desk surface - rectangle */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.0, 0.05, 0.55]} />
        <meshStandardMaterial color="#bfdbfe" />
      </mesh>
      {/* Legs */}
      {[[-0.42,0.22,-0.2],[0.42,0.22,-0.2],[-0.42,0.22,0.2],[0.42,0.22,0.2]].map((p,i)=>(
        <mesh key={i} position={p}><boxGeometry args={[0.03,0.44,0.03]}/><meshStandardMaterial color="#64748b"/></mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 0.65, -0.15]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.02]} />
        <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.53, -0.15]}><boxGeometry args={[0.03, 0.1, 0.03]}/><meshStandardMaterial color="#475569"/></mesh>
      {/* Label on desk */}
      <Html position={[0, 0.55, 0.35]} center distanceFactor={8} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(59,130,246,0.8)',color:'white',padding:'1px 6px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold',whiteSpace:'nowrap'}}>{label || ''}</div>
      </Html>
      {/* Character sitting */}
      {name && (
        <group ref={ref}>
          <RoundedBox args={[0.3,0.4,0.22]} radius={0.06} position={[0,0.2,0.45]}>
            <meshStandardMaterial color={color || '#6366f1'} />
          </RoundedBox>
          <mesh position={[0,0.55,0.45]}>
            <sphereGeometry args={[0.15,16,16]}/><meshStandardMaterial color="#fcd9b6"/>
          </mesh>
          <mesh position={[0,0.64,0.43]}>
            <sphereGeometry args={[0.13,16,16]}/><meshStandardMaterial color={color || '#6366f1'}/>
          </mesh>
          <mesh position={[0.12,0.65,0.52]}>
            <sphereGeometry args={[0.03,8,8]}/><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5}/>
          </mesh>
          <Html position={[0,0.85,0.45]} center distanceFactor={7} style={{pointerEvents:'none'}}>
            <div style={{textAlign:'center',whiteSpace:'nowrap'}}>
              <div style={{background:'rgba(0,0,0,0.75)',color:'white',padding:'2px 7px',borderRadius:'5px',fontSize:'10px',fontWeight:'bold'}}>{name}</div>
              {role && <div style={{color:'#94a3b8',fontSize:'8px'}}>{role}</div>}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/* ─── Empty Desk (no person) ─── */
function EmptyDesk({ position, label, color = '#94a3b8' }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.0, 0.05, 0.55]} />
        <meshStandardMaterial color={color} opacity={0.5} transparent />
      </mesh>
      {[[-0.42,0.22,-0.2],[0.42,0.22,-0.2],[-0.42,0.22,0.2],[0.42,0.22,0.2]].map((p,i)=>(
        <mesh key={i} position={p}><boxGeometry args={[0.03,0.44,0.03]}/><meshStandardMaterial color="#475569"/></mesh>
      ))}
      <Html position={[0, 0.6, 0]} center distanceFactor={8} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(0,0,0,0.5)',color:'#94a3b8',padding:'1px 6px',borderRadius:'4px',fontSize:'8px',whiteSpace:'nowrap'}}>{label}</div>
      </Html>
    </group>
  );
}

/* ─── SCENE ─── */
function FactoryScene({ factoryZones, activeSessions, machineStatus }) {
  const cc = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
  const gc = (id) => cc[id % cc.length];

  // Helper to get first person from a station
  const ppl = (stId) => (activeSessions[stId] || []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[4, -0.01, 4]}>
        <planeGeometry args={[35, 25]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* ═══════ BUILDING 200 ตร.ว. ═══════ */}
      <Room position={[3, 0, -1]} width={22} depth={12} color="#3b82f6" label="โรงงาน 200 ตร.ว. (สำนักงาน + โรงพิมพ์หลัก)" />

      {/* ── Office Row 1 (top): Sale, Marketing, Admin, Graphic, Admin, Accounting, HR ── */}
      {/* z = -5, from left to right */}
      {ppl('desk-sales').map((p, i) => (
        <PersonDesk key={`s${i}`} position={[-6 + i*1.3, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="เซล" />
      ))}
      {ppl('desk-marketing').map((p, i) => (
        <PersonDesk key={`mk${i}`} position={[-0.5, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="การตลาด" />
      ))}
      {ppl('desk-admin').map((p, i) => (
        <PersonDesk key={`ad${i}`} position={[1 + i*1.3, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label={p.role} />
      ))}
      {ppl('desk-graphic').map((p, i) => (
        <PersonDesk key={`gr${i}`} position={[5, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="ออกแบบ" />
      ))}

      {/* ── Office Row 2: ผลิต, คิดราคา, บัญชี, HR, จัดส่ง ── */}
      {ppl('desk-prod-admin').map((p, i) => (
        <PersonDesk key={`pr${i}`} position={[-6, 0, -3.5]} name={p.name} role={p.role} color={gc(p.id)} label="ผลิต" />
      ))}
      {ppl('desk-pricing').map((p, i) => (
        <PersonDesk key={`pc${i}`} position={[-4.5, 0, -3.5]} name={p.name} role={p.role} color={gc(p.id)} label="คิดราคา" />
      ))}
      {ppl('desk-account').map((p, i) => (
        <PersonDesk key={`ac${i}`} position={[-3 + i*1.3, 0, -3.5]} name={p.name} role={p.role} color={gc(p.id)} label="บัญชี" />
      ))}
      {ppl('desk-hr').map((p, i) => (
        <PersonDesk key={`hr${i}`} position={[-0.2, 0, -3.5]} name={p.name} role={p.role} color={gc(p.id)} label="HR" />
      ))}
      {ppl('desk-logistics').map((p, i) => (
        <PersonDesk key={`lg${i}`} position={[1.2, 0, -3.5]} name={p.name} role={p.role} color={gc(p.id)} label="จัดส่ง" />
      ))}

      {/* ── Meeting Room 1 (bottom-left of office) ── */}
      <MeetingRoom position={[-5, 0, -1]} name="ห้องประชุม 1 (รับแขก)" width={3} depth={2} />
      {ppl('meeting-1').map((p, i) => (
        <Character key={`mt1${i}`} position={[-5 + i*0.6, 0, -0.2]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}

      {/* ═══ Prepress (right side of 200) ═══ */}
      {/* ── เช็คไฟล์, Layout, วางแผน, ผู้จัดการ ── */}
      {ppl('desk-checkfile').map((p, i) => (
        <PersonDesk key={`cf${i}`} position={[7 + i*1.3, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="เช็คไฟล์" />
      ))}
      {ppl('desk-layout').map((p, i) => (
        <PersonDesk key={`ly${i}`} position={[10, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="Layout" />
      ))}
      {ppl('desk-planner').map((p, i) => (
        <PersonDesk key={`pl${i}`} position={[11.5, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="วางแผน" />
      ))}
      {ppl('desk-manager').map((p, i) => (
        <PersonDesk key={`mg${i}`} position={[13, 0, -5.5]} name={p.name} role={p.role} color={gc(p.id)} label="ผู้จัดการ" />
      ))}

      {/* ── ODM machine + Meeting Room 2 ── */}
      <Machine position={[7, 0, -3]} name="ODM" status={machineStatus['desk-odm'] || 'running'} width={1.8} depth={1.2} />
      {ppl('desk-odm').map((p, i) => (
        <Character key={`odm${i}`} position={[7 + i*0.5, 0, -1.8]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}
      <MeetingRoom position={[11, 0, -3]} name="ห้องประชุม 2 (ชั้น 2)" width={3} depth={2} />
      {ppl('meeting-2').map((p, i) => (
        <Character key={`mt2${i}`} position={[10.5 + i*0.6, 0, -2.2]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}

      {/* ═══ Factory 200 machines (right block) ═══ */}
      {/* ── Row: SM74, SM102 ── */}
      <Machine position={[7, 0, 0.5]} name="SM74" status={machineStatus['print-sm74'] || 'running'} />
      {ppl('print-sm74').map((p, i) => (
        <Character key={`sm74${i}`} position={[7 + i*0.5, 0, 1.5]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}
      <Machine position={[10, 0, 0.5]} name="SM102" status={machineStatus['print-sm102'] || 'running'} width={2} />
      {ppl('print-sm102').map((p, i) => (
        <Character key={`sm102${i}`} position={[9.5 + i*0.6, 0, 1.5]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}
      <Machine position={[13, 0, 0.5]} name="เครื่องตัด" status={machineStatus['cutter'] || 'running'} />
      {ppl('cutter').map((p, i) => (
        <Character key={`cut${i}`} position={[12.8 + i*0.5, 0, 1.5]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}

      {/* ── Row: ไดคัท, ฟอยล์, เคลือบ ── */}
      <Machine position={[7, 0, 3]} name="ปั๊มไดคัท 1" status="running" width={1.2} />
      <Machine position={[9, 0, 3]} name="ปั๊มไดคัท 2" status="running" width={1.2} />
      <Machine position={[11, 0, 3]} name="ปั๊มฟอยล์ 1" status="running" />
      {ppl('foil-1').map((p, i) => (
        <Character key={`fl${i}`} position={[10.8 + i*0.5, 0, 4]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}
      <Machine position={[13, 0, 3]} name="เครื่องเคลือบ" status="running" width={1.2} />

      {/* ═══════ BUILDING 100 ตร.ว. ═══════ */}
      <Room position={[-2, 0, 9]} width={14} depth={5} color="#10b981" label="โรงงาน 100 ตร.ว. (หลังพิมพ์)" />

      {/* ── Video desk, ODM 1, ODM 2 ── */}
      {ppl('desk-video').length > 0 ? ppl('desk-video').map((p,i) => (
        <PersonDesk key={`vid${i}`} position={[-7, 0, 7.5]} name={p.name} role={p.role} color={gc(p.id)} label="ตัดต่อ" />
      )) : <EmptyDesk position={[-7, 0, 7.5]} label="ตัดต่องาน" />}
      <Machine position={[-5, 0, 7.5]} name="ODM 1" status="running" width={1.3} />
      <Machine position={[-3, 0, 7.5]} name="ODM 2" status="running" width={1.3} />

      {/* ── เครื่องเย็บ, พับ 1, พับ 2 ── */}
      <Machine position={[-7, 0, 10]} name="เครื่องเย็บ" status="running" width={1.2} />
      {ppl('stitch').map((p, i) => (
        <Character key={`st${i}`} position={[-7, 0, 11]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}
      <Machine position={[-5, 0, 10]} name="เครื่องพับ 1" status="running" width={1.2} />
      {ppl('fold-1').map((p, i) => (
        <Character key={`f1${i}`} position={[-5, 0, 11]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}
      <Machine position={[-3, 0, 10]} name="เครื่องพับ 2" status="running" width={1.2} />

      {/* ── กระดูกงู, ขับรถ ── */}
      <Machine position={[-1, 0, 10]} name="กระดูกงู" status="running" width={1.2} />
      <EmptyDesk position={[1, 0, 10]} label="ขับรถ" color="#10b981" />
      {ppl('drive').map((p, i) => (
        <Character key={`dr${i}`} position={[0.7 + i*0.6, 0, 11]} name={p.name} color={gc(p.id)} role={p.role} />
      ))}

      {/* ═══════ BUILDING 63 ตร.ว. ═══════ */}
      <Room position={[10, 0, 9]} width={7} depth={5} color="#6366f1" label="ตึก 63 ตร.ว. (คลัง/จัดส่ง)" />
      {ppl('post-coord').map((p, i) => (
        <PersonDesk key={`pc${i}`} position={[8, 0, 8]} name={p.name} role={p.role} color={gc(p.id)} label="ประสานงาน" />
      ))}
      {ppl('post-press').map((p, i) => (
        <PersonDesk key={`pp${i}`} position={[9.5 + i*1.3, 0, 10]} name={p.name} role={p.role} color={gc(p.id)} label="หลังพิมพ์" />
      ))}

      <OrbitControls makeDefault minPolarAngle={Math.PI/6} maxPolarAngle={Math.PI/2.5} minDistance={5} maxDistance={30} target={[4, 0, 2]} />
    </>
  );
}

export default function VirtualOffice3DView({ factoryZones, activeSessions, machineStatus }) {
  return (
    <div style={{ width: '100%', height: '70vh', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
      <Canvas camera={{ position: [18, 14, 18], fov: 50 }} style={{ background: 'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)' }}>
        <FactoryScene factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus} />
      </Canvas>
    </div>
  );
}
