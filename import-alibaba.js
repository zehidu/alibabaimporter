#!/usr/bin/env node
import fs from 'fs';
import { chromium } from 'playwright';

const prompt = async (q) => {
  process.stdout.write(q);
  return await new Promise((resolve) => {
    process.stdin.once('data', (data) => resolve(String(data).trim()));
  });
};

const getArg = (args, name, def = null) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : def;
};

const mapSameSite = (value) => {
  const v = String(value || '').toLowerCase();
  if (v === 'lax') return 'Lax';
  if (v === 'strict') return 'Strict';
  if (v === 'no_restriction' || v === 'none') return 'None';
  return 'Lax';
};

const loadCookies = (cookiesPath) => {
  if (!cookiesPath || !fs.existsSync(cookiesPath)) return [];
  const raw = fs.readFileSync(cookiesPath, 'utf8');
  const cookies = JSON.parse(raw);
  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    httpOnly: Boolean(c.httpOnly),
    secure: Boolean(c.secure),
    sameSite: mapSameSite(c.sameSite),
    expires: c.expirationDate ? Math.floor(Number(c.expirationDate)) : undefined
  })).filter((c) => c.name && c.domain);
};

const parsePrice = (value) => {
  if (!value) return null;
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? num : null;
};

const extractFromPage = async (page) => {
  return page.evaluate(() => {
    const pickText = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };

    const titleCandidates = [
      pickText('h1'),
      pickText('[class*="product-title"]'),
      pickText('[class*="title"]'),
      document.title || '',
      (document.querySelector('meta[property="og:title"]') || {}).content || ''
    ].filter(Boolean);

    let title = '';
    for (const t of titleCandidates) if (t.length > title.length) title = t;

    const desc = (document.querySelector('meta[name="description"]') || {}).content ||
      (document.querySelector('meta[property="og:description"]') || {}).content || '';

    const imgs = Array.from(document.querySelectorAll('img'))
      .map((img) => img.getAttribute('src') || img.getAttribute('data-src') || '')
      .filter(Boolean);

    const imageUrls = Array.from(new Set(imgs))
      .filter((src) => /(alicdn\.com|alibaba\.com)/i.test(src))
      .filter((src) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(src));

    const priceNodes = Array.from(document.querySelectorAll('[class*="price"], [class*="Price"]'));
    const priceTexts = priceNodes.map((el) => el.textContent.trim()).filter(Boolean);

    return {
      title,
      description: desc,
      imageUrls: imageUrls.slice(0, 10),
      priceText: priceTexts.join(' ')
    };
  });
};

const main = async () => {
  const args = process.argv.slice(2);
  const url = await prompt('Alibaba product URL: ');

  const apiBase = getArg(args, '--api', await prompt('API base (e.g. https://therenewup.com/api): '));
  const token = getArg(args, '--token', await prompt('Admin access token: '));
  const cookiesPath = getArg(args, '--cookies', await prompt('Alibaba cookies JSON path: '));
  const categoryId = getArg(args, '--category', await prompt('Category ID (optional): '));
  const priceArg = getArg(args, '--price', await prompt('Price (optional): '));
  const wholesaleArg = getArg(args, '--wholesale', await prompt('Wholesale price (optional): '));
  const headed = args.includes('--headed');

  const browser = await chromium.launch({
    headless: !headed,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; TRU-Importer/1.0)',
    locale: 'en-US'
  });

  const cookies = loadCookies(cookiesPath);
  if (cookies.length > 0) await context.addCookies(cookies);

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  if (headed) {
    await prompt('If a captcha appears, solve it in the browser, then press Enter here to continue...');
    await page.waitForTimeout(1000);
  }

  const data = await extractFromPage(page);

  await page.close();
  await context.close();
  await browser.close();

  if (!data.title || data.title.toLowerCase().includes('captcha')) {
    throw new Error('Captcha detected. Please re-run with --headed and solve it before pressing Enter.');
  }

  const priceDetected = parsePrice(data.priceText);
  const finalPrice = parsePrice(priceArg) ?? priceDetected;
  const finalWholesale = parsePrice(wholesaleArg) ?? finalPrice;

  if (!finalPrice || !finalWholesale) {
    throw new Error('Price not detected. Provide --price and --wholesale.');
  }

  const payload = {
    name: data.title,
    description: data.description,
    category_id: categoryId ? parseInt(categoryId) : null,
    price: finalPrice,
    wholesale_price: finalWholesale,
    moq: 1,
    stock_quantity: 0,
    in_stock: true,
    is_featured: false,
    specs: [],
    rating: 0,
    review_count: 0,
    sold_count: 0,
  };

  const res = await fetch(`${apiBase}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const created = await res.json();
  if (!res.ok) {
    console.error(created);
    throw new Error('Failed to create product');
  }

  const productId = created.id;
  for (let i = 0; i < data.imageUrls.length; i++) {
    const img = data.imageUrls[i];
    await fetch(`${apiBase}/admin/products/${productId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        image_url: img,
        alt_text: data.title,
        is_primary: i === 0
      })
    });
  }

  console.log(`Imported product ${productId}: ${data.title}`);
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
