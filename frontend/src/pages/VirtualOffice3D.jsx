import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

function WalledRoom({ position, width, depth, color, label, wallH = 1.2 }) {
  const wt = 0.06;
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><planeGeometry args={[width,depth]}/><meshStandardMaterial color={color} opacity={0.12} transparent/></mesh>
      <mesh position={[0,wallH/2,-depth/2]}><boxGeometry args={[width,wallH,wt]}/><meshStandardMaterial color={color} opacity={0.35} transparent/></mesh>
      <mesh position={[-width/2,wallH/2,0]}><boxGeometry args={[wt,wallH,depth]}/><meshStandardMaterial color={color} opacity={0.35} transparent/></mesh>
      <mesh position={[width/2,wallH/2,0]}><boxGeometry args={[wt,wallH,depth]}/><meshStandardMaterial color={color} opacity={0.25} transparent/></mesh>
      <mesh position={[0,wallH/4,depth/2]}><boxGeometry args={[width,wallH/2,wt]}/><meshStandardMaterial color={color} opacity={0.15} transparent/></mesh>
      <Html position={[0,wallH+0.2,-depth/2+0.1]} center distanceFactor={12} style={{pointerEvents:'none'}}>
        <div style={{background:color,color:'white',padding:'4px 12px',borderRadius:'8px',fontSize:'11px',fontWeight:'bold',whiteSpace:'nowrap',boxShadow:'0 3px 10px rgba(0,0,0,0.4)'}}>{label}</div>
      </Html>
    </group>
  );
}

function Bld({ position, width, depth, color, label }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.003,0]}><planeGeometry args={[width,depth]}/><meshStandardMaterial color={color} opacity={0.06} transparent/></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(width,0.02,depth)]}/><lineBasicMaterial color={color}/></lineSegments>
      <Html position={[-width/2+2,0.05,-depth/2+0.2]} center distanceFactor={18} style={{pointerEvents:'none'}}>
        <div style={{background:color,color:'white',padding:'5px 14px',borderRadius:'10px',fontSize:'13px',fontWeight:'bold',whiteSpace:'nowrap',boxShadow:'0 4px 12px rgba(0,0,0,0.5)'}}>{label}</div>
      </Html>
    </group>
  );
}

function Person({ position, name, color='#6366f1', role }) {
  const ref = useRef();
  useFrame((s)=>{if(ref.current)ref.current.position.y=position[1]+Math.sin(s.clock.elapsedTime*1.5+position[0])*0.03;});
  return (
    <group ref={ref} position={position}>
      <RoundedBox args={[0.28,0.35,0.18]} radius={0.05} position={[0,0.18,0]}><meshStandardMaterial color={color}/></RoundedBox>
      <mesh position={[0,0.48,0]}><sphereGeometry args={[0.13,16,16]}/><meshStandardMaterial color="#fcd9b6"/></mesh>
      <mesh position={[0,0.56,-0.02]}><sphereGeometry args={[0.11,16,16]}/><meshStandardMaterial color={color}/></mesh>
      <mesh position={[0.1,0.58,0.07]}><sphereGeometry args={[0.025,8,8]}/><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5}/></mesh>
      <Html position={[0,0.78,0]} center distanceFactor={6} style={{pointerEvents:'none'}}>
        <div style={{textAlign:'center',whiteSpace:'nowrap'}}>
          <div style={{background:'rgba(0,0,0,0.75)',color:'white',padding:'1px 5px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold'}}>{name}</div>
          {role&&<div style={{color:'#94a3b8',fontSize:'6px'}}>{role}</div>}
        </div>
      </Html>
    </group>
  );
}

