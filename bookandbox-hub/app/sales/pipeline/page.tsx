"use client";
import { useState, useEffect } from 'react';

const API = 'https://erp-bookandboxcom-production.up.railway.app/api';

// Safely parse tags — API may return string, null, or array
function safeTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

const STAGES = [
  { id: 'new_lead', label: 'ลูกค้าทักใหม่', icon: '💬', color: '#7c3aed', maxHours: 1, warnText: 'ยังไม่ตอบ!' },
  { id: 'qualifying', label: 'ถามสเปค', icon: '📝', color: '#3b82f6', maxHours: 4, warnText: 'รอนาน!' },
  { id: 'wait_price', label: 'รอราคา', icon: '💰', color: '#f59e0b', maxHours: 24, warnText: 'เร่งคนคิดราคา!' },
  { id: 'quoted', label: 'เสนอราคาแล้ว', icon: '📋', color: '#06b6d4', maxHours: 48, warnText: 'ลูกค้ายังไม่ตอบ!' },
  { id: 'wait_file', label: 'รอไฟล์อาร์ต', icon: '📁', color: '#8b5cf6', maxHours: 72, warnText: 'ตามไฟล์ลูกค้า!' },
  { id: 'proofing', label: 'รอตรวจแบบ', icon: '👁️', color: '#ec4899', maxHours: 48, warnText: 'ตาม Proof!' },
  { id: 'wait_payment', label: 'รอชำระเงิน', icon: '💳', color: '#f97316', maxHours: 72, warnText: 'ตามเงิน!' },
  { id: 'production', label: 'เข้าผลิต', icon: '🏭', color: '#10b981', maxHours: null, warnText: '' },
  { id: 'won', label: 'ปิดขาย ✅', icon: '✅', color: '#16a34a', maxHours: null, warnText: '' },
  { id: 'lost', label: 'หลุด ❌', icon: '❌', color: '#dc2626', maxHours: null, warnText: '' },
];

const mapLeadToStage = (lead: any) => {
  const tags = safeTags(lead.tags);
  const status = lead.sales_status || 'i';
  if (status === 'c') return 'won';
  if (['nt', 'na', 'al'].includes(status)) return 'lost';
  if (tags.includes('เข้าผลิต') || tags.includes('รอจัดส่ง')) return 'production';
  if (tags.includes('รอโอน')) return 'wait_payment';
  if (tags.includes('รอตรวจแบบ')) return 'proofing';
  if (tags.includes('รอไฟล์')) return 'wait_file';
  if (tags.includes('รอราคา')) return 'wait_price';
  if (tags.includes('รอยืนยัน')) return 'quoted';
  if (tags.includes('Follow Up')) return 'qualifying';
  if (status === 'o') return 'quoted';
  const hasAdminReply = lead.messages?.some((m: any) => m.sender === 'admin');
  if (!hasAdminReply) return 'new_lead';
  return 'qualifying';
};

function getStuckHours(lead: any) {
  if (!lead.messages || lead.messages.length === 0) return 0;
  const lastMsg = lead.messages[lead.messages.length - 1];
  return (Date.now() - new Date(lastMsg.created_at).getTime()) / 3600000;
}

