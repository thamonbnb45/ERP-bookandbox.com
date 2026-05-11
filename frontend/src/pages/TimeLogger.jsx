import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

// Quick task buttons per role
const QUICK_TASKS = {
    Operator: {
        'Prepress': [
            { icon: '🔍', label: 'เช็คไฟล์', cat: 'Prepress' },
            { icon: '📐', label: 'เลย์ไฟล์', cat: 'Prepress' },
            { icon: '💿', label: 'ยิงเพลท', cat: 'Prepress' },
        ],
        'พิมพ์': [
            { icon: '🖨️', label: 'พิมพ์ออฟเซท', cat: 'Printing' },
            { icon: '📄', label: 'พิมพ์ On-demand', cat: 'Digital' },
            { icon: '🔧', label: 'ตั้งเครื่อง/ล้างเครื่อง', cat: 'Setup' },
            { icon: '📦', label: 'ขึ้นกระดาษ', cat: 'Setup' },
            { icon: '👀', label: 'เฝ้าเครื่อง', cat: 'Monitoring' },
        ],
        'หลังพิมพ์': [
            { icon: '✂️', label: 'ตัดขึ้นพิมพ์', cat: 'Post-press' },
            { icon: '🔪', label: 'ตัดซอยสำเร็จ', cat: 'Post-press' },
            { icon: '✨', label: 'เคลือบ PVC เงา', cat: 'Coating' },
            { icon: '🌫️', label: 'เคลือบ PVC ด้าน', cat: 'Coating' },
            { icon: '💎', label: 'เคลือบ UV', cat: 'Coating' },
            { icon: '📁', label: 'พับ', cat: 'Post-press' },
            { icon: '📌', label: 'ปั๊มไดคัท/ฟอยล์', cat: 'Post-press' },
            { icon: '📖', label: 'เย็บ/ไสสัน', cat: 'Post-press' },
        ],
    },
    'Production Manager': {
        'จัดการผลิต': [
            { icon: '📋', label: 'วางแผนผลิต', cat: 'Planning' },
            { icon: '✅', label: 'ตรวจงาน QC', cat: 'QC' },
            { icon: '🔧', label: 'ซ่อมบำรุง', cat: 'Maintenance' },
        ],
    },
    Sales: {
        'งานขาย': [
            { icon: '💬', label: 'ตอบแชทลูกค้า', cat: 'Sales' },
            { icon: '📞', label: 'โทรคุยลูกค้า', cat: 'Sales' },
            { icon: '📝', label: 'ทำใบเสนอราคา', cat: 'Sales' },
        ],
    },
    Accountant: {
        'บัญชี/จัดซื้อ': [
            { icon: '🧾', label: 'ออกใบแจ้งหนี้/ใบเสร็จ', cat: 'Finance' },
            { icon: '🛒', label: 'ขอซื้อ', cat: 'Procurement' },
            { icon: '💰', label: 'ขอราคา', cat: 'Procurement' },
            { icon: '✅', label: 'อนุมัติ', cat: 'Procurement' },
            { icon: '📦', label: 'สั่งซื้อ/สั่งจ้าง', cat: 'Procurement' },
        ],
    },
    Pricing: {
        'ประเมินราคา': [
            { icon: '🔢', label: 'คิดราคา', cat: 'Pricing' },
            { icon: '📊', label: 'เปรียบเทียบต้นทุน', cat: 'Pricing' },
        ],
    },
    Driver: {
        'จัดส่ง': [
            { icon: '🚚', label: 'ส่งงาน', cat: 'Delivery' },
            { icon: '📦', label: 'รับวัสดุ', cat: 'Pickup' },
        ],
    },
};