function DeskWithPerson({ position, name, color, role, label }) {
  return (
    <group position={position}>
      <mesh position={[0,0.38,0]}><boxGeometry args={[0.75,0.04,0.4]}/><meshStandardMaterial color="#bfdbfe"/></mesh>
      {[[-0.32,0.18,-0.15],[0.32,0.18,-0.15],[-0.32,0.18,0.15],[0.32,0.18,0.15]].map((p,i)=>(<mesh key={i} position={p}><boxGeometry args={[0.02,0.36,0.02]}/><meshStandardMaterial color="#64748b"/></mesh>))}
      <mesh position={[0,0.52,-0.1]} rotation={[0.1,0,0]}><boxGeometry args={[0.22,0.15,0.012]}/><meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.15}/></mesh>
      {label&&<Html position={[0,0.48,0.25]} center distanceFactor={7} style={{pointerEvents:'none'}}><div style={{background:'rgba(59,130,246,0.7)',color:'white',padding:'1px 4px',borderRadius:'3px',fontSize:'6px',fontWeight:'bold',whiteSpace:'nowrap'}}>{label}</div></Html>}
      {name&&<Person position={[0,0,0.45]} name={name} color={color} role={role}/>}
    </group>
  );
}

function Mch({ position, name, status='running', type='post', w=1.3 }) {
  const sc = status==='error'?'#ef4444':status==='setup'?'#f59e0b':'#22c55e';
  const gR = useRef();
  useFrame(()=>{if(gR.current&&status==='running')gR.current.rotation.z+=0.015;});
  const colors = {printer:'#64748b',cutter:'#78716c',digital:'#475569',post:'#a3a3a3'};
  const heights = {printer:1.0,cutter:0.6,digital:0.9,post:0.7};
  const c = colors[type]; const h = heights[type];
  return (
    <group position={position}>
      <RoundedBox args={[w,h,0.9]} radius={0.04} position={[0,h/2,0]}><meshStandardMaterial color={c} metalness={0.3} roughness={0.6}/></RoundedBox>
      {type==='printer'&&<><mesh position={[0,h*0.8,0.46]}><boxGeometry args={[0.4,0.25,0.02]}/><meshStandardMaterial color="#1e293b" emissive="#0ea5e9" emissiveIntensity={0.3}/></mesh>
      <mesh ref={gR} position={[w/2-0.2,h*0.7,0.47]}><torusGeometry args={[0.08,0.02,8,6]}/><meshStandardMaterial color="#f59e0b" metalness={0.8}/></mesh></>}
      {type==='cutter'&&<mesh position={[0,h+0.02,0]}><boxGeometry args={[w*0.8,0.03,0.015]}/><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3}/></mesh>}
      {type==='digital'&&<mesh position={[0,h*0.8,0.46]}><boxGeometry args={[0.5,0.25,0.02]}/><meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.2}/></mesh>}
      <mesh position={[w/2-0.1,h+0.05,0]}><sphereGeometry args={[0.04,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={1}/></mesh>
      <Html position={[0,h+0.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}>
        <div style={{background:`rgba(0,0,0,0.7)`,color:'white',padding:'2px 6px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div>
      </Html>
    </group>
  );
}

function MtgRoom({ position, name, w=3, d=2 }) {
  return (
    <group position={position}>
      <mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[w,d]}/><meshStandardMaterial color="#fef08a"/></mesh>
      {[[0,0.5,-d/2,w,1,0.03],[0,0.5,d/2,w,1,0.03],[-w/2,0.5,0,0.03,1,d]].map((p,i)=>(<mesh key={i} position={[p[0],p[1],p[2]]}><boxGeometry args={[p[3],p[4],p[5]]}/><meshStandardMaterial color="#bfdbfe" transparent opacity={0.3}/></mesh>))}
      <mesh position={[w/2,0.5,0]}><boxGeometry args={[0.04,1,0.5]}/><meshStandardMaterial color="#ca8a04"/></mesh>
      <RoundedBox args={[w*0.45,0.04,d*0.3]} radius={0.02} position={[0,0.38,0]}><meshStandardMaterial color="#a78bfa"/></RoundedBox>
      <Html position={[0,1.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{background:'rgba(202,138,4,0.85)',color:'white',padding:'3px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div></Html>
    </group>
  );
}

function FactoryScene({ factoryZones, activeSessions, machineStatus }) {
  const cc=['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
  const gc=(id)=>cc[id%cc.length];
  const ppl=(stId)=>(activeSessions[stId]||[]);
  const dp=(stId,x,z,label,pfx)=>ppl(stId).map((p,i)=>(<DeskWithPerson key={`${pfx}${i}`} position={[x+i*1.0,0,z]} name={p.name} color={gc(p.id)} role={p.role} label={label}/>));

  return (
    <>
      <ambientLight intensity={0.6}/><directionalLight position={[10,15,10]} intensity={1}/><directionalLight position={[-5,10,-5]} intensity={0.3}/>
      <mesh rotation={[-Math.PI/2,0,0]} position={[3,-0.01,3]}><planeGeometry args={[35,25]}/><meshStandardMaterial color="#1e293b"/></mesh>

      {/* ═══ โรง 200 ตร.ว. (ด้านบน, ตึกใหญ่) ═══ */}
      <Bld position={[3,0,-3]} width={22} depth={10} color="#3b82f6" label="โรงงาน 200 ตร.ว."/>

      {/* ── ห้องเซล & แอดมิน (บนซ้ายของ200) ── */}
      <WalledRoom position={[-4,0,-6]} width={10} depth={3.5} color="#3b82f6" label="ห้องเซล & แอดมิน"/>
      {dp('desk-sales',-8,-7,'เซล','s')}
      {dp('desk-marketing',-3,-7,'การตลาด','mk')}
      {dp('desk-admin',-2,-5.2,'แอดมิน','ad')}
      {dp('desk-graphic',-5,-5.2,'ออกแบบ','gr')}

      {/* ── ห้องบัญชี & ผลิต (กลางซ้ายของ200, ใต้ห้องเซล) ── */}
      <WalledRoom position={[-4,0,-2.5]} width={10} depth={3} color="#f59e0b" label="ห้องบัญชี & ผลิต"/>
      {dp('desk-prod-admin',-8,-3,'ผลิต','pr')}
      {dp('desk-pricing',-7,-3,'คิดราคา','prc')}
      {dp('desk-account',-5.5,-3,'บัญชี','ac')}
      {dp('desk-hr',-3,-3,'HR','hr')}
      {dp('desk-logistics',-2,-3,'จัดส่ง','lg')}

      {/* ── ห้องประชุม 1 (ล่างซ้ายของ200, หน้าโรงงาน) ── */}
      <MtgRoom position={[-6,0,0]} name="ห้องประชุม 1 (รับแขก)" w={3.5} d={2}/>

      {/* ── เครื่องจักร (ฝั่งขวาของ200) ── */}
      <WalledRoom position={[8,0,-4.5]} width={10} depth={8} color="#f59e0b" label="โซนเครื่องจักร" wallH={1.5}/>
      {/* แถวบน: ตัด1 + Heidelberg Auto + SM74 + ตัด2 */}
      <Mch position={[4.5,0,-7]} name="Itotec No.1" type="cutter" status={machineStatus['cutter-1']||'running'}/>
      {ppl('cutter-1').map((p,i)=><Person key={`c1${i}`} position={[4.5,0,-6]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <Mch position={[6.5,0,-7]} name="Heidelberg Auto" type="post"/>
      <Mch position={[8.5,0,-7]} name="SM74 5สี" type="printer" status={machineStatus['print-sm74']||'running'}/>
      {ppl('print-sm74').map((p,i)=><Person key={`s74${i}`} position={[8.5,0,-6]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <Mch position={[11,0,-7]} name="Itotec No.2" type="cutter" status={machineStatus['cutter-2']||'running'}/>
      {ppl('cutter-2').map((p,i)=><Person key={`c2${i}`} position={[11,0,-6]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      {/* แถว2: SM102 */}
      <Mch position={[8,0,-4.5]} name="SM102 5สี" type="printer" w={2} status={machineStatus['print-sm102']||'running'}/>
      {ppl('print-sm102').map((p,i)=><Person key={`s102${i}`} position={[7.5+i*0.5,0,-3.5]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      {/* แถว3: ไดคัท + ฟอยล์ + เคลือบ */}
      <Mch position={[4.5,0,-2]} name="ไดคัท จีนตัด2" type="post"/>
      <Mch position={[6.5,0,-2]} name="ไดคัท จีนตัด3" type="post"/>
      <Mch position={[8.5,0,-2]} name="ฟอยล์จีน" type="post"/>
      {ppl('foil-cn').map((p,i)=><Person key={`fl${i}`} position={[8.3+i*0.5,0,-1]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <Mch position={[11,0,-2]} name="Guangming 920" type="post" w={1.4}/>

      {/* ═══ โรง 100 ตร.ว. (ด้านล่างซ้าย) ═══ */}
      <Bld position={[-3,0,7]} width={16} depth={7} color="#10b981" label="โรงงาน 100 ตร.ว."/>

      {/* ── ห้องกราฟฟิค & วางแผน (บนซ้ายของ100) ── */}
      <WalledRoom position={[-6,0,5]} width={8} depth={2.5} color="#10b981" label="ห้องกราฟฟิค & วางแผน"/>
      {dp('desk-checkfile',-9,4.5,'เช็คไฟล์','cf')}
      {dp('desk-layout',-7,4.5,'Layout','ly')}
      {dp('desk-odm',-5.5,4.5,'คุมเครื่อง','odmc')}
      {dp('desk-planner',-4,4.5,'วางแผน','pl')}
      {dp('desk-manager',-3,4.5,'ผู้จัดการ','mg')}

      {/* ── ห้องประชุม 2 ชั้น 2 (ซ้ายสุดของ100, ยกสูง) ── */}
      <group position={[-9,1.5,7]}>
        <MtgRoom position={[0,0,0]} name="ห้องประชุม 2 (ชั้น 2)" w={3} d={2}/>
        {[[-1.2,-.75,-.8],[1.2,-.75,-.8],[-1.2,-.75,.8],[1.2,-.75,.8]].map((p,i)=>(<mesh key={i} position={p}><boxGeometry args={[0.07,1.5,0.07]}/><meshStandardMaterial color="#64748b"/></mesh>))}
        <Html position={[0,-0.5,1.2]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{color:'#fbbf24',fontSize:'9px',fontWeight:'bold'}}>↑ ชั้น 2</div></Html>
      </group>

      {/* ── เครื่องจักร โรง100 (กลาง+ล่าง) ── */}
      {dp('desk-video',-6,7,'ตัดต่อ','vid')}
      <Mch position={[-4,0,7]} name="Konica 12000 (ODM1)" type="digital"/>
      <Mch position={[-2,0,7]} name="Konica 4070 (ODM2)" type="digital"/>
      <Mch position={[-6,0,9.5]} name="Muller เก็บเย็บตัด" type="post" w={1.5}/>
      {ppl('stitch').map((p,i)=><Person key={`st${i}`} position={[-6,0,10.3]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <Mch position={[-4,0,9.5]} name="Stahl พับ No.1" type="post"/>
      {ppl('fold-1').map((p,i)=><Person key={`f1${i}`} position={[-4,0,10.3]} name={p.name} color={gc(p.id)} role="Operator"/>)}
      <Mch position={[-2,0,9.5]} name="Stahl พับ No.2" type="post"/>
      <Mch position={[0,0,9.5]} name="กระดูกงู" type="post"/>
      {ppl('drive').map((p,i)=><Person key={`dr${i}`} position={[2+i*0.6,0,9.5]} name={p.name} color={gc(p.id)} role="Driver"/>)}

      {/* ═══ ตึก 63 ตร.ว. (ด้านล่างขวา, ติดกับ100) ═══ */}
      <Bld position={[9,0,7]} width={8} depth={7} color="#6366f1" label="ตึก 63 ตร.ว."/>
      <WalledRoom position={[9,0,6]} width={6} depth={4} color="#6366f1" label="หลังพิมพ์ & CTP"/>
      <Mch position={[7,0,5]} name="CTP" type="digital"/>
      {dp('post-coord',9,5,'ประสานงาน','pco')}
      {dp('post-press',7,7.5,'หลังพิมพ์','pp')}

      <OrbitControls makeDefault minPolarAngle={Math.PI/8} maxPolarAngle={Math.PI/2.3} minDistance={5} maxDistance={35} target={[3,0,2]}/>
    </>
  );
}

export default function VirtualOffice3DView({ factoryZones, activeSessions, machineStatus }) {
  return (
    <div style={{width:'100%',height:'70vh',borderRadius:'20px',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,0.4)'}}>
      <Canvas camera={{position:[20,16,20],fov:50}} style={{background:'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)'}}>
        <FactoryScene factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus}/>
      </Canvas>
    </div>
  );
}
