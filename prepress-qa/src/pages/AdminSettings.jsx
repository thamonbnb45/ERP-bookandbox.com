import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { loadSettings, saveSetting, DEFAULTS } from '@/lib/settingsManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Save, Loader2, Plus, Trash2, RotateCcw, ShieldAlert } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const SETTING_GROUPS = [
  { key: 'comparison', label: 'การเปรียบเทียบ', icon: '🔍' },
  { key: 'bleed', label: 'Bleed', icon: '✂️' },
  { key: 'sizes', label: 'ขนาดเอกสาร', icon: '📐' },
  { key: 'folds', label: 'ประเภทเอกสาร', icon: '📄' },
  { key: 'general', label: 'ทั่วไป', icon: '⚙️' },
];

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [tab, setTab] = useState('comparison');

  useEffect(() => {
    loadSettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

  // ถ้าไม่ใช่ admin redirect กลับ
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <ShieldAlert className="w-16 h-16 mx-auto text-red-400" />
            <h2 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground">หน้านี้สำหรับ Admin เท่านั้น</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const handleSave = async (key, value, group, description) => {
    setSaving(s => ({ ...s, [key]: true }));
    await saveSetting(key, value, group, description);
    setSettings(s => ({ ...s, [key]: value }));
    setSaving(s => ({ ...s, [key]: false }));
  };

  const handleReset = async (key, group) => {
    if (!window.confirm(`รีเซ็ต "${key}" เป็นค่าเริ่มต้น?`)) return;
    const defaultValue = DEFAULTS[key];
    if (defaultValue !== undefined) {
      await handleSave(key, defaultValue, group, `Default value for ${key}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">ตั้งค่าระบบ</h1>
          <p className="text-sm text-muted-foreground">จัดการค่า Threshold, Bleed, ขนาดเอกสาร</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {SETTING_GROUPS.map(g => (
            <TabsTrigger key={g.key} value={g.key}>{g.icon} {g.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Comparison Settings */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>การเปรียบเทียบ Pixel</CardTitle>
              <CardDescription>ค่าที่ใช้ในการเปรียบเทียบไฟล์ Master กับ Print Ready</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingRow label="Diff Threshold" description="ค่าความแตกต่างของสี (0-255) ยิ่งสูงยิ่ง tolerant" settingKey="diff_threshold" value={settings.diff_threshold} type="number" group="comparison" onSave={handleSave} onReset={handleReset} saving={saving} />
              <SettingRow label="Render Scale" description="ความละเอียดในการ render PDF (1-4)" settingKey="render_scale" value={settings.render_scale} type="number" group="comparison" onSave={handleSave} onReset={handleReset} saving={saving} />
              <SettingRow label="Shift Tolerance (mm)" description="ความคลาดเคลื่อนที่ยอมรับได้ (mm)" settingKey="shift_tolerance_mm" value={settings.shift_tolerance_mm} type="number" group="comparison" onSave={handleSave} onReset={handleReset} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bleed Settings */}
        <TabsContent value="bleed">
          <Card>
            <CardHeader>
              <CardTitle>ตั้งค่า Bleed</CardTitle>
              <CardDescription>กำหนดค่า Bleed สำหรับงานพิมพ์</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingRow label="Bleed (mm)" description="ขนาด bleed มาตรฐาน" settingKey="bleed_mm" value={settings.bleed_mm} type="number" group="bleed" onSave={handleSave} onReset={handleReset} saving={saving} />
              <SettingRow label="Bleed Tolerance (mm)" description="ค่าความคลาดเคลื่อน bleed ที่ยอมรับ" settingKey="bleed_tolerance" value={settings.bleed_tolerance} type="number" group="bleed" onSave={handleSave} onReset={handleReset} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standard Sizes */}
        <TabsContent value="sizes">
          <Card>
            <CardHeader>
              <CardTitle>ขนาดเอกสารมาตรฐาน</CardTitle>
              <CardDescription>กำหนดขนาดกระดาษที่ใช้ตรวจสอบ</CardDescription>
            </CardHeader>
            <CardContent>
              <SizesEditor value={settings.standard_sizes} onSave={(v) => handleSave('standard_sizes', v, 'sizes', 'Standard paper sizes')} saving={saving['standard_sizes']} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Types */}
        <TabsContent value="folds">
          <Card>
            <CardHeader>
              <CardTitle>กฎประเภทเอกสาร</CardTitle>
              <CardDescription>กำหนดว่าขนาดกระดาษ + จำนวนหน้า = ประเภทอะไร</CardDescription>
            </CardHeader>
            <CardContent>
              <DocTypeRulesEditor value={settings.document_type_rules} onSave={(v) => handleSave('document_type_rules', v, 'folds', 'Document type detection rules')} saving={saving['document_type_rules']} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>ทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SettingRow label="ชื่อแอป" settingKey="app_name" value={settings.app_name} type="text" group="general" onSave={handleSave} onReset={handleReset} saving={saving} />
              <SettingRow label="Job Code Regex" description="รูปแบบ regex สำหรับ parse รหัสงานจากชื่อไฟล์" settingKey="job_code_regex" value={settings.job_code_regex} type="text" group="general" onSave={handleSave} onReset={handleReset} saving={saving} />
              <SettingRow label="ขนาดไฟล์สูงสุด (MB)" settingKey="max_file_size_mb" value={settings.max_file_size_mb} type="number" group="general" onSave={handleSave} onReset={handleReset} saving={saving} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual Setting Row
function SettingRow({ label, description, settingKey, value, type, group, onSave, onReset, saving }) {
  const [localValue, setLocalValue] = useState(value);
  const changed = String(localValue) !== String(value);

  return (
    <div className="flex items-end gap-4">
      <div className="flex-1 space-y-1">
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Input type={type} value={localValue} onChange={e => setLocalValue(type === 'number' ? Number(e.target.value) : e.target.value)} />
      </div>
      <div className="flex gap-1">
        {changed && (
          <Button size="sm" onClick={() => onSave(settingKey, localValue, group, label)} disabled={saving[settingKey]}>
            {saving[settingKey] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onReset(settingKey, group)} title="รีเซ็ตเป็นค่าเริ่มต้น">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Standard Sizes Editor
function SizesEditor({ value, onSave, saving }) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : (value || []);
  const [sizes, setSizes] = useState(parsed);
  const [newName, setNewName] = useState('');
  const [newW, setNewW] = useState('');
  const [newH, setNewH] = useState('');

  const addSize = () => {
    if (!newName || !newW || !newH) return;
    const updated = [...sizes, { name: newName, width: Number(newW), height: Number(newH) }];
    setSizes(updated);
    setNewName(''); setNewW(''); setNewH('');
  };

  const removeSize = (idx) => setSizes(sizes.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2 px-2">ชื่อ</th><th className="text-center py-2 px-2">กว้าง (mm)</th><th className="text-center py-2 px-2">สูง (mm)</th><th className="w-10"></th></tr></thead>
          <tbody>
            {sizes.map((s, i) => (
              <tr key={i} className="border-b"><td className="py-2 px-2">{s.name}</td><td className="text-center py-2 px-2">{s.width}</td><td className="text-center py-2 px-2">{s.height}</td>
                <td className="py-2 px-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSize(i)}><Trash2 className="h-3 w-3 text-red-500" /></Button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1"><Label>ชื่อ</Label><Input placeholder="เช่น A4" value={newName} onChange={e => setNewName(e.target.value)} /></div>
        <div className="w-24"><Label>กว้าง</Label><Input type="number" placeholder="mm" value={newW} onChange={e => setNewW(e.target.value)} /></div>
        <div className="w-24"><Label>สูง</Label><Input type="number" placeholder="mm" value={newH} onChange={e => setNewH(e.target.value)} /></div>
        <Button size="sm" onClick={addSize}><Plus className="h-4 w-4" /></Button>
      </div>
      <Button onClick={() => onSave(JSON.stringify(sizes))} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}บันทึกขนาดทั้งหมด</Button>
    </div>
  );
}

// Document Type Rules Editor
function DocTypeRulesEditor({ value, onSave, saving }) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : (value || []);
  const [rules, setRules] = useState(parsed);
  const [newSize, setNewSize] = useState('');
  const [newPages, setNewPages] = useState('');
  const [newType, setNewType] = useState('');

  const addRule = () => {
    if (!newSize || !newPages || !newType) return;
    setRules([...rules, { size: newSize, pages: Number(newPages), type: newType }]);
    setNewSize(''); setNewPages(''); setNewType('');
  };

  const removeRule = (idx) => setRules(rules.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2 px-2">ขนาด</th><th className="text-center py-2 px-2">จำนวนหน้า</th><th className="text-left py-2 px-2">ประเภท</th><th className="w-10"></th></tr></thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={i} className="border-b"><td className="py-2 px-2">{r.size}</td><td className="text-center py-2 px-2">{r.pages}</td><td className="py-2 px-2"><Badge variant="secondary">{r.type}</Badge></td>
                <td className="py-2 px-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRule(i)}><Trash2 className="h-3 w-3 text-red-500" /></Button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 items-end">
        <div className="w-24"><Label>ขนาด</Label><Input placeholder="A4" value={newSize} onChange={e => setNewSize(e.target.value)} /></div>
        <div className="w-24"><Label>หน้า</Label><Input type="number" placeholder="1" value={newPages} onChange={e => setNewPages(e.target.value)} /></div>
        <div className="flex-1"><Label>ประเภท</Label><Input placeholder="flyer" value={newType} onChange={e => setNewType(e.target.value)} /></div>
        <Button size="sm" onClick={addRule}><Plus className="h-4 w-4" /></Button>
      </div>
      <Button onClick={() => onSave(JSON.stringify(rules))} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}บันทึกกฎทั้งหมด</Button>
    </div>
  );
}
