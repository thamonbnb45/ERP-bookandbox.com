import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

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
            if ('BarcodeDetector' in window) {
                const detector = new BarcodeDetector({ formats: ['qr_code'] });
                scanIntervalRef.current = setInterval(async () => {
                    if (!videoRef.current || videoRef.current.readyState < 2) return;
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0) handleQRResult(barcodes[0].rawValue);
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
        const joMatch = raw.match(/(?:JO|JOB|jo|job)?[-#]?(\d+)/i);
        if (joMatch) {
            setScannedJob({ id: joMatch[1], text: `JO-${joMatch[1]}`, customer: '', product: '' });
        } else {
            setScannedJob({ id: null, text: raw, customer: '', product: '' });
        }
    };

    // Manual JO — ไม่ต้อง lookup จาก DB อีกต่อไป พิมพ์เลขแล้วใช้ได้เลย
    const useManualJO = () => {
        if (!manualJO.trim()) return;
        const clean = manualJO.trim().replace(/^(JO|JOB|jo|job)[-#]?\s*/i, '');
        setScannedJob({ id: clean, text: `JO-${clean}`, customer: '', product: '' });
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

    const startQuickTask = (task) => startTask(task.label, task.cat);

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

    const roleQuickTasks = QUICK_TASKS[user?.role] || QUICK_TASKS['Operator'];

    if (loading && activeTasks.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>⏳ กำลังโหลด...</div>;

    // ═══════════════════════════════════════════
    // STYLES — Mobile-first, พอดีหน้าจอ
    // ═══════════════════════════════════════════
    const s = {
        page: { padding: '0.75rem', maxWidth: 600, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
        card: { background: '#fff', borderRadius: 16, padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: '1px solid #e2e8f0', marginBottom: '0.75rem' },
        headerCard: { background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: 16, padding: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        badge: (bg) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 700, background: bg, color: '#fff' }),
        btn: (bg) => ({ padding: '10px 16px', borderRadius: 12, border: 'none', background: bg || '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }),
        btnSm: (bg) => ({ padding: '8px 12px', borderRadius: 10, border: 'none', background: bg || '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.8rem', flex: 1, textAlign: 'center' }),
        input: { padding: '10px 14px', borderRadius: 12, border: '1px solid #d1d5db', fontSize: '.95rem', width: '100%', boxSizing: 'border-box' },
        quickBtn: { padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 },
        sectionTitle: { fontSize: '.85rem', fontWeight: 700, color: '#334155', margin: '0.75rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: 6 },
    };

    return (
        <div style={s.page}>
            {/* ═══ HEADER ═══ */}
            <div style={s.headerCard}>
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>⏱️ ลงเวลาทำงาน</div>
                    <div style={{ fontSize: '.75rem', color: '#64748b' }}>Multi-tasking | สแกน QR ได้</div>
                </div>
                <div style={{ background: '#fff', padding: '6px 12px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#1e40af' }}>{currentUser}</div>
                    <div style={{ fontSize: '.65rem', color: '#64748b' }}>{user?.role}</div>
                </div>
            </div>

            {/* ═══ เริ่มงานใหม่ ═══ */}
            <div style={{ ...s.card, borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '0.75rem', color: '#1e3a5f' }}>เริ่มงานใหม่</div>

                {/* QR + Manual JO */}
                <button style={{ ...s.btn('#0ea5e9'), marginBottom: 8 }} onClick={openCamera}>
                    📷 สแกน QR Code
                </button>

                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder="พิมพ์เลข JO (เช่น 104)" value={manualJO}
                        onChange={e => setManualJO(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && useManualJO()} />
                    <button style={{ ...s.btnSm('#3b82f6'), flex: 'none', width: 70 }} onClick={useManualJO}>🔍 ค้นหา</button>
                </div>

                {/* Scanned Job Badge */}
                {scannedJob && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 800, color: '#166534', fontSize: '.95rem' }}>📋 {scannedJob.text}</div>
                            {scannedJob.customer && <div style={{ fontSize: '.75rem', color: '#15803d' }}>👤 {scannedJob.customer}</div>}
                        </div>
                        <button onClick={() => setScannedJob(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                    </div>
                )}

                {/* Quick Tasks */}
                <div style={{ fontSize: '.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>⚡ ปุ่มลัด — กดแล้วจับเวลาทันที:</div>
                {Object.entries(roleQuickTasks).map(([group, tasks]) => (
                    <div key={group} style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: '.65rem', color: '#94a3b8', fontWeight: 700 }}>{group}:</span>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
                            {tasks.map((t, i) => (
                                <button key={i} onClick={() => startQuickTask(t)} style={s.quickBtn}>
                                    <span>{t.icon}</span> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Free text input */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input style={s.input} placeholder="หรือพิมพ์ชื่องานเอง..." value={newTaskName}
                            onChange={e => { setNewTaskName(e.target.value); fetchSuggestions(e.target.value); }}
                            onKeyDown={e => e.key === 'Enter' && startTask(newTaskName, 'General')} />
                        {suggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', zIndex: 10, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflow: 'auto' }}>
                                {suggestions.map((sg, i) => (
                                    <div key={i} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '.85rem' }}
                                        onClick={() => { setNewTaskName(sg); setSuggestions([]); }}>
                                        🕐 {sg}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button style={{ ...s.btnSm('#22c55e'), flex: 'none', width: 60 }} onClick={() => startTask(newTaskName, 'General')}>▶️ เริ่ม</button>
                </div>
            </div>

            {/* ═══ งานที่กำลังทำ ═══ */}
            <div style={s.sectionTitle}>⚡ งานที่กำลังทำ ({activeTasks.length})</div>
            {activeTasks.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>ไม่มีงานค้าง — กดปุ่มด้านบนเพื่อเริ่มงาน</div>
            ) : (
                activeTasks.map(task => (
                    <div key={task.id} style={{ ...s.card, borderTop: `3px solid ${task.status === 'running' ? '#22c55e' : '#94a3b8'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: '.9rem', flex: 1, paddingRight: 8 }}>{task.task_name}</div>
                            <span style={s.badge(task.status === 'running' ? '#22c55e' : '#94a3b8')}>
                                {task.status === 'running' ? '● RUN' : '⏸ PAUSE'}
                            </span>
                        </div>
                        {task.category && <div style={{ fontSize: '.7rem', color: '#64748b', marginBottom: 6 }}>{task.category}</div>}
                        <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 800, color: task.status === 'running' ? '#22c55e' : '#475569', margin: '8px 0' }}>
                            {formatDuration(task)}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {task.status === 'running' ? (
                                <button style={s.btnSm('#f59e0b')} onClick={() => pauseTask(task.id)}>⏸ พัก</button>
                            ) : (
                                <button style={s.btnSm('#22c55e')} onClick={() => resumeTask(task.id)}>▶️ ทำต่อ</button>
                            )}
                            <button style={s.btnSm('#3b82f6')} onClick={() => finishTask(task.id)}>✅ จบงาน</button>
                        </div>
                    </div>
                ))
            )}

            {/* ═══ ประวัติ ═══ */}
            <div style={s.sectionTitle}>📋 ประวัติวันนี้</div>
            {historyTasks.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีประวัติ</div>
            ) : (
                historyTasks.map(task => (
                    <div key={task.id} style={{ ...s.card, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{task.task_name}</div>
                            <div style={{ fontSize: '.7rem', color: '#64748b' }}>
                                {task.end_time ? new Date(task.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                                {task.quantity ? ` • ${task.quantity} ชิ้น` : ''}
                                {task.notes ? ` • ${task.notes}` : ''}
                            </div>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.85rem', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                            {formatDuration(task)}
                        </div>
                    </div>
                ))
            )}

            {/* ═══ CAMERA MODAL ═══ */}
            {showCamera && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>📷 สแกน QR Code</div>
                    <div style={{ position: 'relative', width: '100%', maxWidth: 400, aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', border: '3px solid #38bdf8' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 180, height: 180, border: '3px solid rgba(56,189,248,0.7)', borderRadius: 12 }}></div>
                    </div>
                    <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '.85rem' }}>หันกล้องไปที่ QR Code</p>
                    <button onClick={closeCamera} style={{ marginTop: '0.5rem', padding: '12px 2rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', cursor: 'pointer', fontWeight: 700 }}>
                        ✕ ปิดกล้อง
                    </button>
                </div>
            )}
        </div>
    );
}
