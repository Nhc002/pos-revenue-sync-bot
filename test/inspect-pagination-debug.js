const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://fabi.ipos.vn/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="email_input"]');
  await page.type('input[name="email_input"]', 'techinfor366@gmail.com');
  await page.waitForSelector('input[name="password"]');
  await page.type('input[name="password"]', 'abc123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.click('button[type="submit"]')
  ]);

  await page.goto('https://fabi.ipos.vn/report/revenue/revenue/shift', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');

  // Trigger Tháng này
  await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('div, span, button, input, a'));
    const dateEl = allEls.reverse().find(el => /^\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}$/.test(el.innerText || ''));
    if (dateEl) dateEl.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('li, div, button, span, a')).find(el => (el.innerText || '').trim() === 'Tháng này');
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  console.log('--- TRANG 1 ---');
  let firstRowP1 = await page.evaluate(() => document.querySelector('tbody tr')?.innerText.replace(/\s+/g, ' '));
  console.log('Row 1 Page 1:', firstRowP1);

  // In danh sách nút phân trang
  const pagers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('ul.pagination li, .pagination a, .pagination button, li.number, .btn-page')).map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      class: el.className,
      html: el.outerHTML
    }));
  });
  console.log('Duyệt các elements phân trang:', JSON.stringify(pagers, null, 2));

  // Thử click vào nút trang 2
  console.log('\n--> Click vào trang 2...');
  const clickRes = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.pagination a, .pagination li a, .pagination li, .page-link'));
    const p2 = all.find(el => el.innerText.trim() === '2');
    if (p2) {
      p2.click();
      return { found: true, html: p2.outerHTML };
    }
    return { found: false };
  });
  console.log('Kết quả click:', clickRes);

  await new Promise(r => setTimeout(r, 3000));

  let firstRowP2 = await page.evaluate(() => document.querySelector('tbody tr')?.innerText.replace(/\s+/g, ' '));
  console.log('Row 1 Page 2 sau khi click:', firstRowP2);

  await browser.close();
})();
