// Stock Upload – Excel. Two steps: preview (validate, change nothing) and
// confirm (re-validate the same file and apply the valid rows in one
// transaction). Mode NEW creates products with opening stock; mode UPDATE adds
// to (or, when explicitly chosen, replaces) the stock of existing SKUs.
import 'server-only';
import ExcelJS from 'exceljs';
import { prisma, transaction, n } from '@/server/db';
import { badRequest } from '@/server/errors';
import { changeStock, setStock } from '@/server/stock';
import { slugify } from '@/lib/slug';

export const TEMPLATE_COLUMNS = [
  'SKU', 'Product Name', 'Category', 'Subcategory', 'Size', 'Color', 'Purchase Price', 'Selling Price', 'MRP',
  'Opening Stock', 'Low Stock Level', 'Supplier', 'Description', 'Status',
] as const;
type Col = (typeof TEMPLATE_COLUMNS)[number];

export type ImportMode = 'NEW' | 'UPDATE';
export type StockAction = 'ADD' | 'REPLACE';

export interface ImportRow {
  row: number;
  sku: string;
  productName: string;
  category: string;
  subcategory: string;
  size: string;
  color: string;
  purchasePrice: number | null;
  sellingPrice: number | null;
  mrp: number | null;
  stock: number | null;
  lowStockLevel: number | null;
  supplier: string;
  description: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  errors: string[];
  existing: boolean;
  currentStock?: number;
  newStock?: number;
}

export interface ImportPreview {
  mode: ImportMode;
  stockAction: StockAction;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newProducts: number;
  existingProducts: number;
  duplicateSkus: number;
  rows: ImportRow[];
}

export async function buildTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NABA Boutique';
  const ws = wb.addWorksheet('Stock');
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c, key: c, width: c === 'Description' ? 40 : c === 'Product Name' ? 30 : 16 }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D2635' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.addRow({ SKU: 'FTS-101', 'Product Name': 'Cotton Chudidhar', Category: 'Chudidhars', Subcategory: 'Daily Wear', Size: 'M', Color: 'Blue', 'Purchase Price': 450, 'Selling Price': 799, MRP: 899, 'Opening Stock': 20, 'Low Stock Level': 3, Supplier: 'Surat Textiles', Description: 'Soft cotton chudidhar set', Status: 'Active' });
  ws.addRow({ SKU: 'FTS-102', 'Product Name': 'Designer Material', Category: 'Dress Materials', Subcategory: '', Size: 'Free Size', Color: 'Pink', 'Purchase Price': 650, 'Selling Price': 1199, MRP: 1399, 'Opening Stock': 15, 'Low Stock Level': 2, Supplier: 'Surat Textiles', Description: '', Status: 'Active' });

  const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { name: true } });
  const help = wb.addWorksheet('How to fill');
  help.columns = [{ width: 24 }, { width: 90 }];
  const lines: [string, string][] = [
    ['Column', 'Notes'],
    ['SKU', 'Required. Unique code for one size + colour (e.g. FTS-101).'],
    ['Product Name', 'Required for new products. Rows with the same name and category become sizes/colours of one product.'],
    ['Category', `Required for new products. One of: ${cats.map((c) => c.name).join(', ')}`],
    ['Size / Color', 'Size defaults to "Free Size".'],
    ['Prices', 'Numbers only, no ₹ sign. MRP defaults to Selling Price.'],
    ['Opening Stock', 'New Product Import: the opening stock. Stock Update: the quantity to ADD (or the new count if you choose Replace).'],
    ['Status', 'Active, Draft or Archived. Defaults to Active.'],
  ];
  lines.forEach((l, i) => {
    const r = help.addRow(l);
    if (i === 0) r.font = { bold: true };
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return cellText(v.result as ExcelJS.CellValue);
    if ('text' in v) return String(v.text);
    if ('hyperlink' in v) return String((v as { text?: string }).text ?? '');
    return '';
  }
  return String(v);
}

const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim();

function parseNum(raw: string, label: string, errors: string[], opts: { int?: boolean } = {}): number | null {
  const s = raw.replace(/[₹,\s]/g, '');
  if (!s) return null;
  const v = Number(s);
  if (!Number.isFinite(v) || v < 0 || (opts.int && !Number.isInteger(v)) || v > 10_000_000) {
    errors.push(`Invalid ${label}`);
    return null;
  }
  return Math.round(v * 100) / 100;
}

