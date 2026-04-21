import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const MODULES = [
    { key: 'sales_module', name: 'งานขายและทำราคา (Sales & Quotations)', icon: 'fa-cart-shopping' },
    { key: 'finance_module', name: 'งานบัญชีและการเงิน (Finance & Billing)', icon: 'fa-file-invoice-dollar' },
    { key: 'hr_module', name: 'ฝ่ายบุคคล (HR Workforce)', icon: 'fa-users-gear' },
];

const ROLES = ['CEO', 'Sales', 'Accountant', 'Production Manager', 'Operator', 'Driver'];

export default function Settings() {
    const { user, settings, fetchSettings } = useAuth();
    const [users, setUsers] = useState([]);
    
    // User Form state
    const [userForm, setUserForm] = useState({ username: '', full_name: '', role: 'Operator', pin_code: '' });

    useEffect(() => {
        if (user?.role === 'CEO') {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleModule = async (moduleName, currentValue) => {
        if (!confirm(`คุณต้องการ ${currentValue ? 'ปิด' : 'เปิด'} การแสดงผลหมวดหมู่นี้ในระบบหรือไม่?`)) return;
        try {
            await axios.post(`${API_URL}/settings`, { module_name: moduleName, is_enabled: !currentValue });
            fetchSettings(); // refresh global settings
        } catch (e) {
            alert('Failed to update setting');
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users`, userForm);
            alert('เพิ่มรายชื่อพนักงานสำเร็จ!');
            setUserForm({ username: '', full_name: '', role: 'Operator', pin_code: '' });
            fetchUsers();
        } catch (e) {
            alert('เกิดข้อผิดพลาด อาจมี Username นี้ในระบบแล้ว');
        }
    };

    const toggleUserActive = async (id, currentStatus) => {
        if (!confirm('ยืนยันการระงับการเข้าถึงของพนักงานคนนี้?')) return;
        try {
            await axios.post(`${API_URL}/users/${id}/deactivate`);
            fetchUsers();
        } catch (e) {
            alert('Error');
        }
    };

    if (user?.role !== 'CEO') {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>ไม่มีสิทธิ์เข้าถึง (Access Denied)</h2></div>;
    }

    return (
        <div className="view-section active" style={{ padding: '2rem' }}>
            <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}><i className="fa-solid fa-gear"></i> ตั้งค่าระบบ ERP & พนักงาน</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>เฉพาะระดับผู้บริหารสูงสุดเท่านั้น (CEO Level Only)</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                
                {/* Modules Toggle */}
                <div className="table-container shadow" style={{ flex: '1 1 350px', padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}><i className="fa-solid fa-toggle-on"></i> ควบคุมการแสดงผลหมวดหมู่ (Module Toggles)</h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
                        ปิดสวิตช์เพื่อซ่อนหมวดหมู่นั้นๆ ออกจากหน้าจอพนักงานทั้งหมดทันที (ปิดชั่วคราวเพื่อเทสระบบได้)
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {MODULES.map(m => {
                            // default true if not set
                            const isEnabled = settings.hasOwnProperty(m.key) ? settings[m.key] : true;
                            return (
                                <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div>
                                        <i className={`fa-solid ${m.icon}`} style={{ color: '#3b82f6', width: '20px' }}></i> 
                                        <strong style={{ marginLeft: '0.5rem', color: '#334155' }}>{m.name}</strong>
                                    </div>
                                    <button 
                                        onClick={() => toggleModule(m.key, isEnabled)}
                                        style={{ 
                                            background: isEnabled ? '#10b981' : '#cbd5e1', 
                                            color: isEnabled ? 'white' : '#64748b', 
                                            border: 'none', 
                                            padding: '0.4rem 1rem', 
                                            borderRadius: '20px', 
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '0.75rem'
                                        }}>
                                        {isEnabled ? 'ON : เปิดใช้งาน' : 'OFF : ซ่อนแผนกนี้'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* User / RBAC Management */}
                <div className="table-container shadow" style={{ flex: '2 1 600px', padding: '1.5rem', borderTop: '4px solid #ef4444' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '1rem' }}><i className="fa-solid fa-users"></i> สิทธิ์การเข้าถึง (Users & RBAC)</h4>
                    
                    <form onSubmit={handleSaveUser} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: '#fff1f2', borderRadius: '8px', flexWrap: 'wrap' }}>
                        <input className="form-control" style={{ flex: 1, minWidth: '150px' }} placeholder="ชื่อผู้ใช้ (Login)" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} required />
                        <input className="form-control" style={{ flex: 1, minWidth: '150px' }} placeholder="ชื่อจริง - แผนก" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} required />
                        <select className="form-control" style={{ flex: 1, minWidth: '150px' }} value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <input className="form-control" style={{ width: '120px' }} placeholder="รหัส PIN" value={userForm.pin_code} onChange={e => setUserForm({...userForm, pin_code: e.target.value})} required />
                        <button className="btn btn-primary" type="submit" style={{ whiteSpace: 'nowrap' }}>+ เพิ่มคน</button>
                    </form>

                    <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                                <th style={{ padding: '0.8rem' }}>Username</th>
                                <th style={{ padding: '0.8rem' }}>ชื่อนามสกุล</th>
                                <th style={{ padding: '0.8rem' }}>ตำแหน่ง (Role)</th>
                                <th style={{ padding: '0.8rem' }}>สถานะ</th>
                                <th style={{ padding: '0.8rem', textAlign: 'right' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: u.active ? 1 : 0.5 }}>
                                    <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{u.username}</td>
                                    <td style={{ padding: '0.8rem' }}>{u.full_name}</td>
                                    <td style={{ padding: '0.8rem' }}>
                                        <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{u.role}</span>
                                    </td>
                                    <td style={{ padding: '0.8rem' }}>{u.active ? '🟢 ใช้งาน' : '🔴 ระงับ'}</td>
                                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                                        {u.active && u.username !== 'admin' && (
                                            <button onClick={() => toggleUserActive(u.id, u.active)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>ระงับสิทธิ์</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
