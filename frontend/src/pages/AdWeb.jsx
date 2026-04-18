import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export default function AdWeb() {
  const [leads, setLeads] = useState([]);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  
  // Tagging & Editing State
  const [editingLead, setEditingLead] = useState(false);
  const [aliasName, setAliasName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [statusTicked, setStatusTicked] = useState('i');
  
  // Image Lightbox
  const [previewImage, setPreviewImage] = useState(null);
  
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  // Polling backend
  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchChats = () => {
    axios.get(`${API_URL}/chats`).then(res => {
        setLeads(res.data);
        if (activeLeadId === null && res.data.length > 0) {
            setActiveLeadId(res.data[0].id);
        }
    }).catch(err => console.error(err));
  };

  const activeLead = leads.find(l => l.id === activeLeadId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeLead?.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeLeadId) return;
    try {
        await axios.post(`${API_URL}/chats/${activeLeadId}/reply`, { text: inputValue });
        setInputValue('');
        fetchChats(); 
    } catch (err) {
        alert("Failed to send message: " + err.message);
    }
  };

  // Switch status specifically
  const handleToggleStatus = async (newStatus) => {
      if (!activeLead) return;
      try {
        await axios.put(`${API_URL}/leads/${activeLead.id}`, {
            erp_alias_name: activeLead.erp_alias_name,
            tags: activeLead.tags,
            sales_status: newStatus
        });
        fetchChats();
      } catch (err) {}
  }

  const handleSaveLeadInfo = async () => {
    if (!activeLead) return;
    const tagsArray = tagInput.split(',').map(t => t.trim()).filter(t => t);
    try {
        await axios.put(`${API_URL}/leads/${activeLead.id}`, {
            erp_alias_name: aliasName,
            tags: tagsArray,
            sales_status: statusTicked
        });
        setEditingLead(false);
        fetchChats();
    } catch (err) {
        alert("Failed to update profile");
    }
  };

  const handleAIDraft = (type) => {
      if (type === 'price') {
          setInputValue("เพื่อให้คุณลูกค้าได้ราคาที่แม่นยำที่สุด รบกวนแจ้ง:\n1. ขนาด (กว้างxยาว)\n2. จำนวนที่ต้องการ\nเพื่อให้ระบบคำนวณราคาโปรโมชั่นให้นะคะ😊");
      } else if (type === 'file_prep') {
          setInputValue("⚠️ ข้อควรระวังในการเตรียมไฟล์งาน:\nรบกวนคุณลูกค้าเช็คระยะตัดตกมาให้ครบถ้วน และก่อนส่งไฟล์รบกวนตรวจสอบ Version V1/V2 ให้แม่นยำเพื่อป้องกันการพิมพ์ผิดพลาดจากระบบเซฟเวอร์ชั่นทับซ้อนนะคะ ขอบคุณมากค่ะ!");
      }
  };

  const renderTierBadge = (tier) => {
      const tierDetails = {
          'New': { bg: '#94a3b8', color: '#fff', text: 'New' },
          'C1': { bg: '#cbd5e1', color: '#334155', text: 'C1 (<5k)' },
          'C2': { bg: '#bae6fd', color: '#0369a1', text: 'C2 (5k-15k)' },
          'C3': { bg: '#86efac', color: '#166534', text: 'C3 (15k-50k)' },
          'C4': { bg: '#fcd34d', color: '#92400e', text: 'C4 (50k-100k)' },
          'C5': { bg: '#fbbf24', color: '#ffffff', text: '👑 C5 (>100k+)', shadow: '0 0 10px rgba(251, 191, 36, 0.5)' }
      };
      const conf = tierDetails[tier] || tierDetails['New'];
      return (
          <span style={{
              background: conf.bg, 
              color: conf.color, 
              padding: '0.2rem 0.5rem', 
              borderRadius: '20px', 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              boxShadow: conf.shadow || 'none'
          }}>
              {conf.text}
          </span>
      );
  };

  return (
    <div className="view-section active" style={{ height: 'calc(100vh - var(--topbar-height) - 4rem)'}}>
      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setPreviewImage(null)}
        >
            <img src={previewImage} alt="preview" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', objectFit: 'contain' }} />
            <button style={{ position: 'absolute', top: '20px', right: '30px', background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      <div className="flex justify-between align-center mb-4">
        <div>
          <h3 className="text-primary">LINE Official CRM (Sales Optimized)</h3>
          <p>ระบบแยกเกรด C1-C5 อัตโนมัติ พร้อมสวิตช์ติดตามงาน (i/q)</p>
        </div>
      </div>
      
      <div className="chat-container shadow" style={{ height: '85%' }}>
        {/* Contact List */}
        <div className="chat-list" style={{ width: '30%', minWidth: '280px' }}>
          {leads.length === 0 && <div className="p-4" style={{color:'#888'}}>กำลังโหลดฐานข้อมูลลูกค้า Leads...</div>}
          
          {leads.map(lead => {
            const lastMsg = lead.messages.length > 0 ? lead.messages[lead.messages.length - 1] : { type: 'text', text_content: 'ไม่มีบทสนทนา' };
            let previewText = lastMsg.type === 'image' ? '[รูปภาพจากมือถือ]' : lastMsg.type === 'file' ? '[ไฟล์เอกสาร]' : lastMsg.text_content;
            
            return (
              <div 
                key={lead.id} 
                className={`chat-item ${activeLeadId === lead.id ? 'active' : ''}`} 
                onClick={() => {
                    setActiveLeadId(lead.id);
                    setEditingLead(false);
                    setStatusTicked(lead.sales_status);
                }}
              >
                <div style={{ position: 'relative' }}>
                    {lead.avatar_url ? (
                        <img src={lead.avatar_url} alt="avatar" className="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div className="avatar" style={{ background: '#e2e8f0', color: '#333', width: '45px', height: '45px' }}>
                            {(lead.erp_alias_name || lead.original_name || '?').charAt(0)}
                        </div>
                    )}
                    {/* Status Dot */}
                    <div style={{
                        position: 'absolute', bottom: -2, right: -2, width: '16px', height: '16px', borderRadius: '50%',
                        background: lead.sales_status === 'q' ? '#10b981' : '#f59e0b',
                        border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', color: 'white', fontWeight: 'bold'
                    }} title={lead.sales_status === 'q' ? 'Opportunity' : 'Info'}>
                        {lead.sales_status.toUpperCase()}
                    </div>
                </div>

                <div style={{ overflow: 'hidden', width: '100%', marginLeft: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.95rem' }}>{lead.erp_alias_name || lead.original_name}</strong>
                    {renderTierBadge(lead.analytics.tier)}
                  </div>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: lastMsg.type !== 'text' ? '#10b981' : 'inherit' }}>
                    {previewText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Area */}
        {activeLead && (
        <div className="chat-main" style={{ display: 'flex', flexDirection: 'column', width: '70%' }}>
          {/* Profile Header Block */}
          <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
            <div className="flex justify-between align-center">
                
                <div className="flex" style={{gap: '1rem', alignItems: 'center'}}>
                    <div>
                        {editingLead ? (
                            <input type="text" className="form-control" value={aliasName} onChange={e => setAliasName(e.target.value)} style={{fontSize: '1.2rem', fontWeight: 'bold', width: '250px'}}/>
                        ) : (
                            <h4 style={{ margin: 0, display: 'inline-block', fontSize: '1.3rem' }}>{activeLead.erp_alias_name || activeLead.original_name}</h4>
                        )}
                        <small style={{display: 'block', color: 'var(--text-muted)'}}>
                            LINE ID: {activeLead.original_name}
                        </small>
                    </div>

                    {/* Quick Analytics Summary */}
                    <div style={{background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', display: 'flex', gap: '1rem'}}>
                        <div style={{borderRight: '1px solid #e2e8f0', paddingRight: '1rem'}}>
                            <span style={{fontSize: '0.7rem', color: '#64748b', display: 'block'}}>ยอดซื้อสะสม (CLV)</span>
                            <span style={{fontWeight: 'bold', color: '#0f172a'}}>
                                ฿{activeLead.analytics.totalSpend.toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <span style={{fontSize: '0.7rem', color: '#64748b', display: 'block'}}>สั่งซื้อซ้ำ</span>
                            <span style={{fontWeight: 'bold', color: '#10b981'}}>
                                {activeLead.analytics.repeatCount} ครั้ง
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex" style={{gap: '0.5rem', alignItems: 'center'}}>
                    {/* Status Toggle buttons */}
                    {!editingLead && (
                        <div style={{background: '#f1f5f9', padding: '3px', borderRadius: '8px', display: 'flex'}}>
                            <button 
                                className={`btn btn-sm ${activeLead.sales_status === 'i' ? 'btn-primary' : ''}`} 
                                style={{background: activeLead.sales_status !== 'i' ? 'transparent' : '', color: activeLead.sales_status !== 'i' ? '#64748b' : ''}}
                                onClick={() => handleToggleStatus('i')}
                            >
                                <i className="fa-solid fa-info-circle mr-1"></i> ถาม (i)
                            </button>
                            <button 
                                className={`btn btn-sm ${activeLead.sales_status === 'q' ? 'btn-success' : ''}`} 
                                style={{background: activeLead.sales_status !== 'q' ? 'transparent' : '', color: activeLead.sales_status !== 'q' ? '#64748b' : ''}}
                                onClick={() => handleToggleStatus('q')}
                            >
                                <i className="fa-solid fa-file-invoice-dollar mr-1"></i> เสนอ (q)
                            </button>
                        </div>
                    )}

                    {editingLead ? (
                        <>
                            <button className="btn btn-primary btn-sm" onClick={handleSaveLeadInfo}>บันทึก</button>
                            <button className="btn btn-outline btn-sm ml-1" onClick={() => setEditingLead(false)}>ยกเลิก</button>
                        </>
                    ) : (
                        <button className="btn btn-outline ml-2" style={{padding: '0.4rem 0.6rem', fontSize:'0.8rem'}} onClick={() => {
                            setAliasName(activeLead.erp_alias_name || activeLead.original_name);
                            setTagInput((activeLead.tags || []).join(', '));
                            setStatusTicked(activeLead.sales_status);
                            setEditingLead(true);
                        }}><i className="fa-solid fa-pen"></i></button>
                    )}
                </div>
            </div>

            {/* Tag Area */}
            <div className="mt-2 text-sm">
                {editingLead ? (
                   <input 
                      type="text" 
                      className="form-control mt-2" 
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      placeholder="ใส่แท็ก คั่นด้วยลูกน้ำ เช่น รอตรวจแบบ, โดนเท"
                   />
                ) : (
                   <div style={{display:'flex', gap: '0.4rem', flexWrap: 'wrap'}}>
                       {activeLead.tags?.map((tag, idx) => (
                           <span key={idx} style={{background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600}}>
                               #{tag}
                           </span>
                       ))}
                   </div>
                )}
            </div>
          </div>
          
          <div className="chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: '#f1f5f9' }}>
            {activeLead.messages.map((msg, idx) => {
              const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '';
              return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'client' ? 'flex-start' : 'flex-end', marginBottom: '1rem' }}>
                  {msg.sender === 'client' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{activeLead.original_name}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: msg.sender === 'client' ? 'row' : 'row-reverse', gap: '0.5rem' }}>
                      <div className={`message ${msg.sender === 'client' ? 'msg-client' : 'msg-admin'}`} style={{ margin: 0, maxWidth: '300px' }}>
                        {msg.type === 'text' && <div>{msg.text_content}</div>}
                        {msg.type === 'image' && msg.media_url && (
                          <div style={{ cursor: 'zoom-in' }} onClick={() => setPreviewImage(msg.media_url)}>
                              <img src={msg.media_url} alt="Media" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{timeStr}</div>
                  </div>
              </div>
            )})}
            <div ref={chatEndRef} />
          </div>
          
          <div className="chat-input" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            
            {/* AI Assistant Toolbar */}
            <div style={{display: 'flex', gap: '0.5rem'}}>
                <button className="btn btn-outline" style={{fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderColor: '#8b5cf6', color: '#8b5cf6'}} onClick={() => handleAIDraft('price')}>
                    <i className="fa-solid fa-wand-magic-sparkles"></i> AI ร่างคำถามราคา
                </button>
                <button className="btn btn-outline" style={{fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderColor: '#ec4899', color: '#ec4899'}} onClick={() => handleAIDraft('file_prep')}>
                    <i className="fa-solid fa-wand-magic-sparkles"></i> AI สคริปต์ตรวจไฟล์
                </button>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ตอบกลับลูกค้า (จะถูกส่ง Push เข้าแอป LINE...)" 
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn-primary" onClick={handleSendMessage} style={{ padding: '0.8rem 1.2rem' }}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
                <button className="btn btn-success" onClick={() => navigate('/sales')} style={{ padding: '0.8rem 1.2rem', whiteSpace: 'nowrap' }}>
                  <i className="fa-solid fa-file-invoice"></i> เสนอราคา
                </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
