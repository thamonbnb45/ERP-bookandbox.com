import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
const WC_TYPES = [
  { value: 'offset_press', label: '🖨️ Offset', color: '#3b82f6' },
  { value: 'digital_press', label: '🖥️ Digital', color: '#8b5cf6' },
  { value: 'diecut', label: '✂️ ไดคัท', color: '#ef4444' },
  { value: 'folding', label: '📐 พับ/ปะ', color: '#f59e0b' },
  { value: 'lamination', label: '✨ เคลือบ', color: '#10b981' },
  { value: 'binding', label: '📚 เข้าเล่ม', color: '#6366f1' },
  { value: 'finishing', label: '🎨 ตกแต่ง', color: '#ec4899' },
  { value: 'prepress', label: '🔍 พรีเพรส', color: '#14b8a6' },
  { value: 'packing', label: '📦 แพ็ค', color: '#78716c' },
  { value: 'general', label: '⚙️ ทั่วไป', color: '#64748b' },
];
const STAGES = ['queued','in_progress','completed'];
const STAGE_COLORS = { queued:'#3b82f6', in_progress:'#f59e0b', completed:'#22c55e', on_hold:'#ef4444', cancelled:'#6b7280' };
const STAGE_LABELS = { queued:'📥 รอผลิต', in_progress:'⚙️ กำลังผลิต', completed:'✅ เสร็จ', on_hold:'⏸️ พัก' };

function getTypeInfo(t) { return WC_TYPES.find(w => w.value === t) || WC_TYPES[WC_TYPES.length-1]; }
function utilColor(pct) { return pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : pct >= 40 ? '#3b82f6' : '#22c55e'; }

