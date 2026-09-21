const puppeteer = require('puppeteer');

async function testUrlParams() {
  console.log('Đang thử nghiệm các URL parameter lọc ngày tháng của iPOS FABi...');
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

    // Danh sách URL parameter nghi vấn
    const urlsToTest = [
      'https://fabi.ipos.vn/report/revenue/revenue/shift?from_date=01/09/2026&to_date=20/09/2026',
      'https://fabi.ipos.vn/report/revenue/revenue/shift?start_date=2026-09-01&end_date=2026-09-20',
      'https://fabi.ipos.vn/report/revenue/revenue/shift?date_range=01/09/2026%20-%2020/09/2026',
      'https://fabi.ipos.vn/report/revenue/revenue/shift?time_range=01/09/2026+-+20/09/2026'
    ];

    for (const testUrl of urlsToTest) {
      console.log(`\nThử URL: ${testUrl}`);
      await page.goto(testUrl, { waitUntil: 'networkidle2' });
      await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});

      const rowsCount = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        return rows.length;
      });

      console.log(`-> Tìm thấy ${rowsCount} dòng trong bảng.`);
    }

  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    await browser.close();
  }
}

testUrlParams();
