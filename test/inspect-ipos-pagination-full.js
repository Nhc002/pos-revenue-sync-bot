const puppeteer = require('puppeteer');

(async () => {
  console.log('Khởi chạy debug phân trang iPOS...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://fabi.ipos.vn/login', { waitUntil: 'networkidle2' });
  const userInput = await page.$('input[name="email_input"], input[name="username"]');
  if (userInput) await userInput.type('techinfor366@gmail.com');
  const passInput = await page.$('input[name="password"]');
  if (passInput) await passInput.type('abc123');
  const loginBtn = await page.$('button[type="submit"], .btn-primary, .btn-login');
  if (loginBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      loginBtn.click()
    ]);
  }

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

  for (let p = 1; p <= 6; p++) {
    const rowsInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(r => {
        const tds = Array.from(r.querySelectorAll('td'));
        return {
          open: tds[11] ? tds[11].innerText.trim() : '',
          close: tds[12] ? tds[12].innerText.trim() : '',
          rev: tds[5] ? tds[5].innerText.trim() : ''
        };
      }).filter(r => r.open || r.rev);
    });

    console.log(`--- TRANG ${p} (Số dòng: ${rowsInfo.length}) ---`);
    if (rowsInfo.length > 0) {
      console.log('Dòng đầu:', rowsInfo[0]);
      console.log('Dòng cuối:', rowsInfo[rowsInfo.length - 1]);
    }

    // Thử click trang tiếp theo
    const nextP = p + 1;
    const clicked = await page.evaluate((targetPage) => {
      // Tìm tất cả các element chứa số trang targetPage
      const candidates = Array.from(document.querySelectorAll('ul.pagination a, ul.pagination li, .pagination a, .page-link, .page-item a, li.number, button'));
      const target = candidates.find(c => c.innerText.trim() === String(targetPage));
      if (target) {
        target.click();
        return { success: true, text: target.innerText, html: target.outerHTML };
      }
      return { success: false };
    }, nextP);

    console.log(`Click chuyển sang Trang ${nextP}:`, clicked);
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
})();
