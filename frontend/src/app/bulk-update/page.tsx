'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { productService } from '../../services/product.service';
import { authService } from '../../services/auth.service';
import { BulkUpdateItem, UomType } from '../../types/product';
import { getErrorMessage } from '../../lib/utils';

type Tab = 'csv' | 'inline';

interface CsvRow {
  partNumber: string;
  productName?: string;
  brand?: string;
  salesPrice?: number;
  costPrice?: number;
  uom?: UomType;
  description?: string;
  _valid: boolean;
  _error?: string;
}

interface InlineRow extends BulkUpdateItem {
  _id: number;
  _touched: boolean;
}

const CSV_COLUMNS = ['part_number', 'product_name', 'brand', 'sales_price', 'cost_price', 'uom', 'description'];

// 100 dummy spare parts for heavy equipment (realistic for PT Multi Power Aditama)
const SAMPLE_PRODUCTS = [
  ['MP-UC-001','Track Shoe Assy D85','Berco','4500000','3600000','PCS','Track shoe assembly for Komatsu D85'],
  ['MP-UC-002','Track Link D65','Berco','3200000','2560000','PCS','Track link chain for Komatsu D65'],
  ['MP-UC-003','Sprocket D85 Seg','Berco','5800000','4640000','PCS','Drive sprocket segment D85'],
  ['MP-UC-004','Idler Roller D155','Berco','8500000','6800000','PCS','Front idler roller Komatsu D155'],
  ['MP-UC-005','Carrier Roller D65','Berco','2100000','1680000','PCS','Top carrier roller D65'],
  ['MP-UC-006','Track Roller D85','Berco','1950000','1560000','PCS','Bottom track roller D85'],
  ['MP-UC-007','Track Bolt & Nut Set','Berco','85000','68000','BOX','Track bolt and nut set (50 pcs)'],
  ['MP-UC-008','Sprocket D155 Full','Berco','12000000','9600000','PCS','Complete sprocket D155'],
  ['MP-UC-009','Track Link PC200','Berco','2800000','2240000','PCS','Track link for Komatsu PC200'],
  ['MP-UC-010','Final Drive Seal PC300','NOK','650000','520000','PCS','Final drive seal kit PC300'],
  ['MP-EN-001','Engine Oil Filter PC200','Komatsu','185000','148000','PCS','Engine oil filter Komatsu PC200-8'],
  ['MP-EN-002','Fuel Filter D85','Komatsu','220000','176000','PCS','Primary fuel filter D85A-21'],
  ['MP-EN-003','Air Filter D155','Komatsu','380000','304000','PCS','Air cleaner element D155AX'],
  ['MP-EN-004','Hydraulic Oil Filter PC300','Komatsu','275000','220000','PCS','Hydraulic return filter PC300-8'],
  ['MP-EN-005','Engine Gasket Set PC200','Komatsu','1850000','1480000','PCS','Full engine gasket set PC200'],
  ['MP-EN-006','Piston Ring Set D85','Komatsu','2200000','1760000','PCS','STD piston ring set D85'],
  ['MP-EN-007','Cylinder Liner D155','Komatsu','3400000','2720000','PCS','Cylinder liner STD D155'],
  ['MP-EN-008','Crankshaft Bearing Set','Komatsu','850000','680000','PCS','Main bearing set for D65E'],
  ['MP-EN-009','Turbocharger PC300','Komatsu','8500000','6800000','PCS','Turbocharger assy PC300-8'],
  ['MP-EN-010','Water Pump D85','Komatsu','1200000','960000','PCS','Engine water pump D85A'],
  ['MP-HY-001','Hydraulic Cylinder Seal PC200','NOK','450000','360000','PCS','Bucket cylinder seal kit PC200'],
  ['MP-HY-002','Hydraulic Pump PC300','Komatsu','35000000','28000000','PCS','Main hydraulic pump PC300-8'],
  ['MP-HY-003','Control Valve PC200','Komatsu','22000000','17600000','PCS','Main control valve PC200-8'],
  ['MP-HY-004','Hydraulic Hose 1 inch','Parker','185000','148000','PCS','High pressure hose 1 inch x 1m'],
  ['MP-HY-005','Hydraulic Hose 3/4 inch','Parker','145000','116000','PCS','High pressure hose 3/4 inch x 1m'],
  ['MP-HY-006','Hydraulic Fitting 90deg','Parker','45000','36000','PCS','90 degree elbow fitting 1 inch'],
  ['MP-HY-007','Swing Motor PC300','Komatsu','18500000','14800000','PCS','Swing motor assy PC300-8'],
  ['MP-HY-008','Travel Motor PC200','Komatsu','15000000','12000000','PCS','Travel motor assy PC200-8'],
  ['MP-HY-009','Boom Cylinder Seal D65','NOK','380000','304000','PCS','Boom cylinder seal kit D65'],
  ['MP-HY-010','Hydraulic Tank Filter','Komatsu','165000','132000','PCS','Suction strainer element'],
  ['MP-EL-001','Alternator 24V PC200','Denso','2200000','1760000','PCS','Alternator 24V 50A PC200-8'],
  ['MP-EL-002','Starter Motor 24V D85','Denso','3500000','2800000','PCS','Starter motor 24V 7.5kW D85'],
  ['MP-EL-003','Battery 12V 100Ah','Yuasa','850000','680000','PCS','MF battery 12V 100Ah'],
  ['MP-EL-004','Battery 12V 150Ah','Yuasa','1200000','960000','PCS','MF battery 12V 150Ah heavy duty'],
  ['MP-EL-005','Glow Plug D65','NGK','185000','148000','PCS','Glow plug for D65E-12'],
  ['MP-EL-006','Monitor Panel PC300','Komatsu','8500000','6800000','PCS','Machine monitor panel PC300-8'],
  ['MP-EL-007','Pressure Sensor PC200','Komatsu','650000','520000','PCS','Oil pressure sensor PC200'],
  ['MP-EL-008','Wiring Harness Main','Komatsu','4500000','3600000','PCS','Main wiring harness PC200-8'],
  ['MP-EL-009','Solenoid Valve 24V','Komatsu','485000','388000','PCS','Proportional solenoid valve 24V'],
  ['MP-EL-010','Controller ECU PC300','Komatsu','15000000','12000000','PCS','Engine controller unit PC300'],
  ['MP-BR-001','Bearing 6207-2RS','SKF','95000','76000','PCS','Deep groove ball bearing 6207'],
  ['MP-BR-002','Bearing 6308-2RS','SKF','125000','100000','PCS','Deep groove ball bearing 6308'],
  ['MP-BR-003','Bearing 22218 CK','SKF','850000','680000','PCS','Spherical roller bearing 22218'],
  ['MP-BR-004','Bearing 32215 J2','SKF','680000','544000','PCS','Tapered roller bearing 32215'],
  ['MP-BR-005','Bearing 6210-2RS','NSK','110000','88000','PCS','Deep groove ball bearing 6210'],
  ['MP-BR-006','Bearing 51108','SKF','145000','116000','PCS','Thrust ball bearing 51108'],
  ['MP-BR-007','Pillow Block UCF 205','SKF','185000','148000','PCS','Flange bearing unit UCF205'],
  ['MP-BR-008','Bearing 23040 CC','SKF','2200000','1760000','PCS','Spherical roller bearing 23040'],
  ['MP-BR-009','Bearing 32310 J2','SKF','380000','304000','PCS','Tapered roller bearing 32310'],
  ['MP-BR-010','Needle Roller NKI 35/20','INA','220000','176000','PCS','Needle roller bearing NKI35/20'],
  ['MP-SE-001','O-Ring Kit Assorted','NOK','185000','148000','BOX','O-ring assortment 200 pcs'],
  ['MP-SE-002','Oil Seal 50x70x10','NOK','45000','36000','PCS','Shaft oil seal 50x70x10'],
  ['MP-SE-003','Oil Seal 80x100x12','NOK','65000','52000','PCS','Shaft oil seal 80x100x12'],
  ['MP-SE-004','V-Ring Seal VR80','NOK','35000','28000','PCS','V-ring axial shaft seal VR80'],
  ['MP-SE-005','Dust Seal 60x80x8','NOK','38000','30400','PCS','Wiper ring dust seal 60x80x8'],
  ['MP-SE-006','Hydraulic Seal Kit PC200 Arm','NOK','420000','336000','PCS','Arm cylinder seal kit PC200'],
  ['MP-SE-007','Hydraulic Seal Kit D85 Blade','NOK','380000','304000','PCS','Blade cylinder seal kit D85'],
  ['MP-SE-008','Engine Crankshaft Seal','NOK','125000','100000','PCS','Front crankshaft seal D65'],
  ['MP-SE-009','Transmission Seal Kit D85','NOK','650000','520000','PCS','Transmission seal kit D85'],
  ['MP-SE-010','Final Drive Seal D155','NOK','850000','680000','PCS','Final drive seal kit D155'],
  ['MP-LU-001','Engine Oil 10W-40 (20L)','Shell Rimula','580000','464000','PCS','Diesel engine oil 10W-40 20L'],
  ['MP-LU-002','Hydraulic Oil VG46 (20L)','Shell Tellus','520000','416000','PCS','Hydraulic oil ISO VG46 20L'],
  ['MP-LU-003','Gear Oil EP 90 (20L)','Shell Spirax','480000','384000','PCS','Gear lubricant EP 90 20L'],
  ['MP-LU-004','Grease EP2 (18kg)','Shell Gadus','680000','544000','PCS','Lithium grease NLGI 2 18kg'],
  ['MP-LU-005','Engine Oil 15W-40 (200L)','Shell Rimula','5800000','4640000','PCS','Diesel engine oil 15W-40 drum 200L'],
  ['MP-LU-006','Hydraulic Oil VG68 (200L)','Shell Tellus','5200000','4160000','PCS','Hydraulic oil VG68 drum 200L'],
  ['MP-LU-007','Anti-Freeze Coolant 20L','BASF Glysantin','380000','304000','PCS','Engine coolant concentrate 20L'],
  ['MP-LU-008','Chain Lube Spray','WD-40','85000','68000','PCS','Chain and cable lubricant spray 400ml'],
  ['MP-LU-009','Copper Grease Anti-Seize','Molykote','125000','100000','PCS','Copper anti-seize paste 500g'],
  ['MP-LU-010','Grease Cartridge EP2','SKF','35000','28000','PCS','Grease cartridge 400g NLGI2'],
  ['MP-GT-001','Belt V-A75','Gates','85000','68000','PCS','V-belt A section 75 inches'],
  ['MP-GT-002','Belt V-B82','Gates','110000','88000','PCS','V-belt B section 82 inches'],
  ['MP-GT-003','Timing Belt 200XL','Gates','165000','132000','PCS','Timing belt 200 teeth XL pitch'],
  ['MP-GT-004','Poly V-Belt 6PK1760','Gates','185000','148000','PCS','Poly V-belt 6 ribs 1760mm'],
  ['MP-GT-005','Sprocket 20T #50 Chain','Tsubaki','220000','176000','PCS','Roller chain sprocket 20T #50'],
  ['MP-GT-006','Chain #50-10ft','Tsubaki','280000','224000','PCS','Roller chain #50 10 feet'],
  ['MP-GT-007','Chain #80-10ft','Tsubaki','480000','384000','PCS','Roller chain #80 10 feet heavy duty'],
  ['MP-GT-008','Coupling Jaw L075','Rexnord','185000','148000','PCS','Jaw coupling spider L075'],
  ['MP-GT-009','Coupling Flange 40mm','Rexnord','680000','544000','PCS','Rigid flange coupling 40mm bore'],
  ['MP-GT-010','Universal Joint 30mm','SKF','380000','304000','PCS','Cardan universal joint 30mm'],
  ['MP-FT-001','Engine Oil Filter 1R-0739','Caterpillar','220000','176000','PCS','Engine oil filter 1R-0739 CAT'],
  ['MP-FT-002','Fuel Filter Primary 1R-0750','Caterpillar','285000','228000','PCS','Primary fuel filter 1R-0750 CAT'],
  ['MP-FT-003','Air Filter 6I-2499','Caterpillar','420000','336000','PCS','Primary air filter element 6I-2499'],
  ['MP-FT-004','Hydraulic Filter 7I-7599','Caterpillar','310000','248000','PCS','Hydraulic filter element 7I-7599'],
  ['MP-FT-005','Transmission Filter CAT','Caterpillar','185000','148000','PCS','Transmission oil filter CAT D9T'],
  ['MP-FT-006','Oil Filter EX300','Hitachi','195000','156000','PCS','Engine oil filter Hitachi EX300'],
  ['MP-FT-007','Hydraulic Filter EX200','Hitachi','245000','196000','PCS','Hydraulic filter element EX200-5'],
  ['MP-FT-008','Fuel Water Separator 320D','Caterpillar','380000','304000','PCS','Fuel/water separator 320D'],
  ['MP-FT-009','Breather Filter Assy','Komatsu','125000','100000','PCS','Hydraulic tank breather filter'],
  ['MP-FT-010','Filter Element Cabin AC','Komatsu','165000','132000','PCS','Cabin air conditioner filter PC300'],
  ['MP-ST-001','Bucket Tooth Tiger PC200','ESCO','185000','148000','PCS','Tiger tooth for PC200 bucket'],
  ['MP-ST-002','Bucket Adaptor PC200','ESCO','380000','304000','PCS','Bucket tooth adaptor PC200'],
  ['MP-ST-003','Cutting Edge D85 Blade','Berco','2800000','2240000','PCS','Cutting edge for D85 blade 4m'],
  ['MP-ST-004','End Bit D85','Berco','680000','544000','PCS','End bit for D85 straight blade'],
  ['MP-ST-005','Ripper Tip D155','ESCO','1200000','960000','PCS','Ripper tooth tip for D155'],
  ['MP-ST-006','Wear Plate 200x300 20mm','Hardox','385000','308000','PCS','Wear plate Hardox 400 200x300x20mm'],
  ['MP-ST-007','Bucket Pin 60mm x 350mm','Komatsu','450000','360000','PCS','Bucket pin 60mm dia 350mm length'],
  ['MP-ST-008','Bushing Pin 60mm','Komatsu','185000','148000','PCS','Pin bushing 60mm ID x 80mm OD'],
  ['MP-ST-009','Cutting Edge Grader 14G','Caterpillar','3200000','2560000','PCS','Main cutting edge for 14G grader'],
  ['MP-ST-010','Ripper Shank D9','Caterpillar','8500000','6800000','PCS','Single shank ripper assembly D9T'],
];