export default function TimeLogger() {
    const { user } = useAuth();
    const [activeTasks, setActiveTasks] = useState([]);
    const [historyTasks, setHistoryTasks] = useState([]);
    const [newTaskName, setNewTaskName] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = user?.full_name || 'ไม่ระบุตัวตน';

    // Camera / QR states
    const [showCamera, setShowCamera] = useState(false);
    const [scannedJob, setScannedJob] = useState(null);
    const [manualJO, setManualJO] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);

    // Timer
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { fetchData(); }, [currentUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [activeRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/timelog/active?user=${currentUser}`),
                axios.get(`${API_URL}/timelog/history?user=${currentUser}`)
            ]);
            setActiveTasks(activeRes.data);
            setHistoryTasks(historyRes.data);
        } catch (error) { console.error('Error fetching time logs', error); }
        setLoading(false);
    };

    const fetchSuggestions = async (q) => {
        if (!q) { setSuggestions([]); return; }
        try {
            const res = await axios.get(`${API_URL}/timelog/suggest?q=${q}`);
            setSuggestions(res.data);
        } catch (e) { console.error(e); }
    };

    // === CAMERA / QR ===
    const openCamera = async () => {
        setShowCamera(true);
        setScannedJob(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            // Start scanning with BarcodeDetector if available
            if ('BarcodeDetector' in window) {
                const detector = new BarcodeDetector({ formats: ['qr_code'] });
                scanIntervalRef.current = setInterval(async () => {
                    if (!videoRef.current || videoRef.current.readyState < 2) return;
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0) {
                            const raw = barcodes[0].rawValue;
                            handleQRResult(raw);
                        }
                    } catch (e) {}
                }, 500);
            }
        } catch (err) {
            alert('ไม่สามารถเปิดกล้องได้: ' + err.message);
            setShowCamera(false);
        }
    };

    const closeCamera = () => {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setShowCamera(false);
    };

    const handleQRResult = async (raw) => {
        closeCamera();
        // Try to extract JO number from QR text
        const joMatch = raw.match(/(?:JO|JOB|jo|job)?[-#]?(\d+)/i);
        if (joMatch) {
            await lookupJob(joMatch[1]);
        } else {
            // Use entire scanned text as task name
            setScannedJob({ id: null, text: raw, customer: '', product: '' });
        }
    };

    const lookupJob = async (jobId) => {
        try {
            const res = await axios.get(`${API_URL}/job_orders`);
            const job = res.data.find(j => j.id === parseInt(jobId));
            if (job) {
                setScannedJob({
                    id: job.id,
                    text: `JO-${job.id}`,
                    customer: job.customer || '',
                    product: job.product || '',
                    qty: job.quantity,
                    stage: job.production_stage
                });
            } else {
                setScannedJob({ id: jobId, text: `JO-${jobId}`, customer: 'ไม่พบในระบบ', product: '' });
            }
        } catch (e) {
            setScannedJob({ id: jobId, text: `JO-${jobId}`, customer: 'Error', product: '' });
        }
    };

    const searchJO = async () => {
        if (!manualJO.trim()) return;
        await lookupJob(manualJO.trim());
        setManualJO('');
    };

    // === TASK ACTIONS ===
    const startTask = async (taskName, category) => {
        if (!taskName?.trim()) return alert('กรุณาระบุชื่องาน');
        const fullName = scannedJob?.id ? `[JO-${scannedJob.id}] ${taskName}` : taskName;
        try {
            await axios.post(`${API_URL}/timelog/start`, {
                user_name: currentUser, task_name: fullName, category: category || 'General'
            });
            setNewTaskName('');
            setSuggestions([]);
            setScannedJob(null);
            fetchData();
        } catch (e) { alert('เกิดข้อผิดพลาดในการเริ่มงาน'); }
    };

    const startQuickTask = (task) => {
        startTask(task.label, task.cat);
    };

    const pauseTask = async (id) => {
        try { await axios.post(`${API_URL}/timelog/pause`, { id }); fetchData(); }
        catch (e) { alert('เกิดข้อผิดพลาด'); }
    };
    const resumeTask = async (id) => {
        try { await axios.post(`${API_URL}/timelog/resume`, { id }); fetchData(); }
        catch (e) { alert('เกิดข้อผิดพลาด'); }
    };
    const finishTask = async (id) => {
        const qty = prompt("จำนวนงานที่ทำได้ (เว้นว่างได้):");
        const pct = prompt("ความคืบหน้า % (เว้นว่างได้):");
        const notes = prompt("หมายเหตุ (เว้นว่างได้):");
        try {
            await axios.post(`${API_URL}/timelog/finish`, {
                id, quantity: qty ? parseInt(qty) : null,
                completion_percent: pct ? parseInt(pct) : null, notes: notes || null
            });
            fetchData();
        } catch (e) { alert('เกิดข้อผิดพลาด'); }
    };

    const formatDuration = (task) => {
        let s = task.duration_seconds || 0;
        if (task.status === 'running' && task.start_time) s += Math.floor((now - new Date(task.start_time)) / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        if (h > 0) return `${h} ชม. ${m} นาที`;
        if (m > 0) return `${m} นาที ${sec} วิ`;
        return `${sec} วินาที`;
    };

    // Get quick tasks for current user's role
    const roleQuickTasks = QUICK_TASKS[user?.role] || QUICK_TASKS['Operator'];

    if (loading && activeTasks.length === 0) return <div className="p-4"><h2>กำลังโหลด...</h2></div>;

    return (
        <div className="view-section active p-4">
            {/* Header */}
            <div className="flex justify-between align-center mb-4">
                <div>
                    <h2 className="text-primary mb-2"><i className="fa-solid fa-stopwatch"></i> ระบบลงเวลาทำงาน</h2>
                    <p className="text-muted">บันทึกเวลา Multi-tasking | สแกน QR ใบสั่งผลิตได้</p>
                </div>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa-solid fa-user-check" style={{ color: '#0284c7' }}></i>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0c4a6e' }}>{currentUser}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.role}</div>
                    </div>
                </div>
            </div>

            {/* === START NEW TASK SECTION === */}
            <div className="table-container p-4 shadow mb-4" style={{ borderLeft: '4px solid var(--primary)' }}>
                <h3 className="mb-3">เริ่มงานใหม่</h3>

                {/* Method Selector: Camera / Manual JO / Free Text */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn" onClick={openCamera} style={{ background: '#0ea5e9', color: '#fff', padding: '0.6rem 1.2rem', fontSize: '1rem', borderRadius: '10px' }}>
                        <i className="fa-solid fa-camera"></i> 📷 สแกน QR Code
                    </button>
                    <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: '200px' }}>
                        <input type="text" placeholder="พิมพ์เลข JO (เช่น 104)" value={manualJO} onChange={e => setManualJO(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchJO()}
                            style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }} />
                        <button className="btn btn-outline" onClick={searchJO} style={{ padding: '0.6rem 1rem' }}>
                            <i className="fa-solid fa-search"></i> ค้นหา JO
                        </button>
                    </div>
                </div>

                {/* Scanned Job Info */}
                {scannedJob && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>
                                    <i className="fa-solid fa-qrcode"></i> {scannedJob.text}
                                </div>
                                {scannedJob.customer && <div style={{ color: '#15803d', fontSize: '0.9rem' }}>👤 {scannedJob.customer} | 📦 {scannedJob.product} {scannedJob.qty ? `(${scannedJob.qty.toLocaleString()} ใบ)` : ''}</div>}
                            </div>
                            <button onClick={() => setScannedJob(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                    </div>
                )}

                {/* Quick Task Buttons */}
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>⚡ ปุ่มลัด — กดแล้วจับเวลาทันที:</p>
                    {Object.entries(roleQuickTasks).map(([group, tasks]) => (
                        <div key={group} style={{ marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{group}:</span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {tasks.map((t, i) => (
                                    <button key={i} onClick={() => startQuickTask(t)}
                                        style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                        <span>{t.icon}</span> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Free text input */}
                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input type="text" placeholder="หรือพิมพ์ชื่องานเอง..." value={newTaskName}
                            onChange={e => { setNewTaskName(e.target.value); fetchSuggestions(e.target.value); }}
                            style={{ width: '100%', padding: '0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem' }} />
                        {suggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', zIndex: 10, borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                {suggestions.map((s, i) => (
                                    <div key={i} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                        onClick={() => { setNewTaskName(s); setSuggestions([]); }}>
                                        <i className="fa-solid fa-clock-rotate-left text-muted"></i> {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="btn btn-primary" onClick={() => startTask(newTaskName, 'General')} style={{ padding: '0 1.5rem', fontSize: '1rem' }}>
                        <i className="fa-solid fa-play"></i> เริ่ม
                    </button>
                </div>
            </div>

            {/* === ACTIVE TASKS === */}
            <h3 className="mb-3"><i className="fa-solid fa-bolt text-accent"></i> งานที่กำลังทำอยู่ ({activeTasks.length})</h3>
            {activeTasks.length === 0 ? (
                <div className="p-4 text-center text-muted" style={{ background: '#f8fafc', borderRadius: '8px' }}>ไม่มีงานที่ค้างอยู่</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {activeTasks.map(task => (
                        <div key={task.id} className="table-container p-4 shadow" style={{ borderTop: `4px solid ${task.status === 'running' ? 'var(--success)' : '#cbd5e1'}` }}>
                            {task.status === 'running' && <span style={{ position: 'absolute', top: 10, right: 10, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>● RUNNING</span>}
                            {task.status === 'paused' && <span style={{ position: 'absolute', top: 10, right: 10, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>⏸ PAUSED</span>}
                            <h4 style={{ fontSize: '1.1rem', paddingRight: '80px' }}>{task.task_name}</h4>
                            <p className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>{task.category || ''}</p>
                            <div className="text-center mb-3" style={{ fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 700, color: task.status === 'running' ? 'var(--success)' : '#475569' }}>
                                {formatDuration(task)}
                            </div>
                            <div className="flex gap-2 justify-center">
                                {task.status === 'running' ? (
                                    <button className="btn btn-outline flex-1" onClick={() => pauseTask(task.id)}><i className="fa-solid fa-pause"></i> พัก</button>
                                ) : (
                                    <button className="btn flex-1" style={{ background: '#10b981', color: '#fff' }} onClick={() => resumeTask(task.id)}><i className="fa-solid fa-play"></i> ทำต่อ</button>
                                )}
                                <button className="btn btn-primary flex-1" onClick={() => finishTask(task.id)}><i className="fa-solid fa-check"></i> จบ</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* === HISTORY === */}
            <h3 className="mb-3 mt-5"><i className="fa-solid fa-list-check text-success"></i> ประวัติการทำงาน</h3>
            <div className="table-container shadow" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th className="p-3" style={{ textAlign: 'left' }}>ชื่องาน</th>
                            <th className="p-3">เวลาที่ใช้</th>
                            <th className="p-3">ผลงาน</th>
                            <th className="p-3">เวลาจบ</th>
                            <th className="p-3">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyTasks.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-muted">ยังไม่มีประวัติ</td></tr>
                        ) : historyTasks.map(task => (
                            <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td className="p-3" style={{ fontWeight: 600 }}>{task.task_name}</td>
                                <td className="p-3 text-center" style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{formatDuration(task)}</td>
                                <td className="p-3 text-center">
                                    {task.completion_percent ? <span style={{ background: '#dbeafe', color: '#1e3a8a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{task.completion_percent}%</span> : ''}
                                    {task.quantity ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', marginLeft: '4px' }}>{task.quantity} ชิ้น</span> : ''}
                                    {!task.completion_percent && !task.quantity ? '-' : ''}
                                </td>
                                <td className="p-3 text-center text-muted">{task.end_time ? new Date(task.end_time).toLocaleTimeString('th-TH') : '-'}</td>
                                <td className="p-3 text-muted">{task.notes || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* === CAMERA MODAL === */}
            {showCamera && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-qrcode"></i> สแกน QR Code ใบสั่งผลิต
                    </div>
                    <div style={{ position: 'relative', width: '90%', maxWidth: '500px', aspectRatio: '4/3', borderRadius: '16px', overflow: 'hidden', border: '3px solid #38bdf8' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '200px', height: '200px', border: '3px solid rgba(56,189,248,0.7)', borderRadius: '12px' }}></div>
                    </div>
                    <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem' }}>หันกล้องไปที่ QR Code บนใบสั่งผลิต</p>
                    <button onClick={closeCamera} style={{ marginTop: '1rem', padding: '0.8rem 2rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', cursor: 'pointer' }}>
                        <i className="fa-solid fa-xmark"></i> ปิดกล้อง
                    </button>
                </div>
            )}
        </div>
    );
}
