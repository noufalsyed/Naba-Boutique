// Demo catalogue + staff accounts. Run with `npm run db:seed` (or db:reset for a clean start).
// Demo sales/purchases are only added outside production (or with SEED_DEMO_SALES=true).
import '../scripts/load-env';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { prisma, transaction } from '@/server/db';
import { changeStock } from '@/server/stock';
import { hashPassword } from '@/server/auth/password';
import { slugify } from '@/lib/slug';
import { productArt, type ArtSpec } from './placeholder-art';

const storage = path.resolve(process.env.STORAGE_DIR || './storage');

async function writeArt(name: string, spec: ArtSpec, variant: 'front' | 'detail' = 'front') {
  const dir = path.join(storage, 'public', 'products');
  await fs.mkdir(dir, { recursive: true });
  const file = `${name}-${variant}.webp`;
  await sharp(Buffer.from(productArt(spec, variant))).webp({ quality: 84 }).toFile(path.join(dir, file));
  return `/media/products/${file}`;
}

const CATEGORIES = [
  { name: 'Chudidhars', description: 'Ready-to-wear chudidhar sets in breathable cottons and festive weaves.', art: { base: '#7a2235', accent: '#e9c9a8', bg: '#f6efe6', kind: 'kurta', pattern: 'buti', gold: true } },
  { name: 'Dress Materials', description: 'Unstitched dress materials — choose your fabric, we can stitch it to fit.', art: { base: '#2f6f73', accent: '#f1d9b5', bg: '#f3efe8', kind: 'fabric', pattern: 'floral' } },
  { name: 'Ethnic Wear', description: 'Anarkalis, kurti sets, shararas and dupattas for every celebration.', art: { base: '#6b4a86', accent: '#e8c98f', bg: '#f5eee8', kind: 'anarkali', pattern: 'paisley', gold: true } },
  { name: 'Fabrics', description: 'Premium cottons, linens and Kerala kasavu by the piece.', art: { base: '#efe3c8', accent: '#c8a45d', bg: '#f7f2ea', kind: 'fabric', pattern: 'kasavu', gold: true } },
] as const satisfies readonly { name: string; description: string; art: ArtSpec }[];

interface SeedProduct {
  name: string;
  category: (typeof CATEGORIES)[number]['name'];
  subcategory?: string;
  shortDesc: string;
  description: string;
  fabric: string;
  price: number;
  mrp: number;
  sizes: string[];
  colors: { name: string; art: ArtSpec }[];
  flags?: { featured?: boolean; newArrival?: boolean; bestSeller?: boolean };
  stock?: number | 'out';
}

const ALL = ['S', 'M', 'L', 'XL', 'XXL'];
const P = (base: string, accent: string, kind: ArtSpec['kind'], pattern: ArtSpec['pattern'], gold = false, bg = '#f6efe6'): ArtSpec => ({ base, accent, bg, kind, pattern, gold });

