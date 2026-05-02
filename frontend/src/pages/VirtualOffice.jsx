import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function VirtualOffice() {
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Factory Layout based on physical locations
    const factoryZones = [
        {
            id: 'zone-sales-admin',
            name: '🏢 ห้องเซล & แอดมิน (โรง 200 ตร.ว.)',
            color: '#3b82f6',
            bg: '#eff6ff',
            stations: [
                { id: 'desk-sales', name: 'โต๊ะเซล', type: 'desk', capacity: 4 },
                { id: 'desk-admin', name: 'โต๊ะแอดมิน', type: 'desk', capacity: 2 },
                { id: 'desk-graphic', name: 'โต๊ะออกแบบกราฟฟิค', type: 'computer', capacity: 1 },
                { id: 'desk-marketing', name: 'โต๊ะการตลาด', type: 'desk', capacity: 1 },
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
                { id: 'stitch', name: 'เครื่องเย็บ', type: 'machine', capacity: 1 },
                { id: 'fold-1', name: 'เครื่องพับ 1', type: 'machine', capacity: 1 },
                { id: 'fold-2', name: 'เครื่องพับ 2', type: 'machine', capacity: 1 },
                { id: 'odm-1', name: 'On Demand 1', type: 'machine', capacity: 1 },
                { id: 'odm-2', name: 'On Demand 2', type: 'machine', capacity: 1 },
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
            { id: 3, name: 'แบงค์', role: 'Sales', avatar: 'บ', timeIn: '08:30' },
            { id: 4, name: 'อีม', role: 'Sales (aem)', avatar: 'อ', timeIn: '08:30' }
        ],
        'desk-admin': [
            { id: 5, name: 'ตะวัน', role: 'Admin', avatar: 'ต', timeIn: '08:00' },
            { id: 6, name: 'ปูเป้', role: 'Admin', avatar: 'ป', timeIn: '08:00' }
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
        'desk-logistics': [{ id: 19, name: 'แบงค์', role: 'Logistics', avatar: 'บ', timeIn: '08:30' }],

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
        ]
    });

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

            {/* Zones Grid */}
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
                                                <i className={`fa-solid ${station.type === 'machine' ? 'fa-gears' : station.type === 'computer' ? 'fa-desktop' : 'fa-chair'}`} style={{ marginRight: '0.5rem' }}></i>
                                                {station.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>
                                                {occupants.length}/{station.capacity}
                                            </div>
                                        </div>

                                        {/* Occupants List */}
                                        <div style={{ padding: '1rem', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {isEmpty ? (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', opacity: 0.7 }}>
                                                    <i className="fa-solid fa-mug-hot" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                                                    <span style={{ fontSize: '0.8rem' }}>ไม่มีพนักงานใช้งาน</span>
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
                                                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>
                                                                <i className="fa-solid fa-clock-rotate-left mr-1"></i> {getElapseTime(person.timeIn)}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>ตั้งแต่ {person.timeIn} น.</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Assign Button */}
                                        <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid #f1f5f9', background: '#fcfcfc', textAlign: 'center' }}>
                                            <button 
                                                className={`btn ${isFull ? 'btn-light' : 'btn-primary'}`} 
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', opacity: isFull ? 0.5 : 1 }}
                                                disabled={isFull}
                                                onClick={() => alert('ฟังก์ชั่นระบบเช็คอินกำลังพัฒนา (รอพนักงานแสกนบัตร หรือแอดมินลากวางชื่อใส่ได้เลย)')}
                                            >
                                                {isFull ? 'ใช้งานเต็มแล้ว' : '+ เพิ่มพนักงานเข้าจุดนี้'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
