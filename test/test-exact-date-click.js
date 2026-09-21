const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testExactDateClick() {
  console.log('Đang nhắm chính xác phần tử Date Picker Filter...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://fabi.ipos.vn/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email_input"]', 'techinfor366@gmail.com');
    await page.type('input[type="password"]', 'abc123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);

    await page.goto('https://fabi.ipos.vn/report/revenue/revenue/shift', { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 10000 }).catch(() => {});

    // Tìm chính xác phần tử nhỏ nhất chứa chuỗi ngày tháng
    const datePickerInfo = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('div, span, button, input, a'));
      const dateEl = allEls.reverse().find(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        return /^\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}$/.test(text);
      });
      if (dateEl) {
        dateEl.click();
        return { tag: dateEl.tagName, class: dateEl.className, text: dateEl.innerText };
      }
      return null;
    });

    console.log('ĐÃ CLICK PHẦN TỬ LỌC NGÀY THÁNG:', datePickerInfo);
    await new Promise(r => setTimeout(r, 1500));

    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    await page.screenshot({ path: path.join(logDir, 'date-popup-opened.png') });

    // Tìm tất cả các item trong popup vừa mở
    const popupItems = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('li, div, button, span, td, a'));
      return els.filter(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        return text.includes('Tháng này') || text.includes('30 ngày') || text.includes('Tháng trước') || text === 'Áp dụng' || text === '01';
      }).map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.trim() }));
    });

    console.log('\nCÁC TÙY CHỌN TRONG POPUP BỘ LỌC NGÀY THÁNG:');
    console.dir(popupItems, { depth: null });

    // Click chọn "Tháng này" hoặc "30 ngày qua"
    const clickedItem = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('li, div, button, span, a'));
      const target = els.find(el => {
        const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
        return text === 'tháng này' || text === '30 ngày qua' || text === 'tháng trước';
      });
      if (target) {
        target.click();
        return target.innerText;
      }
      return null;
    });

    console.log(`\n-> Đã click chọn: "${clickedItem}"`);
    await new Promise(r => setTimeout(r, 3000));

    // Đếm số dòng sau khi đổi bộ lọc
    const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
    console.log(`\n🎉 KẾT QUẢ: Đã nạp được ${rowCount} dòng trong bảng báo cáo!`);

  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    await browser.close();
  }
}

testExactDateClick();
