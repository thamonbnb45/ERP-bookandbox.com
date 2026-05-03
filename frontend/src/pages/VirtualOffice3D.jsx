import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

function WR({position,width,depth,color,label,wH=1.2}){const w=0.06;return(<group position={position}><mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><planeGeometry args={[width,depth]}/><meshStandardMaterial color={color} opacity={0.12} transparent/></mesh><mesh position={[0,wH/2,-depth/2]}><boxGeometry args={[width,wH,w]}/><meshStandardMaterial color={color} opacity={0.35} transparent/></mesh><mesh position={[-width/2,wH/2,0]}><boxGeometry args={[w,wH,depth]}/><meshStandardMaterial color={color} opacity={0.35} transparent/></mesh><mesh position={[width/2,wH/2,0]}><boxGeometry args={[w,wH,depth]}/><meshStandardMaterial color={color} opacity={0.25} transparent/></mesh><mesh position={[0,wH/4,depth/2]}><boxGeometry args={[width,wH/2,w]}/><meshStandardMaterial color={color} opacity={0.15} transparent/></mesh><Html position={[0,wH+0.2,-depth/2+0.1]} center distanceFactor={12} style={{pointerEvents:'none'}}><div style={{background:color,color:'white',padding:'3px 10px',borderRadius:'7px',fontSize:'10px',fontWeight:'bold',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>{label}</div></Html></group>);}
function Bld({position,width,depth,color,label}){return(<group position={position}><mesh rotation={[-Math.PI/2,0,0]} position={[0,0.003,0]}><planeGeometry args={[width,depth]}/><meshStandardMaterial color={color} opacity={0.06} transparent/></mesh><lineSegments><edgesGeometry args={[new THREE.BoxGeometry(width,0.02,depth)]}/><lineBasicMaterial color={color}/></lineSegments><Html position={[-width/2+2,0.05,-depth/2+0.2]} center distanceFactor={18} style={{pointerEvents:'none'}}><div style={{background:color,color:'white',padding:'4px 12px',borderRadius:'9px',fontSize:'12px',fontWeight:'bold',whiteSpace:'nowrap',boxShadow:'0 3px 10px rgba(0,0,0,0.5)'}}>{label}</div></Html></group>);}
function P({position,name,color='#6366f1',role}){const r=useRef();useFrame(s=>{if(r.current)r.current.position.y=position[1]+Math.sin(s.clock.elapsedTime*1.5+position[0])*0.03;});return(<group ref={r} position={position}><RoundedBox args={[0.28,0.35,0.18]} radius={0.05} position={[0,0.18,0]}><meshStandardMaterial color={color}/></RoundedBox><mesh position={[0,0.48,0]}><sphereGeometry args={[0.13,16,16]}/><meshStandardMaterial color="#fcd9b6"/></mesh><mesh position={[0,0.56,-0.02]}><sphereGeometry args={[0.11,16,16]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0.1,0.58,0.07]}><sphereGeometry args={[0.025,8,8]}/><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5}/></mesh><Html position={[0,0.78,0]} center distanceFactor={6} style={{pointerEvents:'none'}}><div style={{textAlign:'center',whiteSpace:'nowrap'}}><div style={{background:'rgba(0,0,0,0.75)',color:'white',padding:'1px 5px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold'}}>{name}</div>{role&&<div style={{color:'#94a3b8',fontSize:'6px'}}>{role}</div>}</div></Html></group>);}
function DP({position,name,color,role,label}){return(<group position={position}><mesh position={[0,0.38,0]}><boxGeometry args={[0.75,0.04,0.4]}/><meshStandardMaterial color="#bfdbfe"/></mesh>{[[-0.32,0.18,-0.15],[0.32,0.18,-0.15],[-0.32,0.18,0.15],[0.32,0.18,0.15]].map((p,i)=>(<mesh key={i} position={p}><boxGeometry args={[0.02,0.36,0.02]}/><meshStandardMaterial color="#64748b"/></mesh>))}<mesh position={[0,0.52,-0.1]} rotation={[0.1,0,0]}><boxGeometry args={[0.22,0.15,0.012]}/><meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.15}/></mesh>{label&&<Html position={[0,0.48,0.25]} center distanceFactor={7} style={{pointerEvents:'none'}}><div style={{background:'rgba(59,130,246,0.7)',color:'white',padding:'1px 4px',borderRadius:'3px',fontSize:'6px',fontWeight:'bold',whiteSpace:'nowrap'}}>{label}</div></Html>}{name&&<P position={[0,0,0.45]} name={name} color={color} role={role}/>}</group>);}
function M({position,name,status='running',type='post',w=1.3}){const sc=status==='error'?'#ef4444':status==='setup'?'#f59e0b':'#22c55e';const gR=useRef();useFrame(()=>{if(gR.current&&status==='running')gR.current.rotation.z+=0.015;});const c={printer:'#64748b',cutter:'#78716c',digital:'#475569',post:'#a3a3a3'}[type];const h={printer:1.0,cutter:0.6,digital:0.9,post:0.7}[type];return(<group position={position}><RoundedBox args={[w,h,0.9]} radius={0.04} position={[0,h/2,0]}><meshStandardMaterial color={c} metalness={0.3} roughness={0.6}/></RoundedBox>{type==='printer'&&<><mesh position={[0,h*0.8,0.46]}><boxGeometry args={[0.4,0.25,0.02]}/><meshStandardMaterial color="#1e293b" emissive="#0ea5e9" emissiveIntensity={0.3}/></mesh><mesh ref={gR} position={[w/2-0.2,h*0.7,0.47]}><torusGeometry args={[0.08,0.02,8,6]}/><meshStandardMaterial color="#f59e0b" metalness={0.8}/></mesh></>}{type==='cutter'&&<mesh position={[0,h+0.02,0]}><boxGeometry args={[w*0.8,0.03,0.015]}/><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3}/></mesh>}{type==='digital'&&<mesh position={[0,h*0.8,0.46]}><boxGeometry args={[0.5,0.25,0.02]}/><meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.2}/></mesh>}<mesh position={[w/2-0.1,h+0.05,0]}><sphereGeometry args={[0.04,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={1}/></mesh><Html position={[0,h+0.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{background:'rgba(0,0,0,0.7)',color:'white',padding:'2px 6px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div></Html></group>);}
function MR({position,name,w=3,d=2}){return(<group position={position}><mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[w,d]}/><meshStandardMaterial color="#fef08a"/></mesh>{[[0,0.5,-d/2,w,1,0.03],[0,0.5,d/2,w,1,0.03],[-w/2,0.5,0,0.03,1,d]].map((p,i)=>(<mesh key={i} position={[p[0],p[1],p[2]]}><boxGeometry args={[p[3],p[4],p[5]]}/><meshStandardMaterial color="#bfdbfe" transparent opacity={0.3}/></mesh>))}<mesh position={[w/2,0.5,0]}><boxGeometry args={[0.04,1,0.5]}/><meshStandardMaterial color="#ca8a04"/></mesh><RoundedBox args={[w*0.45,0.04,d*0.3]} radius={0.02} position={[0,0.38,0]}><meshStandardMaterial color="#a78bfa"/></RoundedBox><Html position={[0,1.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{background:'rgba(202,138,4,0.85)',color:'white',padding:'3px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div></Html></group>);}

function Scene({factoryZones,activeSessions,machineStatus}){
  const cc=['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
  const gc=id=>cc[id%cc.length], ppl=s=>(activeSessions[s]||[]);
  const dp=(s,x,z,l,k)=>ppl(s).map((p,i)=><DP key={`${k}${i}`} position={[x+i*1.0,0,z]} name={p.name} color={gc(p.id)} role={p.role} label={l}/>);
  return(<>
    <ambientLight intensity={0.6}/><directionalLight position={[10,15,10]} intensity={1}/><directionalLight position={[-5,10,-5]} intensity={0.3}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[3,-0.01,4]}><planeGeometry args={[38,28]}/><meshStandardMaterial color="#1e293b"/></mesh>

    {/* ═══ โรง 200 ตร.ว. (บน, ตึกใหญ่ชั้นเดียว) ═══ */}
    <Bld position={[3,0,-3]} width={24} depth={12} color="#3b82f6" label="โรงงาน 200 ตร.ว."/>

    {/* ── ห้องเซล (ซ้ายสุด, แถวบน) ── */}
    <WR position={[-7,0,-7]} width={6} depth={3.5} color="#3b82f6" label="ห้องเซล"/>
    {dp('desk-sales',-9,-8,'เซล','s')}
    {dp('desk-marketing',-5,-8,'การตลาด','mk')}
    {dp('desk-admin',-9,-6.2,'แอดมิน','ad')}
    {dp('desk-graphic',-6,-6.2,'ออกแบบ','gr')}

    {/* ── ห้องกราฟฟิค & วางแผน (กลาง, แถวบน ในโรง200) ── */}
    <WR position={[-0.5,0,-7]} width={7} depth={3.5} color="#10b981" label="ห้องกราฟฟิค & วางแผน"/>
    {dp('desk-checkfile',-3,-8,'เช็คไฟล์','cf')}
    {dp('desk-layout',-1,-8,'Layout','ly')}
    {dp('desk-odm',-3,-6.2,'คุมเครื่อง','odmc')}
    {dp('desk-planner',-1,-6.2,'วางแผน','pl')}
    {dp('desk-manager',1,-6.2,'ผู้จัดการ','mg')}

    {/* ── ห้องบัญชี & ผลิต (ขวา, แถวบน) ── */}
    <WR position={[5.5,0,-7]} width={5} depth={3.5} color="#f59e0b" label="ห้องบัญชี & ผลิต & HR"/>
    {dp('desk-prod-admin',4,-8,'ผลิต','pr')}
    {dp('desk-pricing',5,-8,'คิดราคา','prc')}
    {dp('desk-account',4,-6.2,'บัญชี','ac')}
    {dp('desk-hr',6,-6.2,'HR','hr')}
    {dp('desk-logistics',7,-6.2,'จัดส่ง','lg')}

    {/* ── ห้องประชุม 1 (ล่างซ้ายของ200) ── */}
    <MR position={[-7,0,-3]} name="ห้องประชุม 1 (รับแขก)" w={4} d={2.5}/>

    {/* ── เครื่องจักร (ขวาของ200, ใต้ห้องบัญชี) ── */}
    {/* แถวบน: ตัด1 + SM74 + ตัด2 */}
    <M position={[4,0,-3.5]} name="Itotec No.1" type="cutter"/>
    {ppl('cutter-1').map((p,i)=><P key={`c1${i}`} position={[4,0,-2.5]} name={p.name} color={gc(p.id)} role="Operator"/>)}
    <M position={[7,0,-3.5]} name="SM74 5สี" type="printer" status={machineStatus['print-sm74']||'running'}/>
    {ppl('print-sm74').map((p,i)=><P key={`s74${i}`} position={[7,0,-2.5]} name={p.name} color={gc(p.id)} role="Operator"/>)}
    <M position={[10,0,-3.5]} name="Itotec No.2" type="cutter"/>
    {ppl('cutter-2').map((p,i)=><P key={`c2${i}`} position={[10,0,-2.5]} name={p.name} color={gc(p.id)} role="Operator"/>)}
    {/* แถว2: SM102 + Heidelberg Auto */}
    <M position={[7,0,-1]} name="SM102 5สี" type="printer" w={2} status={machineStatus['print-sm102']||'running'}/>
    {ppl('print-sm102').map((p,i)=><P key={`s102${i}`} position={[6.5+i*0.5,0,0]} name={p.name} color={gc(p.id)} role="Operator"/>)}
    <M position={[10,0,-1]} name="Heidelberg Auto" type="post"/>
    {/* แถว3: ไดคัท + ฟอยล์ + เคลือบ */}
    <M position={[4,0,1]} name="ไดคัท จีนตัด2" type="post"/>
    <M position={[6,0,1]} name="ไดคัท จีนตัด3" type="post"/>
    <M position={[8,0,1]} name="ฟอยล์จีน" type="post"/>
    {ppl('foil-cn').map((p,i)=><P key={`fl${i}`} position={[7.8+i*0.5,0,2]} name={p.name} color={gc(p.id)} role="Operator"/>)}
    <M position={[10,0,1]} name="Guangming 920" type="post" w={1.4}/>

    {/* ═══ โรง 100 ตร.ว. (ล่างซ้าย) ═══ */}
    <Bld position={[-3,0,8]} width={16} depth={8} color="#10b981" label="โรงงาน 100 ตร.ว."/>

    {/* ── ห้องประชุม 2 ชั้น 2 (ซ้ายสุดของ100) ── */}
    <group position={[-9,1.5,7]}>
      <MR position={[0,0,0]} name="ห้องประชุม 2 (ชั้น 2)" w={3} d={2}/>
      {[[-1.2,-.75,-.8],[1.2,-.75,-.8],[-1.2,-.75,.8],[1.2,-.75,.8]].map((p,i)=>(<mesh key={i} position={p}><boxGeometry args={[0.07,1.5,0.07]}/><meshStandardMaterial color="#64748b"/></mesh>))}
      <Html position={[0,-0.5,1.2]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{color:'#fbbf24',fontSize:'9px',fontWeight:'bold'}}>↑ ชั้น 2</div></Html>
    </group>

    {/* ── ตัดต่อ + ODM1 ODM2 (กลางบนของ100) ── */}
    {dp('desk-video',-6,6,'ตัดต่อ','vid')}
    <M position={[-4,0,6]} name="Konica 12000 (ODM1)" type="digital"/>
    <M position={[-2,0,6]} name="Konica 4070 (ODM2)" type="digital"/>

    {/* ── เย็บ (ขวาบนของ100) ── */}
    <M position={[1,0,6]} name="Muller เก็บเย็บตัด" type="post" w={1.5}/>
    {ppl('stitch').map((p,i)=><P key={`st${i}`} position={[1,0,7]} name={p.name} color={gc(p.id)} role="Operator"/>)}

    {/* ── พับ 1, พับ 2 (กลางของ100) ── */}
    <M position={[-2,0,9]} name="Stahl พับ No.1" type="post"/>
    {ppl('fold-1').map((p,i)=><P key={`f1${i}`} position={[-2,0,10]} name={p.name} color={gc(p.id)} role="Operator"/>)}
    <M position={[0,0,9]} name="Stahl พับ No.2" type="post"/>

    {/* ── กระดูกงู (ล่างกลาง) ── */}
    <M position={[-2,0,11]} name="กระดูกงู" type="post"/>

    {/* ── ขับรถ + จัดส่ง (ล่างสุด) ── */}
    {ppl('drive').map((p,i)=><P key={`dr${i}`} position={[-6+i*2,0,12.5]} name={p.name} color={gc(p.id)} role="Driver"/>)}

    {/* ═══ ตึก 63 ตร.ว. (ล่างขวา ติดกับ100) ═══ */}
    <Bld position={[9,0,8]} width={8} depth={8} color="#6366f1" label="ตึก 63 ตร.ว."/>
    <WR position={[9,0,7]} width={6} depth={5} color="#6366f1" label="หลังพิมพ์ & CTP"/>
    <M position={[7,0,6]} name="CTP" type="digital" w={1.5}/>
    {dp('post-coord',9,6,'ประสานงาน','pco')}
    {dp('post-press',7,8.5,'หลังพิมพ์','pp')}

    <OrbitControls makeDefault minPolarAngle={Math.PI/8} maxPolarAngle={Math.PI/2.3} minDistance={5} maxDistance={35} target={[3,0,2]}/>
  </>);
}

export default function VirtualOffice3DView({factoryZones,activeSessions,machineStatus}){
  return(<div style={{width:'100%',height:'70vh',borderRadius:'20px',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,0.4)'}}>
    <Canvas camera={{position:[20,16,20],fov:50}} style={{background:'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)'}}>
      <Scene factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus}/>
    </Canvas>
  </div>);
}
