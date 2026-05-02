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
  const [searchQuery, setSearchQuery] = useState('');
  const [salesFilter, setSalesFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, unread
  // ★ LINE-Style Read Tracking (v5 — force reset green badges)
  const READ_VERSION = 'chatReadV5';
  const [readTimestamps, setReadTimestamps] = useState(() => {
    try {
      const ver = localStorage.getItem('chatReadVersion');
      if (ver === READ_VERSION) return JSON.parse(localStorage.getItem('readTimestamps') || '{}');
      localStorage.removeItem('readTimestamps');
      localStorage.removeItem('endedChats');
      localStorage.removeItem('chatInitDone');
      return {};
    } catch { return {}; }
  });
  const readTsRef = useRef(readTimestamps);
  const [endedChats, setEndedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('endedChats') || '{}'); } catch { return {}; }
  });
  const [autoInitDone, setAutoInitDone] = useState(() => localStorage.getItem('chatInitDone') === 'true');

  const saveReadTimestamps = (ts) => {
    readTsRef.current = ts;
    setReadTimestamps(ts);
    localStorage.setItem('readTimestamps', JSON.stringify(ts));
    localStorage.setItem('chatReadVersion', READ_VERSION);
  };
  const markAsRead = (leadId, msgs) => {
    if (!msgs || msgs.length === 0) return;
    const lastMsgTime = msgs[msgs.length - 1].created_at;
    const updated = { ...readTsRef.current, [leadId]: lastMsgTime };
    saveReadTimestamps(updated);
    if (endedChats[leadId]) {
      const ec = { ...endedChats };
      delete ec[leadId];
      setEndedChats(ec);
      localStorage.setItem('endedChats', JSON.stringify(ec));
    }
  };
  const markAllRead = () => {
    const updated = { ...readTsRef.current };
    leads.forEach(l => { if (l.messages?.length) updated[l.id] = l.messages[l.messages.length - 1].created_at; });
    saveReadTimestamps(updated);
  };
  const markEnded = (leadId) => {
    const updated = { ...endedChats, [leadId]: true };
    setEndedChats(updated);
    localStorage.setItem('endedChats', JSON.stringify(updated));
    const lead = leads.find(l => l.id === leadId);
    if (lead?.messages?.length) markAsRead(leadId, lead.messages);
  };

  // Get unread count: messages from client AFTER our last read timestamp
  const getUnreadCount = (lead) => {
    if (!lead.messages || lead.messages.length === 0) return 0;
    const readAt = readTimestamps[lead.id];
    if (!readAt) return lead.messages.filter(m => m.sender === 'client').length;
    return lead.messages.filter(m => m.sender === 'client' && new Date(m.created_at) > new Date(readAt)).length;
  };

  // Simple status: has unread? / admin replied? / ended?
  const getChatStatus = (lead) => {
    if (!lead.messages || lead.messages.length === 0) return 'done';
    const lastMsg = lead.messages[lead.messages.length - 1];
    if (lastMsg.sender === 'admin') return 'replied';
    if (endedChats[lead.id]) return 'done';
    const unread = getUnreadCount(lead);
    if (unread > 0) return 'new';
    return 'read';
  };
  
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
  const [activeSalesRep, setActiveSalesRep] = useState(localStorage.getItem('activeSalesRep') || '');


  // ★ Price Tracking (เสนอราคา + ซื้อสินค้า)
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [showQuotePanel, setShowQuotePanel] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showChatUploadModal, setShowChatUploadModal] = useState(false);
  const [showDataUploadModal, setShowDataUploadModal] = useState({ visible: false, type: '' });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [quoteTab, setQuoteTab] = useState('quote'); // 'quote' | 'purchase'
  const [quoteMonthFilter, setQuoteMonthFilter] = useState('all');
  const [quoteForm, setQuoteForm] = useState({ product_name: '', category: 'ใบปลิว/แผ่นพับ', specs: '', quantity: '', price_per_unit: '', total_price: '', notes: '', quote_date: new Date().toISOString().split('T')[0] });
  
  const fetchQuotes = async (leadId) => {
    try {
      const res = await axios.get(`${API_URL}/customer_quotes/${leadId}`);
      setCustomerQuotes(res.data);
    } catch (e) { console.error(e); }
  };

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
    axios.get(`${API_URL}/chats?t=${new Date().getTime()}`).then(res => {
        setLeads(res.data);
        // Auto-init: first load after version upgrade → mark all as read
        if (!autoInitDone && res.data.length > 0) {
          const initTs = {};
          res.data.forEach(l => { if (l.messages?.length) initTs[l.id] = l.messages[l.messages.length - 1].created_at; });
          saveReadTimestamps(initTs);
          setAutoInitDone(true);
          localStorage.setItem('chatInitDone', 'true');
        }
        setActiveLeadId(prevId => {
            if (prevId === null && res.data.length > 0) {
                return res.data[0].id;
            }
            return prevId;
        });
    }).catch(err => console.error(err));
  };

  const activeLead = leads.find(l => l.id === activeLeadId);
  
  // Filtered leads by platform + search + sales
  const getSalesName = (lead) => {
    const alias = lead.erp_alias_name || '';
    const parts = alias.split('-');
    return parts.length >= 3 ? parts[1].trim() : '';
  };
  const allSalesNames = [...new Set(leads.map(getSalesName).filter(Boolean))].sort();
  
  const filteredLeads = leads.filter(l => {
    if (platformFilter !== 'all' && (l.platform || 'line') !== platformFilter) return false;
    if (statusFilter === 'unread' && getChatStatus(l) !== 'new') return false;
    if (statusFilter === 'nochat' && l.messages?.length > 0) return false;
    if (statusFilter === 'incomplete' && (l.messages?.length || 0) >= 10) return false;
    if (statusFilter === 'incomplete' && (l.messages?.length || 0) === 0) return false;
    if (statusFilter === 'nosales') {
      const parts = (l.erp_alias_name || '').split('-');
      if (parts.length >= 2 && parts[1]) return false;
    }
    if (statusFilter === 'complete' && (l.messages?.length || 0) < 10) return false;
    // Dashboard clickable card filters
    if (statusFilter === 'newtoday') {
      if (l.messages.length === 0) return false;
      const todayStr = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'})).toDateString();
      if (new Date(l.messages[0].created_at).toDateString() !== todayStr) return false;
    }
    if (statusFilter === 'activetoday') {
      const todayStr = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'})).toDateString();
      if (!l.messages.some(m => new Date(m.created_at).toDateString() === todayStr)) return false;
    }
    if (statusFilter === 'pending') {
      if (l.messages.length === 0) return false;
      if (l.messages[l.messages.length - 1].sender !== 'client') return false;
    }
    if (statusFilter === 'redwait') {
      const rTags = ['รอราคา','รอตรวจ','แก้ไฟล์','รอผลิต','รอขนส่ง','รอบิล','คืนเงิน'];
      if (!(l.tags || []).some(t => rTags.includes(t))) return false;
    }
    if (statusFilter === 'bluewait') {
      const bTags = ['รอไฟล์','รอโอนเงิน','รอตรวจไฟล์','รอตัดสินใจ'];
      if (!(l.tags || []).some(t => bTags.includes(t))) return false;
    }
    if (statusFilter === 'appointed') {
      if (!(l.tags || []).some(t => t.startsWith('นัด:'))) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (l.erp_alias_name || l.original_name || '').toLowerCase();
      if (!name.includes(q)) return false;
    }
    if (salesFilter !== 'all') {
      const sales = getSalesName(l);
      if (sales !== salesFilter) return false;
    }
    return true;
  });

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

  // ★ Waiting Status Tag Toggle
  const toggleWaitTag = async (tag) => {
    if (!activeLead) return;
    const current = activeLead.tags || [];
    const newTags = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    saveWaitTags(newTags);
  };
  const saveWaitTags = async (newTags) => {
    if (!activeLead) return;
    try {
      await axios.put(`${API_URL}/leads/${activeLead.id}`, {
        erp_alias_name: activeLead.erp_alias_name || activeLead.original_name,
        tags: newTags,
        sales_status: activeLead.sales_status
      });
      fetchChats();
    } catch (err) {}
  };

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
    <div className="view-section active" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - 4rem)'}}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', gap: '1rem' }}>
        {/* Left: Title & Buttons */}
        <div style={{ flexShrink: 0 }}>
          <h3 className="text-primary" style={{ margin: '0 0 0.2rem 0' }}><i className="fa-solid fa-headset"></i> Chat Center</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>CRM & Social Chat</p>
          {/* Data Upload Buttons */}
          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => setShowDataUploadModal({ visible: true, type: 'images' })}><i className="fa-solid fa-images"></i> รูป</button>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => setShowDataUploadModal({ visible: true, type: 'contacts' })}><i className="fa-solid fa-users"></i> รายชื่อ</button>
            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => setShowDataUploadModal({ visible: true, type: 'quotes' })}><i className="fa-solid fa-file-invoice-dollar"></i> ประวัติ</button>
          </div>
        </div>

        {/* Center: 🏆 Gamified Sales Leaderboard (Compact) */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', padding: '0.4rem 1rem', borderRadius: '20px', color: 'white', display: 'flex', gap: '0.8rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', alignItems: 'center', overflowX: 'auto', maxWidth: '100%' }}>
            <div style={{ flexShrink: 0, paddingRight: '0.5rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ margin: 0, color: '#fcd34d', fontSize: '0.8rem', fontWeight: 'bold' }}><i className="fa-solid fa-trophy"></i> Leaderboard</div>
            </div>
            
            {(() => {
              const salesStats = {};
              leads.forEach(l => {
                const alias = l.erp_alias_name || '';
                const parts = alias.split('-');
                if (parts.length >= 2) {
                  const rep = parts[1].split(' ')[0];
                  if (!salesStats[rep]) salesStats[rep] = { name: rep, totalLeads: 0, closed: 0, revenue: 0 };
                  salesStats[rep].totalLeads += 1;
                  if (l.sales_status === 'c') {
                    salesStats[rep].closed += 1;
                    salesStats[rep].revenue += (l.analytics?.totalSpend || 0);
                  }
                }
              });

              const board = Object.values(salesStats).map(s => {
                s.winRate = s.totalLeads > 0 ? (s.closed / s.totalLeads) * 100 : 0;
                s.score = (s.revenue / 1000) * (s.winRate / 100); 
                return s;
              }).filter(s => s.totalLeads > 0).sort((a, b) => b.score - a.score);

              const medals = ['🥇', '🥈', '🥉'];

              return board.length === 0 ? <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ยังไม่มีข้อมูล</div> : board.slice(0, 3).map((s, idx) => (
                <div key={s.name} style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', minWidth: '90px' }}>
                  <div style={{ fontSize: '1rem' }}>{medals[idx] || '🎖️'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.7rem' }}>{s.name} <span style={{fontSize:'0.55rem', color:'#fde047'}}>Lv.{Math.max(1, Math.floor(s.score))}</span></div>
                    <div style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>{s.winRate.toFixed(1)}% | {(s.revenue/1000).toFixed(1)}k</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Right: Daily Stats */}
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0, width: '450px'}}>
          {(() => {
            const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
            const todayStr = today.toDateString();
            
            // New leads = first message is today
            const newLeadsToday = leads.filter(l => {
              if (l.messages.length === 0) return false;
              return new Date(l.messages[0].created_at).toDateString() === todayStr;
            }).length;
            
            // Active today = any message today
            const activeTodayCount = leads.filter(l => 
              l.messages.some(m => new Date(m.created_at).toDateString() === todayStr)
            ).length;
            
            // Pending = client sent last & not replied (count as people)
            const pendingCount = leads.filter(l => {
              if (l.messages.length === 0) return false;
              return l.messages[l.messages.length - 1].sender === 'client';
            }).length;

            // Waiting tags counts  
            const redTags = ['รอราคา','รอตรวจ','แก้ไฟล์','รอผลิต','รอขนส่ง','รอบิล','คืนเงิน'];
            const blueTags = ['รอไฟล์','รอโอนเงิน','รอตรวจไฟล์','รอตัดสินใจ'];
            const redWaitCount = leads.filter(l => (l.tags || []).some(t => redTags.includes(t))).length;
            const blueWaitCount = leads.filter(l => (l.tags || []).some(t => blueTags.includes(t))).length;
            const appointCount = leads.filter(l => (l.tags || []).some(t => t.startsWith('นัด:'))).length;

            const cardStyle = (bg, active) => ({
              background: bg, borderRadius: '10px', padding: '0.4rem 0.8rem', textAlign: 'center',
              minWidth: '65px', cursor: 'pointer', transition: 'transform 0.15s',
              outline: active ? '3px solid #3b82f6' : 'none',
            });

            return (
              <>
                <div title="ลูกค้าที่ทักเข้ามาวันนี้เป็นครั้งแรก" style={cardStyle('#ede9fe', statusFilter === 'newtoday')} 
                  onClick={() => setStatusFilter(statusFilter === 'newtoday' ? 'all' : 'newtoday')}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#7c3aed'}}>{newLeadsToday}</div>
                  <div style={{fontSize: '0.6rem', color: '#5b21b6'}}>ลูกค้าใหม่</div>
                </div>
                <div title="คนที่มีข้อความวันนี้ (วัดปริมาณงาน)" style={cardStyle('#e0f2fe', statusFilter === 'activetoday')}
                  onClick={() => setStatusFilter(statusFilter === 'activetoday' ? 'all' : 'activetoday')}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#0284c7'}}>{activeTodayCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#0369a1'}}>💬 คุยวันนี้</div>
                </div>
                <div title={`ลูกค้าส่งมาสุดท้าย ยังไม่ตอบ (${pendingCount} ราย)`} style={{...cardStyle(pendingCount > 10 ? '#fee2e2' : '#fef3c7', statusFilter === 'pending'), animation: pendingCount > 10 ? 'pulse 2s infinite' : 'none'}}
                  onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: pendingCount > 10 ? '#dc2626' : '#d97706'}}>{pendingCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#92400e'}}>⏳ แชทค้าง</div>
                </div>
                <div title={`ลูกค้ารอเราทำ: ${redWaitCount} ราย`} style={cardStyle(redWaitCount > 0 ? '#fee2e2' : '#fef2f2', statusFilter === 'redwait')}
                  onClick={() => setStatusFilter(statusFilter === 'redwait' ? 'all' : 'redwait')}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#dc2626'}}>{redWaitCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#991b1b'}}>🔴 ลูกค้ารอ</div>
                </div>
                <div title={`เรารอลูกค้า: ${blueWaitCount} ราย`} style={cardStyle(blueWaitCount > 0 ? '#dbeafe' : '#eff6ff', statusFilter === 'bluewait')}
                  onClick={() => setStatusFilter(statusFilter === 'bluewait' ? 'all' : 'bluewait')}>
                  <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#1d4ed8'}}>{blueWaitCount}</div>
                  <div style={{fontSize: '0.6rem', color: '#1e3a8a'}}>🔵 รอลูกค้า</div>
                </div>
                {appointCount > 0 && (
                  <div title={`มีนัด: ${appointCount} ราย`} style={cardStyle('#f0fdf4', statusFilter === 'appointed')}
                    onClick={() => setStatusFilter(statusFilter === 'appointed' ? 'all' : 'appointed')}>
                    <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#16a34a'}}>{appointCount}</div>
                    <div style={{fontSize: '0.6rem', color: '#166534'}}>📅 มีนัด</div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="chat-container shadow" style={{ flex: 1, minHeight: 0 }}>
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

          {/* Search + Sales Filter */}
          <div style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '4px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <i className="fa-solid fa-search" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.7rem' }}></i>
              <input 
                placeholder="ค้นหาชื่อ..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                style={{ width: '100%', padding: '0.35rem 0.3rem 0.35rem 1.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', outline: 'none' }} 
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position:'absolute', right:'6px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'0.7rem' }}>✕</button>}
            </div>
            <select value={salesFilter} onChange={e => setSalesFilter(e.target.value)} style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem', maxWidth: '80px', color: salesFilter === 'all' ? '#94a3b8' : '#0f172a' }}>
              <option value="all">ทุกเซล</option>
              {allSalesNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem', color: statusFilter === 'all' ? '#94a3b8' : '#0f172a', background: statusFilter === 'unread' ? '#dcfce7' : statusFilter === 'nochat' ? '#fee2e2' : statusFilter === 'incomplete' ? '#fef3c7' : 'white' }}>
              <option value="all">ล่าสุด</option>
              <option value="unread">🟢 ไม่อ่าน</option>
              <option value="nochat">❌ ไม่มีแชท</option>
              <option value="incomplete">⚠️ ข้อมูลน้อย</option>
              <option value="nosales">👤? ไม่มีเซล</option>
              <option value="complete">✅ ครบ 10+</option>
            </select>
            <button onClick={markAllRead} title="อ่านทั้งหมด" style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f0fdf4', cursor: 'pointer', fontSize: '0.65rem', color: '#16a34a', whiteSpace: 'nowrap' }}>✓ อ่านแล้ว</button>
          </div>

          {/* Contact Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredLeads.length === 0 && <div className="p-4" style={{color:'#888'}}>ไม่พบลูกค้าในช่องทางนี้...</div>}
          
          {filteredLeads.map(lead => {
            const lastMsg = lead.messages.length > 0 ? lead.messages[lead.messages.length - 1] : { type: 'text', text_content: 'ไม่มีบทสนทนา' };
            let previewText = lastMsg.type === 'image' ? '[📷 รูปภาพ]' : lastMsg.type === 'file' ? '[📎 ไฟล์]' : lastMsg.text_content;
            const platConf = PLATFORM_CONFIG[lead.platform] || PLATFORM_CONFIG.line;
            const revGrade = REVENUE_GRADES[lead.company_revenue_grade];
            
            // Smart 3-state status
            const chatStatus = getChatStatus(lead);
            const unreadCount = getUnreadCount(lead);
            const STATUS_BADGE = {
              new:  { bg: '#ef4444', emoji: '', show: true },
              read: { bg: '#f59e0b', emoji: '', show: true },
              replied: { bg: null, emoji: '', show: false },
              done: { bg: null, emoji: '', show: false },
            };
            const badge = STATUS_BADGE[chatStatus];
            
            return (
              <div 
                key={lead.id} 
                className={`chat-item ${activeLeadId === lead.id ? 'active' : ''}`} 
                onClick={() => {
                    setActiveLeadId(lead.id);
                    setEditingLead(false);
                    markAsRead(lead.id, lead.messages);
                    fetchQuotes(lead.id);
                }}
                style={{ borderLeft: `3px solid ${platConf.color}`, display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    {lead.avatar_url ? (
                        <img src={lead.avatar_url} alt="" className="avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div className="avatar" style={{ background: platConf.bg, color: platConf.color, width: '45px', height: '45px', fontWeight: 700 }}>
                            {(lead.erp_alias_name || lead.original_name || '?').charAt(0)}
                        </div>
                    )}
                    <div style={{
                        position: 'absolute', bottom: -3, right: -3, width: '18px', height: '18px', borderRadius: '50%',
                        background: 'white', border: `2px solid ${platConf.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <i className={platConf.icon} style={{ fontSize: '0.55rem', color: platConf.color }}></i>
                    </div>
                </div>

                {/* Name + Preview */}
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                    <h5 style={{margin: '0 0 0.2rem 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                        <span style={{
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px',
                          color: ['nt','na','al'].includes(lead.sales_status) ? '#dc2626' : lead.erp_alias_name?.startsWith('C') ? '#16a34a' : lead.erp_alias_name?.startsWith('O') ? '#f59e0b' : '#0f172a',
                          textDecoration: ['nt','na','al'].includes(lead.sales_status) ? 'line-through' : 'none',
                          opacity: ['nt','na','al'].includes(lead.sales_status) ? 0.6 : 1,
                          fontWeight: unreadCount > 0 ? 800 : 600
                        }}>
                          {lead.erp_alias_name || lead.original_name}
                        </span>
                        {lead.visit_required && <i className="fa-solid fa-building" style={{ color: '#6366f1', fontSize: '0.7rem' }} title="ต้องเข้าพบ"></i>}
                    </h5>
                    <p style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: unreadCount > 0 ? '#0f172a' : '#94a3b8', margin: 0, fontWeight: unreadCount > 0 ? 600 : 400 }}>
                        {previewText}
                    </p>
                    <div style={{fontSize: '0.6rem', color: '#94a3b8', display: 'flex', gap: '0.3rem', marginTop: '0.15rem', alignItems: 'center'}}>
                        {lead.company_role || lead.industry ? <span>• {lead.company_role || lead.industry}</span> : null}
                        {revGrade && <span style={{ background: revGrade.bg, color: revGrade.color, padding: '0 0.3rem', borderRadius: '4px', fontWeight: 700 }}>{revGrade.label}</span>}
                    </div>
                    {/* Data Quality Badge */}
                    <div style={{fontSize: '0.55rem', display: 'flex', gap: '0.2rem', marginTop: '0.15rem', alignItems: 'center', flexWrap: 'wrap'}}>
                        {(() => {
                          const clientMsgs = lead.messages.filter(m => m.sender === 'client').length;
                          const adminMsgs = lead.messages.filter(m => m.sender === 'admin').length;
                          const total = lead.messages.length;
                          const parts = (lead.erp_alias_name || '').split('-');
                          const sales = parts.length >= 2 ? parts[1] : '';
                          return (
                            <>
                              {total === 0 ? (
                                <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 600 }}>❌ ไม่มีแชท</span>
                              ) : adminMsgs > 0 ? (
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 600 }} title="มีข้อมูล 2 ฝั่ง วิเคราะห์ได้">✅ {clientMsgs}↓ {adminMsgs}↑</span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 600 }} title="มีแค่ฝั่งลูกค้า ไม่เห็นเซลตอบ">⚠️ {clientMsgs}↓ 0↑</span>
                              )}
                              {!sales ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '0 0.25rem', borderRadius: '3px' }}>👤?</span>
                                : <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0 0.25rem', borderRadius: '3px' }}>👤{sales}</span>}
                            </>
                          );
                        })()}
                        {/* Waiting status tags */}
                        {(lead.tags || []).filter(t => ['รอราคา','รอตรวจ','แก้ไฟล์','รอผลิต','รอขนส่ง','รอบิล','คืนเงิน'].includes(t)).map(t => (
                          <span key={t} style={{ background: '#fee2e2', color: '#dc2626', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 600 }}>🔴{t}</span>
                        ))}
                        {(lead.tags || []).filter(t => ['รอไฟล์','รอโอนเงิน','รอตรวจไฟล์','รอตัดสินใจ'].includes(t)).map(t => (
                          <span key={t} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 600 }}>🔵{t}</span>
                        ))}
                        {(lead.tags || []).filter(t => t.startsWith('นัด:')).map(t => (
                          <span key={t} style={{ background: '#f0fdf4', color: '#16a34a', padding: '0 0.25rem', borderRadius: '3px', fontWeight: 600 }}>📅{t.replace('นัด:','')}</span>
                        ))}
                    </div>
                </div>

                {/* Right: Time + Unread Badge (LINE-style) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '4px', minWidth: '40px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                        {lastMsg.created_at ? (() => {
                            const d = new Date(lastMsg.created_at);
                            const now = new Date();
                            const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                            const isYesterday = new Date(now.setDate(now.getDate() - 1)).getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
                            if (isToday) return d.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
                            if (isYesterday) return 'เมื่อวาน';
                            return d.toLocaleDateString('th-TH', {day:'2-digit', month:'short'});
                        })() : ''}
                    </span>
                    {unreadCount > 0 ? (
                      <div style={{
                        minWidth: '20px', height: '20px', borderRadius: '10px',
                        background: '#06c755', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 'bold', padding: '0 5px'
                      }}>{unreadCount > 99 ? '99+' : unreadCount}</div>
                    ) : chatStatus === 'read' ? (() => {
                      const mins = Math.round((Date.now() - new Date(lastMsg.created_at).getTime()) / 60000);
                      const label = mins < 60 ? `${mins}น.` : mins < 1440 ? `${Math.round(mins/60)}ชม.` : `${Math.round(mins/1440)}วัน`;
                      const isUrgent = mins > 1440;
                      return <div style={{
                        padding: '0.1rem 0.3rem', borderRadius: '8px', fontSize: '0.55rem', fontWeight: 'bold',
                        background: isUrgent ? '#fee2e2' : '#fef3c7', color: isUrgent ? '#dc2626' : '#92400e',
                        whiteSpace: 'nowrap'
                      }} title="อ่านแล้ว ยังไม่ตอบ">⏳{label}</div>;
                    })() : chatStatus === 'replied' ? (
                      <div style={{ fontSize: '0.6rem', color: '#3b82f6' }} title="ตอบแล้ว">✓✓</div>
                    ) : null}
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
                          <button className="btn" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem', background: showQuotePanel ? '#7c3aed' : '#f8fafc', color: showQuotePanel ? 'white' : '#7c3aed', border: '1px solid #7c3aed'}} onClick={() => setShowQuotePanel(!showQuotePanel)}>
                              <i className="fa-solid fa-tags"></i> ราคา ({customerQuotes.length})
                          </button>
                          <button className="btn btn-primary" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem', background: '#1e293b', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} onClick={() => setShowOrderModal(true)}>
                              <i className="fa-solid fa-file-invoice"></i> สร้างใบงานผลิต
                          </button>
                          {/* Sync Chat Button */}
                          <button className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize:'0.8rem', borderColor: '#e2e8f0', color: '#64748b'}} onClick={() => setShowChatUploadModal(true)}>
                              <i className="fa-solid fa-rotate"></i> ดึงแชท
                          </button>
                        </>
                    )}
                </div>
            </div>

            {/* ★ Waiting Status Bar */}
            {!editingLead && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* ลูกค้ารอเรา (Red) */}
                {[
                  { tag: 'รอราคา', icon: '💰' },
                  { tag: 'รอตรวจ', icon: '👁️' },
                  { tag: 'แก้ไฟล์', icon: '🔧' },
                  { tag: 'รอผลิต', icon: '🏭' },
                  { tag: 'รอขนส่ง', icon: '📦' },
                  { tag: 'รอบิล', icon: '🧾' },
                  { tag: 'คืนเงิน', icon: '💸' },
                ].map(w => {
                  const active = (activeLead.tags || []).includes(w.tag);
                  return <button key={w.tag} onClick={() => toggleWaitTag(w.tag)} style={{
                    padding: '0.15rem 0.4rem', borderRadius: '6px', fontSize: '0.6rem', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#fee2e2' : '#f8fafc', color: active ? '#dc2626' : '#94a3b8',
                    border: active ? '2px solid #fca5a5' : '1px solid #e2e8f0'
                  }}>{w.icon} {w.tag}</button>;
                })}
                <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 2px' }}></div>
                {/* เรารอลูกค้า (Blue) */}
                {[
                  { tag: 'รอไฟล์', icon: '📁' },
                  { tag: 'รอโอนเงิน', icon: '💳' },
                  { tag: 'รอตรวจไฟล์', icon: '📝' },
                  { tag: 'รอตัดสินใจ', icon: '🤔' },
                ].map(w => {
                  const active = (activeLead.tags || []).includes(w.tag);
                  return <button key={w.tag} onClick={() => toggleWaitTag(w.tag)} style={{
                    padding: '0.15rem 0.4rem', borderRadius: '6px', fontSize: '0.6rem', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#dbeafe' : '#f8fafc', color: active ? '#1d4ed8' : '#94a3b8',
                    border: active ? '2px solid #93c5fd' : '1px solid #e2e8f0'
                  }}>{w.icon} {w.tag}</button>;
                })}
                <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 2px' }}></div>
                {/* นัดวัน */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.6rem', color: '#64748b' }}>📅 นัด:</span>
                  <input type="date" value={(activeLead.tags || []).find(t => t.startsWith('นัด:'))?.replace('นัด:', '') || ''}
                    onChange={e => {
                      const dateVal = e.target.value;
                      const newTags = (activeLead.tags || []).filter(t => !t.startsWith('นัด:'));
                      if (dateVal) newTags.push('นัด:' + dateVal);
                      saveWaitTags(newTags);
                    }}
                    style={{ fontSize: '0.6rem', padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #e2e8f0', width: '110px' }}
                  />
                </div>
              </div>
            )}
            
            {/* ★ CRM Feedback & Win/Loss Tracking */}
            {!editingLead && (
              <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>📊 CRM Insight:</span>
                
                {/* 🏆 ซื้อเพราะ (Win Reasons) */}
                {[
                  { tag: '🏆ซื้อ:ราคาถูก', label: 'ราคาถูก' },
                  { tag: '🏆ซื้อ:โปรโมชั่น', label: 'โปรโมชั่น' },
                  { tag: '🏆ซื้อ:บริการ', label: 'บริการ' },
                  { tag: '🏆ซื้อ:ความน่าเชื่อถือ', label: 'น่าเชื่อถือ' },
                ].map(w => {
                  const active = (activeLead.tags || []).includes(w.tag);
                  return <button key={w.tag} onClick={() => toggleWaitTag(w.tag)} title="ลูกค้าตกลงซื้อเพราะอะไร" style={{
                    padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.58rem', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#fef3c7' : '#f8fafc', color: active ? '#d97706' : '#94a3b8',
                    border: active ? '1px solid #fcd34d' : '1px solid #e2e8f0'
                  }}>🏆 {w.label}</button>;
                })}

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1', margin: '0 2px' }}></div>
                
                {/* 💔 ไม่ซื้อเพราะ (Loss Reasons) */}
                {[
                  { tag: '💔แพ้:ราคาสูง', label: 'ราคาสูง' },
                  { tag: '💔แพ้:ตอบช้า', label: 'เงียบ/ตอบช้า' },
                  { tag: '💔แพ้:เทียบราคา', label: 'เทียบราคา' },
                  { tag: '💔แพ้:คิวเต็ม', label: 'คิวเต็ม' },
                  { tag: '💔แพ้:เสนอราคาช้า', label: 'เสนอราคาช้า' },
                ].map(w => {
                  const active = (activeLead.tags || []).includes(w.tag);
                  return <button key={w.tag} onClick={() => toggleWaitTag(w.tag)} title="ลูกค้าไม่ซื้อเพราะอะไร" style={{
                    padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.58rem', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#fee2e2' : '#f8fafc', color: active ? '#dc2626' : '#94a3b8',
                    border: active ? '1px solid #fca5a5' : '1px solid #e2e8f0'
                  }}>💔 {w.label}</button>;
                })}

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1', margin: '0 2px' }}></div>
                
                {/* ⭐ คำชมเซล (Compliments) */}
                {[
                  { tag: '⭐ชม:บริการดี', label: 'บริการดี' },
                  { tag: '⭐ชม:งานสวย', label: 'งานสวย' },
                  { tag: '⭐ชม:รวดเร็ว', label: 'ทำงานเร็ว' },
                ].map(w => {
                  const active = (activeLead.tags || []).includes(w.tag);
                  return <button key={w.tag} onClick={() => toggleWaitTag(w.tag)} title="คำชมจากลูกค้า" style={{
                    padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.58rem', cursor: 'pointer', fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#ecfdf5' : '#f8fafc', color: active ? '#059669' : '#94a3b8',
                    border: active ? '1px solid #6ee7b7' : '1px solid #e2e8f0'
                  }}>⭐ {w.label}</button>;
                })}
              </div>
            )}
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
          
          {/* ★ Price Tracking Panel */}
          {showQuotePanel && (() => {
            const quotes = customerQuotes.filter(q => (q.type || 'quote') === quoteTab);
            const purchases = customerQuotes.filter(q => (q.type || 'quote') === 'purchase');
            const allQuotes = customerQuotes.filter(q => (q.type || 'quote') === 'quote');
            const totalPurchaseAmount = purchases.reduce((s, q) => s + (Number(q.total_price) || 0), 0);

            // Month filter options
            const monthOptions = [...new Set(customerQuotes.map(q => {
              const d = new Date(q.quote_date || q.created_at);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }))].sort().reverse();
            const formatMonth = (ym) => { const [y, m] = ym.split('-'); const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; return `${months[parseInt(m)-1]} ${(parseInt(y)+543).toString().slice(-2)}`; };

            // Filter by month
            const filtered = quoteMonthFilter === 'all' ? quotes : quotes.filter(q => {
              const d = new Date(q.quote_date || q.created_at);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === quoteMonthFilter;
            });

            return (
            <div style={{ background: '#faf5ff', borderBottom: '2px solid #7c3aed', padding: '0.8rem 1rem', maxHeight: '380px', overflowY: 'auto' }}>
              {/* Summary Bar & Close Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 'bold' }}>🟡 เสนอ {allQuotes.length} ครั้ง</span>
                  <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 'bold' }}>✅ ซื้อ {purchases.length} ครั้ง</span>
                  {totalPurchaseAmount > 0 && <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 'bold' }}>💰 ยอดรวม ฿{totalPurchaseAmount.toLocaleString()}</span>}
                </div>
                <button 
                  onClick={() => setShowQuotePanel(false)} 
                  style={{ background: 'transparent', border: '1px solid #c084fc', color: '#7e22ce', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <i className="fa-solid fa-chevron-up"></i> พับเก็บ
                </button>
              </div>

              {/* Tabs + Filter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '2px', background: '#e9d5ff', borderRadius: '8px', padding: '2px' }}>
                  {[{key:'quote',label:'🟡 เสนอราคา'},{key:'purchase',label:'✅ ซื้อสินค้า'}].map(t => (
                    <button key={t.key} onClick={() => setQuoteTab(t.key)} style={{ padding:'0.25rem 0.6rem', fontSize:'0.72rem', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight: quoteTab === t.key ? 'bold' : 'normal', background: quoteTab === t.key ? 'white' : 'transparent', color: quoteTab === t.key ? '#7c3aed' : '#6b7280', boxShadow: quoteTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{t.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <select value={quoteMonthFilter} onChange={e => setQuoteMonthFilter(e.target.value)} style={{ padding:'0.2rem 0.3rem', fontSize:'0.68rem', borderRadius:'4px', border:'1px solid #d4d4d8', background:'white' }}>
                    <option value="all">ทั้งหมด</option>
                    {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                  <button onClick={() => { setShowQuoteForm(!showQuoteForm); setQuoteForm({ product_name: '', category: 'ใบปลิว/แผ่นพับ', specs: '', quantity: '', price_per_unit: '', total_price: '', notes: '', quote_date: new Date().toISOString().split('T')[0] }); }} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                    {showQuoteForm ? '✕ ปิด' : `+ ${quoteTab === 'quote' ? 'เสนอราคา' : 'บันทึกซื้อ'}`}
                  </button>
                </div>
              </div>

              {/* Add Form */}
              {showQuoteForm && (
                <div style={{ background: 'white', borderRadius: '8px', padding: '0.6rem', marginBottom: '0.5rem', border: `2px solid ${quoteTab === 'quote' ? '#fbbf24' : '#34d399'}` }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: quoteTab === 'quote' ? '#92400e' : '#065f46', marginBottom: '0.3rem' }}>
                    {quoteTab === 'quote' ? '🟡 บันทึกเสนอราคาใหม่' : '✅ บันทึกซื้อสินค้า'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.75rem' }}>
                    <input type="date" value={quoteForm.quote_date} onChange={e => setQuoteForm({...quoteForm, quote_date: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8', gridColumn:'1/3' }} />
                    <input placeholder="ชื่อสินค้า *" value={quoteForm.product_name} onChange={e => setQuoteForm({...quoteForm, product_name: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8', gridColumn:'1/3' }} />
                    <select value={quoteForm.category} onChange={e => setQuoteForm({...quoteForm, category: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8' }}>
                      {PRICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input placeholder="จำนวน" type="number" value={quoteForm.quantity} onChange={e => setQuoteForm({...quoteForm, quantity: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8' }} />
                    <input placeholder="ราคา/หน่วย" type="number" step="0.01" value={quoteForm.price_per_unit} onChange={e => setQuoteForm({...quoteForm, price_per_unit: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8' }} />
                    <input placeholder="ราคารวม" type="number" step="0.01" value={quoteForm.total_price} onChange={e => setQuoteForm({...quoteForm, total_price: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8' }} />
                    <input placeholder="สเปค/รายละเอียด" value={quoteForm.specs} onChange={e => setQuoteForm({...quoteForm, specs: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8', gridColumn:'1/3' }} />
                    <input placeholder="หมายเหตุ" value={quoteForm.notes} onChange={e => setQuoteForm({...quoteForm, notes: e.target.value})} style={{ padding:'0.3rem', borderRadius:'4px', border:'1px solid #d4d4d8' }} />
                    <div style={{ gridColumn: '1/3', display: 'flex', gap: '0.3rem' }}>
                      <button onClick={async () => {
                        if (!quoteForm.product_name) return alert('กรุณาใส่ชื่อสินค้า');
                        try {
                          const erpUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
                          await axios.post(`${API_URL}/customer_quotes`, { ...quoteForm, lead_id: activeLeadId, quoted_by: erpUser.name || 'Sales', type: quoteTab });
                          fetchQuotes(activeLeadId);
                          setShowQuoteForm(false);
                        } catch(e) { alert('Error: ' + e.message); }
                      }} style={{ flex: 1, background: quoteTab === 'quote' ? '#f59e0b' : '#10b981', color:'white', border:'none', borderRadius:'4px', padding:'0.4rem', cursor:'pointer', fontWeight:'bold' }}>
                        💾 {quoteTab === 'quote' ? 'บันทึก' : 'บันทึกการซื้อ'}
                      </button>
                      
                      {quoteTab === 'quote' && (
                        <button onClick={async () => {
                          if (!quoteForm.product_name) return alert('กรุณาใส่ชื่อสินค้าก่อนครับ');
                          const quoteMsg = `📋 *ใบเสนอราคาเบื้องต้น*\nสินค้า: ${quoteForm.product_name}\nหมวดหมู่: ${quoteForm.category}\nสเปค: ${quoteForm.specs}\nจำนวน: ${quoteForm.quantity} ชิ้น\nราคา: ${Number(quoteForm.total_price).toLocaleString()} บาท\nหมายเหตุ: ${quoteForm.notes}\n\nหากลูกค้ายืนยัน สามารถแจ้งแอดมินเพื่อดำเนินการต่อได้เลยครับ 😊`;
                          setInputValue(quoteMsg);
                        }} style={{ flex: 2, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color:'white', border:'none', borderRadius:'4px', padding:'0.4rem', cursor:'pointer', fontWeight:'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}>
                          <i className="fa-solid fa-bolt"></i> สร้างข้อความเสนอราคาด่วน
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Record List */}
              {filtered.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', margin: '0.5rem 0' }}>
                  {quoteTab === 'quote' ? 'ยังไม่มีประวัติเสนอราคา' : 'ยังไม่มีประวัติซื้อสินค้า'} — กด "+" เพื่อเพิ่ม
                </p>
              ) : filtered.map(q => {
                const qDate = q.quote_date ? new Date(q.quote_date) : new Date(q.created_at);
                const dateStr = qDate.toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' });
                const roundLabel = quoteTab === 'quote' ? `ครั้งที่ ${q.round_number || '?'}` : `ซื้อครั้งที่ ${q.round_number || '?'}`;
                const borderColor = q.status === 'ordered' ? '#34d399' : q.status === 'rejected' ? '#fca5a5' : '#fbbf24';

                return (
                <div key={q.id} style={{ background: 'white', borderRadius: '8px', padding: '0.5rem 0.6rem', marginBottom: '0.4rem', borderLeft: `4px solid ${borderColor}`, border: '1px solid #e9d5ff', borderLeftWidth: '4px', borderLeftColor: borderColor, fontSize: '0.75rem' }}>
                  {/* Header: round + date + actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ background: quoteTab === 'quote' ? '#fef3c7' : '#d1fae5', color: quoteTab === 'quote' ? '#92400e' : '#065f46', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>{roundLabel}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.65rem', marginLeft: '0.4rem' }}>📅 {dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {quoteTab === 'quote' && [
                        { s: 'quoted', label: '🟡 รอ', bg: '#fef3c7', c: '#92400e' },
                        { s: 'ordered', label: '✅ สั่งแล้ว', bg: '#d1fae5', c: '#065f46' },
                        { s: 'rejected', label: '❌ ไม่สั่ง', bg: '#fee2e2', c: '#991b1b' },
                      ].map(btn => (
                        <button key={btn.s} onClick={async () => {
                          if (btn.s === 'ordered') {
                            // Convert quote to purchase
                            try { await axios.post(`${API_URL}/customer_quotes/${q.id}/convert`); fetchQuotes(activeLeadId); } catch(e) { await axios.put(`${API_URL}/customer_quotes/${q.id}`, { status: btn.s }); fetchQuotes(activeLeadId); }
                          } else if (btn.s === 'rejected') {
                            const reason = prompt('เหตุผลที่ไม่สั่ง (ไม่บังคับ):');
                            await axios.put(`${API_URL}/customer_quotes/${q.id}`, { status: btn.s, rejection_reason: reason || '' });
                            fetchQuotes(activeLeadId);
                          } else {
                            await axios.put(`${API_URL}/customer_quotes/${q.id}`, { status: btn.s });
                            fetchQuotes(activeLeadId);
                          }
                        }} style={{ padding:'0.1rem 0.3rem', fontSize:'0.6rem', borderRadius:'4px', cursor:'pointer', border: q.status === btn.s ? 'none' : '1px solid #e2e8f0', background: q.status === btn.s ? btn.bg : 'white', color: btn.c, fontWeight: q.status === btn.s ? 'bold' : 'normal' }}>{btn.label}</button>
                      ))}
                      <button onClick={async () => { if(confirm('ลบรายการนี้?')) { await axios.delete(`${API_URL}/customer_quotes/${q.id}`); fetchQuotes(activeLeadId); }}} style={{ padding:'0.1rem 0.3rem', fontSize:'0.6rem', borderRadius:'4px', cursor:'pointer', border:'1px solid #fecaca', background:'white', color:'#dc2626' }}>🗑️</button>
                    </div>
                  </div>

                  {/* Product info */}
                  <div style={{ marginTop: '0.3rem' }}>
                    <strong style={{ color: '#0f172a' }}>📦 {q.product_name}</strong>
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', marginLeft: '0.3rem' }}>({q.category})</span>
                  </div>

                  {/* Price details */}
                  <div style={{ color: '#64748b', marginTop: '0.15rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {q.quantity && <span>📊 {Number(q.quantity).toLocaleString()} ชิ้น</span>}
                    {q.price_per_unit && <span>💲 @{Number(q.price_per_unit).toFixed(2)}</span>}
                    <strong style={{ color: '#7c3aed' }}>💰 ฿{q.total_price ? Number(q.total_price).toLocaleString() : '-'}</strong>
                  </div>

                  {/* Specs + Meta */}
                  {q.specs && <div style={{ color: '#475569', marginTop: '0.1rem', fontSize: '0.68rem' }}>📋 {q.specs}</div>}
                  <div style={{ color: '#94a3b8', marginTop: '0.1rem', fontSize: '0.62rem' }}>
                    👤 {q.quoted_by || '-'}
                    {q.ref_quote_id && <span> • 🔗 จาก Quote</span>}
                    {q.rejection_reason && <span style={{ color: '#dc2626' }}> • ❌ {q.rejection_reason}</span>}
                    {q.notes && <span> • 📝 {q.notes}</span>}
                  </div>
                </div>
              );
              })}
            </div>
          );
          })()}

          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: '#f1f5f9' }}>
            {activeLead.messages.map((msg, idx) => {
              const msgDate = msg.created_at ? new Date(msg.created_at) : null;
              const timeStr = msgDate ? msgDate.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '';
              const dateStr = msgDate ? msgDate.toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: '2-digit'}) : '';
              
              // Show date separator when date changes
              const prevMsg = idx > 0 ? activeLead.messages[idx - 1] : null;
              const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at).toDateString() : null;
              const currentDate = msgDate ? msgDate.toDateString() : null;
              const showDateSep = idx === 0 || currentDate !== prevDate;
              
              // Check if message is today
              const isToday = currentDate === new Date().toDateString();
              const isYesterday = currentDate === new Date(Date.now() - 86400000).toDateString();
              const dateSepLabel = isToday ? '📅 วันนี้' : isYesterday ? '📅 เมื่อวาน' : `📅 ${dateStr}`;
              
              return (
              <div key={idx}>
                  {showDateSep && (
                    <div style={{ textAlign: 'center', margin: '0.8rem 0', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#cbd5e1' }}></div>
                      <span style={{ position: 'relative', background: '#f1f5f9', padding: '0.2rem 0.8rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        {dateSepLabel}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'client' ? 'flex-start' : 'flex-end', marginBottom: '1rem' }}>
                  {msg.sender === 'client' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', marginLeft: '0.5rem' }}>{activeLead.original_name}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: msg.sender === 'client' ? 'row' : 'row-reverse', gap: '0.5rem' }}>
                      <div className={`message ${msg.sender === 'client' ? 'msg-client' : 'msg-admin'}`} style={{ margin: 0, maxWidth: '300px' }}>
                        {msg.type === 'text' && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text_content}</div>}
                        {msg.type === 'image' && msg.media_url && (
                          <div style={{ cursor: 'zoom-in' }} onClick={() => setPreviewImage(msg.media_url)}>
                              <img 
                                src={msg.media_url.startsWith('http://localhost') ? msg.media_url.replace('http://localhost:3001', '') : msg.media_url} 
                                alt="Media" 
                                style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '<div style="padding:0.5rem;background:#f1f5f9;border-radius:8px;color:#64748b;font-size:0.75rem;text-align:center">📷 รูปภาพ (ไม่สามารถโหลดได้)</div>';
                                }}
                              />
                          </div>
                        )}
                        {msg.type === 'image' && !msg.media_url && (
                          <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: '8px', color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                            📷 รูปภาพ (ยังไม่มีลิงก์)
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{!isToday && !isYesterday ? `${dateStr} ` : ''}{timeStr}</div>
                  </div>
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
                {/* 🖼️ Product Image Categories */}
                {['กล่องบรรจุภัณฑ์', 'ถุงกระดาษ', 'สติ๊กเกอร์', 'ใบปลิว', 'ป้าย Tag'].map((cat, idx) => (
                  <button key={`img-${idx}`} className="btn" style={{fontSize: '0.7rem', padding: '0.2rem 0.5rem', border: `1px solid #10b981`, color: '#059669', background: '#f0fdf4', borderRadius: '20px'}} onClick={() => alert(`เปิดคลังรูป: ${cat}`)}>
                      <i className="fa-solid fa-image"></i> รูป{cat}
                  </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <select 
                  className="form-control" 
                  style={{ width: '130px', fontSize: '0.8rem', padding: '0.6rem', background: activeSalesRep ? '#e0e7ff' : '#fee2e2', borderColor: activeSalesRep ? '#818cf8' : '#fca5a5' }}
                  value={activeSalesRep}
                  onChange={e => {
                    setActiveSalesRep(e.target.value);
                    localStorage.setItem('activeSalesRep', e.target.value);
                    // Automatically assign lead if unassigned
                    if (e.target.value && activeLead && (!activeLead.erp_alias_name || activeLead.erp_alias_name.indexOf('-') === -1)) {
                      const newAlias = (activeLead.erp_alias_name || 'I') + '-' + e.target.value.split(' ')[0];
                      axios.put(`${API_URL}/leads/${activeLead.id}`, { erp_alias_name: newAlias }).then(fetchChats).catch(console.error);
                    }
                  }}
                >
                  <option value="">-- ผู้ตอบ --</option>
                  <option value="KW กวาง">KW กวาง</option>
                  <option value="KW2 อาร์ท">KW2 อาร์ท</option>
                  <option value="BK แบงค์">BK แบงค์</option>
                  <option value="aem อีม">aem อีม</option>
                  <option value="แอดมิน ตะวัน">แอดมิน ตะวัน</option>
                  <option value="แอดมิน ปูเป้">แอดมิน ปูเป้</option>
                </select>

                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={activeSalesRep ? `กำลังตอบในนาม: ${activeSalesRep}...` : "กรุณาเลือกชื่อผู้ตอบก่อนส่งข้อความ!"}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (!activeSalesRep) { alert("กรุณาเลือกผู้ตอบก่อนครับ!"); return; }
                      handleSendMessage();
                    }
                  }}
                />
                <button className="btn btn-primary" onClick={() => {
                  if (!activeSalesRep) { alert("กรุณาเลือกผู้ตอบก่อนครับ!"); return; }
                  handleSendMessage();
                }} style={{ padding: '0.8rem 1.2rem' }}>
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
      {/* Manual Chat Upload Modal */}
      {showChatUploadModal && activeLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#0f172a' }}><i className="fa-solid fa-cloud-arrow-up text-primary"></i> ดึงแชทย้อนหลัง (Manual Sync)</h4>
                    <button className="btn" style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setShowChatUploadModal(false)}>×</button>
                </div>
                
                <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#92400e', marginBottom: '1rem' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> <b>ข้อจำกัดของระบบ LINE:</b> LINE API ไม่อนุญาตให้ดึงประวัติแชทเก่าผ่านระบบอัตโนมัติ หากต้องการนำแชทเก่าของลูกค้ารายนี้มาวิเคราะห์ คุณต้อง <b>Export ไฟล์แชทจาก LINE Official Account Manager</b> (.txt หรือ .csv) แล้วนำมาอัพโหลดที่นี่
                </div>

                <div style={{ border: '2px dashed #cbd5e1', padding: '2rem', textAlign: 'center', borderRadius: '8px', background: '#f8fafc', marginBottom: '1rem', cursor: 'pointer' }}>
                  <i className="fa-solid fa-file-csv" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '0.5rem' }}></i>
                  <div style={{ fontWeight: 'bold', color: '#475569' }}>แนบไฟล์แชทจาก LINE (.txt, .csv)</div>
                  <input type="file" accept=".txt,.csv" style={{ marginTop: '1rem' }} />
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>เฉพาะประวัติแชทของ: {activeLead.erp_alias_name || activeLead.original_name}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-outline" onClick={() => setShowChatUploadModal(false)}>ยกเลิก</button>
                    <button className="btn btn-primary" onClick={() => {
                        alert('อัพโหลดสำเร็จ! ระบบจะทำการประมวลผลข้อความและนำไปให้ AI วิเคราะห์ต่อไป');
                        setShowChatUploadModal(false);
                    }}>อัพโหลดข้อมูล</button>
                </div>
            </div>
        </div>
      )}

      {/* Generic Data Upload Modal (Images, Contacts, Quotes) */}
      {showDataUploadModal.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#0f172a' }}>
                      {showDataUploadModal.type === 'images' && <><i className="fa-solid fa-images text-primary"></i> อัพโหลดคลังรูปสินค้า</>}
                      {showDataUploadModal.type === 'contacts' && <><i className="fa-solid fa-users text-primary"></i> นำเข้ารายชื่อลูกค้าเก่า</>}
                      {showDataUploadModal.type === 'quotes' && <><i className="fa-solid fa-file-invoice-dollar text-primary"></i> นำเข้าประวัติใบสั่งงาน/เสนอราคา</>}
                    </h4>
                    <button className="btn" style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setShowDataUploadModal({ visible: false, type: '' })}>×</button>
                </div>

                {showDataUploadModal.type === 'images' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>เลือกหมวดหมู่รูปภาพ:</label>
                    <select className="form-control" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option>กล่องบรรจุภัณฑ์</option>
                      <option>ถุงกระดาษ</option>
                      <option>สติ๊กเกอร์</option>
                      <option>ใบปลิว</option>
                      <option>ป้าย Tag</option>
                      <option>อื่นๆ</option>
                    </select>
                  </div>
                )}

                <div style={{ border: '2px dashed #cbd5e1', padding: '2rem', textAlign: 'center', borderRadius: '8px', background: '#f8fafc', marginBottom: '1rem' }}>
                  <i className={`fa-solid ${showDataUploadModal.type === 'images' ? 'fa-cloud-arrow-up' : 'fa-file-excel'}`} style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '0.5rem' }}></i>
                  <div style={{ fontWeight: 'bold', color: '#475569' }}>
                    {showDataUploadModal.type === 'images' ? 'เลือกรูปภาพที่ต้องการอัพโหลด (อัพได้หลายไฟล์)' : 'เลือกไฟล์ CSV หรือ Excel'}
                  </div>
                  <input type="file" multiple={showDataUploadModal.type === 'images'} accept={showDataUploadModal.type === 'images' ? 'image/*' : '.csv,.xlsx,.xls'} style={{ marginTop: '1rem' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn btn-outline" onClick={() => setShowDataUploadModal({ visible: false, type: '' })}>ยกเลิก</button>
                    <button className="btn btn-primary" onClick={() => {
                        alert('ฟังก์ชั่นส่งไฟล์ไปหลังบ้าน (Backend API) จะเชื่อมต่อในสเตปถัดไปครับ เตรียมไฟล์ไว้ได้เลย!');
                        setShowDataUploadModal({ visible: false, type: '' });
                    }}>อัพโหลดไฟล์</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