function generateSampleCsv(): string {
  const header = CSV_COLUMNS.join(',');
  const rows = SAMPLE_PRODUCTS.map((r) => r.join(','));
  return header + '\n' + rows.join('\n');
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values with commas inside
    const values = lines[i].match(/(?:"[^"]*"|[^,])+/g)?.map((v) => v.trim().replace(/^"|"$/g, '')) ?? lines[i].split(',').map((v) => v.trim());
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });

    const partNumber = obj['part_number'] ?? '';
    if (!partNumber) {
      rows.push({ partNumber: '', _valid: false, _error: `Baris ${i + 1}: part_number wajib diisi` });
      continue;
    }

    const salesPrice = obj['sales_price'] ? parseFloat(obj['sales_price'].replace(/[^0-9.]/g, '')) : undefined;
    const costPrice = obj['cost_price'] ? parseFloat(obj['cost_price'].replace(/[^0-9.]/g, '')) : undefined;
    const uomRaw = (obj['uom'] ?? '').toUpperCase().trim();
    const uom: UomType | undefined = ['PCS', 'BOX', 'DOZEN'].includes(uomRaw) ? (uomRaw as UomType) : undefined;

    rows.push({
      partNumber,
      productName: obj['product_name'] || undefined,
      brand: obj['brand'] || undefined,
      salesPrice: salesPrice !== undefined && !isNaN(salesPrice) ? salesPrice : undefined,
      costPrice: costPrice !== undefined && !isNaN(costPrice) ? costPrice : undefined,
      uom,
      description: obj['description'] || undefined,
      _valid: true,
    });
  }

  return rows;
}

