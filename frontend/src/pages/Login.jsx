import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const result = await login(username, pin);
        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                        Book<span style={{ color: '#5b92e5' }}>and</span>box
                    </div>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>ระบบปฏิบัติการ Enterprise ERP</p>
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>ชื่อผู้ใช้งาน (Username ระบบ)</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)}
                            placeholder="เช่น admin, ek_driver" 
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>รหัสฝ่าน / PIN (เฉพาะตัวเลข 4-6 หลัก)</label>
                        <input 
                            type="password" 
                            inputMode="numeric"
                            value={pin} 
                            onChange={e => setPin(e.target.value)}
                            placeholder="****" 
                            required
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.5rem', outline: 'none' }}
                        />
                    </div>
                    
                    <button type="submit" disabled={loading} style={{ background: '#0f4c81', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'กำลังเข้าสู่ระบบ...' : 'ลงชื่อเข้าใช้ (Login)'}
                    </button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                    โรงพิมพ์บุ๊คแอนด์บ็อกซ์ • Internal Staff Only <br/>
                    เข้าใช้ครั้งแรกด้วยชื่อ <strong style={{color:'#333'}}>admin</strong> รหัส <strong style={{color:'#333'}}>1234</strong>
                </div>
            </div>
        </div>
    );
}
