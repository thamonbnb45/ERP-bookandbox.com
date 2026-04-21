import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

// Platform config
const PLATFORM_CONFIG = {
  line:     { icon: 'fa-brands fa-line',          color: '#06C755', label: 'LINE',     bg: '#e6f9ee' },
  facebook: { icon: 'fa-brands fa-facebook-messenger', color: '#0084FF', label: 'Facebook', bg: '#e3f0ff' },
  tiktok:   { icon: 'fa-brands fa-tiktok',        color: '#010101', label: 'TikTok',   bg: '#f0f0f0' }
};

// Quick reply scripts
const QUICK_REPLIES = [
  { label: 'ถามสเปค', icon: 'fa-solid fa-ruler-combined', color: '#8b5cf6', text: 'เพื่อให้คุณลูกค้าได้ราคาที่แม่นยำที่สุด รบกวนแจ้ง:\n1. ขนาด (กว้างxยาวxสูง)\n2. จำนวนที่ต้องการ\n3. กระดาษที่ต้องการ (อาร์ตการ์ด/ลูกฟูก)\nเพื่อให้ระบบคำนวณราคาโปรโมชั่นให้นะคะ😊' },
  { label: 'เช็คไฟล์', icon: 'fa-solid fa-file-circle-check', color: '#ec4899', text: '⚠️ ข้อควรระวังในการเตรียมไฟล์งาน:\n✅ กรุณาตรวจสอบระยะตัดตก (Bleed) 3mm\n✅ โหมดสี CMYK เท่านั้น (ไม่ใช่ RGB)\n✅ ความละเอียดไม่ต่ำกว่า 300 DPI\n✅ ตรวจ Version V1/V2 ก่อนส่งไฟล์\nขอบคุณมากค่ะ!' },
  { label: 'แจ้งเวลา', icon: 'fa-solid fa-clock', color: '#f59e0b', text: 'ระยะเวลาการผลิตตามประเภทงาน:\n🟢 งานด่วน (Rush): 1-3 วันทำการ (+30%)\n🔵 งานปกติ (Standard): 7-10 วันทำการ\n🟣 งานสต็อค (Stock): 14-30 วันทำการ (ราคาพิเศษ)\n\nหากต้องการงานเร่งด่วนกรุณาแจ้งล่วงหน้านะคะ' },
  { label: 'ขอปรู๊ฟ', icon: 'fa-solid fa-eye', color: '#10b981', text: '📋 ขั้นตอนการตรวจปรู๊ฟก่อนพิมพ์:\n1. ทีมงานจะส่งไฟล์ Digital Proof ผ่านแชท\n2. กรุณาตรวจสอบ: ขนาด/สี/ข้อความ/โลโก้\n3. กดยืนยัน "OK to Print" ผ่านลิงก์\n⚠️ หลังยืนยันแล้วไม่สามารถแก้ไขได้นะคะ' },
  { label: 'สอบถามจัดส่ง', icon: 'fa-solid fa-truck', color: '#0ea5e9', text: '📦 ข้อมูลการจัดส่ง:\n• จัดส่งฟรี (เขต กทม./ปริมณฑล) ออเดอร์ 5,000 บาทขึ้นไป\n• ต่างจังหวัดส่ง Nim Express / Kerry ราคาตามน้ำหนักจริง\n• รับ Tracking Number ผ่านแชทอัตโนมัติ\nกรุณาแจ้งที่อยู่จัดส่งด้วยนะคะ' },
  { label: 'นัดเข้าพบ', icon: 'fa-solid fa-handshake', color: '#6366f1', text: '🤝 ยินดีเข้าพบเพื่อนำเสนอตัวอย่างงานพิมพ์และหารือรายละเอียดค่ะ\nกรุณาแจ้ง:\n📅 วันที่สะดวก\n🕐 เวลาที่ต้องการ\n📍 สถานที่ (ออฟฟิศ/โรงงาน)\nทีมเซลส์จะติดต่อกลับภายใน 1 ชั่วโมงค่ะ' },
];

// Revenue grade display
const REVENUE_GRADES = {
  '50M':   { label: '50M', color: '#94a3b8', bg: '#f1f5f9' },
  '100M':  { label: '100M', color: '#0ea5e9', bg: '#e0f2fe' },
  '200M':  { label: '200M', color: '#8b5cf6', bg: '#ede9fe' },
  '300M':  { label: '300M', color: '#ec4899', bg: '#fce7f3' },
  '500M':  { label: '500M', color: '#f59e0b', bg: '#fef3c7' },
  '1B':    { label: '1B+', color: '#dc2626', bg: '#fee2e2' },
  '10B':   { label: '10B+', color: '#b91c1c', bg: '#fecaca' },
};

