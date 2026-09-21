const puppeteer = require('puppeteer');

async function testVueDatePicker() {
  console.log('Đang tìm Vue DatePicker Component trên iPOS FABi...');
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

    // Quét tất cả thẻ div, span, button chứa chữ date hoặc ngày
    const dateComponentInfo = await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('*'));
      const dateEls = allEls.filter(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        const className = String(el.className || '');
        return text.includes('20/09/2026') || text.includes('01/09/2026') || className.includes('date') || className.includes('picker');
      });

      return dateEls.map(el => ({
        tag: el.tagName,
        class: String(el.className || ''),
        text: el.innerText ? el.innerText.trim().slice(0, 80) : ''
      })).slice(0, 15);
    });

    console.log('CÁC PHẦN TỬ CHỨA NGÀY THÁNG TRÊN IPOS:');
    console.dir(dateComponentInfo, { depth: null });

  } catch (err) {
    console.error('Lỗi:', err);
  } finally {
    await browser.close();
  }
}

testVueDatePicker();
