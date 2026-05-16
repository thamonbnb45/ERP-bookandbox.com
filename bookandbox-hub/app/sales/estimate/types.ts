// Shared types & mock data for Estimate module

export interface EstimateData {
  id: string;
  name: string;
  customer: string;
  type: string;
  status: string;
  createdAt: string;
  createdBy: string;
  width: number;
  height: number;
  unit: string;
  orientation: string;
  binding: string;
  pagesCover: number;
  pagesInner: number;
  quantities: number[];
  customerContact: string;
  salesperson: string;
  company: string;
  team: string;
  poNumber: string;
  note: string;
  estimator: string;
  // Cost data
  costDesign: number[];
  costPrint: number[];
  costPaper: number[];
  costPlate: number[];
  costFold: number[];
  costCoating: number[];
  costDieCut: number[];
  costBinding: number[];
  costShipping: number[];
  costAdmin: number;
  profitPercent: number;
  sellingPrice: number[];
}

export type UserRole = 'costing' | 'sales' | 'production' | 'hr';

export const ROLE_LABELS: Record<UserRole, string> = {
  costing: '🧮 คิดราคา (เห็นทั้งหมด)',
  sales: '💰 Sales (เห็นราคาขาย)',
  production: '🏭 Production (เห็นต้นทุนวัตถุดิบ)',
  hr: '👥 HR (เห็นผลตอบแทน)',
};

export const MOCK_ESTIMATE: EstimateData = {
  id: 'JEG6905-0765',
  name: 'Annual Report 2026 BnB',
  customer: 'Goldentime Co.',
  type: 'หนังสือ Catalog',
  status: 'รออนุมัติ',
  createdAt: '2026-05-11',
  createdBy: 'ceo789',
  width: 21.00,
  height: 29.70,
  unit: 'ซม.',
  orientation: 'แนวตั้ง',
  binding: 'เรียบรอบอั้ว 3 มม.',
  pagesCover: 4,
  pagesInner: 76,
  quantities: [1000, 2000, 3000, 5000],
  customerContact: 'คุณสมชาย',
  salesperson: 'คุณวิไล',
  company: 'Goldentime',
  team: 'ไม่ระบุทีม',
  poNumber: '',
  note: '',
  estimator: 'ceo789',
  costDesign: [0, 0, 0, 0],
  costPrint: [2000, 2000, 2000, 2000],
  costPaper: [555.22, 869.04, 1182.86, 1810.50],
  costPlate: [800, 800, 800, 800],
  costFold: [0, 0, 0, 0],
  costCoating: [0, 0, 0, 0],
  costDieCut: [0, 0, 0, 0],
  costBinding: [0, 0, 0, 0],
  costShipping: [0, 0, 0, 0],
  costAdmin: 0,
  profitPercent: 0,
  sellingPrice: [5000, 5300, 6000, 7750],
};

export const EMPTY_ESTIMATE: EstimateData = {
  id: '', name: '', customer: '', type: 'หนังสือ Catalog',
  status: 'อยู่ระหว่างเสนอราคา',
  createdAt: new Date().toISOString().slice(0, 10),
  createdBy: '', width: 0, height: 0, unit: 'ซม.',
  orientation: 'แนวตั้ง', binding: '', pagesCover: 4, pagesInner: 0,
  quantities: [1000, 2000, 3000, 5000],
  customerContact: '', salesperson: '', company: '', team: '', poNumber: '',
  note: '', estimator: '',
  costDesign: [], costPrint: [], costPaper: [], costPlate: [],
  costFold: [], costCoating: [], costDieCut: [], costBinding: [],
  costShipping: [], costAdmin: 0, profitPercent: 0, sellingPrice: [],
};

export const JOB_TYPES = [
  'หนังสือ Catalog', 'BNB Web', 'โบรชัวร์', 'ใบปลิว',
  'กล่อง', 'นามบัตร', 'สติกเกอร์', 'ปฏิทิน',
  'โปสเตอร์', 'บัตรพลาสติก',
];

export const STATUS_OPTIONS = ['อยู่ระหว่างเสนอราคา', 'ตกลงรับงาน', 'เลิกจ่ายอดพิมพ์', 'ยกเลิก'];

export const PAPER_CATALOG = [
  { code: 'PAPE-G-0055', name: 'กระดาษอาร์ตมัน 128g 25x36 Sunpaper', priceReem: 2349.19, priceKg: 63.22, updated: '04 เม.ย. 2569' },
  { code: 'PAPE-G-0052', name: 'กระดาษอาร์ตมัน 128g 25x36 Chenming', priceReem: 1382.40, priceKg: 37.20, updated: '02 ก.พ. 2569' },
  { code: 'PAPE-G-0049', name: 'กระดาษอาร์ตมัน 128g 31x43 Kinmari', priceReem: 2047.49, priceKg: 37.20, updated: '08 ก.พ. 2569' },
  { code: 'PAPE-M-0050', name: 'กระดาษอาร์ตด้าน 128g 25x36 Hikote', priceReem: 1337.81, priceKg: 36.00, updated: '04 พ.ค. 2569' },
  { code: 'PAPE-G-0029', name: 'กระดาษอาร์ตมัน 128g 31x43 หัวไก่', priceReem: 1981.44, priceKg: 36.00, updated: '25 ม.ค. 2569' },
  { code: 'PAPE-G-0013', name: 'กระดาษอาร์ตมัน 128g 24x35 Chenming', priceReem: 1207.00, priceKg: 34.80, updated: '24 ก.พ. 2569' },
  { code: 'PAPE-G-0014', name: 'กระดาษอาร์ตมัน 128g 24x35 Apex', priceReem: 1248.62, priceKg: 36.00, updated: '24 ก.พ. 2569' },
  { code: 'PAPE-G-0015', name: 'กระดาษอาร์ตมัน 128g 25x36 Kinmari', priceReem: 1404.70, priceKg: 37.80, updated: '24 ก.พ. 2569' },
];
