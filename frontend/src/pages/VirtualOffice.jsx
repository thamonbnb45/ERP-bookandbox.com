import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function VirtualOffice() {
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Mock factory layout and machines
    const factoryZones = [
        {
            id: 'office',
            name: '🏢 ออฟฟิศ (Sales & Admin)',
            color: '#3b82f6',
            bg: '#eff6ff',
            stations: [
                { id: 'desk1', name: 'โต๊ะเซล 1', type: 'desk', capacity: 1 },
                { id: 'desk2', name: 'โต๊ะเซล 2', type: 'desk', capacity: 1 },
                { id: 'desk3', name: 'โต๊ะประเมินราคา', type: 'desk', capacity: 1 },
                { id: 'desk4', name: 'โต๊ะบัญชี', type: 'desk', capacity: 1 },
            ]
        },
        {
            id: 'design',
            name: '🎨 ห้องอาร์ตเวิร์ค (Prepress)',
            color: '#8b5cf6',
            bg: '#f5f3ff',
            stations: [
                { id: 'mac1', name: 'Mac Station 1', type: 'computer', capacity: 1 },
                { id: 'mac2', name: 'Mac Station 2', type: 'computer', capacity: 1 },
            ]
        },
        {
            id: 'production',
            name: '🏭 โรงพิมพ์ (Production Floor)',
            color: '#f59e0b',
            bg: '#fffbeb',
            stations: [
                { id: 'print1', name: 'เครื่องพิมพ์ 4 สี (Offset)', type: 'machine', capacity: 2 },
                { id: 'print2', name: 'เครื่องพิมพ์ Digital', type: 'machine', capacity: 1 },
                { id: 'diecut', name: 'เครื่องปั๊มไดคัท (Die-cut)', type: 'machine', capacity: 2 },
                { id: 'glue', name: 'เครื่องปะกล่อง', type: 'machine', capacity: 3 },
                { id: 'coat', name: 'เครื่องเคลือบ', type: 'machine', capacity: 1 },
            ]
        },
        {
            id: 'logistics',
            name: '📦 คลังสินค้า & จัดส่ง',
            color: '#10b981',
            bg: '#ecfdf5',
            stations: [
                { id: 'pack1', name: 'โต๊ะแพคงาน 1', type: 'table', capacity: 2 },
                { id: 'pack2', name: 'โต๊ะแพคงาน 2', type: 'table', capacity: 2 },
                { id: 'truck', name: 'จุดโหลดสินค้า (Loading)', type: 'zone', capacity: 2 },
            ]
        }
    ];

    // Mock active sessions (Who is sitting where)
    // In the future, this will be fetched from the database
    const [activeSessions, setActiveSessions] = useState({
        'desk1': [{ id: 1, name: 'KW (กวาง)', role: 'Sales', avatar: 'K', timeIn: '08:15' }],
        'desk2': [{ id: 2, name: 'aem (อีม)', role: 'Sales', avatar: 'A', timeIn: '08:30' }],
        'desk3': [{ id: 3, name: 'NING (คิดราคา)', role: 'Pricing', avatar: 'N', timeIn: '09:00' }],
        'mac1': [{ id: 4, name: 'อาร์ท', role: 'Designer', avatar: 'อ', timeIn: '08:45' }],
        'print1': [{ id: 5, name: 'สมชาย (ช่างพิมพ์)', role: 'Operator', avatar: 'ส', timeIn: '08:00' }, { id: 6, name: 'วิชัย (ผู้ช่วย)', role: 'Operator', avatar: 'ว', timeIn: '08:00' }],
        'diecut': [{ id: 7, name: 'ประเสริฐ', role: 'Operator', avatar: 'ป', timeIn: '08:10' }],
        'pack1': [{ id: 8, name: 'สมศรี', role: 'Warehouse', avatar: 'ศ', timeIn: '08:05' }]
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
                        3 <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>เครื่อง</span>
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
