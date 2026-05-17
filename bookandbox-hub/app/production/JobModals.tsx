"use client";
import React from 'react';

const inputStyle: React.CSSProperties = { width:'100%', padding:'0.5rem', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.9rem', boxSizing:'border-box' as const };
const selectStyle = inputStyle;
const labelStyle: React.CSSProperties = { fontSize:'0.78rem', fontWeight:700, color:'#64748b', display:'block', marginBottom:'0.3rem' };

const MACHINES = ['SM74F','SM102F','KM C12000','KM C4070'];
const COLORS = ['4/4','4/0','2/0','1/0','4/1'];
const COATINGS = ['ไม่ทำ','เคลือบมัน','เคลือบด้าน','UV เฉพาะจุด'];
const DIECUTS = ['ไม่ทำ','ปั๊มไดคัท','ตัดตาม'];
const FOLDS = ['ไม่ทำ','พับ 2','พับ 3','พับถุง','พับปิดกล่อง','ยกเล่ม'];
const GLUES = ['ไม่ทำ','ปะกาว','ทากาวสัน','ไสสัน'];
const STAMPS = ['ไม่ทำ','ฟอยล์ทอง','ฟอยล์เงิน'];
const STATUSES = ['queued','printing','completed','shipped','issue'];

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}

// ========== JOB DETAIL / EDIT MODAL ==========
export function JobDetailModal({ job, onClose, onSave, onDelete, saving }: { job: any; onClose: () => void; onSave: (data: any) => void; onDelete: (jogNo: string) => void; saving: boolean }) {
  const [form, setForm] = React.useState({...job});
  const set = (k: string, v: any) => setForm((f: any) => ({...f, [k]: v}));
  
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:'16px', maxWidth:'720px', width:'100%', maxHeight:'85vh', overflow:'auto', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'1.5rem 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', borderTopLeftRadius:'16px', borderTopRightRadius:'16px' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'#1e293b' }}>📋 #{form.jog_no}</h3>
            <p style={{ margin:'0.2rem 0 0', color:'#64748b', fontSize:'0.85rem' }}>แก้ไขรายละเอียดงาน</p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button onClick={() => onDelete(form.jog_no)} style={{ background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', padding:'0.4rem 1rem', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:'0.85rem' }}>🗑 ลบ</button>
            <button onClick={onClose} style={{ background:'#f1f5f9', color:'#64748b', border:'none', padding:'0.4rem 1rem', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:'0.85rem' }}>✕</button>
          </div>
        </div>
        {/* Form */}
        <div style={{ padding:'1.5rem 2rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div style={{ gridColumn:'1/-1' }}><label style={labelStyle}>ชื่องาน</label><input type="text" value={form.job_name||''} onChange={e => set('job_name', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>ลูกค้า</label><input type="text" value={form.customer||''} onChange={e => set('customer', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>เครื่อง</label><Select value={form.machine||''} onChange={v => set('machine', v)} options={MACHINES} /></div>
          <div><label style={labelStyle}>กระดาษ</label><input type="text" value={form.paper||''} onChange={e => set('paper', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>สี</label><Select value={form.colors||''} onChange={v => set('colors', v)} options={COLORS} /></div>
          <div><label style={labelStyle}>แผ่นพิมพ์ (Plan)</label><input type="number" value={form.sheets_plan||0} onChange={e => set('sheets_plan', Number(e.target.value))} style={inputStyle} /></div>
          <div><label style={labelStyle}>แผ่นพิมพ์ (จริง)</label><input type="number" value={form.sheets_actual||0} onChange={e => set('sheets_actual', Number(e.target.value))} style={inputStyle} /></div>
          <div><label style={labelStyle}>กำหนดส่ง</label><input type="date" value={form.due_date?.split('T')[0]||''} onChange={e => set('due_date', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>สถานะ</label><Select value={form.status||'queued'} onChange={v => set('status', v)} options={STATUSES} /></div>
          <div><label style={labelStyle}>เคลือบ</label><Select value={form.coating||'ไม่ทำ'} onChange={v => set('coating', v)} options={COATINGS} /></div>
          <div><label style={labelStyle}>ไดคัท</label><Select value={form.die_cut||'ไม่ทำ'} onChange={v => set('die_cut', v)} options={DIECUTS} /></div>
          <div><label style={labelStyle}>พับ</label><Select value={form.fold||'ไม่ทำ'} onChange={v => set('fold', v)} options={FOLDS} /></div>
          <div><label style={labelStyle}>ปะกาว</label><Select value={form.glue||'ไม่ทำ'} onChange={v => set('glue', v)} options={GLUES} /></div>
          <div><label style={labelStyle}>ฟอยล์/ปั๊ม</label><Select value={form.hot_stamp||'ไม่ทำ'} onChange={v => set('hot_stamp', v)} options={STAMPS} /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={labelStyle}>หมายเหตุ</label><input type="text" value={form.notes||''} onChange={e => set('notes', e.target.value)} style={inputStyle} /></div>
        </div>
        {/* Actions */}
        <div style={{ padding:'1rem 2rem 1.5rem', display:'flex', justifyContent:'flex-end', gap:'0.75rem', borderTop:'1px solid #e2e8f0' }}>
          <button onClick={onClose} style={{ padding:'0.6rem 1.5rem', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', fontWeight:600, cursor:'pointer' }}>ยกเลิก</button>
          <button disabled={saving} onClick={() => onSave(form)} style={{ padding:'0.6rem 1.5rem', borderRadius:'8px', border:'none', background: saving?'#94a3b8':'#3b82f6', color:'white', fontWeight:700, cursor: saving?'not-allowed':'pointer', fontSize:'0.9rem' }}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== ADD JOB MODAL ==========
export function AddJobModal({ initialJogNo, onClose, onCreate, saving }: { initialJogNo: string; onClose: () => void; onCreate: (data: any) => void; saving: boolean }) {
  const [form, setForm] = React.useState({ jog_no: initialJogNo, job_name:'', customer:'', machine:'SM74F', paper:'', sheets_plan:0, due_date: new Date().toISOString().split('T')[0], colors:'4/4', coating:'ไม่ทำ', die_cut:'ไม่ทำ', fold:'ไม่ทำ', glue:'ไม่ทำ', hot_stamp:'ไม่ทำ', notes:'' });
  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:'16px', maxWidth:'720px', width:'100%', maxHeight:'85vh', overflow:'auto', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'1.5rem 2rem', borderBottom:'1px solid #e2e8f0', background:'#f0fdf4', borderTopLeftRadius:'16px', borderTopRightRadius:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'#15803d' }}>＋ เพิ่มงานใหม่</h3>
            <p style={{ margin:'0.2rem 0 0', color:'#4ade80', fontSize:'0.85rem' }}>กรอกข้อมูล JO เข้าสู่ระบบผลิต</p>
          </div>
          <button onClick={onClose} style={{ background:'#dcfce7', color:'#15803d', border:'none', padding:'0.4rem 1rem', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>✕</button>
        </div>
        {/* Form */}
        <div style={{ padding:'1.5rem 2rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div><label style={labelStyle}>JOG No.</label><input type="text" value={form.jog_no} onChange={e => set('jog_no', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>ชื่องาน *</label><input type="text" value={form.job_name} onChange={e => set('job_name', e.target.value)} style={inputStyle} placeholder="กล่อง Salonpas A4" /></div>
          <div><label style={labelStyle}>ลูกค้า</label><input type="text" value={form.customer} onChange={e => set('customer', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>เครื่อง</label><Select value={form.machine} onChange={v => set('machine', v)} options={MACHINES} /></div>
          <div><label style={labelStyle}>กระดาษ</label><input type="text" value={form.paper} onChange={e => set('paper', e.target.value)} style={inputStyle} placeholder="อาร์ตมัน 128gsm" /></div>
          <div><label style={labelStyle}>แผ่นพิมพ์ (Plan)</label><input type="number" value={form.sheets_plan} onChange={e => set('sheets_plan', Number(e.target.value))} style={inputStyle} /></div>
          <div><label style={labelStyle}>กำหนดส่ง</label><input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>สี</label><Select value={form.colors} onChange={v => set('colors', v)} options={COLORS} /></div>
        </div>
        {/* Actions */}
        <div style={{ padding:'1rem 2rem 1.5rem', display:'flex', justifyContent:'flex-end', gap:'0.75rem', borderTop:'1px solid #e2e8f0' }}>
          <button onClick={onClose} style={{ padding:'0.6rem 1.5rem', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', fontWeight:600, cursor:'pointer' }}>ยกเลิก</button>
          <button disabled={saving} onClick={() => { if (!form.jog_no||!form.job_name) return alert('กรอก JOG No. และชื่องาน'); onCreate(form); }} style={{ padding:'0.6rem 1.5rem', borderRadius:'8px', border:'none', background: saving?'#94a3b8':'#22c55e', color:'white', fontWeight:700, cursor: saving?'not-allowed':'pointer', fontSize:'0.9rem' }}>
            {saving ? '⏳ กำลังบันทึก...' : '✅ เพิ่มงานเข้าระบบ'}
          </button>
        </div>
      </div>
    </div>
  );
}