const PRODUCTS: SeedProduct[] = [
  { name: 'Premium Cotton Chudidhar', category: 'Chudidhars', subcategory: 'Daily Wear', shortDesc: 'Soft mul-cotton chudidhar set with buti print and matching dupatta.', description: 'An everyday favourite in breathable mul cotton. The straight-cut top has a gentle V-neck with piping, paired with a comfortable chudidhar bottom and a light cotton dupatta. Made for long Kerala days — soft, airy and easy to care for.', fabric: '100% Mul Cotton', price: 1299, mrp: 1599, sizes: ALL, colors: [{ name: 'Navy', art: P('#22304f', '#e7d3b0', 'kurta', 'buti') }, { name: 'Maroon', art: P('#6d1f2c', '#efd9b9', 'kurta', 'buti', true) }], flags: { newArrival: true, bestSeller: true, featured: true } },
  { name: 'Designer Anarkali Dress Material', category: 'Dress Materials', subcategory: 'Anarkali', shortDesc: 'Unstitched georgette anarkali material with floral print and lining.', description: 'Three-piece unstitched set: 3 m printed georgette top, 2.5 m santoon bottom and a 2.25 m chiffon dupatta. Perfect for a flowing anarkali — send it to us for custom stitching to your measurements.', fabric: 'Georgette / Santoon / Chiffon', price: 1899, mrp: 2399, sizes: ['Free Size'], colors: [{ name: 'Wine', art: P('#5e1a2a', '#f0c9b7', 'fabric', 'floral') }, { name: 'Teal', art: P('#2f6f73', '#f1d9b5', 'fabric', 'floral') }], flags: { featured: true } },
  { name: 'Embroidered Party Wear Material', category: 'Dress Materials', subcategory: 'Party Wear', shortDesc: 'Zari and thread embroidered material for weddings and parties.', description: 'Rich embroidered yoke with zari detailing on soft organza. Includes top, bottom and embroidered dupatta fabric. A statement piece for wedding season.', fabric: 'Organza with Zari Embroidery', price: 2499, mrp: 3199, sizes: ['Free Size'], colors: [{ name: 'Black', art: P('#1f1d1c', '#c8a45d', 'fabric', 'paisley', true) }, { name: 'Burgundy', art: P('#7a2235', '#e8c98f', 'fabric', 'paisley', true) }], flags: { bestSeller: true } },
  { name: 'Premium Printed Chudidhar', category: 'Chudidhars', subcategory: 'Printed', shortDesc: 'Floral printed rayon chudidhar with contrast piping.', description: 'A cheerful floral print on fluid rayon with a flattering straight fit, three-quarter sleeves and contrast piping. Comes with chudidhar and printed dupatta.', fabric: 'Rayon', price: 999, mrp: 1299, sizes: ALL, colors: [{ name: 'Mustard', art: P('#c99a2e', '#7a2235', 'kurta', 'floral') }, { name: 'Sky Blue', art: P('#8fb6d9', '#22304f', 'kurta', 'floral') }], flags: { newArrival: true } },
  { name: 'Festive Collection Anarkali Set', category: 'Ethnic Wear', subcategory: 'Anarkali', shortDesc: 'Flared anarkali with gold yoke work, churidar and net dupatta.', description: 'Our festive bestseller — a twelve-panel flared anarkali with hand-finished gold yoke work, a fitted churidar and a soft net dupatta with scalloped border. Fully lined.', fabric: 'Silk Blend with Lining', price: 3299, mrp: 3999, sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Maroon', art: P('#6d1f2c', '#e8c98f', 'anarkali', 'paisley', true) }, { name: 'Green', art: P('#3f6a4a', '#e8c98f', 'anarkali', 'paisley', true) }], flags: { featured: true, bestSeller: true } },
  { name: 'Designer Dupatta', category: 'Ethnic Wear', subcategory: 'Dupattas', shortDesc: 'Lightweight chiffon dupatta with gold tassels.', description: 'A versatile chiffon dupatta with delicate buti and gold tassel finish — pairs beautifully with plain kurtas and chudidhars.', fabric: 'Chiffon', price: 699, mrp: 899, sizes: ['Free Size'], colors: [{ name: 'Rose', art: P('#c98d95', '#ffffff', 'dupatta', 'buti', true) }, { name: 'Ivory', art: P('#f4ecdc', '#c8a45d', 'dupatta', 'buti', true, '#efe7db') }], flags: { newArrival: true } },
  { name: 'Premium Cotton Fabric', category: 'Fabrics', subcategory: 'Cotton', shortDesc: '2.5 m pure cotton piece with woven stripes.', description: 'A 2.5-metre piece of fine pure cotton with subtle woven stripes. Ideal for kurtas, tops and kidswear.', fabric: '100% Cotton, 2.5 m', price: 449, mrp: 549, sizes: ['Free Size'], colors: [{ name: 'Beige', art: P('#d9c3a5', '#7a5235', 'fabric', 'stripe') }, { name: 'Olive', art: P('#77783f', '#efe3c8', 'fabric', 'stripe') }] },
  { name: 'Customized Chudidhar', category: 'Chudidhars', subcategory: 'Made to Measure', shortDesc: 'Stitched to your measurements in your choice of neck and sleeve.', description: 'Choose the colour, tell us your measurements and preferred neck and sleeve style — we stitch a chudidhar that fits you perfectly. After ordering, our team will contact you on WhatsApp to confirm measurements.', fabric: 'Premium Cotton Silk', price: 1799, mrp: 1999, sizes: ['Custom'], colors: [{ name: 'Peach', art: P('#efb79b', '#7a2235', 'kurta', 'paisley') }, { name: 'Teal', art: P('#2f6f73', '#efd9b9', 'kurta', 'paisley', true) }], flags: { featured: true } },
  { name: 'Chanderi Silk Dress Material', category: 'Dress Materials', subcategory: 'Silk', shortDesc: 'Lustrous chanderi with woven gold butis.', description: 'Lightweight chanderi silk with woven gold butis, cotton bottom and chanderi dupatta. A graceful choice for functions and office wear alike.', fabric: 'Chanderi Silk', price: 1599, mrp: 1999, sizes: ['Free Size'], colors: [{ name: 'Peach', art: P('#efb79b', '#c8a45d', 'fabric', 'dots', true) }, { name: 'Mint', art: P('#a9cdb5', '#c8a45d', 'fabric', 'dots', true) }], flags: { newArrival: true } },
  { name: 'Rayon A-Line Kurti Set', category: 'Ethnic Wear', subcategory: 'Kurti Sets', shortDesc: 'A-line kurti with palazzo, easy everyday elegance.', description: 'A swishy A-line kurti in soft rayon with a matching palazzo. Pull-on comfort with a polished look.', fabric: 'Rayon', price: 1149, mrp: 1499, sizes: ALL, colors: [{ name: 'Lavender', art: P('#b3a4cf', '#ffffff', 'kurta', 'chikan') }, { name: 'Coral', art: P('#e4775f', '#ffffff', 'kurta', 'chikan') }], flags: { newArrival: true } },
  { name: 'Handblock Printed Chudidhar', category: 'Chudidhars', subcategory: 'Printed', shortDesc: 'Hand-block printed cotton in classic indigo.', description: 'Hand-block printed by artisans on soft cotton — every piece carries small, beautiful variations. Includes chudidhar and mulmul dupatta.', fabric: 'Cotton', price: 1099, mrp: 1399, sizes: ['M', 'L', 'XL'], colors: [{ name: 'Blue', art: P('#3c5f93', '#f4ecdc', 'kurta', 'ikat') }, { name: 'Brown', art: P('#7a5235', '#f4ecdc', 'kurta', 'ikat') }], flags: { bestSeller: true } },
  { name: 'Kerala Kasavu Fabric', category: 'Fabrics', subcategory: 'Kasavu', shortDesc: 'Traditional cream kasavu with gold zari border.', description: 'Classic Kerala kasavu cotton with a rich gold zari border — a must for Onam and Vishu. 2.5 m piece.', fabric: 'Cotton with Zari, 2.5 m', price: 899, mrp: 1099, sizes: ['Free Size'], colors: [{ name: 'Cream', art: P('#efe3c8', '#c8a45d', 'fabric', 'kasavu', true, '#f7f2ea') }], flags: { bestSeller: true } },
  { name: 'Georgette Sharara Set', category: 'Ethnic Wear', subcategory: 'Sharara', shortDesc: 'Short kurta with flared sharara and dupatta.', description: 'A short embroidered kurta with a dramatic flared sharara and sheer dupatta. Light georgette that moves beautifully.', fabric: 'Georgette', price: 2799, mrp: 3499, sizes: ['S', 'M', 'L'], colors: [{ name: 'Mauve', art: P('#a07b8f', '#f0dcc0', 'sharara', 'chikan', true) }, { name: 'Teal', art: P('#2f6f73', '#f0dcc0', 'sharara', 'chikan', true) }], flags: { newArrival: true } },
  { name: 'Linen Blend Fabric', category: 'Fabrics', subcategory: 'Linen', shortDesc: 'Cool linen-cotton blend, 2.5 m piece.', description: 'A breathable linen-cotton blend with a soft slub texture — ideal for summer kurtas.', fabric: 'Linen Cotton Blend, 2.5 m', price: 599, mrp: 699, sizes: ['Free Size'], colors: [{ name: 'Grey', art: P('#9a9692', '#f8f6f2', 'fabric', 'dots') }, { name: 'Peach', art: P('#efb79b', '#ffffff', 'fabric', 'dots') }] },
  { name: 'Lucknowi Chikankari Material', category: 'Dress Materials', subcategory: 'Chikankari', shortDesc: 'Hand-embroidered chikankari on soft cotton.', description: 'Delicate Lucknowi chikankari hand embroidery on soft cotton, with plain bottom and mulmul dupatta.', fabric: 'Cotton with Chikankari', price: 2199, mrp: 2699, sizes: ['Free Size'], colors: [{ name: 'White', art: P('#f8f6f2', '#b8aa98', 'fabric', 'chikan', false, '#efe7db') }, { name: 'Pink', art: P('#e2a3b0', '#ffffff', 'fabric', 'chikan') }], flags: { featured: true } },
  { name: 'Ikat Weave Chudidhar', category: 'Chudidhars', subcategory: 'Handloom', shortDesc: 'Handloom ikat chudidhar — back soon.', description: 'Handloom ikat weave chudidhar with a straight fit. Currently sold out — order on WhatsApp to be notified when it is back.', fabric: 'Handloom Cotton', price: 1499, mrp: 1799, sizes: ['M', 'L'], colors: [{ name: 'Red', art: P('#b3263a', '#f4ecdc', 'kurta', 'ikat') }], stock: 'out' },
];

const REVIEWS = [
  { name: 'Anjali R.', location: 'Kochi', rating: 5, text: 'The cotton chudidhar fits perfectly and the fabric is so soft. Ordered on WhatsApp and got it in three days!' },
  { name: 'Fathima S.', location: 'Kozhikode', rating: 5, text: 'Gave my material for custom stitching — the neck design came out exactly like my reference photo. Highly recommend.' },
  { name: 'Lakshmi Menon', location: 'Thrissur', rating: 5, text: 'Beautiful festive anarkali, the gold work is elegant and not loud. Got so many compliments at the wedding.' },
  { name: 'Neha P.', location: 'Bengaluru', rating: 4, text: 'Lovely quality and very responsive on Instagram. Packaging was neat and premium.' },
  { name: 'Shabna K.', location: 'Malappuram', rating: 5, text: 'Payment by UPI was quick and they updated me at every step. My go-to boutique now.' },
  { name: 'Divya Nair', location: 'Trivandrum', rating: 5, text: 'Kasavu fabric was gorgeous for Onam. Stitching was done on time too.' },
];

async function seedStaff() {
  const lines: string[] = [];
  for (const u of [
    { name: 'Store Admin', email: (process.env.SEED_ADMIN_EMAIL || 'admin@feathers.local').toLowerCase(), role: 'ADMIN' as const, env: 'SEED_ADMIN_PASSWORD' },
    { name: 'Counter Cashier', email: 'cashier@feathers.local', role: 'CASHIER' as const, env: 'SEED_CASHIER_PASSWORD' },
  ]) {
    if (await prisma.adminUser.findUnique({ where: { email: u.email } })) continue;
    const password = process.env[u.env] || `Ft${randomBytes(6).toString('base64url')}9`;
    await prisma.adminUser.create({ data: { name: u.name, email: u.email, role: u.role, passwordHash: await hashPassword(password) } });
    lines.push(`${u.role.padEnd(8)} ${u.email}  ${password}`);
  }
  if (lines.length) {
    await fs.writeFile('TEST-LOGINS.txt', `NABA Boutique admin logins (created ${new Date().toISOString()})\nChange these after first sign-in.\n\n${lines.join('\n')}\n`, { flag: 'a' });
    console.log('Staff accounts created — see TEST-LOGINS.txt');
  }
}

async function main() {
  await seedStaff();
  if ((await prisma.product.count()) > 0) {
    console.log('Catalogue already has products — skipping demo catalogue.');
    return;
  }

  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const imageUrl = await writeArt(`category-${slugify(c.name)}`, c.art);
    const row = await prisma.category.create({ data: { name: c.name, slug: slugify(c.name), description: c.description, imageUrl, sortOrder: i } });
    cats.set(c.name, row.id);
  }

  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Surat Textiles', companyName: 'Surat Textile House', phone: '9824000011', whatsapp: '9824000011', email: 'orders@surattextiles.example', address: 'Ring Road, Surat, Gujarat', gstin: '24ABCDE1234F1Z5' } }),
    prisma.supplier.create({ data: { name: 'Jaipur Prints', companyName: 'Jaipur Block Prints Co.', phone: '9414000022', address: 'Sanganer, Jaipur, Rajasthan' } }),
    prisma.supplier.create({ data: { name: 'Balaramapuram Weavers', companyName: 'Balaramapuram Handloom Society', phone: '9447000033', address: 'Balaramapuram, Trivandrum, Kerala' } }),
  ]);

  let skuNo = 1;
  for (const [pi, p] of PRODUCTS.entries()) {
    const slug = slugify(p.name);
    const images: { url: string; alt: string; sortOrder: number }[] = [];
    for (const [ci, c] of p.colors.entries()) {
      images.push({ url: await writeArt(`${slug}-${slugify(c.name)}`, c.art), alt: `${p.name} in ${c.name}`, sortOrder: ci * 2 });
      if (ci === 0) images.push({ url: await writeArt(`${slug}-${slugify(c.name)}`, c.art, 'detail'), alt: `${p.name} fabric detail`, sortOrder: 1 });
    }
    const supplier = suppliers[p.category === 'Fabrics' ? 2 : p.subcategory === 'Printed' ? 1 : 0];
    await transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: p.name,
          slug,
          categoryId: cats.get(p.category)!,
          subcategory: p.subcategory,
          shortDesc: p.shortDesc,
          description: p.description,
          fabric: p.fabric,
          careNotes: 'Gentle hand wash or dry clean. Wash dark colours separately. Dry in shade.',
          supplierId: supplier.id,
          isFeatured: !!p.flags?.featured,
          isNewArrival: !!p.flags?.newArrival,
          isBestSeller: !!p.flags?.bestSeller,
          soldCount: p.flags?.bestSeller ? 40 - pi : pi,
          createdAt: new Date(Date.now() - (PRODUCTS.length - pi) * 86_400_000),
          images: { create: images },
        },
      });
      for (const c of p.colors) {
        for (const size of p.sizes) {
          const sku = `FTS-${String(skuNo++).padStart(3, '0')}`;
          const v = await tx.productVariant.create({
            data: { productId: product.id, sku, size, color: c.name, price: p.price, mrp: p.mrp, costPrice: Math.round(p.price * 0.55), lowStockLevel: 2 },
          });
          const qty = p.stock === 'out' ? 0 : p.stock ?? ((skuNo * 7) % 11) + 2;
          if (qty > 0) await changeStock(tx, v.id, qty, { type: 'OPENING_STOCK', reference: 'Opening stock', userName: 'System' });
        }
      }
    });
  }
  await prisma.review.createMany({ data: REVIEWS.map((r) => ({ ...r, isApproved: true })) });
  console.log(`Seeded ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${skuNo - 1} SKUs.`);

  if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_SALES === 'true') await seedDemoActivity(suppliers[0].id);
}

