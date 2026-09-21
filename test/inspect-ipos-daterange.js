const puppeteer = require('puppeteer');

async function testDateRangePicker() {
  console.log('Đang kiểm tra ô daterangepicker trên iPOS FABi...');
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

    // Quét ô datepicker
    const dateInputInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(i => ({
        id: i.id,
        class: i.className,
        value: i.value,
        outerHTML: i.outerHTML
      }));
    });

    console.log('CÁC Ô INPUT TRÊN TRANG BÁO CÁO:');
    console.dir(dateInputInfo, { depth: null });

  } catch (err) {
    console.error('Lỗi:', err);
  } finally {
    await browser.close();
  }
}

testDateRangePicker();