export default function AdWeb() {
  const [leads, setLeads] = useState([]);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  
  // Tagging & Editing State
  const [editingLead, setEditingLead] = useState(false);
  const [aliasName, setAliasName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [statusTicked, setStatusTicked] = useState('i');
  
  // CRM Profile Fields
  const [editRole, setEditRole] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editSLA, setEditSLA] = useState('');
  const [editRevenueGrade, setEditRevenueGrade] = useState('');
  const [editVisitRequired, setEditVisitRequired] = useState(false);
  
  // Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderQty, setOrderQty] = useState(1000);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  // Image Lightbox
  const [previewImage, setPreviewImage] = useState(null);
  
  // AI Feature
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Price Request Modal
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceReqCategory, setPriceReqCategory] = useState('ใบปลิว/แผ่นพับ');
  const [priceReqSpecs, setPriceReqSpecs] = useState('');
  const [priceReqUrgency, setPriceReqUrgency] = useState('normal');
  
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const PRICE_CATEGORIES = [
    'หนังสือ', 'ใบปลิว/แผ่นพับ', 'ถุงกระดาษ/ถุงหิ้ว', 'สายคาด/ป้ายไฟ/ป้ายแท็ก',
    'บิล/ใบเสร็จ', 'ด้วย/แก้ว/บรรจุภัณฑ์อาหาร', 'บัตรพลาสติก', 'คูปอง/บัตร',
    'อินดี้/งานพิเศษ', 'กล่อง/แพคเกจจิ้ง', 'ปฏิทิน', 'นามบัตร', 'สติกเกอร์', 'อื่นๆ'
  ];

  // Polling backend
  useEffect(() => {
    fetchChats();
    axios.get(`${API_URL}/products`).then(res => setProducts(res.data)).catch(e => console.error(e));
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchChats = () => {
    axios.get(`${API_URL}/chats`).then(res => {
        setLeads(res.data);
        setActiveLeadId(prevId => {
            if (prevId === null && res.data.length > 0) {
                return res.data[0].id;
            }
            return prevId;
        });
    }).catch(err => console.error(err));
  };

  const activeLead = leads.find(l => l.id === activeLeadId);
  
  // Filtered leads by platform
  const filteredLeads = platformFilter === 'all' 
    ? leads 
    : leads.filter(l => (l.platform || 'line') === platformFilter);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeLead?.messages?.length, activeLeadId]);

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

  const handleToggleStatus = async (newStatus) => {
      if (!activeLead) return;
      // Auto-update alias prefix to match status
      let newAlias = activeLead.erp_alias_name || activeLead.original_name;
      const statusMap = { 'i': 'I', 'o': 'O', 'c': 'C', 'nt': 'NT', 'na': 'NA', 'al': 'AL' };
      const parts = newAlias.split('-');
      if (parts.length >= 2) {
          parts[0] = statusMap[newStatus] || parts[0];
          newAlias = parts.join('-');
      }
      try {
        await axios.put(`${API_URL}/leads/${activeLead.id}`, {
            erp_alias_name: newAlias,
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
            sales_status: statusTicked,
            company_role: editRole || null,
            industry: editIndustry || null,
            sla_days: editSLA ? parseInt(editSLA) : null,
            company_revenue_grade: editRevenueGrade || null,
            visit_required: editVisitRequired
        });
        setEditingLead(false);
        fetchChats();
    } catch (err) {
        alert("Failed to update profile");
    }
  };

  const startEditing = () => {
    setAliasName(activeLead.erp_alias_name || activeLead.original_name);
    setTagInput((activeLead.tags || []).join(', '));
    setStatusTicked(activeLead.sales_status);
    setEditRole(activeLead.company_role || '');
    setEditIndustry(activeLead.industry || '');
    setEditSLA(activeLead.sla_days ? String(activeLead.sla_days) : '');
    setEditRevenueGrade(activeLead.company_revenue_grade || '');
    setEditVisitRequired(activeLead.visit_required || false);
    setEditingLead(true);
  };

  const handleConvertToOrder = async () => {
    if (!selectedProductId || orderQty <= 0) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน"); return;
    }
    const product = products.find(p => p.id.toString() === selectedProductId);
    const total = (product.base_price * orderQty) * 1.07;
    
    setIsSubmittingOrder(true);
    try {
        const res = await axios.post(`${API_URL}/chats/${activeLeadId}/convert-to-order`, {
            product_id: selectedProductId,
            quantity: orderQty,
            total_price: total
        });
        alert(`สร้างใบสั่งผลิตและส่งไปหน้า Production สำเร็จ! Job Order ID: ${res.data.job_id}`);
        setShowOrderModal(false);
        fetchChats();
    } catch (e) {
        alert("Failed to create order");
    } finally {
        setIsSubmittingOrder(false);
    }
  };

  const handleAskAI = async () => {
    if (!activeLead || activeLead.messages.length === 0) return;
    setIsAIGenerating(true);
    setInputValue('🤖 กำลังให้ AI อ่านคำถามและค้นหาข้อมูลราคาจากระบบ...');
    try {
        const lastClientMsg = [...activeLead.messages].reverse().find(m => m.sender === 'client');
        if (!lastClientMsg || lastClientMsg.type !== 'text') {
            setInputValue('🤖 AI: ลูกค้ายังไม่มีคำถามที่เป็นข้อความล่าสุดให้ AI วิเคราะห์ครับ');
            setIsAIGenerating(false);
            return;
        }
        
        const res = await axios.post(`${API_URL}/ai/suggest`, { message: lastClientMsg.text_content });
        setInputValue(res.data.suggestion);
    } catch (e) {
        setInputValue('🤖 AI Error: ระบบไม่สามารถเชื่อมต่อคลังความรู้ได้');
    } finally {
        setIsAIGenerating(false);
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
              background: conf.bg, color: conf.color, padding: '0.2rem 0.5rem', 
              borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold',
              boxShadow: conf.shadow || 'none'
          }}>
              {conf.text}
          </span>
      );
  };

  const renderPlatformIcon = (platform) => {
    const conf = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.line;
    return (
      <i className={conf.icon} style={{ color: conf.color, fontSize: '0.9rem' }} title={conf.label}></i>
    );
  };

  const pConf = activeLead ? (PLATFORM_CONFIG[activeLead.platform] || PLATFORM_CONFIG.line) : PLATFORM_CONFIG.line;

  return (
    <div className="view-section active" style={{ height: 'calc(100vh - var(--topbar-height) - 4rem)'}}>
      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setPreviewImage(null)}
        >
            <img src={previewImage} alt="preview" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', objectFit: 'contain' }} />
            <button style={{ position: 'absolute', top: '20px', right: '30px', background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* Header + Daily Stats */}
      <div className="flex justify-between align-center mb-4">
        <div>
          <h3 className="text-primary"><i className="fa-solid fa-headset"></i> Omni-Channel Chat Center</h3>
          <p>รวมแชท LINE / Facebook / TikTok + CRM ลูกค้าเจ้าใหญ่</p>
        </div>
        <div style={{display: 'flex', gap: '0.8rem'}}>
          {(() => {
            const today = new Date().toDateString();
            const todayLeads = leads.filter(l => l.messages.length > 0 && new Date(l.messages[0].created_at).toDateString() === today);
            const todayMsgs = leads.reduce((sum, l) => sum + l.messages.filter(m => new Date(m.created_at).toDateString() === today).length, 0);
            const ntCount = leads.filter(l => l.sales_status === 'nt').length;
            const naCount = leads.filter(l => l.sales_status === 'na').length;
            const alCount = leads.filter(l => l.sales_status === 'al').length;
            const iCount = leads.filter(l => l.sales_status === 'i').length;
            const cCount = leads.filter(l => l.sales_status === 'c').length;
            const badCount = ntCount + naCount + alCount;
            return (
              <>
                <div style={{background: '#e0f2fe', borderRadius: '10px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '65px'}}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#0284c7'}}>{todayLeads.length}</div>
                  <div style={{fontSize: '0.6rem', color: '#0369a1'}}>แชทวันนี้</div>
                </div>
                <div style={{background: '#f0fdf4', borderRadius: '10px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '65px'}}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#16a34a'}}>{cCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#166534'}}>ซื้อแล้ว</div>
                </div>
                <div style={{background: '#fefce8', borderRadius: '10px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '65px'}}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#ca8a04'}}>{iCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#854d0e'}}>สนใจ</div>
                </div>
                <div style={{background: '#fef2f2', borderRadius: '10px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: '65px'}}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#dc2626'}}>{badCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#991b1b'}}>หลุด/ผี/ช้า</div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      
      <div className="chat-container shadow" style={{ height: '85%' }}>
        {/* Contact List */}
        <div className="chat-list" style={{ width: '30%', minWidth: '280px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Platform Filter Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', padding: '0' }}>
            {[
              { key: 'all', label: 'ทั้งหมด', icon: 'fa-solid fa-layer-group', color: '#0f4c81' },
              { key: 'line', label: 'LINE', icon: 'fa-brands fa-line', color: '#06C755' },
              { key: 'facebook', label: 'FB', icon: 'fa-brands fa-facebook-messenger', color: '#0084FF' },
              { key: 'tiktok', label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#010101' },
            ].map(tab => (
              <button 
                key={tab.key}
                onClick={() => setPlatformFilter(tab.key)}
                style={{
                  flex: 1, padding: '0.6rem 0.3rem', border: 'none', cursor: 'pointer',
                  background: platformFilter === tab.key ? 'white' : 'transparent',
                  borderBottom: platformFilter === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                  color: platformFilter === tab.key ? tab.color : '#94a3b8',
                  fontWeight: platformFilter === tab.key ? 700 : 400,
                  fontSize: '0.75rem', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem'
                }}
              >
                <i className={tab.icon} style={{ fontSize: '1rem' }}></i>
                <span>{tab.label}</span>
                <span style={{ fontSize: '0.65rem', background: platformFilter === tab.key ? tab.color : '#cbd5e1', color: 'white', borderRadius: '10px', padding: '0 0.4rem', minWidth: '18px' }}>
                  {tab.key === 'all' ? leads.length : leads.filter(l => (l.platform || 'line') === tab.key).length}
                </span>
              </button>
            ))}
          </div>

          {/* Contact Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredLeads.length === 0 && <div className="p-4" style={{color:'#888'}}>ไม่พบลูกค้าในช่องทางนี้...</div>}
          
          {filteredLeads.map(lead => {
            const lastMsg = lead.messages.length > 0 ? lead.messages[lead.messages.length - 1] : { type: 'text', text_content: 'ไม่มีบทสนทนา' };
            let previewText = lastMsg.type === 'image' ? '[📷 รูปภาพ]' : lastMsg.type === 'file' ? '[📎 ไฟล์]' : lastMsg.text_content;
            const platConf = PLATFORM_CONFIG[lead.platform] || PLATFORM_CONFIG.line;
            const revGrade = REVENUE_GRADES[lead.company_revenue_grade];
            
            return (
              <div 
                key={lead.id} 
                className={`chat-item ${activeLeadId === lead.id ? 'active' : ''}`} 
                onClick={() => {
                    setActiveLeadId(lead.id);
                    setEditingLead(false);
                }}
                style={{ borderLeft: `3px solid ${platConf.color}` }}
              >
                <div style={{ position: 'relative' }}>
                    {lead.avatar_url ? (
                        <img src={lead.avatar_url} alt="avatar" className="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div className="avatar" style={{ background: platConf.bg, color: platConf.color, width: '45px', height: '45px', fontWeight: 700 }}>
                            {(lead.erp_alias_name || lead.original_name || '?').charAt(0)}
                        </div>
                    )}
                    {/* Platform Icon Badge */}
                    <div style={{
                        position: 'absolute', bottom: -3, right: -3, width: '18px', height: '18px', borderRadius: '50%',
                        background: 'white', border: `2px solid ${platConf.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <i className={platConf.icon} style={{ fontSize: '0.55rem', color: platConf.color }}></i>
                    </div>
                </div>

                <div style={{ overflow: 'hidden', width: '100%', marginLeft: '10px' }}>
                        <h5 style={{margin: '0 0 0.3rem 0', color: '#0f172a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                            <span style={{
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px',
                              color: ['nt','na','al'].includes(lead.sales_status) ? '#dc2626' : lead.erp_alias_name?.startsWith('C') ? '#16a34a' : lead.erp_alias_name?.startsWith('O') ? '#f59e0b' : '#0f172a',
                              textDecoration: ['nt','na','al'].includes(lead.sales_status) ? 'line-through' : 'none',
                              opacity: ['nt','na','al'].includes(lead.sales_status) ? 0.6 : 1
                            }}>
                              {lead.erp_alias_name || lead.original_name}
                            </span>
                            {lead.visit_required && <i className="fa-solid fa-building" style={{ color: '#6366f1', fontSize: '0.7rem' }} title="ต้องเข้าพบ"></i>}
                        </h5>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                            <p style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: lastMsg.type !== 'text' ? '#10b981' : '#64748b', margin: 0, maxWidth: '150px' }}>
                                {previewText}
                            </p>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                {lastMsg.created_at ? new Date(lastMsg.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : ''}
                            </span>
                        </div>
                        <div style={{fontSize: '0.65rem', color: '#94a3b8', display: 'flex', gap: '0.3rem', marginTop: '0.2rem', alignItems: 'center'}}>
                            {lead.company_role || lead.industry ? <span>• {lead.company_role || lead.industry}</span> : null}
                            {revGrade && <span style={{ background: revGrade.bg, color: revGrade.color, padding: '0 0.3rem', borderRadius: '4px', fontWeight: 700 }}>{revGrade.label}</span>}
                        </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Chat Area */}
        {activeLead && (
        <div className="chat-main" style={{ display: 'flex', flexDirection: 'column', width: '70%' }}>
          {/* Profile Header Block */}
          <div className="p-4" style={{ borderBottom: `3px solid ${pConf.color}`, background: pConf.bg }}>
            <div className="flex justify-between align-center">
                
                <div className="flex" style={{gap: '1rem', alignItems: 'center'}}>
                    <div>
                        {editingLead ? (
                            <div style={{display: 'flex', gap: '0.4rem', alignItems: 'center'}}>
                                <select className="form-control" value={aliasName.split('-')[0] || 'I'} onChange={e => {
                                    const parts = aliasName.split('-');
                                    parts[0] = e.target.value;
                                    setAliasName(parts.join('-'));
                                }} style={{width: '70px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                                    <option value="I">I</option>
                                    <option value="O">O</option>
                                    <option value="C">C</option>
                                    <option value="C2">C2</option>
                                    <option value="C3">C3</option>
                                    <option value="C4">C4</option>
                                    <option value="C5">C5</option>
                                </select>
                                <span style={{fontWeight: 'bold', color: '#94a3b8'}}>-</span>
                                <input type="text" className="form-control" placeholder="เซลส์" value={(aliasName.split('-')[1] || '')} onChange={e => {
                                    const parts = aliasName.split('-');
                                    while(parts.length < 3) parts.push('');
                                    parts[1] = e.target.value;
                                    setAliasName(parts.join('-'));
                                }} style={{width: '70px', fontSize: '0.9rem'}}/>
                                <span style={{fontWeight: 'bold', color: '#94a3b8'}}>-</span>
                                <input type="text" className="form-control" placeholder="ชื่อ+วันที่" value={(aliasName.split('-').slice(2).join('-') || '')} onChange={e => {
                                    const parts = aliasName.split('-');
                                    while(parts.length < 3) parts.push('');
                                    const newAlias = parts[0] + '-' + parts[1] + '-' + e.target.value;
                                    setAliasName(newAlias);
                                }} style={{width: '180px', fontSize: '0.9rem'}}/>
                            </div>
                        ) : (
                            <h4 className="m-0" style={{
                              color: activeLead.erp_alias_name?.startsWith('C') ? '#16a34a' : activeLead.erp_alias_name?.startsWith('O') ? '#f59e0b' : '#0f172a',
                              display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                              {renderPlatformIcon(activeLead.platform)}
                              {activeLead.erp_alias_name || activeLead.original_name}
                              {activeLead.visit_required && <span style={{ background: '#6366f1', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.65rem' }}>🏢 นัดเข้าพบ</span>}
                            </h4>
                        )}
                        <small style={{display: 'block', color: 'var(--text-muted)'}}>
                            LINE: {activeLead.original_name}
                            {activeLead.company_role && <> • <strong>{activeLead.company_role}</strong></>}
                            {activeLead.industry && <> • {activeLead.industry}</>}
                        </small>
                    </div>

                    {/* Quick Analytics Summary */}
                    <div style={{background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem', display: 'flex', gap: '1rem'}}>
                        <div style={{borderRight: '1px solid #e2e8f0', paddingRight: '1rem'}}>
                            <span style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>CLV</span>
                            <span style={{fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem'}}>
                                ฿{activeLead.analytics.totalSpend.toLocaleString()}
                            </span>
                        </div>
                        <div style={{borderRight: '1px solid #e2e8f0', paddingRight: '1rem'}}>
                            <span style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>ซื้อซ้ำ</span>
                            <span style={{fontWeight: 'bold', color: '#10b981', fontSize: '0.9rem'}}>
                                {activeLead.analytics.repeatCount}x
                            </span>
                        </div>
                        <div>
                            <span style={{fontSize: '0.65rem', color: '#64748b', display: 'block'}}>SLA</span>
                            <span style={{fontWeight: 'bold', color: activeLead.sla_days && activeLead.sla_days <= 3 ? '#ef4444' : '#0f172a', fontSize: '0.9rem'}}>
                                {activeLead.sla_days ? `${activeLead.sla_days}d` : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex" style={{gap: '0.5rem', alignItems: 'center'}}>
                    {!editingLead && (
                        <div style={{background: '#f1f5f9', padding: '3px', borderRadius: '8px', display: 'flex', gap: '2px', flexWrap: 'wrap'}}>
                            <button 
                                className={`btn btn-sm ${activeLead.sales_status === 'i' ? 'btn-primary' : ''}`} 
                                style={{background: activeLead.sales_status !== 'i' ? 'transparent' : '', color: activeLead.sales_status !== 'i' ? '#64748b' : '', fontSize: '0.65rem', padding: '0.3rem 0.5rem', minHeight: 'unset'}}
                                onClick={() => handleToggleStatus('i')}
                            >
                                I (สนใจ)
                            </button>
                            <button 
                                style={{background: activeLead.sales_status === 'o' ? '#f59e0b' : 'transparent', color: activeLead.sales_status === 'o' ? 'white' : '#64748b', fontSize: '0.65rem', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer'}}
                                onClick={() => handleToggleStatus('o')}
                            >
                                O (โอกาส)
                            </button>
                            <button 
                                className={`btn btn-sm ${activeLead.sales_status === 'c' ? 'btn-success' : ''}`} 
                                style={{background: activeLead.sales_status !== 'c' ? 'transparent' : '', color: activeLead.sales_status !== 'c' ? '#64748b' : '', fontSize: '0.65rem', padding: '0.3rem 0.5rem', minHeight: 'unset'}}
                                onClick={() => handleToggleStatus('c')}
                            >
                                C (ลูกค้า)
                            </button>
                            <div style={{width: '1px', background: '#cbd5e1', margin: '0 4px'}}></div>
                            <button 
                                style={{background: activeLead.sales_status === 'nt' ? '#dc2626' : 'transparent', color: activeLead.sales_status === 'nt' ? 'white' : '#64748b', fontSize: '0.6rem', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer'}}
                                onClick={() => handleToggleStatus('nt')} title="Not Target: ไม่ตรงเป้าหมาย"
                            >
                                NT
                            </button>
                            <button 
                                style={{background: activeLead.sales_status === 'na' ? '#dc2626' : 'transparent', color: activeLead.sales_status === 'na' ? 'white' : '#64748b', fontSize: '0.6rem', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer'}}
                                onClick={() => handleToggleStatus('na')} title="No Answer: ทักแล้วเงียบกริบ"
                            >
                                NA
                            </button>
                            <button 
                                style={{background: activeLead.sales_status === 'al' ? '#dc2626' : 'transparent', color: activeLead.sales_status === 'al' ? 'white' : '#64748b', fontSize: '0.6rem', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer'}}
                                onClick={() => handleToggleStatus('al')} title="Answer Late: ตอบช้าลูกค้าหาย"
                            >
                                AL
                            </button>
                        </div>
                    )}

                    {editingLead ? (
                        <>
                            <button className="btn btn-primary btn-sm" onClick={handleSaveLeadInfo}>บันทึก</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingLead(false)}>ยกเลิก</button>
                        </>
                    ) : (
                        <>
                          <button className="btn btn-outline" style={{padding: '0.4rem 0.6rem', fontSize:'0.8rem'}} onClick={startEditing}><i className="fa-solid fa-pen"></i></button>
                          <button className="btn btn-primary" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem', background: '#1e293b', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} onClick={() => setShowOrderModal(true)}>
                              <i className="fa-solid fa-file-invoice"></i> สร้างใบงานผลิต
                          </button>
                        </>
                    )}
                </div>
            </div>

            {/* Editable CRM Profile Form */}
            {editingLead && (
              <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748b' }}>ตำแหน่ง/Role</label>
                  <select className="form-control" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">-</option>
                    <option value="จัดซื้อ">จัดซื้อ</option>
                    <option value="Marketing">Marketing</option>
                    <option value="เจ้าของกิจการ">เจ้าของกิจการ</option>
                    <option value="Graphic Designer">Graphic Designer</option>
                    <option value="ออร์แกไนเซอร์">ออร์แกไนเซอร์</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748b' }}>อุตสาหกรรม</label>
                  <select className="form-control" value={editIndustry} onChange={e => setEditIndustry(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">-</option>
                    <option value="ครีม/สกินแคร์">ครีม/สกินแคร์</option>
                    <option value="อาหารเสริม">อาหารเสริม</option>
                    <option value="เครื่องสำอาง">เครื่องสำอาง</option>
                    <option value="OEM โรงงาน">OEM โรงงาน</option>
                    <option value="อีเว้นต์/ออกบูธ">อีเว้นต์/ออกบูธ</option>
                    <option value="ร้านอาหาร/คาเฟ่">ร้านอาหาร/คาเฟ่</option>
                    <option value="แบรนด์แฟชั่น">แบรนด์แฟชั่น</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748b' }}>SLA (วัน)</label>
                  <select className="form-control" value={editSLA} onChange={e => setEditSLA(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">-</option>
                    <option value="1">1 วัน (เช้า-เย็น)</option>
                    <option value="3">3 วัน (Rush)</option>
                    <option value="7">7 วัน</option>
                    <option value="10">10 วัน (Standard)</option>
                    <option value="14">14 วัน</option>
                    <option value="20">20 วัน</option>
                    <option value="30">30 วัน (Stock)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748b' }}>เกรดรายได้บริษัท</label>
                  <select className="form-control" value={editRevenueGrade} onChange={e => setEditRevenueGrade(e.target.value)} style={{ fontSize: '0.85rem' }}>
                    <option value="">-</option>
                    <option value="50M">50 ล้าน</option>
                    <option value="100M">100 ล้าน</option>
                    <option value="200M">200 ล้าน</option>
                    <option value="500M">500 ล้าน</option>
                    <option value="1B">1,000 ล้าน</option>
                    <option value="10B">10,000 ล้าน+</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editVisitRequired} onChange={e => setEditVisitRequired(e.target.checked)} />
                    🏢 ต้องเข้าพบ
                  </label>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748b' }}>แท็ก (คั่นด้วย ,)</label>
                  <input type="text" className="form-control" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="เช่น รอตรวจแบบ, VIP" style={{ fontSize: '0.85rem' }} />
                </div>
              </div>
            )}

            {/* Tag & Info Display */}
            {!editingLead && (
            <div style={{display:'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem', alignItems: 'center'}}>
                {activeLead.tags?.map((tag, idx) => (
                    <span key={idx} style={{background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600}}>
                        #{tag}
                    </span>
                ))}
                {activeLead.company_revenue_grade && REVENUE_GRADES[activeLead.company_revenue_grade] && (
                  <span style={{ background: REVENUE_GRADES[activeLead.company_revenue_grade].bg, color: REVENUE_GRADES[activeLead.company_revenue_grade].color, padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                    💼 Revenue: {REVENUE_GRADES[activeLead.company_revenue_grade].label}
                  </span>
                )}
                {activeLead.sla_days && (
                  <span style={{ background: activeLead.sla_days <= 3 ? '#fee2e2' : '#f0fdf4', color: activeLead.sla_days <= 3 ? '#dc2626' : '#166534', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                    ⏱ SLA: {activeLead.sla_days} วัน
                  </span>
                )}
            </div>
            )}
          </div>
          
          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: '#f1f5f9' }}>
            {activeLead.messages.map((msg, idx) => {
              const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '';
              return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'client' ? 'flex-start' : 'flex-end', marginBottom: '1rem' }}>
                  {msg.sender === 'client' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{activeLead.original_name}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: msg.sender === 'client' ? 'row' : 'row-reverse', gap: '0.5rem' }}>
                      <div className={`message ${msg.sender === 'client' ? 'msg-client' : 'msg-admin'}`} style={{ margin: 0, maxWidth: '300px' }}>
                        {msg.type === 'text' && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text_content}</div>}
                        {msg.type === 'image' && msg.media_url && (
                          <div style={{ cursor: 'zoom-in' }} onClick={() => setPreviewImage(msg.media_url)}>
                              <img src={msg.media_url} alt="Media" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{timeStr}</div>
                  </div>
              </div>
            )})}
            <div ref={chatEndRef} />
          </div>
          
          {/* Input Area with Quick Replies */}
          <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid var(--border-color)', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            
            {/* Magic Quick Reply Buttons */}
            <div style={{display: 'flex', gap: '0.4rem', flexWrap: 'wrap'}}>
                <button className="btn" style={{fontSize: '0.75rem', padding: '0.3rem 0.6rem', border: `none`, color: 'white', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', borderRadius: '20px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'}} onClick={handleAskAI} disabled={isAIGenerating}>
                    {isAIGenerating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} ร่างคำตอบด้วย AI
                </button>
                <div style={{width: '1px', background: '#cbd5e1', margin: '0 0.2rem'}}></div>
                {QUICK_REPLIES.map((qr, idx) => (
                  <button key={idx} className="btn" style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem', border: `1px solid ${qr.color}`, color: qr.color, background: 'transparent', borderRadius: '20px'}} onClick={() => setInputValue(qr.text)}>
                      <i className={qr.icon}></i> {qr.label}
                  </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={`ตอบกลับลูกค้าผ่าน ${pConf.label}...`}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn-primary" onClick={handleSendMessage} style={{ padding: '0.8rem 1.2rem' }}>
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
                <button className="btn btn-success" onClick={() => {
                  setPriceReqSpecs('');
                  setShowPriceModal(true);
                }} style={{ padding: '0.8rem 1.2rem', whiteSpace: 'nowrap' }}>
                  <i className="fa-solid fa-file-invoice"></i> ขอราคา
                </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Chat-To-Order Modal */}
      {showOrderModal && activeLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h4 style={{marginTop: 0, color: '#0f4c81'}}><i className="fa-solid fa-file-invoice"></i> สร้างใบงานผลิตจากแชท</h4>
                <p style={{fontSize: '0.85rem', color: '#64748b'}}>กำลังสร้างบิลผลิตให้ลูกค้า: <strong style={{color: '#0f172a'}}>{activeLead.original_name}</strong></p>
                
                <div className="form-group mt-4">
                    <label style={{fontSize: '0.8rem'}}>เลือกสินค้าที่จะสั่งผลิต</label>
                    <select className="form-control" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                        <option value="">-- เลือกประเภทงานพิมพ์ --</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.base_price.toLocaleString()} บ./ชิ้น)</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-group">
                    <label style={{fontSize: '0.8rem'}}>จำนวนที่สั่งผลิต (ชิ้น/ใบ)</label>
                    <input type="number" className="form-control" value={orderQty} onChange={e => setOrderQty(e.target.value)} min="1" />
                </div>
                
                {selectedProductId && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#166534'}}>
                            <span>ราคาฐานสุทธิ:</span> 
                            <span>{(products.find(p => p.id.toString() === selectedProductId)?.base_price * orderQty).toLocaleString()} ฿</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#166534'}}>
                            <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span> 
                            <span>{((products.find(p => p.id.toString() === selectedProductId)?.base_price * orderQty) * 0.07).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', borderTop: '1px solid #bbf7d0', paddingTop: '0.5rem', marginTop: '0.5rem', color: '#15803d'}}>
                            <span>ยอดชำระสุทธิ:</span> 
                            <span>{((products.find(p => p.id.toString() === selectedProductId)?.base_price * orderQty) * 1.07).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ฿</span>
                        </div>
                    </div>
                )}
                
                <div className="flex" style={{gap: '1rem', marginTop: '2rem'}}>
                    <button className="btn btn-outline" style={{flex: 1, padding: '0.8rem'}} onClick={() => setShowOrderModal(false)}>ยกเลิก</button>
                    <button className="btn btn-primary" style={{flex: 1, padding: '0.8rem', background: '#10b981', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'}} onClick={handleConvertToOrder} disabled={!selectedProductId || isSubmittingOrder}>
                        {isSubmittingOrder ? 'กำลังสร้าง...' : '✅ ยืนยันสร้างบิล'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Price Request Modal — Structured Form */}
      {showPriceModal && activeLead && (() => {
        const fieldStyle = { marginBottom: '0.6rem' };
        const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.2rem' };
        const inputStyle = { width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' };
        const rowStyle = { display: 'flex', gap: '0.5rem' };
        const halfStyle = { flex: 1 };
        
        return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.5rem' }}>
            <div style={{ background: 'white', padding: '1.2rem', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h4 style={{marginTop: 0, color: '#7c3aed', marginBottom: '0.3rem'}}><i className="fa-solid fa-coins"></i> สรุปสเปค & ขอราคา</h4>
                
                <div style={{ background: '#eff6ff', padding: '0.5rem 0.8rem', borderRadius: '8px', marginBottom: '0.8rem', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><span style={{ fontSize: '0.7rem', color: '#1e40af' }}>ลูกค้า:</span> <strong style={{ color: '#1e293b', fontSize: '0.85rem' }}>{activeLead.alias_name || activeLead.original_name}</strong></div>
                </div>

                {/* Category */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>หมวดสินค้า</label>
                  <select style={inputStyle} value={priceReqCategory} onChange={e => setPriceReqCategory(e.target.value)}>
                    {PRICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Size */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>📐 ขนาดสำเร็จรูป</label>
                  <div style={rowStyle}>
                    <input style={inputStyle} placeholder="กว้าง (cm)" id="pq-w" />
                    <span style={{ alignSelf: 'center', color: '#94a3b8' }}>×</span>
                    <input style={inputStyle} placeholder="ยาว (cm)" id="pq-h" />
                    <span style={{ alignSelf: 'center', color: '#94a3b8' }}>×</span>
                    <input style={inputStyle} placeholder="สูง (ถ้ามี)" id="pq-d" />
                  </div>
                </div>

                {/* Paper */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>📄 กระดาษ</label>
                  <div style={rowStyle}>
                    <select style={{...inputStyle, flex: 2}} id="pq-paper">
                      <option>อาร์ตการ์ด</option>
                      <option>อาร์ตมัน</option>
                      <option>อาร์ตด้าน</option>
                      <option>ปอนด์</option>
                      <option>คราฟท์</option>
                      <option>กระดาษลูกฟูก</option>
                      <option>จั่วปัง</option>
                      <option>กระดาษปก C-Card</option>
                      <option>กระดาษ NCR (ก็อปปี้)</option>
                      <option>PVC</option>
                      <option>PP</option>
                      <option>สติกเกอร์</option>
                      <option>อื่นๆ</option>
                    </select>
                    <input style={{...inputStyle, flex: 1}} placeholder="แกรม" id="pq-gsm" />
                    <span style={{ alignSelf: 'center', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>แกรม</span>
                  </div>
                </div>

                {/* Print */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>🖨️ พิมพ์</label>
                  <div style={rowStyle}>
                    <select style={inputStyle} id="pq-color">
                      <option>4 สี (CMYK)</option>
                      <option>1 สี</option>
                      <option>2 สี</option>
                      <option>Pantone</option>
                      <option>ขาวดำ</option>
                    </select>
                    <select style={inputStyle} id="pq-sides">
                      <option>1 หน้า (1/S)</option>
                      <option>2 หน้า (2/S)</option>
                      <option>4/4 สี 2 ด้าน</option>
                    </select>
                  </div>
                </div>

                {/* Book-specific (only show for books) */}
                {priceReqCategory === 'หนังสือ' && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>📖 ข้อมูลหนังสือ</label>
                    <div style={rowStyle}>
                      <input style={inputStyle} placeholder="จำนวนหน้า" id="pq-pages" />
                      <select style={inputStyle} id="pq-binding">
                        <option>ไสกาว (Perfect Binding)</option>
                        <option>สเทปเปิ้ล (Staple)</option>
                        <option>สันห่วง (Wire-O)</option>
                        <option>เย็บกี่ (Sewing)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Finishing */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>✨ งานหลังพิมพ์ (Finishing)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {['เคลือบ PVC ด้าน', 'เคลือบ PVC เงา', 'เคลือบ UV', 'ปั๊มฟอยล์', 'ปั๊มนูน', 'ไดคัท', 'ปะกาว', 'พับ', 'ปรุฉีก', 'เข้าเล่ม', 'เคลือบลามิเนต'].map(f => (
                      <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', padding: '0.25rem 0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', background: '#fafafa' }}>
                        <input type="checkbox" className={`pq-finish`} value={f} style={{ width: '12px', height: '12px' }} /> {f}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quantities */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>📦 จำนวนที่ต้องการ (ใส่ได้หลายจำนวน)</label>
                  <input style={inputStyle} placeholder="เช่น 500 / 1,000 / 3,000" id="pq-qty" />
                </div>

                {/* Notes */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>📝 หมายเหตุเพิ่มเติม</label>
                  <textarea style={{...inputStyle, resize: 'vertical'}} rows="2" placeholder="รายละเอียดเพิ่มเติม เช่น ขนาดถุงหิ้ว, สีฟอยล์, จำนวนหน้า ฯลฯ" id="pq-notes"></textarea>
                </div>

                {/* Urgency */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>⏰ ความเร่งด่วน</label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[['normal', '🟢 ปกติ'], ['urgent', '🟡 ด่วน'], ['critical', '🔴 ด่วนมาก']].map(([k, v]) => (
                      <button key={k} onClick={() => setPriceReqUrgency(k)} style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: priceReqUrgency === k ? '2px solid #7c3aed' : '1px solid #e2e8f0', background: priceReqUrgency === k ? '#f5f3ff' : 'white', cursor: 'pointer', fontSize: '0.7rem' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex" style={{gap: '0.6rem', marginTop: '1rem'}}>
                    <button className="btn btn-outline" style={{flex: 1, padding: '0.6rem', fontSize: '0.8rem'}} onClick={() => setShowPriceModal(false)}>ยกเลิก</button>
                    <button className="btn btn-primary" style={{flex: 2, padding: '0.6rem', background: '#7c3aed', border: 'none', fontSize: '0.8rem'}} onClick={async () => {
                      // Build structured spec string
                      const w = document.getElementById('pq-w')?.value;
                      const h = document.getElementById('pq-h')?.value;
                      const d = document.getElementById('pq-d')?.value;
                      const paper = document.getElementById('pq-paper')?.value;
                      const gsm = document.getElementById('pq-gsm')?.value;
                      const color = document.getElementById('pq-color')?.value;
                      const sides = document.getElementById('pq-sides')?.value;
                      const qty = document.getElementById('pq-qty')?.value;
                      const notes = document.getElementById('pq-notes')?.value;
                      const pages = document.getElementById('pq-pages')?.value;
                      const binding = document.getElementById('pq-binding')?.value;
                      const finishes = [...document.querySelectorAll('.pq-finish:checked')].map(cb => cb.value);

                      if (!qty) { alert('กรุณากรอกจำนวนที่ต้องการ'); return; }

                      let specs = `ขอราคา${priceReqCategory}\n`;
                      if (w || h) specs += `ขนาด: ${w || '-'}×${h || '-'}${d ? '×' + d : ''} cm\n`;
                      if (paper) specs += `กระดาษ: ${paper} ${gsm || ''} แกรม\n`;
                      specs += `พิมพ์: ${color} ${sides}\n`;
                      if (pages) specs += `จำนวนหน้า: ${pages} หน้า เข้าเล่ม: ${binding}\n`;
                      if (finishes.length) specs += `+ ${finishes.join('\n+ ')}\n`;
                      specs += `จำนวน: ${qty}\n`;
                      if (notes) specs += `หมายเหตุ: ${notes}`;

                      try {
                        await axios.post(`${API_URL}/price_requests`, {
                          category: priceReqCategory,
                          customer_name: activeLead.alias_name || activeLead.original_name,
                          specs: specs.trim(),
                          urgency: priceReqUrgency,
                          requested_by: 'Sales (จากแชท)',
                          status: 'pending'
                        });
                        alert('✅ ส่งขอราคาไปยัง Pricing Desk เรียบร้อย!');
                        setShowPriceModal(false);
                      } catch (e) { alert('ส่งไม่สำเร็จ: ' + e.message); }
                    }}>
                        <i className="fa-solid fa-paper-plane"></i> ส่งขอราคาไป Pricing Desk
                    </button>
                </div>

                <div style={{ marginTop: '0.6rem', textAlign: 'center' }}>
                  <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }} onClick={() => { setShowPriceModal(false); navigate('/estimator'); }}>
                    หรือไปค้นหาราคาเองที่ ศูนย์ราคา →
                  </button>
                </div>
            </div>
        </div>
        );
      })()}

    </div>
  );
}
