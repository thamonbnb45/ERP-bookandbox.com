import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const VirtualOffice3D = lazy(() => import('./VirtualOffice3D'));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function VirtualOffice() {
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [viewMode, setViewMode] = useState('3d'); // '3d', 'map' or 'dashboard'

    // Factory Layout based on physical locations
    const factoryZones = [
        {
            id: 'zone-sales-admin',
            name: '🏢 ห้องเซล & แอดมิน (โรง 200 ตร.ว.)',
            color: '#3b82f6',
            bg: '#eff6ff',
            stations: [
                { id: 'desk-sales', name: 'โต๊ะเซล', type: 'desk', capacity: 4 },
                { id: 'desk-admin', name: 'โต๊ะแอดมิน', type: 'desk', capacity: 3 },
                { id: 'desk-graphic', name: 'โต๊ะออกแบบกราฟฟิค', type: 'computer', capacity: 1 },
                { id: 'desk-marketing', name: 'โต๊ะการตลาด', type: 'desk', capacity: 1 },
                { id: 'meeting-1', name: 'ห้องประชุม 1 (รับแขก)', type: 'meeting', capacity: 8 },
            ]
        },
        {
            id: 'zone-prepress',
            name: '🎨 ห้องกราฟฟิค & วางแผน (โรง 200 ตร.ว.)',
            color: '#8b5cf6',
            bg: '#f5f3ff',
            stations: [
                { id: 'desk-checkfile', name: 'โต๊ะเช็คไฟล์', type: 'computer', capacity: 2 },
                { id: 'desk-layout', name: 'โต๊ะเลย์ออฟ (Layout)', type: 'computer', capacity: 1 },
                { id: 'desk-odm', name: 'คุมเครื่อง ODM', type: 'machine', capacity: 1 },
                { id: 'desk-planner', name: 'โต๊ะวางแผน', type: 'desk', capacity: 1 },
                { id: 'desk-manager', name: 'โต๊ะผู้จัดการ', type: 'desk', capacity: 1 },
                { id: 'meeting-2', name: 'ห้องประชุม 2 (ชั้น 2)', type: 'meeting', capacity: 10 },
            ]
        },
        {
            id: 'zone-acc-prod',
            name: '📊 ห้องบัญชี & ผลิต (โรง 200 ตร.ว.)',
            color: '#ec4899',
            bg: '#fdf2f8',
            stations: [
                { id: 'desk-prod-admin', name: 'ฝ่ายผลิต', type: 'desk', capacity: 1 },
                { id: 'desk-pricing', name: 'โต๊ะคิดราคา', type: 'desk', capacity: 1 },
                { id: 'desk-account', name: 'โต๊ะบัญชี', type: 'desk', capacity: 2 },
                { id: 'desk-hr', name: 'โต๊ะ HR', type: 'desk', capacity: 1 },
                { id: 'desk-logistics', name: 'โต๊ะจัดส่ง', type: 'desk', capacity: 1 },
            ]
        },
        {
            id: 'zone-factory-200',
            name: '🏭 โรงงานหลัก (โรง 200 ตร.ว.)',
            color: '#f59e0b',
            bg: '#fffbeb',
            stations: [
                { id: 'print-sm74', name: 'เครื่องพิมพ์ SM74', type: 'machine', capacity: 1 },
                { id: 'print-sm102', name: 'เครื่องพิมพ์ SM102', type: 'machine', capacity: 3 },
                { id: 'cutter', name: 'เครื่องตัด', type: 'machine', capacity: 2 },
                { id: 'diecut-1', name: 'เครื่องปั๊มไดคัท 1', type: 'machine', capacity: 1 },
                { id: 'diecut-2', name: 'เครื่องปั๊มไดคัท 2', type: 'machine', capacity: 1 },
                { id: 'foil-1', name: 'ปั๊มฟอยล์ 1', type: 'machine', capacity: 2 },
                { id: 'coat-1', name: 'เครื่องเคลือบ 1', type: 'machine', capacity: 1 },
            ]
        },
        {
            id: 'zone-factory-100',
            name: '🏭 โรงงานรอง (โรง 100 ตร.ว.)',
            color: '#10b981',
            bg: '#ecfdf5',
            stations: [
                { id: 'desk-video', name: 'โต๊ะตัดต่องาน', type: 'computer', capacity: 1 },
                { id: 'odm-1', name: 'On Demand 1', type: 'machine', capacity: 1 },
                { id: 'odm-2', name: 'On Demand 2', type: 'machine', capacity: 1 },
                { id: 'stitch', name: 'เครื่องเย็บ', type: 'machine', capacity: 1 },
                { id: 'fold-1', name: 'เครื่องพับ 1', type: 'machine', capacity: 1 },
                { id: 'fold-2', name: 'เครื่องพับ 2', type: 'machine', capacity: 1 },
                { id: 'wire-bind', name: 'เข้าเล่มกระดูกงู', type: 'machine', capacity: 1 },
                { id: 'drive', name: 'พนักงานขับรถ', type: 'zone', capacity: 2 },
            ]
        },
        {
            id: 'zone-factory-63',
            name: '📦 ตึกหลังพิมพ์ (ตึก 63 ตร.ว.)',
            color: '#6366f1',
            bg: '#eef2ff',
            stations: [
                { id: 'post-coord', name: 'ประสานงานหลังพิมพ์', type: 'desk', capacity: 1 },
                { id: 'post-press', name: 'ฝ่ายหลังพิมพ์', type: 'table', capacity: 3 },
            ]
        }
    ];

    // Current active staff tracking
    const [activeSessions, setActiveSessions] = useState({
        'desk-sales': [
            { id: 1, name: 'กวาง', role: 'Sales (KW)', avatar: 'ก', timeIn: '08:30' },
            { id: 2, name: 'อาร์ท', role: 'Sales', avatar: 'อ', timeIn: '08:30' },
            { id: 3, name: 'แบงค์', role: 'Sales (เซล)', avatar: 'บ', timeIn: '08:30' },
            { id: 4, name: 'อีม', role: 'Sales (aem)', avatar: 'อ', timeIn: '08:30' }
        ],
        'desk-admin': [
            { id: 5, name: 'ตะวัน', role: 'Admin', avatar: 'ต', timeIn: '08:00' },
            { id: 6, name: 'ปูเป้', role: 'Admin', avatar: 'ป', timeIn: '08:00' },
            { id: 999, name: 'ใจ', role: 'Maid (แม่บ้าน)', avatar: 'จ', timeIn: '07:30' }
        ],
        'desk-graphic': [{ id: 7, name: 'ยุทธ', role: 'Graphic Design', avatar: 'ย', timeIn: '08:45' }],
        'desk-marketing': [{ id: 8, name: 'ฟ้า', role: 'Marketing', avatar: 'ฟ', timeIn: '09:00' }],
        
        'desk-checkfile': [
            { id: 9, name: 'เก๊าะ', role: 'Prepress', avatar: 'ก', timeIn: '08:15' },
            { id: 10, name: 'เจี๊ยบ', role: 'Prepress', avatar: 'จ', timeIn: '08:15' }
        ],
        'desk-layout': [{ id: 11, name: 'จิม', role: 'Layout', avatar: 'จ', timeIn: '08:15' }],
        'desk-odm': [{ id: 12, name: 'นัท', role: 'ODM Control', avatar: 'น', timeIn: '08:10' }],
        'desk-planner': [{ id: 13, name: 'หนึ่ง', role: 'Planner', avatar: 'ห', timeIn: '08:00' }],
        'desk-manager': [{ id: 14, name: 'ซัน', role: 'Manager', avatar: 'ซ', timeIn: '09:30' }],

        'desk-prod-admin': [{ id: 15, name: 'บิ๊ก', role: 'Production', avatar: 'บ', timeIn: '08:00' }],
        'desk-pricing': [{ id: 16, name: 'หนิง', role: 'Pricing', avatar: 'ห', timeIn: '08:30' }],
        'desk-account': [
            { id: 17, name: 'อ้อ', role: 'Accounting', avatar: 'อ', timeIn: '08:30' },
            { id: 18, name: 'มินต์', role: 'Accounting', avatar: 'ม', timeIn: '08:30' }
        ],
        'desk-hr': [{ id: 102, name: 'ซ่าส์', role: 'HR', avatar: 'ซ', timeIn: '08:30' }],
        'desk-logistics': [{ id: 19, name: 'แบงค์', role: 'Logistics (ประสานงานจัดส่ง)', avatar: 'บ', timeIn: '08:30' }],

        'print-sm74': [{ id: 20, name: 'น้อย', role: 'Operator', avatar: 'น', timeIn: '08:00' }],
        'print-sm102': [
            { id: 21, name: 'วุฒิ', role: 'Operator', avatar: 'ว', timeIn: '08:00' },
            { id: 22, name: 'โต้', role: 'Operator', avatar: 'ต', timeIn: '08:00' },
            { id: 23, name: 'โจ', role: 'Operator', avatar: 'จ', timeIn: '08:00' }
        ],
        'cutter': [
            { id: 24, name: 'ปอนด์', role: 'Operator', avatar: 'ป', timeIn: '08:00' },
            { id: 25, name: 'กอล์ฟ', role: 'Operator', avatar: 'ก', timeIn: '08:00' }
        ],
        'diecut-1': [],
        'diecut-2': [],
        'foil-1': [
            { id: 26, name: 'ทองใบ', role: 'Operator', avatar: 'ท', timeIn: '08:00' },
            { id: 27, name: 'ปู', role: 'Operator', avatar: 'ป', timeIn: '08:00' }
        ],
        'coat-1': [],

        'stitch': [{ id: 28, name: 'หมอ', role: 'Operator', avatar: 'ห', timeIn: '08:00' }],
        'fold-1': [{ id: 29, name: 'จักร', role: 'Operator', avatar: 'จ', timeIn: '08:00' }],
        'fold-2': [],
        'desk-video': [],
        'odm-1': [],
        'odm-2': [],
        'wire-bind': [],
        'drive': [
            { id: 30, name: 'อ๊อด', role: 'Driver', avatar: 'อ', timeIn: '08:00' },
            { id: 31, name: 'รัตน์', role: 'Driver', avatar: 'ร', timeIn: '08:00' }
        ],

        'post-coord': [{ id: 32, name: 'พลอย', role: 'Coordinator', avatar: 'พ', timeIn: '08:30' }],
        'post-press': [
            { id: 33, name: 'ปลา', role: 'Post-press', avatar: 'ป', timeIn: '08:00' },
            { id: 34, name: 'พิณ', role: 'Post-press', avatar: 'พ', timeIn: '08:00' },
            { id: 35, name: 'คริม', role: 'Post-press', avatar: 'ค', timeIn: '08:00' }
        ],
        'meeting-1': [
            { id: 99, name: 'ลูกค้านัดพบ', role: 'Guest', avatar: 'G', timeIn: '10:00' }
        ],
        'meeting-2': [
            { id: 100, name: 'ประชุมประจำวัน', role: 'Internal', avatar: 'M', timeIn: '09:00' },
            { id: 101, name: 'การตลาดถ่ายงาน', role: 'Internal', avatar: 'M', timeIn: '13:00' }
        ]
    });

    const [machineStatus, setMachineStatus] = useState({
        'desk-odm': 'error',     // 🔴 เครื่องเสีย
        'print-sm74': 'running', // 🟢 ปกติ
        'print-sm102': 'running',// 🟢 ปกติ
        'cutter': 'setup',       // 🟡 ตั้งเครื่อง
    });

    const getMachineStatusUI = (status) => {
        if (status === 'error') return { color: '#ef4444', icon: 'fa-triangle-exclamation', text: 'เครื่องเสีย/รอซ่อม', anim: 'pulse' };
        if (status === 'setup') return { color: '#f59e0b', icon: 'fa-wrench', text: 'กำลังตั้งเครื่อง', anim: '' };
        return { color: '#10b981', icon: 'fa-circle-check', text: 'เดินเครื่องปกติ', anim: '' };
    };

    // Color palette for characters
    const charColors = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
    const getCharColor = (id) => charColors[id % charColors.length];

    // Render a single CSS chibi character
    const renderCharacter = (person, idx) => {
        const c = getCharColor(person.id);
        return (
            <div key={person.id} title={`${person.name} (${person.role})`} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', cursor:'pointer' }}>
                {/* Head */}
                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:c, border:'3px solid white', boxShadow:'0 2px 8px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.85rem', fontWeight:'bold', position:'relative', zIndex:2 }}>
                    {person.avatar}
                    {/* Online dot */}
                    <div style={{ position:'absolute', bottom:'-1px', right:'-1px', width:'10px', height:'10px', borderRadius:'50%', background:'#22c55e', border:'2px solid white' }}></div>
                </div>
                {/* Body */}
                <div style={{ width:'24px', height:'16px', background:c, borderRadius:'0 0 8px 8px', marginTop:'-4px', zIndex:1 }}></div>
                {/* Name */}
                <span style={{ fontSize:'0.65rem', color:'white', fontWeight:'bold', textShadow:'0 1px 3px rgba(0,0,0,0.8)', maxWidth:'60px', textAlign:'center', lineHeight:'1.1' }}>{person.name}</span>
            </div>
        );
    };

    // Render a station (desk/machine/meeting)
    const renderStation = (station, zone) => {
        const occupants = activeSessions[station.id] || [];
        const isMachine = station.type === 'machine';
        const isMeeting = station.type === 'meeting';
        const isComputer = station.type === 'computer';
        const mStatus = machineStatus[station.id];

        const deskBg = isMachine ? '#94a3b8' : isMeeting ? '#fef08a' : isComputer ? '#c4b5fd' : '#bfdbfe';
        const deskBorder = isMachine ? '#64748b' : isMeeting ? '#ca8a04' : isComputer ? '#7c3aed' : '#3b82f6';
        const stW = isMeeting ? 180 : isMachine ? 150 : isComputer ? 130 : 120;

        return (
            <div key={station.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', margin:'0.5rem' }}>
                {/* People on top */}
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', justifyContent:'center', minHeight:'55px', alignItems:'flex-end' }}>
                    {occupants.map((occ, idx) => renderCharacter(occ, idx))}
                    {occupants.length === 0 && <div style={{ height:'55px' }}></div>}
                </div>
                {/* Desk / Machine body */}
                <div style={{ 
                    width: stW+'px', minHeight: isMachine ? '50px' : '38px',
                    background: deskBg, border:`3px solid ${deskBorder}`, 
                    borderRadius: isMachine ? '6px' : '10px',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                    position:'relative', padding:'4px 8px',
                    boxShadow:'0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    {/* Icon */}
                    <i className={`fa-solid ${isMachine ? 'fa-gears' : isMeeting ? 'fa-door-open' : isComputer ? 'fa-display' : 'fa-chair'}`} style={{ color: deskBorder, fontSize:'0.9rem' }}></i>
                    <span style={{ fontSize:'0.7rem', fontWeight:'bold', color:'#1e293b', textAlign:'center' }}>{station.name}</span>
                    
                    {/* Machine status badge */}
                    {isMachine && mStatus && (
                        <div style={{
                            position:'absolute', top:'-8px', right:'-8px',
                            width:'22px', height:'22px', borderRadius:'50%',
                            background: getMachineStatusUI(mStatus).color,
                            border:'2px solid white', zIndex:5,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'white', fontSize:'0.6rem',
                            animation: getMachineStatusUI(mStatus).anim === 'pulse' ? 'pulse 1.5s infinite' : 'none'
                        }}>
                            <i className={`fa-solid ${getMachineStatusUI(mStatus).icon}`}></i>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderGraphicalZone = (zoneId, customStyle = {}) => {
        const zone = factoryZones.find(z => z.id === zoneId);
        if (!zone) return null;

        return (
            <div style={{ border:`2px solid ${zone.color}60`, borderRadius:'16px', padding:'1rem', background: zone.color + '10', ...customStyle }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1rem', paddingLeft:'0.5rem' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:zone.color, boxShadow:`0 0 8px ${zone.color}` }}></div>
                    <span style={{ color:zone.color, fontWeight:'bold', fontSize:'0.85rem' }}>{zone.name}</span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'0.5rem' }}>
                    {zone.stations.map(station => renderStation(station, zone))}
                </div>
            </div>
        );
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every min
        return () => clearInterval(timer);
    }, []);

    const getElapseTime = (timeIn) => {
        if (!timeIn) return '';
        const [hours, minutes] = timeIn.split(':').map(Number);
        const now = currentTime;
        let diffMins = (now.getHours() * 60 + now.getMinutes()) - (hours * 60 + minutes);
        if (diffMins < 0) diffMins += 24 * 60; // handle next day
        
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        return `${h} ชม. ${m} น.`;
    };

    return (
        <div style={{ padding: '1.5rem', background: '#f1f5f9', minHeight: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                        <i className="fa-solid fa-building-user text-primary" style={{ marginRight: '0.8rem' }}></i>
                        Virtual Office & Factory
                    </h1>
                    <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>แผนผังแสดงสถานะการทำงานของพนักงานแบบ Real-time</p>
                </div>
                <div style={{ background: 'white', padding: '0.8rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <i className="fa-regular fa-clock" style={{ fontSize: '1.5rem', color: '#3b82f6' }}></i>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>เวลาปัจจุบัน</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>
                            {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button 
                    className={`btn ${viewMode === '3d' ? 'btn-primary' : 'btn-light'}`} 
                    onClick={() => setViewMode('3d')}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold' }}
                >
                    <i className="fa-solid fa-cube"></i> 3D Virtual Office
                </button>
                <button 
                    className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-light'}`} 
                    onClick={() => setViewMode('map')}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold' }}
                >
                    <i className="fa-solid fa-map-location-dot"></i> แผนผัง 2.5D
                </button>
                <button 
                    className={`btn ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-light'}`} 
                    onClick={() => setViewMode('dashboard')}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: 'bold' }}
                >
                    <i className="fa-solid fa-table-cells-large"></i> แบบตาราง
                </button>
            </div>

            {/* Overall Status Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', borderLeft: '4px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>พนักงานที่ทำงานอยู่ตอนนี้</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.5rem' }}>
                        {Object.values(activeSessions).reduce((acc, curr) => acc + curr.length, 0)} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>คน</span>
                    </div>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', borderLeft: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>เครื่องจักรที่กำลังเดินสายพาน</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.5rem' }}>
                        6 <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>เครื่อง</span>
                    </div>
                </div>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', borderLeft: '4px solid #3b82f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>โต๊ะออฟฟิศว่าง</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginTop: '0.5rem' }}>
                        2 <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>ที่นั่ง</span>
                    </div>
                </div>
            </div>

            {viewMode === '3d' ? (
                /* 3D Virtual Office */
                <Suspense fallback={<div style={{height:'70vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',borderRadius:'20px',color:'white',fontSize:'1.2rem'}}><i className="fa-solid fa-spinner fa-spin" style={{marginRight:'1rem'}}></i>กำลังโหลดโรงงาน 3D...</div>}>
                    <VirtualOffice3D factoryZones={factoryZones} activeSessions={activeSessions} machineStatus={machineStatus} />
                    <p style={{textAlign:'center',color:'#64748b',marginTop:'1rem',fontSize:'0.85rem'}}><i className="fa-solid fa-hand-pointer"></i> คลิกลากเพื่อหมุน | คลิกขวาเพื่อเลื่อน | Scroll เพื่อซูมเข้า-ออก</p>
                </Suspense>
            ) : viewMode === 'map' ? (
                /* 2.5D Blueprint Map View */
                <div style={{ background: '#0f172a', padding: '3rem', borderRadius: '24px', overflowX: 'auto', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)' }}>
                    <div style={{ minWidth: '1400px', display: 'flex', flexDirection: 'column', gap: '3rem', position: 'relative' }}>
                        
                        {/* CSS Animation for Machine Pulse */}
                        <style>
                            {`
                                @keyframes pulse {
                                    0% { transform: scale(1); opacity: 1; }
                                    50% { transform: scale(1.2); opacity: 0.8; }
                                    100% { transform: scale(1); opacity: 1; }
                                }
                            `}
                        </style>

                        {/* Building 200 sq.w. */}
                        <div style={{ background: '#1e293b', border: '6px solid #3b82f6', borderRadius: '20px', padding: '2rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-20px', left: '40px', background: '#3b82f6', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                <i className="fa-regular fa-building"></i> โรงงาน 200 ตร.ว. (สำนักงาน + โรงพิมพ์หลัก)
                            </div>
                            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {renderGraphicalZone('zone-sales-admin')}
                                    {renderGraphicalZone('zone-acc-prod')}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {renderGraphicalZone('zone-prepress')}
                                    {renderGraphicalZone('zone-factory-200')}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Building 100 sq.w. & 63 sq.w. */}
                        <div style={{ display: 'flex', gap: '3rem' }}>
                            <div style={{ flex: 1, background: '#1e293b', border: '6px solid #10b981', borderRadius: '20px', padding: '2rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '-20px', left: '40px', background: '#10b981', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                    <i className="fa-solid fa-industry"></i> โรงงาน 100 ตร.ว. (หลังพิมพ์)
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    {renderGraphicalZone('zone-factory-100')}
                                </div>
                            </div>

                            <div style={{ flex: 1, background: '#1e293b', border: '6px solid #6366f1', borderRadius: '20px', padding: '2rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '-20px', left: '40px', background: '#6366f1', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                    <i className="fa-solid fa-box-open"></i> ตึก 63 ตร.ว. (คลัง/จัดส่ง)
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    {renderGraphicalZone('zone-factory-63')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
            /* Dashboard View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {factoryZones.map((zone) => (
                    <div key={zone.id} style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                        <div style={{ background: zone.bg, borderBottom: `2px solid ${zone.color}20`, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: zone.color, boxShadow: `0 0 10px ${zone.color}` }}></div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 'bold' }}>{zone.name}</h2>
                        </div>
                        
                        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', background: '#f8fafc' }}>
                            {zone.stations.map((station) => {
                                const occupants = activeSessions[station.id] || [];
                                const isFull = occupants.length >= station.capacity;
                                const isEmpty = occupants.length === 0;

                                return (
                                    <div key={station.id} style={{ 
                                        background: 'white', 
                                        borderRadius: '16px', 
                                        border: `1px solid ${isEmpty ? '#e2e8f0' : zone.color + '50'}`,
                                        boxShadow: isEmpty ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Status Header */}
                                        <div style={{ 
                                            background: isEmpty ? '#f1f5f9' : zone.color, 
                                            color: isEmpty ? '#64748b' : 'white',
                                            padding: '0.8rem 1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                                <i className={`fa-solid ${station.type === 'machine' ? 'fa-gears' : station.type === 'meeting' ? 'fa-people-group' : station.type === 'computer' ? 'fa-desktop' : 'fa-chair'}`} style={{ marginRight: '0.5rem' }}></i>
                                                {station.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                                                {occupants.length}/{station.capacity}
                                            </div>
                                        </div>

                                        {/* Machine Status Overlay (If Machine) */}
                                        {station.type === 'machine' && machineStatus[station.id] && (
                                            <div style={{ 
                                                padding: '0.4rem 1rem', 
                                                background: getMachineStatusUI(machineStatus[station.id]).color + '15',
                                                borderBottom: '1px solid #f1f5f9',
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                color: getMachineStatusUI(machineStatus[station.id]).color,
                                                fontSize: '0.8rem', fontWeight: 'bold'
                                            }}>
                                                <i className={`fa-solid ${getMachineStatusUI(machineStatus[station.id]).icon} ${getMachineStatusUI(machineStatus[station.id]).anim === 'pulse' ? 'fa-fade' : ''}`}></i>
                                                {getMachineStatusUI(machineStatus[station.id]).text}
                                            </div>
                                        )}

                                        {/* Occupants List */}
                                        <div style={{ padding: '1rem', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {isEmpty ? (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', opacity: 0.7 }}>
                                                    {station.type === 'meeting' ? (
                                                        <>
                                                            <i className="fa-regular fa-calendar-check" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                                                            <span style={{ fontSize: '0.8rem' }}>ห้องว่าง (จองได้)</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa-solid fa-mug-hot" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                                                            <span style={{ fontSize: '0.8rem' }}>ไม่มีพนักงานใช้งาน</span>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                occupants.map((person) => (
                                                    <div key={person.id} style={{ 
                                                        display: 'flex', alignItems: 'center', gap: '0.8rem', 
                                                        padding: '0.6rem', background: '#f8fafc', borderRadius: '10px',
                                                        border: '1px solid #f1f5f9'
                                                    }}>
                                                        <div style={{ 
                                                            width: '40px', height: '40px', borderRadius: '50%', 
                                                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                                        }}>
                                                            {person.avatar}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.9rem' }}>{person.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{person.role}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            {station.type === 'meeting' ? (
                                                                <>
                                                                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>
                                                                        <i className="fa-regular fa-clock mr-1"></i> จองถึง 12:00
                                                                    </div>
                                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>จองโดย: {person.name}</div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>
                                                                        <i className="fa-solid fa-clock-rotate-left mr-1"></i> {getElapseTime(person.timeIn)}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>ตั้งแต่ {person.timeIn} น.</div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Assign Button */}
                                        <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid #f1f5f9', background: '#fcfcfc', textAlign: 'center' }}>
                                            {station.type === 'machine' ? (
                                                <button 
                                                    className="btn btn-outline-warning" 
                                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', color: '#f59e0b', borderColor: '#fde68a' }}
                                                    onClick={() => alert('ฟังก์ชั่นสำหรับหัวหน้าช่าง: กดเพื่อรายงานสถานะเครื่องจักร (เสีย/ซ่อม/ล้างเครื่อง)')}
                                                >
                                                    <i className="fa-solid fa-wrench"></i> อัปเดตสถานะเครื่องจักร
                                                </button>
                                            ) : station.type === 'meeting' ? (
                                                <button 
                                                    className={`btn ${isFull ? 'btn-light' : 'btn-primary'}`} 
                                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', opacity: isFull ? 0.5 : 1 }}
                                                    disabled={isFull}
                                                    onClick={() => alert('ฟังก์ชั่นระบบจองห้องประชุมกำลังพัฒนา (เลือกเวลา และหัวข้อการประชุมได้เลย)')}
                                                >
                                                    {isFull ? 'ห้องไม่ว่าง' : '+ จองห้องประชุมนี้'}
                                                </button>
                                            ) : (
                                                <button 
                                                    className={`btn ${isFull ? 'btn-light' : 'btn-primary'}`} 
                                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', opacity: isFull ? 0.5 : 1 }}
                                                    disabled={isFull}
                                                    onClick={() => alert('ฟังก์ชั่นระบบเช็คอินกำลังพัฒนา (รอพนักงานแสกนบัตร หรือแอดมินลากวางชื่อใส่ได้เลย)')}
                                                >
                                                    {isFull ? 'ใช้งานเต็มแล้ว' : '+ เพิ่มพนักงานเข้าจุดนี้'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            )}
        </div>
    );
}
