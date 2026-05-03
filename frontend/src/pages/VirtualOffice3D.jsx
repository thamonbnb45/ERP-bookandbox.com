import React, { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* Compact components */
function WR({position,width,depth,color,label,wH=1.2}){const w=0.06;return(<group><mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><planeGeometry args={[width,depth]}/><meshStandardMaterial color={color} opacity={0.12} transparent/></mesh>{[[0,wH/2,-depth/2,width,wH,w],[0,wH/2,depth/2,width,wH,w],[-width/2,wH/2,0,w,wH,depth],[width/2,wH/2,0,w,wH,depth]].map((p,i)=>(<mesh key={i} position={[p[0],p[1],p[2]]}><boxGeometry args={[p[3],p[4],p[5]]}/><meshStandardMaterial color={color} opacity={i<2?0.35:0.25} transparent/></mesh>))}<Html position={[0,wH+0.2,-depth/2+0.1]} center distanceFactor={12} style={{pointerEvents:'none'}}><div style={{background:color,color:'white',padding:'3px 10px',borderRadius:'7px',fontSize:'10px',fontWeight:'bold',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>{label}</div></Html></group>);}

function P({position,name,color='#6366f1',role}){const r=useRef();useFrame(s=>{if(r.current)r.current.position.y=position[1]+Math.sin(s.clock.elapsedTime*1.5+position[0])*0.03;});return(<group ref={r} position={position}><RoundedBox args={[0.28,0.35,0.18]} radius={0.05} position={[0,0.18,0]}><meshStandardMaterial color={color}/></RoundedBox><mesh position={[0,0.48,0]}><sphereGeometry args={[0.13,16,16]}/><meshStandardMaterial color="#fcd9b6"/></mesh><mesh position={[0,0.56,-0.02]}><sphereGeometry args={[0.11,16,16]}/><meshStandardMaterial color={color}/></mesh><Html position={[0,0.78,0]} center distanceFactor={6} style={{pointerEvents:'none'}}><div style={{background:'rgba(0,0,0,0.75)',color:'white',padding:'1px 5px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div></Html></group>);}

function DP({position,name,color,role,label}){return(<group position={position}><mesh position={[0,0.38,0]}><boxGeometry args={[0.75,0.04,0.4]}/><meshStandardMaterial color="#bfdbfe"/></mesh><mesh position={[0,0.52,-0.1]} rotation={[0.1,0,0]}><boxGeometry args={[0.22,0.15,0.012]}/><meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.15}/></mesh>{label&&<Html position={[0,0.48,0.25]} center distanceFactor={7} style={{pointerEvents:'none'}}><div style={{background:'rgba(59,130,246,0.7)',color:'white',padding:'1px 4px',borderRadius:'3px',fontSize:'6px',fontWeight:'bold',whiteSpace:'nowrap'}}>{label}</div></Html>}{name&&<P position={[0,0,0.45]} name={name} color={color} role={role}/>}</group>);}

function M({position,name,status='running',type='post',w=1.3}){const sc=status==='error'?'#ef4444':'#22c55e';const c={printer:'#64748b',cutter:'#78716c',digital:'#475569',post:'#a3a3a3'}[type];const h={printer:1.0,cutter:0.6,digital:0.9,post:0.7}[type];const gR=useRef();useFrame(()=>{if(gR.current&&status==='running')gR.current.rotation.z+=0.015;});return(<group position={position}><RoundedBox args={[w,h,0.9]} radius={0.04} position={[0,h/2,0]}><meshStandardMaterial color={c} metalness={0.3}/></RoundedBox>{type==='printer'&&<mesh ref={gR} position={[w/2-0.2,h*0.7,0.47]}><torusGeometry args={[0.08,0.02,8,6]}/><meshStandardMaterial color="#f59e0b" metalness={0.8}/></mesh>}<mesh position={[w/2-0.1,h+0.05,0]}><sphereGeometry args={[0.04,8,8]}/><meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={1}/></mesh><Html position={[0,h+0.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{background:'rgba(0,0,0,0.7)',color:'white',padding:'2px 6px',borderRadius:'4px',fontSize:'8px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div></Html></group>);}

function MR({position,name,w=3,d=2}){return(<group position={position}><mesh position={[0,0.01,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[w,d]}/><meshStandardMaterial color="#fef08a"/></mesh>{[[0,0.5,-d/2,w,1,0.03],[0,0.5,d/2,w,1,0.03],[-w/2,0.5,0,0.03,1,d]].map((p,i)=>(<mesh key={i} position={[p[0],p[1],p[2]]}><boxGeometry args={[p[3],p[4],p[5]]}/><meshStandardMaterial color="#bfdbfe" transparent opacity={0.3}/></mesh>))}<RoundedBox args={[w*0.45,0.04,d*0.3]} radius={0.02} position={[0,0.38,0]}><meshStandardMaterial color="#a78bfa"/></RoundedBox><Html position={[0,1.2,0]} center distanceFactor={10} style={{pointerEvents:'none'}}><div style={{background:'rgba(202,138,4,0.85)',color:'white',padding:'3px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{name}</div></Html></group>);}

/* Draggable group wrapper */
function DG({ children, id, pos, onDragStart, onDragEnd, dragId, offsetRef }) {
  const { camera } = useThree();
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0,1,0), 0));
  const [position, setPosition] = useState(pos);
  const rc = useRef(new THREE.Raycaster());
  const tv = useRef(new THREE.Vector3());

  useFrame(({pointer}) => {
    if (dragId !== id) return;
    rc.current.setFromCamera(pointer, camera);
    rc.current.ray.intersectPlane(plane.current, tv.current);
    setPosition([tv.current.x + offsetRef.current[0], 0, tv.current.z + offsetRef.current[1]]);
  });

  return (
    <group position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        rc.current.setFromCamera({x: (e.clientX/window.innerWidth)*2-1, y:-(e.clientY/window.innerHeight)*2+1}, camera);
        rc.current.ray.intersectPlane(plane.current, tv.current);
        offsetRef.current = [position[0]-tv.current.x, position[2]-tv.current.z];
        onDragStart(id);
      }}
      onPointerUp={() => onDragEnd()}
    >
      {/* Hit area for dragging */}
      <mesh position={[0,0.6,0]} visible={false}><boxGeometry args={[6,1.5,4]}/></mesh>
      {children}
    </group>
  );
}

function Scene({factoryZones,activeSessions,machineStatus}) {
  const cc=['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
  const gc=id=>cc[id%cc.length], ppl=s=>(activeSessions[s]||[]);
  const dp=(s,x,z,l,k)=>ppl(s).map((p,i)=><DP key={`${k}${i}`} position={[x+i*1.0,0,z]} name={p.name} color={gc(p.id)} role={p.role} label={l}/>);

  const [dragId, setDragId] = useState(null);
  const offsetRef = useRef([0,0]);
  const orbitRef = useRef();
  const startDrag = useCallback((id) => { setDragId(id); if(orbitRef.current) orbitRef.current.enabled=false; }, []);
  const endDrag = useCallback(() => { setDragId(null); if(orbitRef.current) orbitRef.current.enabled=true; }, []);

  return (<>
    <ambientLight intensity={0.6}/><directionalLight position={[10,15,10]} intensity={1}/><directionalLight position={[-5,10,-5]} intensity={0.3}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[5,-0.01,3]}><planeGeometry args={[40,28]}/><meshStandardMaterial color="#1e293b"/></mesh>

    {/* ═══ โรง 200 ตร.ว. ═══ */}
    {/* Building outline */}
    <group position={[5,0,-5]}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.003,0]}><planeGeometry args={[30,10]}/><meshStandardMaterial color="#3b82f6" opacity={0.06} transparent/></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(30,0.02,10)]}/><lineBasicMaterial color="#3b82f6"/></lineSegments>
      <Html position={[-13,0.05,-4.8]} center distanceFactor={18} style={{pointerEvents:'none'}}><div style={{background:'#3b82f6',color:'white',padding:'4px 12px',borderRadius:'9px',fontSize:'12px',fontWeight:'bold',whiteSpace:'nowrap'}}>โรงงาน 200 ตร.ว.</div></Html>
    </group>

    {/* ── ห้องเซล (ซ้ายสุด) ── */}
    <DG id="sales" pos={[-7,0,-7]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <WR width={6} depth={3.5} color="#3b82f6" label="ห้องเซล"/>
      {dp('desk-sales',-2,-1,'เซล','s')}
      {dp('desk-marketing',2,-1,'การตลาด','mk')}
      {dp('desk-admin',-2,0.5,'แอดมิน','ad')}
      {dp('desk-graphic',1,0.5,'ออกแบบ','gr')}
    </DG>

    {/* ── ห้องกราฟฟิค (กลาง) ── */}
    <DG id="graphic" pos={[-0.5,0,-7]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <WR width={7} depth={3.5} color="#10b981" label="ห้องกราฟฟิค & วางแผน"/>
      {dp('desk-checkfile',-2.5,-1,'เช็คไฟล์','cf')}
      {dp('desk-layout',-0.5,-1,'Layout','ly')}
      {dp('desk-odm',-2.5,0.5,'คุมเครื่อง','odmc')}
      {dp('desk-planner',-0.5,0.5,'วางแผน','pl')}
      {dp('desk-manager',1,0.5,'ผู้จัดการ','mg')}
    </DG>

    {/* ── ห้องบัญชี (ขวา) ── */}
    <DG id="account" pos={[6,0,-7]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <WR width={5} depth={3.5} color="#f59e0b" label="ห้องบัญชี & ผลิต"/>
      {dp('desk-prod-admin',-1.5,-1,'ผลิต','pr')}
      {dp('desk-pricing',-0.5,-1,'คิดราคา','prc')}
      {dp('desk-account',-1.5,0.5,'บัญชี','ac')}
      {dp('desk-hr',0,0.5,'HR','hr')}
      {dp('desk-logistics',1.5,0.5,'จัดส่ง','lg')}
    </DG>

    {/* ── ห้องประชุม 1 ── */}
    <DG id="mtg1" pos={[-7,0,-3]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <MR name="ห้องประชุม 1 (รับแขก)" w={4} d={2.5}/>
    </DG>

    {/* ── เครื่องจักร (ขวาของออฟฟิศ) ── */}
    <DG id="mch200" pos={[14,0,-7]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <WR width={10} depth={8} color="#f59e0b" label="โซนเครื่องจักร" wH={1.5}/>
      <M position={[-3.5,0,-2.5]} name="Itotec No.1" type="cutter"/>
      {ppl('cutter-1').map((p,i)=><P key={`c1${i}`} position={[-3.5,0,-1.5]} name={p.name} color={gc(p.id)}/>)}
      <M position={[-1,0,-2.5]} name="SM74 5สี" type="printer" status={machineStatus['print-sm74']||'running'}/>
      {ppl('print-sm74').map((p,i)=><P key={`s74${i}`} position={[-1,0,-1.5]} name={p.name} color={gc(p.id)}/>)}
      <M position={[1.5,0,-2.5]} name="Itotec No.2" type="cutter"/>
      {ppl('cutter-2').map((p,i)=><P key={`c2${i}`} position={[1.5,0,-1.5]} name={p.name} color={gc(p.id)}/>)}
      <M position={[3.5,0,-2.5]} name="Heidelberg Auto" type="post"/>
      <M position={[-1,0,0]} name="SM102 5สี" type="printer" w={2} status={machineStatus['print-sm102']||'running'}/>
      {ppl('print-sm102').map((p,i)=><P key={`s102${i}`} position={[-1.5+i*0.5,0,1]} name={p.name} color={gc(p.id)}/>)}
      <M position={[-3.5,0,2.5]} name="ไดคัท จีนตัด2" type="post"/>
      <M position={[-1.5,0,2.5]} name="ไดคัท จีนตัด3" type="post"/>
      <M position={[0.5,0,2.5]} name="ฟอยล์จีน" type="post"/>
      {ppl('foil-cn').map((p,i)=><P key={`fl${i}`} position={[0.3+i*0.5,0,3.3]} name={p.name} color={gc(p.id)}/>)}
      <M position={[3,0,2.5]} name="Guangming 920" type="post" w={1.4}/>
    </DG>

    {/* ═══ โรง 100 ตร.ว. (ล่างซ้าย) ═══ */}
    <group position={[-3,0,7]}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.003,0]}><planeGeometry args={[16,8]}/><meshStandardMaterial color="#10b981" opacity={0.06} transparent/></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(16,0.02,8)]}/><lineBasicMaterial color="#10b981"/></lineSegments>
      <Html position={[-6,0.05,-3.8]} center distanceFactor={18} style={{pointerEvents:'none'}}><div style={{background:'#10b981',color:'white',padding:'4px 12px',borderRadius:'9px',fontSize:'12px',fontWeight:'bold',whiteSpace:'nowrap'}}>โรงงาน 100 ตร.ว.</div></Html>
    </group>

    <DG id="mtg2" pos={[-13,0,7]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <WR width={5} depth={5} color="#ca8a04" label="ห้องประชุม 2 (ชั้น 2)" wH={2}/>
      {/* 2nd floor indicator */}
      <mesh position={[0,1,0]}><boxGeometry args={[5,0.06,5]}/><meshStandardMaterial color="#ca8a04" opacity={0.15} transparent/></mesh>
      <Html position={[0,2.3,0]} center distanceFactor={12} style={{pointerEvents:'none'}}><div style={{color:'#fbbf24',fontSize:'10px',fontWeight:'bold'}}>↑ ชั้น 2</div></Html>
      <RoundedBox args={[2,0.05,1]} radius={0.02} position={[0,0.4,0]}><meshStandardMaterial color="#a78bfa"/></RoundedBox>
      {/* Chairs */}
      {[[-0.8,0,-0.8],[0.8,0,-0.8],[-0.8,0,0.8],[0.8,0,0.8],[0,0,-0.8],[0,0,0.8]].map((p,i)=>(<mesh key={i} position={[p[0],0.25,p[2]]}><boxGeometry args={[0.25,0.25,0.25]}/><meshStandardMaterial color="#7c3aed" opacity={0.5} transparent/></mesh>))}
    </DG>

    <DG id="odm" pos={[-4,0,5.5]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      {dp('desk-video',-1.5,0,'ตัดต่อ','vid')}
      <M position={[0,0,0]} name="Konica 12000 (ODM1)" type="digital"/>
      <M position={[2,0,0]} name="Konica 4070 (ODM2)" type="digital"/>
    </DG>

    <DG id="stitch" pos={[2,0,5.5]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <M position={[0,0,0]} name="Muller เก็บเย็บตัด" type="post" w={1.5}/>
      {ppl('stitch').map((p,i)=><P key={`st${i}`} position={[0,0,1]} name={p.name} color={gc(p.id)}/>)}
    </DG>

    <DG id="fold" pos={[-2,0,9]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <M position={[0,0,0]} name="Stahl พับ No.1" type="post"/>
      {ppl('fold-1').map((p,i)=><P key={`f1${i}`} position={[0,0,1]} name={p.name} color={gc(p.id)}/>)}
      <M position={[2,0,0]} name="Stahl พับ No.2" type="post"/>
    </DG>

    <DG id="wire" pos={[-2,0,11.5]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <M position={[0,0,0]} name="กระดูกงู" type="post"/>
    </DG>

    {ppl('drive').map((p,i)=><P key={`dr${i}`} position={[-6+i*2,0,12]} name={p.name} color={gc(p.id)} role="Driver"/>)}

    {/* ═══ ตึก 63 ตร.ว. (ล่างขวา) ═══ */}
    <group position={[10,0,7]}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.003,0]}><planeGeometry args={[8,8]}/><meshStandardMaterial color="#6366f1" opacity={0.06} transparent/></mesh>
      <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(8,0.02,8)]}/><lineBasicMaterial color="#6366f1"/></lineSegments>
      <Html position={[-2,0.05,-3.8]} center distanceFactor={18} style={{pointerEvents:'none'}}><div style={{background:'#6366f1',color:'white',padding:'4px 12px',borderRadius:'9px',fontSize:'12px',fontWeight:'bold',whiteSpace:'nowrap'}}>ตึก 63 ตร.ว.</div></Html>
    </group>

    <DG id="b63" pos={[10,0,6.5]} onDragStart={startDrag} onDragEnd={endDrag} dragId={dragId} offsetRef={offsetRef}>
      <WR width={6} depth={5} color="#6366f1" label="หลังพิมพ์ & CTP"/>
      <M position={[-1.5,0,-1]} name="CTP" type="digital" w={1.5}/>
      {dp('post-coord',0.5,-1,'ประสานงาน','pco')}
      {dp('post-press',-1.5,1.5,'หลังพิมพ์','pp')}
    </DG>

    <OrbitControls ref={orbitRef} makeDefault minPolarAngle={Math.PI/8} maxPolarAngle={Math.PI/2.3} minDistance={5} maxDistance={35} target={[5,0,2]}/>
  </>);
}

export default function VirtualOffice3DView({factoryZones,activeSessions,machineStatus}){
  return(<div style={{width:'100%',height:'70vh',borderRadius:'20px',overflow:'hidden',boxShadow:'0 8px 30px rgba(0,0,0,0.4)'}}>
    <Canvas camera={{position:[22,18,22],fov:50}} style={{background:'linear-gradient(180deg, #0c1222 0%, #1e293b 100%)'}}>
      <Scene factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus}/>
    </Canvas>
    <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',color:'#94a3b8',fontSize:'11px'}}>🖱️ คลิกลากห้อง/เครื่องเพื่อขยับ | คลิกขวาเพื่อหมุน | Scroll ซูม</div>
  </div>);
}