export default function SmartFactory() {
  const { user } = useAuth();
  const isSales = user?.role === 'Sales';
  const [tab, setTab] = useState('kanban');
  const [wcs, setWcs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState({});
  const [weekCap, setWeekCap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddWC, setShowAddWC] = useState(false);
  const [jobForm, setJobForm] = useState({ job_name:'', customer_name:'', work_center_id:'', scheduled_start: new Date().toISOString().slice(0,10), estimated_duration_min:60, quantity:0, priority:5 });
  const [wcForm, setWcForm] = useState({ name:'', type:'offset_press', capacity_per_hour:100, shift_hours:8 });
  const [workers, setWorkers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, s, st, wk, wkrs] = await Promise.all([
        fetch(`${API}/api/factory/work-centers`).then(r=>r.json()),
        fetch(`${API}/api/factory/schedule`).then(r=>r.json()),
        fetch(`${API}/api/factory/stats`).then(r=>r.json()),
        fetch(`${API}/api/factory/capacity-week`).then(r=>r.json()),
        fetch(`${API}/api/factory/productivity`).then(r=>r.json()),
      ]);
      setWcs(Array.isArray(w)?w:[]); setSchedule(Array.isArray(s)?s:[]); setStats(st||{}); setWeekCap(Array.isArray(wk)?wk:[]); setWorkers(Array.isArray(wkrs)?wkrs:[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);
  const sendSummary = async () => { await fetch(`${API}/api/factory/send-summary`, { method:'POST' }); alert('📊 ส่งสรุปผลิตลงกลุ่มแล้ว!'); };

  const addJob = async () => {
    if (!jobForm.job_name) return alert('กรุณาใส่ชื่องาน');
    const body = { ...jobForm };
    if (!body.work_center_id) delete body.work_center_id;
    const res = await fetch(`${API}/api/factory/schedule`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if (res.status === 409) { const d = await res.json(); alert(d.message); return; }
    setShowAdd(false); setJobForm({ job_name:'', customer_name:'', work_center_id:'', scheduled_start: new Date().toISOString().slice(0,10), estimated_duration_min:60, quantity:0, priority:5 }); load();
  };

  const addWC = async () => {
    if (!wcForm.name) return alert('กรุณาใส่ชื่อเครื่อง');
    await fetch(`${API}/api/factory/work-centers`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(wcForm) });
    setShowAddWC(false); setWcForm({ name:'', type:'offset_press', capacity_per_hour:100, shift_hours:8 }); load();
  };

  const updateJob = async (id, status) => {
    const body = { status };
    if (status === 'in_progress') body.actual_start = new Date().toISOString();
    if (status === 'completed') body.actual_end = new Date().toISOString();
    await fetch(`${API}/api/factory/schedule/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    load();
  };

  const deleteJob = async (id) => { if (!confirm('ลบงานนี้?')) return; await fetch(`${API}/api/factory/schedule/${id}`, { method:'DELETE' }); load(); };
  const deleteWC = async (id) => { if (!confirm('ลบเครื่องนี้?')) return; await fetch(`${API}/api/factory/work-centers/${id}`, { method:'DELETE' }); load(); };

  // Styles
  const s = {
    page: { padding: '0.5rem', maxWidth: 800, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
    card: { background:'#fff', borderRadius:14, padding:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #e2e8f0', marginBottom:'0.75rem' },
    btn: (bg) => ({ padding:'10px 16px', borderRadius:12, border:'none', background:bg||'#3b82f6', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.85rem' }),
    btnSm: (bg) => ({ padding:'6px 12px', borderRadius:8, border:'none', background:bg||'#3b82f6', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:'.75rem' }),
    input: { padding:'10px 14px', borderRadius:10, border:'1px solid #d1d5db', fontSize:'.9rem', width:'100%', boxSizing:'border-box' },
    badge: (bg) => ({ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:'.7rem', fontWeight:700, background:bg, color:'#fff' }),
    tab: (active) => ({ padding:'8px 16px', borderRadius:'10px 10px 0 0', border:'none', fontWeight:700, cursor:'pointer', fontSize:'.8rem', background: active ? '#3b82f6' : '#e2e8f0', color: active ? '#fff' : '#64748b' }),
  };

  // Week capacity grouped by machine
  const weekByMachine = {};
  weekCap.forEach(r => { if (!weekByMachine[r.name]) weekByMachine[r.name] = { type: r.type, days: [] }; weekByMachine[r.name].days.push(r); });

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:6 }}>
        <div>
          <div style={{ fontSize:'1.2rem', fontWeight:800, color:'#0f172a' }}>🏭 Smart Factory</div>
          <div style={{ fontSize:'.7rem', color:'#64748b' }}>Kanban • Capacity • Production</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button style={{ ...s.btn('#64748b'), padding:'10px 12px' }} onClick={load} title="รีเฟรช">🔄</button>
          {!isSales && <button style={s.btn('#22c55e')} onClick={() => setShowAddWC(true)}>+ เครื่อง</button>}
          {!isSales && <button style={s.btn('#3b82f6')} onClick={() => setShowAdd(true)}>+ งาน</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3 }}>
        {(isSales
          ? [['kanban','📋 Kanban'],['dashboard','📊 ภาพรวม']]
          : [['kanban','📋 Kanban'],['dashboard','📊 ภาพรวม'],['workers','👷 คนงาน'],['machines','⚙️ เครื่อง']]
        ).map(([k,l]) =>
          <button key={k} style={s.tab(tab===k)} onClick={() => setTab(k)}>{l}</button>
        )}
      </div>

      <div style={{ ...s.card, borderTopLeftRadius:0, marginBottom:0 }}>
        {loading ? <p style={{ textAlign:'center', padding:'2rem', color:'#94a3b8' }}>⏳ โหลด...</p> :
         tab === 'kanban' ? <Kanban schedule={schedule} wcs={wcs} updateJob={updateJob} deleteJob={deleteJob} s={s} readOnly={isSales} /> :
         tab === 'dashboard' ? <Dashboard stats={stats} weekByMachine={weekByMachine} s={s} sendSummary={isSales ? null : sendSummary} /> :
         tab === 'workers' ? <Workers workers={workers} s={s} /> :
         <Machines wcs={wcs} deleteWC={deleteWC} s={s} />
        }
      </div>

      {/* Add Job Modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }} onClick={() => setShowAdd(false)}>
          <div style={{ ...s.card, width:'100%', maxWidth:500, borderBottomLeftRadius:0, borderBottomRightRadius:0, paddingBottom:'2rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 .75rem', fontSize:'1rem' }}>📋 เพิ่มงานผลิต</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input style={s.input} placeholder="ชื่องาน เช่น กล่อง BNI 500 ใบ" value={jobForm.job_name} onChange={e => setJobForm({...jobForm, job_name:e.target.value})} />
              <input style={s.input} placeholder="ชื่อลูกค้า" value={jobForm.customer_name} onChange={e => setJobForm({...jobForm, customer_name:e.target.value})} />
              <select style={s.input} value={jobForm.work_center_id} onChange={e => setJobForm({...jobForm, work_center_id:e.target.value ? +e.target.value : ''})}>
                <option value="">-- ยังไม่ระบุเครื่อง --</option>
                {wcs.map(w => <option key={w.id} value={w.id}>{getTypeInfo(w.type).label} {w.name}</option>)}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.7rem', color:'#64748b' }}>วันผลิต</label>
                  <input style={s.input} type="date" value={jobForm.scheduled_start} onChange={e => setJobForm({...jobForm, scheduled_start:e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.7rem', color:'#64748b' }}>เวลา (นาที)</label>
                  <input style={s.input} type="number" value={jobForm.estimated_duration_min} onChange={e => setJobForm({...jobForm, estimated_duration_min:+e.target.value})} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.7rem', color:'#64748b' }}>จำนวน</label>
                  <input style={s.input} type="number" value={jobForm.quantity} onChange={e => setJobForm({...jobForm, quantity:+e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.7rem', color:'#64748b' }}>ลำดับ (1=ด่วน)</label>
                  <input style={s.input} type="number" min={1} max={10} value={jobForm.priority} onChange={e => setJobForm({...jobForm, priority:+e.target.value})} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...s.btn('#94a3b8'), flex:1 }} onClick={() => setShowAdd(false)}>ยกเลิก</button>
                <button style={{ ...s.btn('#3b82f6'), flex:1 }} onClick={addJob}>📥 เพิ่มงาน</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Machine Modal */}
      {showAddWC && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:999 }} onClick={() => setShowAddWC(false)}>
          <div style={{ ...s.card, width:'100%', maxWidth:500, borderBottomLeftRadius:0, borderBottomRightRadius:0, paddingBottom:'2rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 .75rem', fontSize:'1rem' }}>⚙️ เพิ่มเครื่องจักร</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input style={s.input} placeholder="ชื่อเครื่อง เช่น Offset #1" value={wcForm.name} onChange={e => setWcForm({...wcForm, name:e.target.value})} />
              <select style={s.input} value={wcForm.type} onChange={e => setWcForm({...wcForm, type:e.target.value})}>
                {WC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.7rem', color:'#64748b' }}>กำลังผลิต/ชม.</label>
                  <input style={s.input} type="number" value={wcForm.capacity_per_hour} onChange={e => setWcForm({...wcForm, capacity_per_hour:+e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.7rem', color:'#64748b' }}>ชม./กะ</label>
                  <input style={s.input} type="number" value={wcForm.shift_hours} onChange={e => setWcForm({...wcForm, shift_hours:+e.target.value})} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...s.btn('#94a3b8'), flex:1 }} onClick={() => setShowAddWC(false)}>ยกเลิก</button>
                <button style={{ ...s.btn('#22c55e'), flex:1 }} onClick={addWC}>✅ บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ KANBAN ═══════════════════
function Kanban({ schedule, wcs, updateJob, deleteJob, s, readOnly }) {
  const [qrJob, setQrJob] = useState(null);
  const columns = ['queued','in_progress','completed'];
  
  const elapsed = (start) => {
    if (!start) return '';
    const ms = Date.now() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}ชม.${m}นาที` : `${m}นาที`;
  };

  return (
    <div>
      {columns.map(stage => {
        const jobs = schedule.filter(j => j.status === stage);
        return (
          <div key={stage} style={{ marginBottom: 16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontWeight:700, fontSize:'.9rem' }}>{STAGE_LABELS[stage]}</span>
              <span style={s.badge(STAGE_COLORS[stage])}>{jobs.length}</span>
            </div>
            {jobs.length === 0 && <div style={{ textAlign:'center', color:'#cbd5e1', fontSize:'.8rem', padding:'1rem', background:'#f8fafc', borderRadius:10 }}>ว่าง</div>}
            {jobs.map(j => {
              const wc = wcs.find(w => w.id === j.work_center_id);
              return (
                <div key={j.id} style={{ background:'#f8fafc', borderRadius:12, padding:'10px 14px', marginBottom:6, border: j.is_urgent ? '2px solid #ef4444' : '1px solid #e2e8f0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ fontWeight:700, fontSize:'.85rem', flex:1 }}>{j.is_urgent && '🔴 '}{j.job_name || 'ไม่มีชื่อ'}</div>
                    <div style={{ display:'flex', gap:4 }}>
                      {!readOnly && <button style={{ background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontSize:'.8rem' }} onClick={() => setQrJob(qrJob === j.id ? null : j.id)} title="QR Code">📱</button>}
                      {!readOnly && <button style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'.8rem' }} onClick={() => deleteJob(j.id)}>✕</button>}
                    </div>
                  </div>
                  <div style={{ fontSize:'.7rem', color:'#64748b', marginTop:2 }}>
                    {j.customer_name && <span>👤 {j.customer_name} • </span>}
                    {wc && <span>{getTypeInfo(wc.type).label} {wc.name} • </span>}
                    {j.estimated_duration_min}นาที{j.quantity > 0 && ` • ${j.quantity.toLocaleString()} ชิ้น`}
                  </div>
                  {stage === 'in_progress' && j.actual_start && (
                    <div style={{ fontSize:'.7rem', color:'#f59e0b', fontWeight:700, marginTop:4 }}>⏱️ {elapsed(j.actual_start)}</div>
                  )}
                  {qrJob === j.id && (
                    <div style={{ textAlign:'center', marginTop:8, padding:8, background:'#fff', borderRadius:8, border:'1px solid #e2e8f0' }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({type:'JOB',id:j.id,name:j.job_name}))}`} alt="QR" style={{ width:120, height:120 }} />
                      <div style={{ fontSize:'.65rem', color:'#94a3b8', marginTop:4 }}>สแกนเพื่อเริ่มจับเวลา</div>
                    </div>
                  )}
                  {!readOnly && <div style={{ display:'flex', gap:4, marginTop:8 }}>
                    {stage === 'queued' && <button style={s.btnSm('#f59e0b')} onClick={() => updateJob(j.id,'in_progress')}>▶️ เริ่มผลิต</button>}
                    {stage === 'in_progress' && <button style={s.btnSm('#22c55e')} onClick={() => updateJob(j.id,'completed')}>✅ เสร็จ</button>}
                    {stage === 'in_progress' && <button style={s.btnSm('#ef4444')} onClick={() => updateJob(j.id,'on_hold')}>⏸️ พัก</button>}
                    {stage === 'completed' && <span style={{ fontSize:'.7rem', color:'#22c55e', fontWeight:600 }}>✅ เสร็จแล้ว</span>}
                  </div>}
                  {readOnly && stage === 'completed' && <div style={{ marginTop:6 }}><span style={{ fontSize:'.7rem', color:'#22c55e', fontWeight:600 }}>✅ เสร็จแล้ว</span></div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════ DASHBOARD ═══════════════════
function Dashboard({ stats, weekByMachine, s, sendSummary }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'เครื่องจักร', value: stats.work_centers||0, icon:'⚙️', color:'#3b82f6' },
          { label:'งานวันนี้', value: stats.today_jobs||0, icon:'📋', color:'#f59e0b' },
          { label:'งานด่วน', value: stats.urgent_jobs||0, icon:'🔴', color:'#ef4444' },
          { label:'เสร็จวันนี้', value: stats.completed_today||0, icon:'✅', color:'#22c55e' },
        ].map((st,i) => (
          <div key={i} style={{ background:`${st.color}10`, borderRadius:12, padding:'0.75rem', border:`1px solid ${st.color}30` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'1.5rem' }}>{st.icon}</span>
              <span style={{ fontSize:'1.6rem', fontWeight:800, color:st.color }}>{st.value}</span>
            </div>
            <div style={{ fontSize:'.7rem', color:'#64748b', marginTop:4 }}>{st.label}</div>
          </div>
        ))}
      </div>

      <h4 style={{ margin:'0 0 8px', fontSize:'.9rem' }}>🔥 Capacity 7 วัน</h4>
      {Object.keys(weekByMachine).length === 0 ? (
        <p style={{ color:'#94a3b8', textAlign:'center', padding:'1.5rem', fontSize:'.85rem' }}>ยังไม่มีเครื่องจักร</p>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.75rem' }}>
            <thead>
              <tr>
                <th style={{ padding:6, textAlign:'left', borderBottom:'2px solid #e2e8f0' }}>เครื่อง</th>
                {weekByMachine[Object.keys(weekByMachine)[0]]?.days.map((d,i) => (
                  <th key={i} style={{ padding:4, textAlign:'center', borderBottom:'2px solid #e2e8f0', minWidth:42 }}>
                    {new Date(d.calendar_date).getDate()}/{new Date(d.calendar_date).getMonth()+1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(weekByMachine).map(([name, info]) => (
                <tr key={name}>
                  <td style={{ padding:6, fontWeight:600, borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>
                    {getTypeInfo(info.type).label.split(' ')[0]} {name}
                  </td>
                  {info.days.map((d,i) => {
                    const pct = d.capacity_min > 0 ? Math.round((d.booked_min / d.capacity_min) * 100) : 0;
                    return (
                      <td key={i} style={{ padding:3, textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                        <div style={{ background: utilColor(pct), color:'#fff', borderRadius:6, padding:'4px 2px', fontWeight:700, fontSize:'.7rem' }}>
                          {pct}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sendSummary && <button style={{ ...s.btn('#8b5cf6'), width:'100%', marginTop:16, padding:'12px' }} onClick={sendSummary}>
        📊 ส่งสรุปผลิตลงกลุ่ม LINE
      </button>}
    </div>
  );
}

// ═══════════════════ MACHINES ═══════════════════
function Machines({ wcs, deleteWC, s }) {
  return (
    <div>
      <h4 style={{ margin:'0 0 .75rem', fontSize:'.9rem' }}>⚙️ เครื่องจักร ({wcs.length})</h4>
      {wcs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'#94a3b8' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🏭</div>
          <p style={{ fontSize:'.85rem' }}>ยังไม่มีเครื่องจักร — กด "+ เครื่อง" เพื่อเพิ่ม</p>
        </div>
      ) : (
        wcs.map(w => {
          const info = getTypeInfo(w.type);
          return (
            <div key={w.id} style={{ ...s.card, display:'flex', alignItems:'center', gap:12, borderLeft:`4px solid ${info.color}` }}>
              <div style={{ fontSize:'1.5rem' }}>{info.label.split(' ')[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'.9rem' }}>{w.name}</div>
                <div style={{ fontSize:'.7rem', color:'#64748b' }}>{info.label} • {w.capacity_per_hour}/ชม. • {w.shift_hours}ชม./กะ</div>
              </div>
              <span style={s.badge(w.status === 'active' ? '#22c55e' : '#ef4444')}>{w.status}</span>
              <button style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'.9rem' }} onClick={() => deleteWC(w.id)}>🗑️</button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════ WORKERS ═══════════════════
function Workers({ workers, s }) {
  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}ชม. ${m}นาที` : `${m}นาที`;
  };
  return (
    <div>
      <h4 style={{ margin:'0 0 .75rem', fontSize:'.9rem' }}>👷 ผลงานพนักงานวันนี้</h4>
      {workers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'#94a3b8' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:8 }}>👷</div>
          <p style={{ fontSize:'.85rem' }}>ยังไม่มีข้อมูลลงเวลาวันนี้</p>
          <p style={{ fontSize:'.75rem', color:'#cbd5e1' }}>พนักงาน DM Zero พิมพ์ "เริ่ม ชื่องาน" เพื่อเริ่มบันทึก</p>
        </div>
      ) : (
        workers.map((w, i) => (
          <div key={w.user_name} style={{ ...s.card, display:'flex', alignItems:'center', gap:12, borderLeft:`4px solid ${i === 0 ? '#f59e0b' : '#3b82f6'}` }}>
            <div style={{ fontSize:'1.5rem', width:36, textAlign:'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:'.9rem' }}>{w.user_name}</div>
              <div style={{ fontSize:'.7rem', color:'#64748b' }}>
                ✅ {w.finished} งานเสร็จ{w.running > 0 ? ` • ⚙️ ${w.running} กำลังทำ` : ''}{w.total_quantity > 0 ? ` • 📦 ${parseInt(w.total_quantity).toLocaleString()} ชิ้น` : ''}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:'.9rem', color:'#3b82f6' }}>{fmtTime(parseInt(w.total_seconds))}</div>
              <div style={{ fontSize:'.65rem', color:'#94a3b8' }}>{w.total_tasks} tasks</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