function formatHours(hrs: number) {
  if (hrs < 1) return `${Math.round(hrs * 60)} นาที`;
  if (hrs < 24) return `${Math.round(hrs)} ชม.`;
  return `${Math.round(hrs / 24)} วัน`;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showLost, setShowLost] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 15000); return () => clearInterval(iv); }, []);

  const fetchData = async () => {
    try { const r = await fetch(`${API}/chats`); setLeads(await r.json()); } catch (e) { console.error(e); }
  };

  const moveToStage = async (leadId: string, newStageId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const stageTagMap: Record<string, string> = { wait_price: 'รอราคา', quoted: 'รอยืนยัน', wait_file: 'รอไฟล์', proofing: 'รอตรวจแบบ', wait_payment: 'รอโอน', production: 'เข้าผลิต' };
    const stageTags = Object.values(stageTagMap);
    let newTags = safeTags(lead.tags).filter((t: string) => !stageTags.includes(t));
    if (stageTagMap[newStageId]) newTags.push(stageTagMap[newStageId]);
    let newStatus = lead.sales_status;
    if (newStageId === 'won') newStatus = 'c';
    else if (newStageId === 'lost') newStatus = 'na';
    else if (newStageId === 'quoted') newStatus = 'o';
    else if (['new_lead', 'qualifying'].includes(newStageId)) newStatus = 'i';
    try {
      await fetch(`${API}/leads/${leadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ erp_alias_name: lead.erp_alias_name || lead.original_name, tags: newTags, sales_status: newStatus }) });
      fetchData();
    } catch { alert('อัพเดตไม่สำเร็จ'); }
  };

  const stageLeads: Record<string, any[]> = {};
  const visibleStages = showLost ? STAGES : STAGES.filter(s => s.id !== 'lost');
  visibleStages.forEach(s => { stageLeads[s.id] = []; });
  leads.forEach(l => { const sid = mapLeadToStage(l); if (stageLeads[sid]) stageLeads[sid].push(l); });
  Object.keys(stageLeads).forEach(key => { stageLeads[key].sort((a, b) => getStuckHours(b) - getStuckHours(a)); });

  const totalActive = leads.filter(l => !['nt', 'na', 'al', 'c'].includes(l.sales_status)).length;
  const overdueCount = leads.filter(l => { const stage = STAGES.find(s => s.id === mapLeadToStage(l)); return stage?.maxHours && getStuckHours(l) > stage.maxHours; }).length;

  return (
    <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>📊 Sales Pipeline</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>ลากย้าย Card เพื่อเปลี่ยนสถานะ • {totalActive} ดีลใน Pipeline {overdueCount > 0 && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>• ⚠️ เกินเวลา {overdueCount} ราย!</span>}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}><input type="checkbox" checked={showLost} onChange={e => setShowLost(e.target.checked)} /> แสดง หลุด/ปิด</label>
          <button onClick={fetchData} style={{ padding: '0.3rem 0.8rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>🔄 รีเฟรช</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem', minHeight: '70vh' }}>
        {visibleStages.filter(s => s.id !== 'won' || showLost).map(stage => {
          const cards = stageLeads[stage.id] || [];
          const hasOverdue = cards.some(l => stage.maxHours && getStuckHours(l) > stage.maxHours);
          return (
            <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (draggingId) moveToStage(draggingId, stage.id); setDraggingId(null); }}
              style={{ minWidth: '220px', maxWidth: '260px', flex: '0 0 220px', background: hasOverdue ? '#fef2f2' : '#f8fafc', borderRadius: '10px', display: 'flex', flexDirection: 'column', border: `2px solid ${hasOverdue ? '#fecaca' : stage.color + '40'}` }}>
              <div style={{ padding: '0.5rem 0.6rem', background: stage.color, color: 'white', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{stage.icon} {stage.label}</span>
                <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold' }}>{cards.length}</span>
              </div>
              {stage.maxHours && (<div style={{ padding: '0.2rem 0.5rem', fontSize: '0.6rem', color: '#64748b', background: '#f1f5f9' }}>⏱ ไม่ควรค้างเกิน {stage.maxHours < 24 ? `${stage.maxHours} ชม.` : `${Math.round(stage.maxHours / 24)} วัน`}</div>)}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem' }}>
                {cards.length === 0 && (<div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.7rem' }}>ว่าง</div>)}
                {cards.map((lead: any) => {
                  const stuckHrs = getStuckHours(lead);
                  const isOverdue = stage.maxHours ? stuckHrs > stage.maxHours : false;
                  const salesPerson = (lead.erp_alias_name || '').split('-')[1] || '';
                  return (
                    <div key={lead.id} draggable onDragStart={() => setDraggingId(lead.id)} onClick={() => setSelectedCard(selectedCard === lead.id ? null : lead.id)}
                      style={{ background: isOverdue ? '#fff5f5' : 'white', borderRadius: '8px', padding: '0.5rem', marginBottom: '0.4rem', border: isOverdue ? '2px solid #fca5a5' : '1px solid #e2e8f0', cursor: 'grab', transition: 'box-shadow 0.2s', boxShadow: draggingId === lead.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
                      {isOverdue && (<div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>🚨 {stage.warnText} (ค้าง {formatHours(stuckHrs)})</div>)}
                      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.erp_alias_name || lead.original_name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        <span>{salesPerson ? `👤 ${salesPerson}` : '—'}</span><span>⏱ {formatHours(stuckHrs)}</span>
                      </div>
                      {safeTags(lead.tags).length > 0 && (<div style={{ display: 'flex', gap: '0.15rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>{safeTags(lead.tags).slice(0, 3).map((t: string) => (<span key={t} style={{ background: '#f1f5f9', color: '#475569', padding: '0.05rem 0.3rem', borderRadius: '6px', fontSize: '0.55rem' }}>{t}</span>))}</div>)}
                      {selectedCard === lead.id && (
                        <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                          <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                            {STAGES.filter(s => !['won', 'lost'].includes(s.id) && s.id !== stage.id).map(s => (
                              <button key={s.id} onClick={e => { e.stopPropagation(); moveToStage(lead.id, s.id); }} style={{ padding: '0.15rem 0.3rem', borderRadius: '4px', border: `1px solid ${s.color}`, background: 'white', color: s.color, fontSize: '0.55rem', cursor: 'pointer' }}>{s.icon} {s.label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