export async function readRows(file: Buffer): Promise<Record<Col, string>[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(file as unknown as ArrayBuffer);
  } catch {
    throw badRequest('This file could not be read. Upload an .xlsx file saved from Excel or Google Sheets.');
  }
  const ws = wb.worksheets[0];
  if (!ws) throw badRequest('The workbook has no sheets');
  const header = (ws.getRow(1).values as ExcelJS.CellValue[]).map((v) => clean(cellText(v)).toLowerCase());
  const index = new Map<Col, number>();
  for (const c of TEMPLATE_COLUMNS) {
    const i = header.indexOf(c.toLowerCase());
    if (i > 0) index.set(c, i);
  }
  const alt = header.findIndex((h) => h === 'add stock' || h === 'quantity' || h === 'stock');
  if (!index.has('Opening Stock') && alt > 0) index.set('Opening Stock', alt);
  if (!index.has('SKU')) throw badRequest('The first row must contain the template column headings (SKU, Product Name, …). Download the template.');
  const rows: Record<Col, string>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, num) => {
    if (num === 1) return;
    const rec = {} as Record<Col, string>;
    for (const c of TEMPLATE_COLUMNS) rec[c] = index.has(c) ? clean(cellText(row.getCell(index.get(c)!).value)) : '';
    if (Object.values(rec).some(Boolean)) rows.push(Object.assign(rec, { __row: String(num) }));
  });
  if (rows.length > 5000) throw badRequest('Upload at most 5,000 rows at a time');
  return rows;
}

