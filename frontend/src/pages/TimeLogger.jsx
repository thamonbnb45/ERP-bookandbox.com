import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export default function TimeLogger() {
    const { user } = useAuth();
    const [activeTasks, setActiveTasks] = useState([]);
    const [historyTasks, setHistoryTasks] = useState([]);
    const [newTaskName, setNewTaskName] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = user?.full_name || 'ไม่ระบุตัวตน';
    
    // Auto-update timers
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [activeRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/timelog/active?user=${currentUser}`),
                axios.get(`${API_URL}/timelog/history?user=${currentUser}`)
            ]);
            setActiveTasks(activeRes.data);
            setHistoryTasks(historyRes.data);
        } catch (error) {
            console.error('Error fetching time logs', error);
        }
        setLoading(false);
    };

    const fetchSuggestions = async (q) => {
        if (!q) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await axios.get(`${API_URL}/timelog/suggest?q=${q}`);
            setSuggestions(res.data);
        } catch (error) {
            console.error('Error fetching suggestions', error);
        }
    };

    const handleTaskNameChange = (e) => {
        const val = e.target.value;
        setNewTaskName(val);
        fetchSuggestions(val);
    };

    const selectSuggestion = (val) => {
        setNewTaskName(val);
        setSuggestions([]);
    };

    const startTask = async () => {
        if (!newTaskName.trim()) return alert('กรุณาระบุชื่องาน');
        try {
            await axios.post(`${API_URL}/timelog/start`, {
                user_name: currentUser,
                task_name: newTaskName,
                category: 'General'
            });
            setNewTaskName('');
            setSuggestions([]);
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการเริ่มงาน');
        }
    };

    const pauseTask = async (id) => {
        try {
            await axios.post(`${API_URL}/timelog/pause`, { id });
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการหยุดพัก');
        }
    };

    const resumeTask = async (id) => {
        try {
            await axios.post(`${API_URL}/timelog/resume`, { id });
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการทำต่อ');
        }
    };

    const finishTask = async (id) => {
        const qty = prompt("ระบุจำนวนงานที่ทำได้ (ถ้ามี/ถ้าไม่มีให้เว้นว่าง):");
        const pct = prompt("ระบุความคืบหน้า % (ถ้ามี/ถ้าไม่มีให้เว้นว่าง):");
        const notes = prompt("หมายเหตุ (ถ้ามี):");
        
        try {
            await axios.post(`${API_URL}/timelog/finish`, {
                id,
                quantity: qty ? parseInt(qty) : null,
                completion_percent: pct ? parseInt(pct) : null,
                notes: notes || null
            });
            fetchData();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการจบงาน');
        }
    };

    const formatDuration = (task) => {
        let totalSeconds = task.duration_seconds || 0;
        if (task.status === 'running' && task.start_time) {
            totalSeconds += Math.floor((now - new Date(task.start_time)) / 1000);
        }
        
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        if (h > 0) return `${h} ชม. ${m} นาที ${s} วินาที`;
        if (m > 0) return `${m} นาที ${s} วินาที`;
        return `${s} วินาที`;
    };

    if (loading && activeTasks.length === 0) return <div className="p-4"><h2>กำลังโหลดข้อมูล...</h2></div>;

    return (
        <div className="view-section active p-4">
            <div className="flex justify-between align-center mb-4">
                <div>
                    <h2 className="text-primary mb-2"><i className="fa-solid fa-stopwatch"></i> ระบบบันทึกเวลาทำงาน (Time & Task Logger)</h2>
                    <p className="text-muted">บันทึกเวลาการทำงานแบบ Multi-tasking สลับงานไปมาได้</p>
                </div>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa-solid fa-user-check" style={{ color: '#0284c7' }}></i>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0c4a6e' }}>{currentUser}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.role || ''}</div>
                    </div>
                </div>
            </div>

            {/* Start New Task */}
            <div className="table-container p-4 shadow mb-4" style={{ borderLeft: '4px solid var(--primary)' }}>
                <h3 className="mb-3">เริ่มงานใหม่</h3>
                <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                            type="text" 
                            className="w-full p-3 border rounded" 
                            placeholder="พิมพ์ชื่องานที่กำลังจะทำ... (เช่น ตอบแชทลูกค้า, เช็คไฟล์, ปรับปรุง HR)"
                            value={newTaskName}
                            onChange={handleTaskNameChange}
                            style={{ fontSize: '1.1rem' }}
                        />
                        {suggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', zIndex: 10, borderRadius: '4px', marginTop: '2px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                {suggestions.map((s, i) => (
                                    <div 
                                        key={i} 
                                        style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                        onClick={() => selectSuggestion(s)}
                                    >
                                        <i className="fa-solid fa-clock-rotate-left text-muted mr-2"></i> {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="btn btn-primary" style={{ padding: '0 2rem', fontSize: '1.1rem' }} onClick={startTask}>
                        <i className="fa-solid fa-play"></i> เริ่มจับเวลา
                    </button>
                </div>
                <p className="text-muted mt-2 text-sm"><i className="fa-solid fa-lightbulb text-warning"></i> <b>Tip:</b> พิมพ์ชื่ออะไรก็ได้ ระบบจะเก็บสถิติเพื่อนำไปเรียนรู้คำศัพท์ที่คุณใช้จริง</p>
            </div>

            {/* Active Tasks */}
            <h3 className="mb-3 mt-5"><i className="fa-solid fa-bolt text-accent"></i> งานที่กำลังทำอยู่ (Active Tasks)</h3>
            {activeTasks.length === 0 ? (
                <div className="p-4 text-center text-muted" style={{ background: '#f8fafc', borderRadius: '8px' }}>
                    ไม่มีงานที่ค้างอยู่
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                    {activeTasks.map(task => (
                        <div key={task.id} className="table-container p-4 shadow" style={{ position: 'relative', borderTop: `4px solid ${task.status === 'running' ? 'var(--success)' : '#cbd5e1'}` }}>
                            {task.status === 'running' && (
                                <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    <i className="fa-solid fa-circle text-success" style={{ fontSize: '0.6rem' }}></i> RUNNING
                                </span>
                            )}
                            {task.status === 'paused' && (
                                <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    PAUSED
                                </span>
                            )}
                            <h4 className="mb-1" style={{ fontSize: '1.2rem' }}>{task.task_name}</h4>
                            <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>หมวดหมู่: {task.category || '-'}</p>
                            
                            <div className="text-center mb-4" style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', color: task.status === 'running' ? 'var(--success)' : '#475569' }}>
                                {formatDuration(task)}
                            </div>

                            <div className="flex gap-2 justify-center">
                                {task.status === 'running' ? (
                                    <button className="btn btn-outline flex-1" onClick={() => pauseTask(task.id)}>
                                        <i className="fa-solid fa-pause"></i> พักงาน
                                    </button>
                                ) : (
                                    <button className="btn flex-1" style={{ background: '#10b981', color: 'white' }} onClick={() => resumeTask(task.id)}>
                                        <i className="fa-solid fa-play"></i> ทำต่อ
                                    </button>
                                )}
                                <button className="btn btn-primary flex-1" onClick={() => finishTask(task.id)}>
                                    <i className="fa-solid fa-check"></i> จบงาน
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* History */}
            <h3 className="mb-3 mt-5"><i className="fa-solid fa-list-check text-success"></i> ประวัติการทำงานวันนี้</h3>
            <div className="table-container shadow">
                <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th className="p-3">ชื่องาน</th>
                            <th className="p-3">ระยะเวลาที่ใช้</th>
                            <th className="p-3">ผลงาน (% / จำนวน)</th>
                            <th className="p-3">เวลาที่จบงาน</th>
                            <th className="p-3">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyTasks.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-muted">ยังไม่มีประวัติการทำงาน</td></tr>
                        ) : (
                            historyTasks.map(task => (
                                <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td className="p-3 font-bold">{task.task_name}</td>
                                    <td className="p-3 text-primary font-mono">{formatDuration(task)}</td>
                                    <td className="p-3">
                                        {task.completion_percent ? <span className="mr-2" style={{ background: '#dbeafe', color: '#1e3a8a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{task.completion_percent}%</span> : null}
                                        {task.quantity ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{task.quantity} ชิ้น</span> : null}
                                        {!task.completion_percent && !task.quantity ? '-' : ''}
                                    </td>
                                    <td className="p-3 text-muted" style={{ fontSize: '0.9rem' }}>{new Date(task.end_time).toLocaleTimeString('th-TH')}</td>
                                    <td className="p-3 text-muted text-sm">{task.notes || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-5 p-4" style={{ borderTop: '2px dashed var(--border-color)', textAlign: 'center', color: '#64748b' }}>
                <p>⚠️ ระบบนี้ใช้สำหรับเก็บศัพท์การทำงาน (Terminology Harvesting) เพื่อนำไปจัดทำ Master Data สำหรับ Dropdown ของแต่ละแผนกในอนาคต</p>
            </div>
        </div>
    );
}
