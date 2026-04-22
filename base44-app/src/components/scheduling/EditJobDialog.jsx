import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PROCESS_LABELS } from './SchedulingUtils';
import { Save, X, ChevronDown, Pencil } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const POSTPRESS_OPTIONS = ['lamination', 'diecut', 'folding', 'binding', 'cutting'];

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

// แปลง mm → cm สำหรับแสดงใน form
function mmToCm(val) {
  if (!val) return '';
  return +(val / 10).toFixed(2);
}

export default function EditJobDialog({ job, machines, open, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const printingMachines = machines.filter(m => m.type === 'printing');

  const { data: paperMaterials = [] } = useQuery({
    queryKey: ['materials-paper'],
    queryFn: () => base44.entities.Material.filter({ type: 'paper' }, 'name', 1000)
  });

  const [saving, setSaving] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('cm');
  const [hasSpecialColor, setHasSpecialColor] = useState(!!(job?.pantone_code));

  // Paper search dropdown
  const [paperSearch, setPaperSearch] = useState('');
  const [paperOpen, setPaperOpen] = useState(false);
  const paperRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (paperRef.current && !paperRef.current.contains(e.target)) setPaperOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Product search dropdown
  const [productSearch, setProductSearch] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (productRef.current && !productRef.current.contains(e.target)) setProductOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const [form, setForm] = useState({});

  // เมื่อ job เปลี่ยน → reset form
  useEffect(() => {
    if (!job) return;
    setForm({
      product_type: job.product_type || '',
      quantity: job.quantity || '',
      colors: job.colors || '',
      plates: job.plates || '',
      sheets: job.sheets || '',
      pantone_code: job.pantone_code || '',
      paper: job.paper || '',
      printing_machine_id: job.printing_machine_id || '',
      postpress_steps: job.postpress_steps || [],
      priority: job.priority || 'normal',
      due_date: job.due_date || '',
      notes: job.notes || '',
      // แสดงขนาดเป็น cm (final_size_w/h เก็บเป็น mm)
      size_w: mmToCm(job.final_size_w),
      size_h: mmToCm(job.final_size_h),
    });
    setPaperSearch(job.paper || '');
    setProductSearch(job.product_type || '');
    setHasSpecialColor(!!(job.pantone_code));
  }, [job]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const togglePostpress = (step) => {
    setForm(prev => ({
      ...prev,
      postpress_steps: prev.postpress_steps.includes(step)
        ? prev.postpress_steps.filter(s => s !== step)
        : [...prev.postpress_steps, step]
    }));
  };

  const toMm = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return null;
    return sizeUnit === 'inch' ? +(n * 25.4).toFixed(2) : +(n * 10).toFixed(2);
  };

  const handleSave = async () => {
    setSaving(true);
    const fw = toMm(form.size_w);
    const fh = toMm(form.size_h);
    await base44.entities.PrintJob.update(job.id, {
      product_type: form.product_type,
      quantity: Number(form.quantity),
      colors: Number(form.colors),
      plates: Number(form.plates || 0),
      sheets: Number(form.sheets || 0),
      pantone_code: hasSpecialColor ? form.pantone_code : '',
      paper: form.paper,
      printing_machine_id: form.printing_machine_id,
      postpress_steps: form.postpress_steps,
      priority: form.priority,
      due_date: form.due_date,
      notes: form.notes,
      ...(fw != null && { final_size_w: fw }),
      ...(fh != null && { final_size_h: fh }),
    });
    queryClient.invalidateQueries({ queryKey: ['job', job.id] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    toast({ title: 'แก้ไขสเป็คงานสำเร็จ', duration: 2500 });
    setSaving(false);
    onClose();
  };

  const filteredPapers = paperMaterials.filter(m =>
    m.name.toLowerCase().includes(paperSearch.toLowerCase())
  );
  const filteredProducts = PRODUCT_TYPES.filter(t =>
    t.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4 text-gray-500" />
            แก้ไขสเป็คงาน — {job.job_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ประเภทสินค้า */}
            <div className="space-y-1.5" ref={productRef}>
              <Label className="text-xs font-medium text-gray-500">ประเภทสินค้า</Label>
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
                      <Input autoFocus placeholder="ค้นหา..." value={productSearch}
                        onChange={e => setProductSearch(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredProducts.map(t => (
                        <div key={t} className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${form.product_type === t ? 'bg-gray-100 font-medium' : ''}`}
                          onMouseDown={() => { handleChange('product_type', t); setProductSearch(t); setProductOpen(false); }}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* จำนวนพิมพ์ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">จำนวนพิมพ์</Label>
              <Input type="number" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} placeholder="1000" />
            </div>

            {/* ขนาดงาน */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-500">ขนาดงานสำเร็จ (กว้าง × สูง)</Label>
                <div className="flex rounded-md border border-input overflow-hidden text-xs">
                  <button type="button" onClick={() => setSizeUnit('cm')}
                    className={`px-2 py-0.5 ${sizeUnit === 'cm' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>ซม.</button>
                  <button type="button" onClick={() => setSizeUnit('inch')}
                    className={`px-2 py-0.5 ${sizeUnit === 'inch' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>นิ้ว</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.01" value={form.size_w} onChange={e => handleChange('size_w', e.target.value)} placeholder="กว้าง" />
                <span className="text-gray-400 shrink-0">×</span>
                <Input type="number" step="0.01" value={form.size_h} onChange={e => handleChange('size_h', e.target.value)} placeholder="สูง" />
                <span className="text-xs text-gray-400 shrink-0">{sizeUnit === 'cm' ? 'ซม.' : 'นิ้ว'}</span>
              </div>
            </div>

            {/* สี */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">จำนวนสี</Label>
              <div className="flex gap-2">
                <Input type="number" value={form.colors} onChange={e => handleChange('colors', e.target.value)} placeholder="4" className="flex-1" />
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-gray-600 whitespace-nowrap">
                  <Checkbox checked={hasSpecialColor} onCheckedChange={(v) => { setHasSpecialColor(!!v); if (!v) handleChange('pantone_code', ''); }} />
                  สีพิเศษ
                </label>
              </div>
              {hasSpecialColor && (
                <Input value={form.pantone_code} onChange={e => handleChange('pantone_code', e.target.value)} placeholder="รหัส Pantone เช่น PMS 485 C" className="mt-1" />
              )}
            </div>

            {/* เพลท */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">จำนวนเพลท</Label>
              <Input type="number" value={form.plates} onChange={e => handleChange('plates', e.target.value)} placeholder="4" />
            </div>

            {/* กระดาษ */}
            <div className="space-y-1.5 sm:col-span-2" ref={paperRef}>
              <Label className="text-xs font-medium text-gray-500">กระดาษ</Label>
              <div className="relative">
                <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
                  onClick={() => setPaperOpen(o => !o)}>
                  <span className={form.paper ? 'text-foreground' : 'text-muted-foreground'}>{form.paper || 'เลือกประเภทกระดาษ'}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
                {paperOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                    <div className="p-2">
                      <Input autoFocus placeholder="ค้นหากระดาษ..." value={paperSearch}
                        onChange={e => setPaperSearch(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredPapers.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">ไม่พบรายการ</div>
                        : filteredPapers.map(m => (
                          <div key={m.id} className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${form.paper === m.name ? 'bg-gray-100 font-medium' : ''}`}
                            onMouseDown={() => { handleChange('paper', m.name); setPaperSearch(m.name); setPaperOpen(false); }}>
                            {m.name}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* เครื่องพิมพ์ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">เครื่องพิมพ์</Label>
              <Select value={form.printing_machine_id} onValueChange={v => handleChange('printing_machine_id', v)}>
                <SelectTrigger><SelectValue placeholder="เลือกเครื่องพิมพ์" /></SelectTrigger>
                <SelectContent>
                  {printingMachines.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ความสำคัญ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">ความสำคัญ</Label>
              <Select value={form.priority} onValueChange={v => handleChange('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">ปกติ</SelectItem>
                  <SelectItem value="urgent">ด่วน</SelectItem>
                  <SelectItem value="rush">ด่วนมาก</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* วันกำหนดส่ง */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-gray-500">วันกำหนดส่ง</Label>
              <Input type="date" value={form.due_date} onChange={e => handleChange('due_date', e.target.value)} className="w-48" />
            </div>
          </div>

          {/* Postpress */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500">ขั้นตอน Postpress</Label>
            <div className="flex flex-wrap gap-3">
              {POSTPRESS_OPTIONS.map(step => (
                <label key={step} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={(form.postpress_steps || []).includes(step)} onCheckedChange={() => togglePostpress(step)} />
                  <span className="text-sm text-gray-700">{PROCESS_LABELS[step]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* หมายเหตุ */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">หมายเหตุ</Label>
            <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." rows={2} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" /> ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800 text-white">
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}