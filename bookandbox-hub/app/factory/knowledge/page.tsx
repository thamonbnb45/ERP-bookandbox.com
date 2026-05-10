"use client";

import React, { useState } from 'react';
import { Search, ChevronLeft, Play, FileText, Upload, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface KnowledgeItem {
  id: string;
  title: string;
  type: 'video' | 'document';
  category: string;
  duration?: string;
  thumbnail?: string;
  url: string;
  views: number;
  updatedAt: string;
}

const CATEGORIES = [
  { id: 'all', label: '📁 ทั้งหมด' },
  { id: 'postpress', label: '🔧 หลังพิมพ์' },
  { id: 'printing', label: '🖨️ พิมพ์' },
  { id: 'prepress', label: '🎨 Pre-press' },
  { id: 'qa', label: '✅ QC/QA' },
  { id: 'logistics', label: '🚚 จัดส่ง' },
  { id: 'safety', label: '⛑️ ความปลอดภัย' },
  { id: 'general', label: '📋 ทั่วไป' },
];

// Mock data - in production, loaded from Supabase
const MOCK_ITEMS: KnowledgeItem[] = [
  { id: '1', title: 'วิธีพับกล่อง — ขั้นตอนและเทคนิค', type: 'video', category: 'postpress', duration: '2:30', url: '#', views: 45, updatedAt: '2026-05-01' },
  { id: '2', title: 'วิธีตัดกระดาษ — ความปลอดภัยและความแม่นยำ', type: 'video', category: 'postpress', duration: '1:45', url: '#', views: 62, updatedAt: '2026-04-28' },
  { id: '3', title: 'วิธีเคลือบ PVC ด้าน — ทำอย่างไรให้ไม่เป็นฟอง', type: 'video', category: 'postpress', duration: '3:00', url: '#', views: 38, updatedAt: '2026-04-25' },
  { id: '4', title: 'SOP การตรวจงานก่อนส่ง v2', type: 'document', category: 'qa', url: '#', views: 25, updatedAt: '2026-05-05' },
  { id: '5', title: 'วิธี Setup เครื่อง SM74F สำหรับมือใหม่', type: 'video', category: 'printing', duration: '5:00', url: '#', views: 30, updatedAt: '2026-04-20' },
  { id: '6', title: 'ตรวจไฟล์งานก่อนทำเพลท — Preflight Checklist', type: 'video', category: 'prepress', duration: '4:00', url: '#', views: 28, updatedAt: '2026-04-15' },
  { id: '7', title: 'PM Checklist เครื่องพิมพ์ SM74F', type: 'document', category: 'printing', url: '#', views: 15, updatedAt: '2026-04-10' },
  { id: '8', title: 'ขั้นตอนปั๊มฟอยล์ — ตั้งอุณหภูมิ+แรงกด', type: 'video', category: 'postpress', duration: '2:15', url: '#', views: 20, updatedAt: '2026-05-08' },
  { id: '9', title: 'วิธีแพ็คงานส่ง — มาตรฐานกล่องและกันกระแทก', type: 'video', category: 'logistics', duration: '1:30', url: '#', views: 55, updatedAt: '2026-05-02' },
  { id: '10', title: 'คู่มือความปลอดภัยในโรงงาน', type: 'document', category: 'safety', url: '#', views: 12, updatedAt: '2026-03-15' },
];

export default function KnowledgeHubPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  const filteredItems = MOCK_ITEMS.filter(item => {
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedItem) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="bg-[#1F4E79] text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-50 shadow-lg">
          <button onClick={() => setSelectedItem(null)} className="p-2 -ml-2 rounded-lg hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-sm font-bold truncate">{selectedItem.title}</h1>
        </div>
        <div className="p-4">
          {selectedItem.type === 'video' ? (
            <div className="bg-black rounded-2xl aspect-video flex items-center justify-center mb-4">
              <div className="text-center text-white">
                <Play className="w-16 h-16 mx-auto opacity-70 mb-2" />
                <p className="text-sm opacity-50">วิดีโอจะแสดงที่นี่</p>
                <p className="text-xs opacity-30">{selectedItem.duration}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center mb-4 border">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">เอกสาร PDF</p>
            </div>
          )}
          <div className="bg-white rounded-2xl p-4 border shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-2">{selectedItem.title}</h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>👁️ {selectedItem.views} ครั้ง</span>
              <span>📅 {new Date(selectedItem.updatedAt).toLocaleDateString('th-TH')}</span>
              <span className="capitalize">📂 {CATEGORIES.find(c => c.id === selectedItem.category)?.label}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <Link href="/factory/log" className="p-2 -ml-2 rounded-lg hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">📚 คู่มือ & คลิปสอน</h1>
            <p className="text-xs text-blue-200">Knowledge Hub</p>
          </div>
        </div>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">{MOCK_ITEMS.length} รายการ</span>
      </div>

      {/* Search */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาคู่มือ / คลิปสอน..."
            className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#1F4E79] outline-none text-sm"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition ${
                selectedCategory === cat.id ? 'bg-[#1F4E79] text-white' : 'bg-white text-slate-600 border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="px-4 space-y-2 pb-24">
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm">ไม่พบผลลัพธ์</p>
          </div>
        )}
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="w-full bg-white rounded-2xl p-3 shadow-sm border flex items-center gap-3 active:bg-slate-50 transition text-left"
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
              item.type === 'video' ? 'bg-red-50' : 'bg-blue-50'
            }`}>
              {item.type === 'video' ? (
                <div className="text-center">
                  <Play className="w-6 h-6 text-red-500 mx-auto" />
                  <span className="text-[9px] text-red-400 font-bold">{item.duration}</span>
                </div>
              ) : (
                <FileText className="w-6 h-6 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
              <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                <span>{CATEGORIES.find(c => c.id === item.category)?.label}</span>
                <span>👁️ {item.views}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="flex">
          <Link href="/factory/log" className="flex-1 py-3 text-center text-slate-400">
            <span className="text-xl block">📦</span>
            <span className="text-[10px] font-bold block mt-0.5">บันทึกงาน</span>
          </Link>
          <Link href="/factory/ai" className="flex-1 py-3 text-center text-slate-400">
            <span className="text-xl block">🤖</span>
            <span className="text-[10px] font-bold block mt-0.5">AI ช่วยเหลือ</span>
          </Link>
          <Link href="/factory/knowledge" className="flex-1 py-3 text-center text-[#1F4E79]">
            <span className="text-xl block">📚</span>
            <span className="text-[10px] font-bold block mt-0.5">คู่มือ/คลิป</span>
          </Link>
          <Link href="/" className="flex-1 py-3 text-center text-slate-400">
            <span className="text-xl block">📊</span>
            <span className="text-[10px] font-bold block mt-0.5">Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
