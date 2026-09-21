const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testClickDateModal() {
  console.log('Đang thử nghiệm click ô bộ lọc ngày tháng trên iPOS FABi...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  
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
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});

    // Chụp ảnh trước khi click
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    await page.screenshot({ path: path.join(logDir, 'date-step1-before-click.png') });

    // Tìm ô chứa chữ xx/xx/2026 và click
    console.log('Đang click vào ô chứa ngày tháng trên giao diện...');
    const clicked = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, input, span, button'));
      const dateEl = allDivs.find(el => el.innerText && el.innerText.match(/\d{2}\/\d{2}\/\d{4}/));
      if (dateEl) {
        dateEl.click();
        return dateEl.innerText;
      }
      return null;
    });

    console.log(`Đã click phần tử: "${clicked}"`);
    await new Promise(r => setTimeout(r, 1500));

    // Chụp ảnh sau khi click (xem modal popup xuất hiện)
    await page.screenshot({ path: path.join(logDir, 'date-step2-after-click.png') });

    // Tìm và click các lựa chọn trong modal popup (như "Tháng này" hoặc "30 ngày qua" hoặc "01/09/2026")
    const optionClicked = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('li, button, a, div.item, span'));
      const targetOption = allButtons.find(b => {
        const text = b.innerText ? b.innerText.trim().toLowerCase() : '';
        return text === 'tháng này' || text === '30 ngày qua' || text === 'tháng trước' || text.includes('tháng này');
      });

      if (targetOption) {
        targetOption.click();
        return targetOption.innerText;
      }
      return null;
    });

    console.log(`Đã click tùy chọn khoảng ngày: "${optionClicked}"`);
    await new Promise(r => setTimeout(r, 3000));

    // Chụp ảnh sau khi chọn khoảng ngày
    await page.screenshot({ path: path.join(logDir, 'date-step3-after-apply.png') });

    // Đếm lại số dòng trong bảng
    const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
    console.log(`\n🎉 KẾT QUẢ: Đã load được ${rowCount} dòng trong bảng báo cáo!`);

  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    await browser.close();
  }
}

testClickDateModal();