export async function previewImport(file: Buffer, mode: ImportMode, stockAction: StockAction): Promise<ImportPreview> {
  const raw = await readRows(file);
  const [cats, variants] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.productVariant.findMany({ where: { sku: { in: raw.map((r) => r.SKU.toUpperCase()).filter(Boolean) } }, select: { sku: true, stock: true, reserved: true } }),
  ]);
  const catByKey = new Map<string, string>();
  for (const c of cats) {
    catByKey.set(c.name.toLowerCase(), c.id);
    catByKey.set(c.slug, c.id);
  }
  const existing = new Map(variants.map((v) => [v.sku, v]));
  const seen = new Map<string, number>();
  let duplicateSkus = 0;

  const rows: ImportRow[] = raw.map((r) => {
    const errors: string[] = [];
    const rowNum = Number((r as unknown as { __row: string }).__row);
    const sku = r.SKU.toUpperCase();
    if (!sku) errors.push('Missing SKU');
    else if (!/^[A-Z0-9][A-Z0-9\-_/.]{0,39}$/.test(sku)) errors.push('Invalid SKU (letters, numbers and - _ / . only)');
    else if (seen.has(sku)) {
      errors.push(`Duplicate SKU (also on row ${seen.get(sku)})`);
      duplicateSkus++;
    } else seen.set(sku, rowNum);

    const ex = sku ? existing.get(sku) : undefined;
    const purchasePrice = parseNum(r['Purchase Price'], 'purchase price', errors);
    const sellingPrice = parseNum(r['Selling Price'], 'selling price', errors);
    const mrp = parseNum(r.MRP, 'MRP', errors);
    const stock = parseNum(r['Opening Stock'], 'quantity', errors, { int: true });
    const lowStockLevel = parseNum(r['Low Stock Level'], 'low stock level', errors, { int: true });
    const statusRaw = r.Status.toUpperCase();
    const status = (['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(statusRaw) ? statusRaw : 'ACTIVE') as ImportRow['status'];
    if (statusRaw && !['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(statusRaw)) errors.push('Status must be Active, Draft or Archived');

    if (mode === 'NEW') {
      if (ex) errors.push('SKU already exists — use Stock Update mode');
      if (!r['Product Name']) errors.push('Missing product name');
      if (!r.Category) errors.push('Missing category');
      else if (!catByKey.has(r.Category.toLowerCase()) && !catByKey.has(slugify(r.Category))) errors.push(`Unknown category "${r.Category}"`);
      if (sellingPrice == null && !errors.some((e) => e.includes('selling'))) errors.push('Missing selling price');
      if (sellingPrice != null && mrp != null && mrp < sellingPrice) errors.push('MRP is lower than selling price');
    } else {
      if (sku && !ex) errors.push('SKU not found — use New Product Import mode');
      if (stock == null && !errors.some((e) => e.includes('quantity'))) errors.push('Missing quantity');
    }

    let newStock: number | undefined;
    if (ex && mode === 'UPDATE' && stock != null) {
      newStock = stockAction === 'REPLACE' ? stock : ex.stock + stock;
      if (newStock < ex.reserved) errors.push(`New stock ${newStock} is below the ${ex.reserved} reserved for pending orders`);
    }

    return {
      row: rowNum,
      sku,
      productName: r['Product Name'],
      category: r.Category,
      subcategory: r.Subcategory,
      size: r.Size || 'Free Size',
      color: r.Color,
      purchasePrice,
      sellingPrice,
      mrp,
      stock,
      lowStockLevel,
      supplier: r.Supplier,
      description: r.Description,
      status,
      errors,
      existing: !!ex,
      currentStock: ex?.stock,
      newStock: mode === 'NEW' ? (stock ?? 0) : newStock,
    };
  });

  const valid = rows.filter((r) => !r.errors.length);
  return {
    mode,
    stockAction,
    totalRows: rows.length,
    validRows: valid.length,
    invalidRows: rows.length - valid.length,
    newProducts: new Set(valid.filter((r) => !r.existing).map((r) => `${r.productName.toLowerCase()}|${r.category.toLowerCase()}`)).size,
    existingProducts: rows.filter((r) => r.existing).length,
    duplicateSkus,
    rows,
  };
}

/** Applies the valid rows of the file. Invalid rows are skipped and reported back. */
export async function confirmImport(file: Buffer, mode: ImportMode, stockAction: StockAction, userName: string) {
  const preview = await previewImport(file, mode, stockAction);
  const valid = preview.rows.filter((r) => !r.errors.length);
  if (!valid.length) throw badRequest('There are no valid rows to import');
  const reference = `Excel ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  await transaction(async (tx) => {
    const cats = await tx.category.findMany();
    const catId = (name: string) => cats.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.slug === slugify(name))!.id;
    const supplierIds = new Map<string, string>();
    const supplierFor = async (name: string) => {
      if (!name) return null;
      const key = name.toLowerCase();
      if (!supplierIds.has(key)) {
        const s = (await tx.supplier.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) ?? (await tx.supplier.create({ data: { name } }));
        supplierIds.set(key, s.id);
      }
      return supplierIds.get(key)!;
    };

    if (mode === 'NEW') {
      const productIds = new Map<string, string>();
      for (const r of valid) {
        const categoryId = catId(r.category);
        const key = `${r.productName.toLowerCase()}|${categoryId}`;
        let productId = productIds.get(key);
        if (!productId) {
          const found = await tx.product.findFirst({ where: { name: { equals: r.productName, mode: 'insensitive' }, categoryId } });
          if (found) productId = found.id;
          else {
            let slug = slugify(r.productName) || 'product';
            if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${r.sku.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            const p = await tx.product.create({
              data: {
                name: r.productName,
                slug,
                categoryId,
                subcategory: r.subcategory || null,
                description: r.description || null,
                shortDesc: r.description ? r.description.slice(0, 160) : null,
                supplierId: await supplierFor(r.supplier),
                status: r.status,
                isNewArrival: true,
              },
            });
            productId = p.id;
          }
          productIds.set(key, productId);
        }
        const v = await tx.productVariant.create({
          data: {
            productId,
            sku: r.sku,
            size: r.size,
            color: r.color,
            price: r.sellingPrice!,
            mrp: r.mrp ?? r.sellingPrice!,
            costPrice: r.purchasePrice ?? 0,
            lowStockLevel: r.lowStockLevel ?? 3,
          },
        });
        if (r.stock) await changeStock(tx, v.id, r.stock, { type: 'OPENING_STOCK', reference, note: 'Excel import', userName });
      }
    } else {
      for (const r of valid) {
        const v = await tx.productVariant.findUniqueOrThrow({ where: { sku: r.sku } });
        const data: Record<string, unknown> = {};
        if (r.sellingPrice != null) data.price = r.sellingPrice;
        if (r.mrp != null) data.mrp = r.mrp;
        else if (r.sellingPrice != null && n(v.mrp) < r.sellingPrice) data.mrp = r.sellingPrice;
        if (r.purchasePrice != null) data.costPrice = r.purchasePrice;
        if (r.lowStockLevel != null) data.lowStockLevel = r.lowStockLevel;
        if (Object.keys(data).length) await tx.productVariant.update({ where: { id: v.id }, data });
        const meta = { type: 'EXCEL_IMPORT' as const, reference, note: stockAction === 'REPLACE' ? 'Replace current stock' : 'Add stock', userName };
        if (stockAction === 'REPLACE') await setStock(tx, v.id, r.stock!, meta);
        else if (r.stock) await changeStock(tx, v.id, r.stock, meta);
      }
    }
  });

  return { imported: valid.length, skipped: preview.invalidRows, reference };
}
