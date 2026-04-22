import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PROCESS_LABELS } from './SchedulingUtils';
import { Save, X, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const POSTPRESS_OPTIONS = ['lamination', 'diecut', 'folding', 'binding', 'cutting'];

export default function JobForm({ machines, onSubmit, onCancel, initialData }) {
  const printingMachines = machines.filter(m => m.type === 'printing');

  const { data: paperMaterials = [] } = useQuery({
    queryKey: ['materials-paper'],
    queryFn: () => base44.entities.Material.filter({ type: 'paper' }, 'name', 1000)
  });

  const PRODUCT_TYPES = [
    'ใบปลิว','โบรชัวร์ / แผ่นพับ','หนังสือ','กล่องบรรจุภัณฑ์',
    'บัตรพลาสติก / บัตรพีวีซี','ปฏิทิน','สติ๊กเกอร์','ป้ายแท็กสินค้า',
    'สายคาดกล่อง / สายคาดแก้ว','กระดาษรองจาน','กระดาษรองแก้ว',
    'กระดาษห่อสินค้า','ถุงกระดาษ','กล่องลูกฟูกประกบออฟเซท','นามบัตร',
    'โรลอัพ','ธงญี่ปุ่น','เอ็กแสตน','สแตนดี้','ป้ายไวนิล','เต๊นท์การ์ด',
    'ที่คั่นหนังสือ','สมุดบันทึก','บิลเล่ม / บิลต่อเนื่อง','แฟ้ม',
    'ซองจดหมาย','หัวจดหมาย','โปสเตอร์','โปสการ์ด','ที่แขวนประตู',
    'คูปอง / บัตรกำนัล','ถุงพลาสติก','สายคล้องบัตร'
  ];

  const [productSearch, setProductSearch] = useState(initialData?.product_type || '');
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (productRef.current && !productRef.current.contains(e.target)) setProductOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredProducts = PRODUCT_TYPES.filter(t =>
    t.toLowerCase().includes(productSearch.toLowerCase())
  );

  const [paperSearch, setPaperSearch] = useState(initialData?.paper || '');
  const [paperOpen, setPaperOpen] = useState(false);
  const paperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (paperRef.current && !paperRef.current.contains(e.target)) setPaperOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredPapers = paperMaterials.filter(m =>
    m.name.toLowerCase().includes(paperSearch.toLowerCase())
  );

  const [sizeUnit, setSizeUnit] = useState('cm'); // 'cm' or 'inch'
  const [hasSpecialColor, setHasSpecialColor] = useState(!!(initialData?.pantone_code));

  const [form, setForm] = useState(initialData || {
    job_number: '',
    product_type: '',
    quantity: '',
    colors: '',
    pantone_code: '',
    paper: '',
    printing_machine_id: '',
    postpress_steps: [],
    priority: 'normal',
    due_date: '',
    notes: '',
    size_w: '',
    size_h: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const togglePostpress = (step) => {
    setForm(prev => ({
      ...prev,
      postpress_steps: prev.postpress_steps.includes(step)
        ? prev.postpress_steps.filter(s => s !== step)
        : [...prev.postpress_steps, step]
    }));
  };

  // Convert size to cm before saving
  const toMm = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    return sizeUnit === 'inch' ? +(n * 25.4).toFixed(2) : +(n * 10).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      quantity: Number(form.quantity),
      colors: Number(form.colors),
      sheets: Number(form.sheets || 0),
      plates: Number(form.plates || 0),
      final_size_w: toMm(form.size_w),
      final_size_h: toMm(form.size_h),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">Job Number *</Label>
          <Input
            value={form.job_number}
            onChange={e => handleChange('job_number', e.target.value)}
            placeholder="JOB-001"
            required
          />
        </div>
        <div className="space-y-1.5" ref={productRef}>
          <Label className="text-xs font-medium text-gray-500">ประเภทสินค้า *</Label>
          <div className="relative">
            <div
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
              onClick={() => setProductOpen(o => !o)}
            >
              <span className={form.product_type ? 'text-foreground' : 'text-muted-foreground'}>
                {form.product_type || 'เลือกประเภทสินค้า'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            {productOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                <div className="p-2">
                  <Input
                    autoFocus
                    placeholder="ค้นหาประเภทสินค้า..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">ไม่พบรายการ</div>
                  ) : filteredProducts.map(t => (
                    <div
                      key={t}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${form.product_type === t ? 'bg-gray-100 font-medium' : ''}`}
                      onMouseDown={() => {
                        handleChange('product_type', t);
                        setProductSearch(t);
                        setProductOpen(false);
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">จำนวนพิมพ์</Label>
          <Input
            type="number"
            value={form.quantity}
            onChange={e => handleChange('quantity', e.target.value)}
            placeholder="10000"
          />
        </div>
        {/* Size fields */}
        <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-500">ขนาดงาน (กว้าง × ยาว)</Label>
            <div className="flex rounded-md border border-input overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSizeUnit('cm')}
                className={`px-2 py-0.5 ${sizeUnit === 'cm' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >ซม.</button>
              <button
                type="button"
                onClick={() => setSizeUnit('inch')}
                className={`px-2 py-0.5 ${sizeUnit === 'inch' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >นิ้ว</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              value={form.size_w}
              onChange={e => handleChange('size_w', e.target.value)}
              placeholder="กว้าง"
              className="flex-1"
            />
            <span className="text-gray-400 text-sm shrink-0">×</span>
            <Input
              type="number"
              step="0.01"
              value={form.size_h}
              onChange={e => handleChange('size_h', e.target.value)}
              placeholder="ยาว"
              className="flex-1"
            />
            <span className="text-xs text-gray-400 shrink-0">{sizeUnit === 'cm' ? 'ซม.' : 'นิ้ว'}</span>
          </div>
        </div>

        {/* Colors + Pantone */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">จำนวนสี</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={form.colors}
              onChange={e => handleChange('colors', e.target.value)}
              placeholder="4"
              className="flex-1"
            />
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-gray-600 whitespace-nowrap">
              <Checkbox
                checked={hasSpecialColor}
                onCheckedChange={(v) => {
                  setHasSpecialColor(!!v);
                  if (!v) handleChange('pantone_code', '');
                }}
              />
              สีพิเศษ
            </label>
          </div>
          {hasSpecialColor && (
            <Input
              value={form.pantone_code}
              onChange={e => handleChange('pantone_code', e.target.value)}
              placeholder="รหัส Pantone เช่น PMS 485 C"
              className="mt-1"
            />
          )}
        </div>
        <div className="space-y-1.5" ref={paperRef}>
          <Label className="text-xs font-medium text-gray-500">กระดาษ</Label>
          <div className="relative">
            <div
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
              onClick={() => setPaperOpen(o => !o)}
            >
              <span className={form.paper ? 'text-foreground' : 'text-muted-foreground'}>
                {form.paper || 'เลือกประเภทกระดาษ'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
            {paperOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                <div className="p-2">
                  <Input
                    autoFocus
                    placeholder="ค้นหากระดาษ..."
                    value={paperSearch}
                    onChange={e => setPaperSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredPapers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">ไม่พบรายการ</div>
                  ) : filteredPapers.map(m => (
                    <div
                      key={m.id}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${form.paper === m.name ? 'bg-gray-100 font-medium' : ''}`}
                      onMouseDown={() => {
                        handleChange('paper', m.name);
                        setPaperSearch(m.name);
                        setPaperOpen(false);
                      }}
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">ความสำคัญ</Label>
          <Select value={form.priority} onValueChange={v => handleChange('priority', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">ปกติ</SelectItem>
              <SelectItem value="urgent">ด่วน</SelectItem>
              <SelectItem value="rush">ด่วนมาก</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-500">วันกำหนดส่ง</Label>
          <Input
            type="date"
            value={form.due_date}
            onChange={e => handleChange('due_date', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">ขั้นตอน Postpress</Label>
        <div className="flex flex-wrap gap-3">
          {POSTPRESS_OPTIONS.map(step => (
            <label key={step} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.postpress_steps.includes(step)}
                onCheckedChange={() => togglePostpress(step)}
              />
              <span className="text-sm text-gray-700">{PROCESS_LABELS[step]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-500">หมายเหตุ</Label>
        <Textarea
          value={form.notes}
          onChange={e => handleChange('notes', e.target.value)}
          placeholder="รายละเอียดเพิ่มเติม..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> ยกเลิก
          </Button>
        )}
        <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white">
          <Save className="w-4 h-4 mr-1" /> บันทึกและจัดคิว
        </Button>
      </div>
    </form>
  );
}