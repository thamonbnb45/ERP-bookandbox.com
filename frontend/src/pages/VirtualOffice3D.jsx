import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ═══ Walled Room with floor, walls, and label ═══ */
function WalledRoom({ position, width, depth, color, label, wallHeight = 1.2 }) {
  const wt = 0.06; // wall thickness
  return (
    <group position={position}>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} opacity={0.12} transparent />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, wallHeight/2, -depth/2]}>
        <boxGeometry args={[width, wallHeight, wt]} />
        <meshStandardMaterial color={color} opacity={0.35} transparent />
      </mesh>
      {/* Left wall */}
      <mesh position={[-width/2, wallHeight/2, 0]}>
        <boxGeometry args={[wt, wallHeight, depth]} />
        <meshStandardMaterial color={color} opacity={0.35} transparent />
      </mesh>
      {/* Right wall */}
      <mesh position={[width/2, wallHeight/2, 0]}>
        <boxGeometry args={[wt, wallHeight, depth]} />
        <meshStandardMaterial color={color} opacity={0.25} transparent />
      </mesh>
      {/* Front wall (lower, like a half-wall) */}
      <mesh position={[0, wallHeight/4, depth/2]}>
        <boxGeometry args={[width, wallHeight/2, wt]} />
        <meshStandardMaterial color={color} opacity={0.15} transparent />
      </mesh>
      {/* Room label on back wall */}
      <Html position={[0, wallHeight + 0.2, -depth/2 + 0.1]} center distanceFactor={12} style={{pointerEvents:'none'}}>
        <div style={{background:color, color:'white', padding:'4px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:'bold', whiteSpace:'nowrap', boxShadow:'0 3px 10px rgba(0,0,0,0.4)'}}>{label}</div>
      </Html>
    </group>
  );
}

/* ═══ Building boundary (outer) ═══ */
function Building({ position, width, depth, color, label }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} opacity={0.06} transparent />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.02, depth)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
      <Html position={[-width/2+2, 0.05, -depth/2+0.2]} center distanceFactor={18} style={{pointerEvents:'none'}}>
        <div style={{background:color, color:'white', padding:'5px 16px', borderRadius:'10px', fontSize:'14px', fontWeight:'bold', whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(0,0,0,0.5)'}}>{label}</div>
      </Html>
    </group>
  );
}

/* ═══ Character (person) ═══ */
function Person({ position, name, color = '#6366f1', role }) {
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 1.5 + position[0]) * 0.03; });
  return (
    <group ref={ref} position={position}>
      <RoundedBox args={[0.3,0.38,0.2]} radius={0.06} position={[0,0.19,0]}><meshStandardMaterial color={color}/></RoundedBox>
      <mesh position={[0,0.52,0]}><sphereGeometry args={[0.14,16,16]}/><meshStandardMaterial color="#fcd9b6"/></mesh>
      <mesh position={[0,0.61,-0.02]}><sphereGeometry args={[0.12,16,16]}/><meshStandardMaterial color={color}/></mesh>
      <mesh position={[0.11,0.62,0.08]}><sphereGeometry args={[0.03,8,8]}/><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5}/></mesh>
      <Html position={[0,0.82,0]} center distanceFactor={6} style={{pointerEvents:'none'}}>
        <div style={{textAlign:'center',whiteSpace:'nowrap'}}>
          <div style={{background:'rgba(0,0,0,0.75)',color:'white',padding:'1px 6px',borderRadius:'4px',fontSize:'9px',fontWeight:'bold'}}>{name}</div>
          {role && <div style={{color:'#94a3b8',fontSize:'7px'}}>{role}</div>}
        </div>
      </Html>
    </group>
  );
}

/* ═══ Desk (individual, small) ═══ */
function Desk({ position, label }) {
  return (
    <group position={position}>
      <mesh position={[0,0.4,0]}><boxGeometry args={[0.8,0.04,0.45]}/><meshStandardMaterial color="#bfdbfe"/></mesh>
      {[[-0.35,0.2,-0.17],[0.35,0.2,-0.17],[-0.35,0.2,0.17],[0.35,0.2,0.17]].map((p,i)=>(
        <mesh key={i} position={p}><boxGeometry args={[0.025,0.4,0.025]}/><meshStandardMaterial color="#64748b"/></mesh>
      ))}
      <mesh position={[0,0.58,-0.12]} rotation={[0.1,0,0]}><boxGeometry args={[0.25,0.18,0.015]}/><meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.15}/></mesh>
      {label && <Html position={[0,0.5,0.3]} center distanceFactor={7} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(59,130,246,0.7)',color:'white',padding:'1px 4px',borderRadius:'3px',fontSize:'7px',fontWeight:'bold',whiteSpace:'nowrap'}}>{label}</div>
      </Html>}
    </group>
  );
}

