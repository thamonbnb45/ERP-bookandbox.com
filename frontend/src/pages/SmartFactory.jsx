import { useState, useEffect, useCallback } from 'react';

const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
const WC_TYPES = [
  { value: 'offset_press', label: '🖨️ Offset Press', color: '#3b82f6' },
  { value: 'digital_press', label: '🖥️ Digital Press', color: '#8b5cf6' },
  { value: 'diecut', label: '✂️ Die Cut', color: '#ef4444' },
  { value: 'folding', label: '📐 Folding/Gluing', color: '#f59e0b' },
  { value: 'lamination', label: '✨ Lamination', color: '#10b981' },
  { value: 'binding', label: '📚 Binding', color: '#6366f1' },
  { value: 'finishing', label: '🎨 Finishing', color: '#ec4899' },
  { value: 'qc', label: '🔍 QC', color: '#14b8a6' },
  { value: 'packing', label: '📦 Packing', color: '#78716c' },
  { value: 'general', label: '⚙️ General', color: '#64748b' },
];
const STAGES = ['planning','queued','in_progress','completed','on_hold','cancelled'];
const STAGE_COLORS = { planning:'#94a3b8', queued:'#3b82f6', in_progress:'#f59e0b', completed:'#22c55e', on_hold:'#ef4444', cancelled:'#6b7280' };
const STAGE_LABELS = { planning:'📋 วางแผน', queued:'📥 รอผลิต', in_progress:'⚙️ กำลังผลิต', completed:'✅ เสร็จ', on_hold:'⏸️ พัก', cancelled:'❌ ยกเลิก' };

function getTypeInfo(t) { return WC_TYPES.find(w => w.value === t) || WC_TYPES[WC_TYPES.length-1]; }
function utilColor(pct) { return pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : pct >= 40 ? '#3b82f6' : '#22c55e'; }
function fmtDate(d) { if (!d) return '-'; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }

export default function SmartFactory() {
  const [tab, setTab] = useState('dashboard');
  const [wcs, setWcs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [weekCap, setWeekCap] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddWC, setShowAddWC] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [wcForm, setWcForm] = useState({ name:'', type:'offset_press', capacity_per_hour:100, shift_hours:8 });
  const [jobForm, setJobForm] = useState({ job_name:'', customer_name:'', work_center_id:'', scheduled_start:'', estimated_duration_min:60, quantity:0, priority:5 });
  const [capDate, setCapDate] = useState(new Date().toISOString().slice(0,10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, s, c, wk, st] = await Promise.all([
        fetch(`${API}/api/factory/work-centers`).then(r=>r.json()),
        fetch(`${API}/api/factory/schedule`).then(r=>r.json()),
        fetch(`${API}/api/factory/capacity?date=${capDate}`).then(r=>r.json()),
        fetch(`${API}/api/factory/capacity-week`).then(r=>r.json()),
        fetch(`${API}/api/factory/stats`).then(r=>r.json()),
      ]);
      setWcs(Array.isArray(w)?w:[]); setSchedule(Array.isArray(s)?s:[]); setCapacity(Array.isArray(c)?c:[]); setWeekCap(Array.isArray(wk)?wk:[]); setStats(st||{});
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [capDate]);

  useEffect(() => { load(); }, [load]);

  const addWC = async () => {
    if (!wcForm.name) return alert('กรุณาใส่ชื่อเครื่องจักร');
    await fetch(`${API}/api/factory/work-centers`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(wcForm) });
    setShowAddWC(false); setWcForm({ name:'', type:'offset_press', capacity_per_hour:100, shift_hours:8 }); load();
  };

  const deleteWC = async (id) => { if (!confirm('ลบเครื่องจักรนี้?')) return; await fetch(`${API}/api/factory/work-centers/${id}`, { method:'DELETE' }); load(); };

  const addJob = async () => {
    if (!jobForm.job_name || !jobForm.work_center_id) return alert('กรุณาใส่ชื่องานและเลือกเครื่องจักร');
    const res = await fetch(`${API}/api/factory/schedule`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(jobForm) });
    const data = await res.json();
    if (res.status === 409) { alert(`⚠️ ${data.message}`); return; }
    setShowAddJob(false); setJobForm({ job_name:'', customer_name:'', work_center_id:'', scheduled_start:'', estimated_duration_min:60, quantity:0, priority:5 }); load();
  };

  const updateJobStatus = async (id, status) => {
    const body = { status };
    if (status === 'in_progress') body.actual_start = new Date().toISOString();
    if (status === 'completed') body.actual_end = new Date().toISOString();
    await fetch(`${API}/api/factory/schedule/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    load();
  };

  const deleteJob = async (id) => { if (!confirm('ลบงานนี้?')) return; await fetch(`${API}/api/factory/schedule/${id}`, { method:'DELETE' }); load(); };

  // Styles
  const card = { background:'#fff', borderRadius:16, padding:'1.5rem', boxShadow:'0 1px 3px rgba(0,0,0,.08)', border:'1px solid #e2e8f0' };
  const badge = (bg) => ({ display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:'.75rem', fontWeight:600, background:bg, color:'#fff' });
  const btn = (bg) => ({ padding:'8px 16px', borderRadius:10, border:'none', background:bg||'#3b82f6', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:'.85rem' });
  const input = { padding:'8px 12px', borderRadius:8, border:'1px solid #d1d5db', fontSize:'.9rem', width:'100%' };
  const tabStyle = (active) => ({ padding:'10px 20px', borderRadius:'10px 10px 0 0', border:'none', fontWeight:600, cursor:'pointer', fontSize:'.9rem', background: active ? '#3b82f6' : '#e2e8f0', color: active ? '#fff' : '#475569' });

  // Group week data by machine
  const weekByMachine = {};
  weekCap.forEach(r => { if (!weekByMachine[r.name]) weekByMachine[r.name] = { type: r.type, days: [] }; weekByMachine[r.name].days.push(r); });

  return (
    <div style={{ padding:'1rem', maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.6rem', color:'#0f172a' }}>🏭 Smart Factory</h1>
          <p style={{ margin:0, color:'#64748b', fontSize:'.85rem' }}>Capacity Planning • Kanban • OEE — powered by Nexus</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={btn('#22c55e')} onClick={() => setShowAddWC(true)}>+ เครื่องจักร</button>
          <button style={btn('#3b82f6')} onClick={() => setShowAddJob(true)}>+ จัดคิวงาน</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:0, flexWrap:'wrap' }}>
        {[['dashboard','📊 Dashboard'],['kanban','📋 Kanban Board'],['capacity','🔥 Capacity'],['machines','⚙️ เครื่องจักร']].map(([k,l]) =>
          <button key={k} style={tabStyle(tab===k)} onClick={() => setTab(k)}>{l}</button>
        )}
      </div>

      <div style={{ ...card, borderTopLeftRadius: 0, minHeight: 400 }}>
        {loading ? <p style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>⏳ กำลังโหลด...</p> :
         tab === 'dashboard' ? renderDashboard() :
         tab === 'kanban' ? renderKanban() :
         tab === 'capacity' ? renderCapacity() :
         renderMachines()
        }
      </div>

      {/* Add Work Center Modal */}
      {showAddWC && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }} onClick={() => setShowAddWC(false)}>
          <div style={{ ...card, width:420, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 1rem' }}>⚙️ เพิ่มเครื่องจักร / สถานีงาน</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input style={input} placeholder="ชื่อเครื่อง เช่น Offset #1" value={wcForm.name} onChange={e => setWcForm({...wcForm, name:e.target.value})} />
              <select style={input} value={wcForm.type} onChange={e => setWcForm({...wcForm, type:e.target.value})}>
                {WC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.75rem', color:'#64748b' }}>กำลังผลิต/ชม.</label>
                  <input style={input} type="number" value={wcForm.capacity_per_hour} onChange={e => setWcForm({...wcForm, capacity_per_hour:+e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.75rem', color:'#64748b' }}>ชม./กะ</label>
                  <input style={input} type="number" value={wcForm.shift_hours} onChange={e => setWcForm({...wcForm, shift_hours:+e.target.value})} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button style={btn('#94a3b8')} onClick={() => setShowAddWC(false)}>ยกเลิก</button>
                <button style={btn('#22c55e')} onClick={addWC}>✅ บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Job Modal */}
      {showAddJob && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }} onClick={() => setShowAddJob(false)}>
          <div style={{ ...card, width:480, maxWidth:'90vw' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:'0 0 1rem' }}>📋 จัดคิวงานผลิต</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input style={input} placeholder="ชื่องาน เช่น กล่อง BNI 500 ใบ" value={jobForm.job_name} onChange={e => setJobForm({...jobForm, job_name:e.target.value})} />
              <input style={input} placeholder="ชื่อลูกค้า" value={jobForm.customer_name} onChange={e => setJobForm({...jobForm, customer_name:e.target.value})} />
              <select style={input} value={jobForm.work_center_id} onChange={e => setJobForm({...jobForm, work_center_id:+e.target.value})}>
                <option value="">-- เลือกเครื่องจักร --</option>
                {wcs.map(w => <option key={w.id} value={w.id}>{getTypeInfo(w.type).label} {w.name}</option>)}
              </select>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.75rem', color:'#64748b' }}>วันผลิต</label>
                  <input style={input} type="date" value={jobForm.scheduled_start} onChange={e => setJobForm({...jobForm, scheduled_start:e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.75rem', color:'#64748b' }}>เวลาที่ใช้ (นาที)</label>
                  <input style={input} type="number" value={jobForm.estimated_duration_min} onChange={e => setJobForm({...jobForm, estimated_duration_min:+e.target.value})} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.75rem', color:'#64748b' }}>จำนวน</label>
                  <input style={input} type="number" value={jobForm.quantity} onChange={e => setJobForm({...jobForm, quantity:+e.target.value})} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:'.75rem', color:'#64748b' }}>Priority (1=ด่วนสุด)</label>
                  <input style={input} type="number" min={1} max={10} value={jobForm.priority} onChange={e => setJobForm({...jobForm, priority:+e.target.value})} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button style={btn('#94a3b8')} onClick={() => setShowAddJob(false)}>ยกเลิก</button>
                <button style={btn('#3b82f6')} onClick={addJob}>📥 จัดคิว</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════ DASHBOARD TAB ═══════════════════
  function renderDashboard() {
    return (
      <div>
        {/* Stats Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginBottom:'1.5rem' }}>
          {[
            { label:'เครื่องจักร', value: stats.work_centers || 0, icon:'⚙️', color:'#3b82f6' },
            { label:'งานวันนี้', value: stats.today_jobs || 0, icon:'📋', color:'#f59e0b' },
            { label:'งานด่วน', value: stats.urgent_jobs || 0, icon:'🔴', color:'#ef4444' },
            { label:'เสร็จวันนี้', value: stats.completed_today || 0, icon:'✅', color:'#22c55e' },
          ].map((s,i) => (
            <div key={i} style={{ background:`linear-gradient(135deg, ${s.color}15, ${s.color}08)`, borderRadius:12, padding:'1.2rem', border:`1px solid ${s.color}30` }}>
              <div style={{ fontSize:'2rem' }}>{s.icon}</div>
              <div style={{ fontSize:'1.8rem', fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'.8rem', color:'#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Capacity Heatmap */}
        <h3 style={{ margin:'0 0 .5rem', fontSize:'1rem' }}>🔥 Capacity Heatmap (7 วัน)</h3>
        {Object.keys(weekByMachine).length === 0 ? (
          <p style={{ color:'#94a3b8', textAlign:'center', padding:'2rem' }}>ยังไม่มีเครื่องจักร — กดปุ่ม "+ เครื่องจักร" เพื่อเริ่มต้น</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding:8, textAlign:'left', borderBottom:'2px solid #e2e8f0' }}>เครื่องจักร</th>
                  {weekByMachine[Object.keys(weekByMachine)[0]]?.days.map((d,i) => (
                    <th key={i} style={{ padding:8, textAlign:'center', borderBottom:'2px solid #e2e8f0', minWidth:60 }}>
                      {fmtDate(d.calendar_date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(weekByMachine).map(([name, info]) => (
                  <tr key={name}>
                    <td style={{ padding:8, fontWeight:600, borderBottom:'1px solid #f1f5f9' }}>
                      {getTypeInfo(info.type).label.split(' ')[0]} {name}
                    </td>
                    {info.days.map((d,i) => {
                      const pct = d.capacity_min > 0 ? Math.round((d.booked_min / d.capacity_min) * 100) : 0;
                      return (
                        <td key={i} style={{ padding:4, textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                          <div style={{ background: utilColor(pct), color:'#fff', borderRadius:8, padding:'6px 4px', fontWeight:700, fontSize:'.8rem' }}>
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
      </div>
    );
  }

  // ═══════════════════ KANBAN TAB ═══════════════════
  function renderKanban() {
    const columns = ['queued','in_progress','completed'];
    return (
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns.length}, 1fr)`, gap:16, minHeight:300 }}>
        {columns.map(stage => {
          const jobs = schedule.filter(j => j.status === stage);
          return (
            <div key={stage} style={{ background:'#f8fafc', borderRadius:12, padding:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:'.9rem' }}>{STAGE_LABELS[stage]}</span>
                <span style={badge(STAGE_COLORS[stage])}>{jobs.length}</span>
              </div>
              {jobs.length === 0 && <p style={{ color:'#cbd5e1', textAlign:'center', fontSize:'.8rem', padding:'2rem 0' }}>ว่าง</p>}
              {jobs.map(j => {
                const wc = wcs.find(w => w.id === j.work_center_id);
                return (
                  <div key={j.id} style={{ background:'#fff', borderRadius:10, padding:12, marginBottom:8, border: j.is_urgent ? '2px solid #ef4444' : '1px solid #e2e8f0', boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontWeight:700, fontSize:'.85rem' }}>{j.is_urgent && '🔴 '}{j.job_name || 'ไม่มีชื่อ'}</div>
                      <button style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'.9rem' }} onClick={() => deleteJob(j.id)}>✕</button>
                    </div>
                    {j.customer_name && <div style={{ fontSize:'.75rem', color:'#64748b' }}>👤 {j.customer_name}</div>}
                    <div style={{ fontSize:'.75rem', color:'#64748b', marginTop:4 }}>
                      {wc && <span>{getTypeInfo(wc.type).label.split(' ')[0]} {wc.name} • </span>}
                      {j.estimated_duration_min}นาที {j.quantity > 0 && `• ${j.quantity} ชิ้น`}
                    </div>
                    <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }}>
                      {stage === 'queued' && <button style={{...btn('#f59e0b'), padding:'4px 10px', fontSize:'.75rem'}} onClick={() => updateJobStatus(j.id,'in_progress')}>▶️ เริ่ม</button>}
                      {stage === 'in_progress' && <button style={{...btn('#22c55e'), padding:'4px 10px', fontSize:'.75rem'}} onClick={() => updateJobStatus(j.id,'completed')}>✅ เสร็จ</button>}
                      {stage === 'in_progress' && <button style={{...btn('#ef4444'), padding:'4px 10px', fontSize:'.75rem'}} onClick={() => updateJobStatus(j.id,'on_hold')}>⏸️ พัก</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ═══════════════════ CAPACITY TAB ═══════════════════
  function renderCapacity() {
    return (
      <div>
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:'1rem' }}>
          <label style={{ fontWeight:600 }}>📅 วันที่:</label>
          <input type="date" style={{...input, width:'auto'}} value={capDate} onChange={e => setCapDate(e.target.value)} />
        </div>
        {capacity.length === 0 ? (
          <p style={{ color:'#94a3b8', textAlign:'center', padding:'2rem' }}>ยังไม่มีเครื่องจักร</p>
        ) : (
          <div style={{ display:'grid', gap:16 }}>
            {capacity.map(c => {
              const pct = c.utilization_pct || 0;
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'1rem', borderRadius:12, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:'2rem', width:50, textAlign:'center' }}>{getTypeInfo(c.type).label.split(' ')[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700 }}>{c.name}</div>
                    <div style={{ fontSize:'.8rem', color:'#64748b' }}>{Math.round(c.booked_min)} / {c.capacity_min} นาที ({c.shift_hours} ชม./กะ)</div>
                    <div style={{ height:16, background:'#e2e8f0', borderRadius:8, marginTop:6, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background: utilColor(pct), borderRadius:8, transition:'width .3s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:'1.6rem', fontWeight:800, color: utilColor(pct), minWidth:60, textAlign:'center' }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════ MACHINES TAB ═══════════════════
  function renderMachines() {
    return (
      <div>
        <h3 style={{ margin:'0 0 1rem' }}>⚙️ เครื่องจักรทั้งหมด ({wcs.length})</h3>
        {wcs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
            <p style={{ fontSize:'3rem' }}>🏭</p>
            <p>ยังไม่มีเครื่องจักร — ให้หนึ่ง/ซัน เพิ่มข้อมูลเครื่องจักรทั้งหมดของโรงพิมพ์</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
            {wcs.map(w => {
              const info = getTypeInfo(w.type);
              return (
                <div key={w.id} style={{ borderRadius:12, padding:'1.2rem', border:`2px solid ${info.color}30`, background:`linear-gradient(135deg, ${info.color}08, #fff)` }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={{ fontSize:'1.5rem' }}>{info.label.split(' ')[0]}</div>
                    <button style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }} onClick={() => deleteWC(w.id)}>🗑️</button>
                  </div>
                  <div style={{ fontWeight:700, fontSize:'1.1rem', marginTop:4 }}>{w.name}</div>
                  <div style={{ fontSize:'.8rem', color:'#64748b', marginTop:4 }}>
                    {info.label} • {w.capacity_per_hour} ชิ้น/ชม. • {w.shift_hours} ชม./กะ
                  </div>
                  <span style={badge(w.status === 'active' ? '#22c55e' : '#ef4444')}>{w.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
