"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Bug, Lightbulb, HelpCircle, Wrench, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  type?: 'chat' | 'bug' | 'suggestion';
}

const QUICK_ACTIONS = [
  { label: '📊 ยอดขายวันนี้', query: 'ยอดขายวันนี้เท่าไหร่', icon: '📊' },
  { label: '📦 งานค้างกี่ Job', query: 'งานค้างกี่ Job ยังไม่เสร็จ', icon: '📦' },
  { label: '⚠️ ของเสียเดือนนี้', query: 'ของเสียเดือนนี้เท่าไหร่ สาเหตุอะไร', icon: '⚠️' },
  { label: '🏭 สถานะเครื่องจักร', query: 'เครื่องจักรสถานะเป็นอย่างไร', icon: '🏭' },
];

const REPORT_TYPES = [
  { id: 'bug', label: 'แจ้งปัญหาระบบ', icon: <Bug className="w-5 h-5" />, color: '#EF4444', placeholder: 'อธิบายปัญหาที่เจอ เช่น กดบันทึกแล้วค้าง, หน้าจอขาว...' },
  { id: 'suggestion', label: 'แนะนำปรับปรุง', icon: <Lightbulb className="w-5 h-5" />, color: '#F59E0B', placeholder: 'อยากให้ปรับอะไร เช่น เพิ่มปุ่ม, เปลี่ยนสี, เพิ่มฟีเจอร์...' },
  { id: 'help', label: 'ขอความช่วยเหลือ', icon: <HelpCircle className="w-5 h-5" />, color: '#3B82F6', placeholder: 'ติดอะไร? ใช้งานอะไรไม่เป็น? ถามได้เลย...' },
];

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: '🤖 สวัสดีครับ! ผม BCD AI ผู้ช่วยระบบ ERP\n\nถามอะไรก็ได้ครับ:\n• ยอดขาย งาน สถานะต่างๆ\n• ปัญหาการใช้ระบบ\n• แนะนำปรับปรุง\n\nหรือกดปุ่มด่วนด้านล่างเลย 👇',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'report'>('chat');
  const [reportType, setReportType] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg: Message = {
      role: 'user',
      content: msgText,
      timestamp: new Date().toISOString(),
      type: 'chat',
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call backend AI Agent API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API_URL}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msgText }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          role: 'ai',
          content: data.answer,
          timestamp: data.timestamp || new Date().toISOString(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: '❌ ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ตรวจสอบอินเตอร์เน็ต',
        timestamp: new Date().toISOString(),
      }]);
    }

    setLoading(false);
  };

  const sendReport = async (type: string, text: string) => {
    if (!text.trim()) return;

    const typeLabel = REPORT_TYPES.find(r => r.id === type)?.label || type;
    const reportMsg: Message = {
      role: 'user',
      content: `[${typeLabel}]\n${text}`,
      timestamp: new Date().toISOString(),
      type: type as any,
    };
    setMessages(prev => [...prev, reportMsg]);
    setInput('');
    setReportType('');
    setMode('chat');

    // TODO: Save to Supabase feedback table + notify LINE group
    // await fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ type, text }) });

    setMessages(prev => [...prev, {
      role: 'ai',
      content: `✅ รับแจ้ง "${typeLabel}" แล้วครับ!\n\nทีม IT จะได้รับแจ้งใน LINE ทันที\nหมายเลขอ้างอิง: #FB-${Date.now().toString(36).toUpperCase()}\n\nขอบคุณที่ช่วยปรับปรุงระบบ 🙏`,
      timestamp: new Date().toISOString(),
    }]);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <Link href="/factory/log" className="p-2 -ml-2 rounded-lg hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">🤖 BCD AI</h1>
            <p className="text-xs text-blue-200">ถาม · แจ้งปัญหา · แนะนำ</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${mode === 'chat' ? 'bg-white text-[#1F4E79]' : 'text-white/70'}`}
          >
            💬 แชท
          </button>
          <button
            onClick={() => setMode('report')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${mode === 'report' ? 'bg-white text-[#1F4E79]' : 'text-white/70'}`}
          >
            🔧 แจ้งปัญหา
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
              msg.role === 'user'
                ? msg.type === 'bug' ? 'bg-red-500 text-white' : msg.type === 'suggestion' ? 'bg-amber-500 text-white' : 'bg-[#1F4E79] text-white'
                : 'bg-white text-slate-800 border'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/50' : 'text-slate-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick actions / Report buttons */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2" style={{ maxWidth: 480, margin: '0 auto' }}>
        {mode === 'chat' && !reportType && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.query)}
                disabled={loading}
                className="whitespace-nowrap bg-white border shadow-sm rounded-full px-3 py-2 text-xs font-bold text-slate-700 active:bg-slate-100 transition flex-shrink-0"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {mode === 'report' && !reportType && (
          <div className="bg-white rounded-2xl shadow-lg border p-3 space-y-2">
            <p className="text-sm font-bold text-slate-700">เลือกประเภท:</p>
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setReportType(rt.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 active:border-slate-300 transition"
              >
                <div className="p-2 rounded-lg" style={{ backgroundColor: rt.color + '15', color: rt.color }}>
                  {rt.icon}
                </div>
                <span className="font-bold text-sm text-slate-700">{rt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-lg" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (reportType) {
                  sendReport(reportType, input);
                } else {
                  sendMessage();
                }
              }
            }}
            placeholder={reportType ? REPORT_TYPES.find(r => r.id === reportType)?.placeholder : 'พิมพ์คำถาม...'}
            className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#1F4E79] outline-none"
          />
          <button
            onClick={() => reportType ? sendReport(reportType, input) : sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-[#1F4E79] text-white p-3 rounded-xl disabled:opacity-40 active:scale-95 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
