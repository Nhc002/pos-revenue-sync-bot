const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function inspectReportPage() {
  console.log('Đang kết nối tới iPOS FABi để kiểm tra ô lọc ngày tháng...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Đăng nhập
    await page.goto('https://fabi.ipos.vn/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email_input"]', 'techinfor366@gmail.com');
    await page.type('input[type="password"]', 'abc123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    // 2. Vào trang báo cáo
    await page.goto('https://fabi.ipos.vn/report/revenue/revenue/shift', { waitUntil: 'networkidle2' });

    // Kiểm tra tất cả input và pagination elements
    const pageInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        id: i.id,
        name: i.name,
        class: i.className,
        value: i.value,
        placeholder: i.placeholder
      }));

      const paginationElements = Array.from(document.querySelectorAll('ul, div, nav, a, li, button')).filter(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        return text === '6' || text.includes('6') || el.className.includes('pagination') || el.className.includes('page');
      }).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText ? el.innerText.trim().slice(0, 50) : ''
      }));

      return { inputs, paginationElements };
    });

    console.log('\n--- CÁC Ô INPUT LỌC NGÀY THÁNG TRÊN IPOS ---');
    console.dir(pageInfo.inputs, { depth: null });

    console.log('\n--- PHẦN TỬ PHÂN TRANG PAGINATION ---');
    console.dir(pageInfo.paginationElements, { depth: null });

  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    await browser.close();
  }
}

inspectReportPage();
