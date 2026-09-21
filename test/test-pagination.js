const puppeteer = require('puppeteer');
const config = require('../config');

(async () => {
  console.log('Khởi tạo browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://fabi.ipos.vn/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="email_input"], input[name="username"]');
  await page.type('input[name="email_input"]', 'techinfor366@gmail.com');
  const passEl = await page.$('input[name="password"]');
  if (passEl) {
    await page.type('input[name="password"]', 'abc123');
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.click('button[type="submit"]')
  ]);
  
  // nếu chưa sang trang, thử lại
  if (page.url().includes('login')) {
    const passInput = await page.$('input[name="password"]');
    if (passInput) await page.type('input[name="password"]', 'abc123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('Đã đăng nhập! Điều hướng báo cáo ca...');
  await page.goto('https://fabi.ipos.vn/report/revenue/revenue/shift', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');

  // Click Tháng này
  await page.evaluate(() => {
    const dateEl = Array.from(document.querySelectorAll('div, span, button, input, a')).reverse().find(el => /^\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}$/.test(el.innerText || ''));
    if (dateEl) dateEl.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('li, div, button, span, a')).find(el => (el.innerText || '').trim() === 'Tháng này');
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // In thông tin phân trang & hàng 1 của trang 1
  const page1Info = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    const paginationEls = Array.from(document.querySelectorAll('.pagination a, .pagination li, .page-link, .page-item')).map(el => ({
      text: el.innerText.trim(),
      html: el.outerHTML
    }));
    return {
      rowCount: rows.length,
      firstRow: rows[0] ? rows[0].innerText.replace(/\s+/g, ' ') : null,
      pagination: paginationEls
    };
  });

  console.log('PAGE 1 row count:', page1Info.rowCount);
  console.log('PAGE 1 first row:', page1Info.firstRow);
  console.log('Pagination elements found:', JSON.stringify(page1Info.pagination, null, 2));

  await browser.close();
})();