/* ═══ Machine types ═══ */
function PrinterMachine({ position, name, status = 'running' }) {
  const sc = status==='error'?'#ef4444':status==='setup'?'#f59e0b':'#22c55e';
  const gearRef = useRef();
  useFrame(() => { if (gearRef.current && status==='running') gearRef.current.rotation.z += 0.015; });
  return (
    <group position={position}>
      <RoundedBox args={[1.8,1.0,1.2]} radius={0.05} position={[0,0.5,0]}><meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.6}/></RoundedBox>
      <mesh position={[0,0.8,0.61]}><boxGeometry args={[0.5,0.3,0.02]}/><meshStandardMaterial color="#1e293b" emissive="#0ea5e9" emissiveIntensity={0.3}/></mesh>
      <mesh ref={gearRef} position={[0.7,0.7,0.62]}><torusGeometry args={[0.1,0.025,8,6]}/><meshStandardMaterial color="#f59e0b" metalness={0.8}/></mesh>
      <mesh position={[0.8,1.05,0]}><sphereGeometry args={[0.06,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={1}/></mesh>
      <Html position={[0,1.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(100,116,139,0.85)',color:'white',padding:'2px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div>
      </Html>
    </group>
  );
}

function CutterMachine({ position, name, status = 'running' }) {
  const sc = status==='error'?'#ef4444':'#22c55e';
  return (
    <group position={position}>
      <RoundedBox args={[1.4,0.6,0.9]} radius={0.04} position={[0,0.3,0]}><meshStandardMaterial color="#78716c" metalness={0.3}/></RoundedBox>
      <mesh position={[0,0.65,0]}><boxGeometry args={[1.2,0.04,0.02]}/><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3}/></mesh>
      <mesh position={[0.6,0.65,0]}><sphereGeometry args={[0.04,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.8}/></mesh>
      <Html position={[0,0.85,0]} center distanceFactor={10} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(120,113,108,0.85)',color:'white',padding:'2px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div>
      </Html>
    </group>
  );
}

function DigitalPrinter({ position, name, status = 'running' }) {
  const sc = status==='error'?'#ef4444':'#22c55e';
  return (
    <group position={position}>
      <RoundedBox args={[1.2,0.9,0.8]} radius={0.04} position={[0,0.45,0]}><meshStandardMaterial color="#475569" metalness={0.2}/></RoundedBox>
      <mesh position={[0,0.75,0.41]}><boxGeometry args={[0.6,0.3,0.02]}/><meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.2}/></mesh>
      <mesh position={[0.5,0.95,0]}><sphereGeometry args={[0.04,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.8}/></mesh>
      <Html position={[0,1.1,0]} center distanceFactor={10} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(71,85,105,0.85)',color:'#38bdf8',padding:'2px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div>
      </Html>
    </group>
  );
}

function PostPressMachine({ position, name, status = 'running' }) {
  const sc = status==='error'?'#ef4444':'#22c55e';
  return (
    <group position={position}>
      <RoundedBox args={[1.3,0.7,0.8]} radius={0.04} position={[0,0.35,0]}><meshStandardMaterial color="#a3a3a3" metalness={0.3}/></RoundedBox>
      <mesh position={[0.55,0.75,0]}><sphereGeometry args={[0.04,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.8}/></mesh>
      <Html position={[0,0.9,0]} center distanceFactor={10} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(163,163,163,0.85)',color:'white',padding:'2px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div>
      </Html>
    </group>
  );
}

function MeetingRoom3D({ position, name, width = 3, depth = 2 }) {
  return (
    <group position={position}>
      <mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[width,depth]}/><meshStandardMaterial color="#fef08a"/></mesh>
      {[[0,0.5,-depth/2,width,1,0.03],[0,0.5,depth/2,width,1,0.03],[-width/2,0.5,0,0.03,1,depth]].map((w,i)=>(
        <mesh key={i} position={[w[0],w[1],w[2]]}><boxGeometry args={[w[3],w[4],w[5]]}/><meshStandardMaterial color="#bfdbfe" transparent opacity={0.3}/></mesh>
      ))}
      <mesh position={[width/2,0.5,0]}><boxGeometry args={[0.04,1,0.6]}/><meshStandardMaterial color="#ca8a04"/></mesh>
      <RoundedBox args={[width*0.5,0.05,depth*0.35]} radius={0.02} position={[0,0.4,0]}><meshStandardMaterial color="#a78bfa"/></RoundedBox>
      <Html position={[0,1.3,0]} center distanceFactor={10} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(202,138,4,0.85)',color:'white',padding:'3px 10px',borderRadius:'6px',fontSize:'10px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div>
      </Html>
    </group>
  );
}

/* ═══ SCENE ═══ */
function FactoryScene({ factoryZones, activeSessions, machineStatus }) {
  const cc = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
  const gc = (id) => cc[id % cc.length];
  const ppl = (stId) => (activeSessions[stId] || []);

  // Helper: render a row of people at desks inside a room
  const deskRow = (stationId, startX, z, label, prefix) => {
    return ppl(stationId).map((p, i) => (
      <group key={`${prefix}${i}`}>
        <Desk position={[startX + i*1.1, 0, z]} label={label} />
        <Person position={[startX + i*1.1, 0, z+0.55]} name={p.name} color={gc(p.id)} role={p.role} />
      </group>
    ));
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10,15,10]} intensity={1} />
      <directionalLight position={[-5,10,-5]} intensity={0.3} />
      <mesh rotation={[-Math.PI/2,0,0]} position={[4,-0.01,5]}><planeGeometry args={[38,28]}/><meshStandardMaterial color="#1e293b"/></mesh>

      {/* ════════════════════════════════════════════════ */}
      {/* ════ โรง 200 ตร.ว. ════════════════════════════ */}
      {/* ════════════════════════════════════════════════ */}
      <Building position={[3,0,-2]} width={24} depth={10} color="#3b82f6" label="โรงงาน 200 ตร.ว." />

      {/* ─── ห้องเซล (Sales + Admin + Marketing + Design) ─── */}
      <WalledRoom position={[-4,0,-4.5]} width={10} depth={4} color="#3b82f6" label="ห้องเซล & แอดมิน" />
      {deskRow('desk-sales', -8, -5.5, 'เซล', 's')}
      {deskRow('desk-admin', -4.5, -5.5, 'แอดมิน', 'ad')}
      {deskRow('desk-marketing', -2, -5.5, 'การตลาด', 'mk')}
      {deskRow('desk-graphic', -0.5, -5.5, 'ออกแบบ', 'gr')}

      {/* ─── ห้องบัญชี & ผลิต ─── */}
      <WalledRoom position={[-4,0,-0.5]} width={10} depth={3} color="#f59e0b" label="ห้องบัญชี & ผลิต" />
      {deskRow('desk-prod-admin', -8, -1.2, 'ผลิต', 'pr')}
      {deskRow('desk-pricing', -6.5, -1.2, 'คิดราคา', 'prc')}
      {deskRow('desk-account', -5, -1.2, 'บัญชี', 'ac')}
      {deskRow('desk-hr', -2.5, -1.2, 'HR', 'hr')}
      {deskRow('desk-logistics', -1, -1.2, 'จัดส่ง', 'lg')}

      {/* ─── ห้องประชุม 1 ─── */}
      <MeetingRoom3D position={[-4,0,2.5]} name="ห้องประชุม 1 (รับแขก)" width={4} depth={2.5} />

      {/* ─── เครื่องจักร (ฝั่งขวา โรง200) ─── */}
      <WalledRoom position={[9,0,-3]} width={10} depth={8} color="#f59e0b" label="โซนเครื่องจักร" wallHeight={1.5} />
      <PrinterMachine position={[6,0,-5.5]} name="SM74 5สี (2003)" status={machineStatus['print-sm74']||'running'} />
      {ppl('print-sm74').map((p,i)=><Person key={`sm74p${i}`} position={[6+i*0.5,0,-4.3]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <PrinterMachine position={[9,0,-5.5]} name="SM102 5สี (1999)" status={machineStatus['print-sm102']||'running'} />
      {ppl('print-sm102').map((p,i)=><Person key={`sm102p${i}`} position={[8.5+i*0.5,0,-4.3]} name={p.name} color={gc(p.id)} role="Operator"/>)}

      <CutterMachine position={[12.5,0,-5.5]} name="Itotec 115 No.1" />
      {ppl('cutter-1').map((p,i)=><Person key={`c1p${i}`} position={[12.5,0,-4.5]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <CutterMachine position={[12.5,0,-3]} name="Itotec 115 No.2" />
      {ppl('cutter-2').map((p,i)=><Person key={`c2p${i}`} position={[12.5,0,-2]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <PostPressMachine position={[13.5,0,-5.5]} name="Heidelberg Auto" />

      <PostPressMachine position={[6,0,-2.5]} name="ไดคัท จีนตัด2" />
      <PostPressMachine position={[8,0,-2.5]} name="ไดคัท จีนตัด3" />
      <PostPressMachine position={[10,0,-2.5]} name="ฟอยล์จีน" />
      {ppl('foil-cn').map((p,i)=><Person key={`flp${i}`} position={[9.8+i*0.5,0,-1.5]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <PostPressMachine position={[6,0,-0.5]} name="Guangming 920" />

      {/* ════════════════════════════════════════════════ */}
      {/* ════ โรง 100 ตร.ว. ════════════════════════════ */}
      {/* ════════════════════════════════════════════════ */}
      <Building position={[0,0,8]} width={20} depth={8} color="#10b981" label="โรงงาน 100 ตร.ว." />

      {/* ─── ห้องกราฟฟิค & วางแผน ─── */}
      <WalledRoom position={[-5,0,5.5]} width={9} depth={3} color="#10b981" label="ห้องกราฟฟิค & วางแผน" />
      {deskRow('desk-checkfile', -8.5, 4.5, 'เช็คไฟล์', 'cf')}
      {deskRow('desk-layout', -5.5, 4.5, 'Layout', 'ly')}
      {deskRow('desk-planner', -4, 4.5, 'วางแผน', 'pl')}
      {deskRow('desk-manager', -2.5, 4.5, 'ผู้จัดการ', 'mg')}
      {deskRow('desk-odm', -7, 6, 'คุมเครื่อง', 'odmc')}

      {/* ─── ห้องประชุม 2 (ชั้น 2) ─── */}
      <group position={[-5,1.5,5.5]}>
        <MeetingRoom3D position={[0,0,0]} name="ห้องประชุม 2 (ชั้น 2)" width={3.5} depth={2} />
        {[[-1.5,-.75,-0.8],[1.5,-.75,-0.8],[-1.5,-.75,0.8],[1.5,-.75,0.8]].map((p,i)=>(
          <mesh key={i} position={p}><boxGeometry args={[0.08,1.5,0.08]}/><meshStandardMaterial color="#64748b"/></mesh>
        ))}
        <Html position={[0,-0.5,1.2]} center distanceFactor={10} style={{pointerEvents:'none'}}>
          <div style={{color:'#fbbf24',fontSize:'9px',fontWeight:'bold'}}>↑ ชั้น 2</div>
        </Html>
      </group>

      {/* ─── เครื่องจักร โรง100 ─── */}
      <WalledRoom position={[3,0,8.5]} width={8} depth={5} color="#10b981" label="โซนเครื่องจักร โรง100" wallHeight={1} />
      {ppl('desk-video').length > 0 ? (
        <group>{deskRow('desk-video', 0, 7, 'ตัดต่อ', 'vid')}</group>
      ) : <Desk position={[0,0,7]} label="ตัดต่อ (ว่าง)" />}
      <DigitalPrinter position={[2,0,7]} name="Konica 12000 (ODM1)" />
      <DigitalPrinter position={[4.5,0,7]} name="Konica 4070 (ODM2)" />
      <PostPressMachine position={[0,0,9.5]} name="Muller เก็บเย็บตัด" />
      {ppl('stitch').map((p,i)=><Person key={`stp${i}`} position={[0,0,10.3]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <PostPressMachine position={[2,0,9.5]} name="Stahl พับ No.1" />
      {ppl('fold-1').map((p,i)=><Person key={`f1p${i}`} position={[2,0,10.3]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <PostPressMachine position={[4,0,9.5]} name="Stahl พับ No.2" />
      <PostPressMachine position={[6,0,9.5]} name="กระดูกงู" />
      {ppl('drive').map((p,i)=><Person key={`drp${i}`} position={[6+i*0.6,0,10.5]} name={p.name} color={gc(p.id)} role="Driver"/>)}

      {/* ════════════════════════════════════════════════ */}
      {/* ════ ตึก 63 ตร.ว. ════════════════════════════ */}
      {/* ════════════════════════════════════════════════ */}
      <Building position={[14,0,8]} width={8} depth={8} color="#6366f1" label="ตึก 63 ตร.ว." />
      <WalledRoom position={[14,0,6]} width={6} depth={3} color="#6366f1" label="หลังพิมพ์ & CTP" wallHeight={1} />
      <DigitalPrinter position={[12,0,5.5]} name="CTP" />
      {deskRow('post-coord', 14, 5, 'ประสานงาน', 'pco')}
      {deskRow('post-press', 12, 7.5, 'หลังพิมพ์', 'pp')}

      <OrbitControls makeDefault minPolarAngle={Math.PI/8} maxPolarAngle={Math.PI/2.3} minDistance={5} maxDistance={35} target={[4,0,3]} />
    </>
  );
}

export default function VirtualOffice3DView({ factoryZones, activeSessions, machineStatus }) {
  return (
    <div style={{ width:'100%', height:'70vh', borderRadius:'20px', overflow:'hidden', boxShadow:'0 8px 30px rgba(0,0,0,0.4)' }}>
      <Canvas camera={{position:[20,16,20],fov:50}} style={{background:'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)'}}>
        <FactoryScene factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus} />
      </Canvas>
    </div>
  );
}