function formatRupiah(val: number | string): string {
  const n = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val;
  if (isNaN(n)) return '';
  return n.toLocaleString('id-ID');
}

export default function BulkUpdatePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('csv');

  useEffect(() => {
    if (!authService.isAuthenticated()) router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Bulk Update Produk" />
        <main className="flex-1 p-6 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {([['csv', 'Import CSV'], ['inline', 'Edit Manual']] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as Tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {key === 'csv' ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {label}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {label}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'csv' && <CsvTab />}
          {tab === 'inline' && <InlineTab />}

        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── CSV Tab ── */
function CsvTab() {
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = csvRows.filter((r) => r._valid);
  const invalidRows = csvRows.filter((r) => !r._valid);

  function loadText(text: string) {
    setCsvText(text);
    setCsvRows(parseCsv(text));
    setResult(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadText(ev.target?.result as string);
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadText(ev.target?.result as string);
    reader.readAsText(file);
  }

  function downloadSample() {
    const csv = generateSampleCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_100_products.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const header = CSV_COLUMNS.join(',');
    const example = 'MP-001,Contoh Produk,BrandName,1500000,1200000,PCS,Deskripsi produk opsional';
    const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_bulk_update.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setCsvRows([]);
    setCsvText('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const updates: BulkUpdateItem[] = validRows.map((r) => ({
        partNumber: r.partNumber,
        productName: r.productName,
        brand: r.brand,
        salesPrice: r.salesPrice,
        costPrice: r.costPrice,
        uom: r.uom,
        description: r.description,
      }));
      const res = await productService.bulkUpdate({ updates });
      const { summary } = res.data;
      setResult({ success: summary.success, failed: summary.failed });
      toast.success(`${summary.success} produk berhasil diperbarui`);
      clearAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Download section */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">File CSV</h3>
          <p className="text-xs text-gray-500 mb-3">
            Kolom wajib: <code className="bg-gray-100 px-1 rounded text-blue-700">part_number</code>. Kolom lain opsional.
          </p>
          <p className="text-xs text-gray-400 mb-4 font-mono bg-gray-50 rounded p-2 leading-5">
            {CSV_COLUMNS.join(', ')}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={downloadSample} className="btn-primary text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Sample (100 produk)
            </button>
            <button onClick={downloadTemplate} className="btn-secondary text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Template Kosong
            </button>
          </div>
        </div>

        {/* UOM reference */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Panduan Pengisian</h3>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li><span className="font-mono bg-gray-100 px-1 rounded">part_number</span> — wajib, unique identifier produk</li>
            <li><span className="font-mono bg-gray-100 px-1 rounded">sales_price</span> / <span className="font-mono bg-gray-100 px-1 rounded">cost_price</span> — angka tanpa titik/koma</li>
            <li><span className="font-mono bg-gray-100 px-1 rounded">uom</span> — nilai: <code className="text-blue-700">PCS</code>, <code className="text-blue-700">BOX</code>, atau <code className="text-blue-700">DOZEN</code></li>
            <li><span className="font-mono bg-gray-100 px-1 rounded">description</span> — opsional, hindari koma dalam teks</li>
            <li className="text-green-600 font-medium">Produk baru otomatis dibuat jika part_number belum ada di database</li>
          </ul>
        </div>
      </div>

      {/* Upload area */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Upload atau Paste CSV</h3>

        {/* Drag & drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500">Drag & drop file CSV di sini, atau <span className="text-blue-600 font-medium">klik untuk browse</span></p>
          <p className="text-xs text-gray-400 mt-1">Format: .csv</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative text-center"><span className="bg-white px-3 text-xs text-gray-400">atau paste teks CSV langsung</span></div>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`part_number,product_name,brand,sales_price,cost_price,uom,description\nMP-UC-001,Track Shoe Assy D85,Berco,4500000,3600000,PCS,Track shoe for D85`}
          rows={6}
          className="input-field w-full font-mono text-xs resize-y leading-5"
        />

        <div className="flex gap-2">
          <button
            onClick={() => { setCsvRows(parseCsv(csvText)); setResult(null); }}
            className="btn-primary text-sm"
          >
            Parse & Preview
          </button>
          {csvRows.length > 0 && (
            <button onClick={clearAll} className="btn-secondary text-sm">
              Bersihkan
            </button>
          )}
        </div>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm border flex items-center gap-2 ${
          result.failed === 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={result.failed === 0 ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} />
          </svg>
          <span><strong>{result.success}</strong> produk berhasil diperbarui · <strong>{result.failed}</strong> gagal</span>
        </div>
      )}

      {/* Preview Table */}
      {csvRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-700">Preview Data</h3>
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{validRows.length} valid</span>
              {invalidRows.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{invalidRows.length} error</span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || validRows.length === 0}
              className="btn-primary"
            >
              {submitting
                ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Memproses...</>
                : `Kirim ${validRows.length} Update`}
            </button>
          </div>

          {invalidRows.length > 0 && (
            <div className="p-3 bg-red-50 border-b border-red-100 space-y-0.5">
              {invalidRows.map((r, i) => (
                <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {r._error}
                </p>
              ))}
            </div>
          )}

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-8">#</th>
                  {['Part Number', 'Nama Produk', 'Brand', 'Harga Jual', 'Harga Pokok', 'UOM', 'Deskripsi'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {validRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-gray-800">{row.partNumber}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{row.productName || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-gray-600">{row.brand || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{row.salesPrice !== undefined ? formatRupiah(row.salesPrice) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{row.costPrice !== undefined ? formatRupiah(row.costPrice) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2">
                      {row.uom
                        ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{row.uom}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{row.description || <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── Inline Tab ── */
let _rowIdCounter = 0;
function makeRow(overrides?: Partial<BulkUpdateItem>): InlineRow {
  return {
    _id: ++_rowIdCounter,
    _touched: false,
    partNumber: '',
    productName: '',
    brand: '',
    salesPrice: undefined,
    costPrice: undefined,
    uom: 'PCS',
    description: '',
    ...overrides,
  };
}

function InlineTab() {
  const [rows, setRows] = useState<InlineRow[]>([makeRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.length === 1 ? [makeRow()] : prev.filter((r) => r._id !== id));
  }

  function updateRow(id: number, field: keyof BulkUpdateItem, value: string | number | undefined) {
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, [field]: value, _touched: true } : r));
  }

  function clearAll() {
    setRows([makeRow()]);
    setResult(null);
  }

  async function loadFromDatabase() {
    setLoadingProducts(true);
    try {
      const res = await productService.getProducts({ page: 1, pageSize: 50 });
      const products = res.data ?? [];
      if (products.length === 0) {
        toast('Belum ada produk di database. Sync dulu dari Odoo.', { icon: 'ℹ️' });
        return;
      }
      setRows(products.map((p) => makeRow({
        partNumber: p.partNumber,
        productName: p.productName,
        brand: p.brand ?? '',
        salesPrice: p.salesPrice,
        costPrice: p.costPrice,
        uom: p.uom,
        description: p.description ?? '',
      })));
      toast.success(`${products.length} produk dimuat dari database`);
      setResult(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSubmit() {
    const valid = rows.filter((r) => r.partNumber.trim());
    if (valid.length === 0) {
      toast.error('Isi minimal satu Part Number');
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const updates: BulkUpdateItem[] = valid.map((r) => ({
        partNumber: r.partNumber.trim(),
        productName: r.productName?.trim() || undefined,
        brand: r.brand?.trim() || undefined,
        salesPrice: r.salesPrice,
        costPrice: r.costPrice,
        uom: r.uom,
        description: r.description?.trim() || undefined,
      }));
      const res = await productService.bulkUpdate({ updates });
      const { summary } = res.data;
      setResult({ success: summary.success, failed: summary.failed });
      toast.success(`${summary.success} produk berhasil diperbarui`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const validCount = rows.filter((r) => r.partNumber.trim()).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={loadFromDatabase}
            disabled={loadingProducts}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {loadingProducts
              ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
            Muat dari Database
          </button>
          <button onClick={addRow} className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Baris
          </button>
          <button onClick={clearAll} className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors">
            Reset
          </button>
        </div>
        <div className="flex items-center gap-2">
          {validCount > 0 && (
            <span className="text-xs text-gray-500">{validCount} baris siap disimpan</span>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || validCount === 0}
            className="btn-primary flex items-center gap-1.5"
          >
            {submitting
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Simpan Semua</>}
          </button>
        </div>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm border flex items-center gap-2 ${
          result.failed === 0 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={result.failed === 0 ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} />
          </svg>
          <span><strong>{result.success}</strong> berhasil · <strong>{result.failed}</strong> gagal</span>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <InlineRowCard
            key={row._id}
            row={row}
            index={idx}
            onUpdate={(field, value) => updateRow(row._id, field, value)}
            onRemove={() => removeRow(row._id)}
            canRemove={rows.length > 1 || row.partNumber !== ''}
          />
        ))}
      </div>

      {/* Add row shortcut at bottom */}
      <button
        onClick={addRow}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Tambah baris baru
      </button>
    </div>
  );
}

interface InlineRowCardProps {
  row: InlineRow;
  index: number;
  onUpdate: (field: keyof BulkUpdateItem, value: string | number | undefined) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function InlineRowCard({ row, index, onUpdate, onRemove, canRemove }: InlineRowCardProps) {
  const isEmpty = !row.partNumber.trim();
  const showError = row._touched && isEmpty;

  return (
    <div className={`card p-4 transition-all ${showError ? 'ring-1 ring-red-200' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Row number */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center mt-1">
          {index + 1}
        </div>

        {/* Fields grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Part Number */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Part Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={row.partNumber}
              onChange={(e) => onUpdate('partNumber', e.target.value)}
              placeholder="MP-UC-001"
              className={`input-field text-sm w-full font-mono ${showError ? 'border-red-300 focus:ring-red-300' : ''}`}
            />
            {showError && <p className="text-xs text-red-500 mt-0.5">Wajib diisi</p>}
          </div>

          {/* Product Name */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nama Produk</label>
            <input
              type="text"
              value={row.productName ?? ''}
              onChange={(e) => onUpdate('productName', e.target.value)}
              placeholder="Track Shoe Assy D85"
              className="input-field text-sm w-full"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
            <input
              type="text"
              value={row.brand ?? ''}
              onChange={(e) => onUpdate('brand', e.target.value)}
              placeholder="Berco"
              className="input-field text-sm w-full"
            />
          </div>

          {/* UOM */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">UOM</label>
            <select
              value={row.uom ?? 'PCS'}
              onChange={(e) => onUpdate('uom', e.target.value as UomType)}
              className="input-field text-sm w-full"
            >
              <option value="PCS">PCS</option>
              <option value="BOX">BOX</option>
              <option value="DOZEN">DOZEN</option>
            </select>
          </div>

          {/* Sales Price */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Harga Jual (Rp)</label>
            <input
              type="number"
              value={row.salesPrice ?? ''}
              onChange={(e) => onUpdate('salesPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="4500000"
              min={0}
              className="input-field text-sm w-full"
            />
            {row.salesPrice !== undefined && row.salesPrice > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{formatRupiah(row.salesPrice)}</p>
            )}
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Harga Pokok (Rp)</label>
            <input
              type="number"
              value={row.costPrice ?? ''}
              onChange={(e) => onUpdate('costPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="3600000"
              min={0}
              className="input-field text-sm w-full"
            />
            {row.costPrice !== undefined && row.costPrice > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{formatRupiah(row.costPrice)}</p>
            )}
          </div>

          {/* Description — full width */}
          <div className="col-span-2 md:col-span-3 lg:col-span-6">
            <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label>
            <input
              type="text"
              value={row.description ?? ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              placeholder="Deskripsi singkat produk (opsional)"
              className="input-field text-sm w-full"
            />
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          disabled={!canRemove}
          title="Hapus baris"
          className="flex-shrink-0 p-1.5 mt-0.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