async function seedDemoActivity(supplierId: string) {
  const { savePurchase } = await import('@/server/purchases');
  const { createStoreSale, createCustomerOrder, recordManualPayment } = await import('@/server/orders');
  const variants = await prisma.productVariant.findMany({ where: { stock: { gt: 3 } }, orderBy: { sku: 'asc' }, take: 12 });
  const v = (i: number) => variants[i % variants.length];

  const today = new Date().toISOString().slice(0, 10);
  await savePurchase(
    {
      supplierId,
      invoiceNumber: 'ST/2026/884',
      purchaseDate: today,
      paymentStatus: 'PAID',
      discount: 200,
      additionalCharges: 150,
      receive: true,
      items: [
        { variantId: v(0).id, productName: 'x', quantity: 10, purchasePrice: 700, sellingPrice: 1299, discount: 0, size: '', color: '' },
        { variantId: v(3).id, productName: 'x', quantity: 6, purchasePrice: 650, sellingPrice: 1299, discount: 0, size: '', color: '' },
      ],
    },
    'Store Admin',
  );
  await savePurchase(
    { supplierId, invoiceNumber: 'ST/2026/901', purchaseDate: today, paymentStatus: 'UNPAID', discount: 0, additionalCharges: 0, receive: false, items: [{ variantId: v(5).id, productName: 'x', quantity: 8, purchasePrice: 520, sellingPrice: 999, discount: 0, size: '', color: '' }] },
    'Store Admin',
  );

  await createStoreSale({ customerName: 'Reshma', phone: '9847012345', paymentMethod: 'CASH', extraDiscount: 0, lines: [{ variantId: v(1).id, quantity: 1 }, { variantId: v(7).id, quantity: 2 }] }, 'Counter Cashier');
  await createStoreSale({ paymentMethod: 'UPI', extraDiscount: 100, lines: [{ variantId: v(2).id, quantity: 1 }] }, 'Counter Cashier');
  await createStoreSale({ paymentMethod: 'CARD', extraDiscount: 0, lines: [{ variantId: v(9).id, quantity: 1 }] }, 'Store Admin');

  const addr = { address: '12/345, Rose Villa, MG Road', city: 'Kochi', state: 'Kerala', pincode: '682016' };
  const wa = await createCustomerOrder({ name: 'Anjali Ramesh', phone: '9895011122', email: 'anjali@example.com', ...addr, method: 'WHATSAPP', lines: [{ variantId: v(4).id, quantity: 1 }] });
  await recordManualPayment(wa.id, 'UPI', 'UPI ref 4512', 'Store Admin');
  await createCustomerOrder({ name: 'Fathima Shirin', phone: '9746033344', ...addr, city: 'Kozhikode', pincode: '673001', method: 'WHATSAPP', lines: [{ variantId: v(6).id, quantity: 2 }] });
  await createCustomerOrder({ name: 'Neha Pillai', phone: '9567055566', ...addr, city: 'Thrissur', pincode: '680001', method: 'ONLINE', lines: [{ variantId: v(8).id, quantity: 1 }] });
  console.log('Seeded demo purchases and orders.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
