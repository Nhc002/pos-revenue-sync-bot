const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function inspectIpos() {
  console.log('Đang kết nối tới https://fabi.ipos.vn/login để kiểm tra cấu trúc DOM thật...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://fabi.ipos.vn/login', { waitUntil: 'networkidle2', timeout: 30000 });

    const title = await page.title();
    console.log(`Tiêu đề trang: "${title}"`);

    // Tìm tất cả các thẻ input trên trang đăng nhập
    const inputs = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('input, button, form'));
      return els.map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        class: el.className,
        placeholder: el.placeholder
      }));
    });

    console.log('\n--- CÁC THẺ PHẦN TỬ TRÊN TRANG ĐĂNG NHẬP IPOS ---');
    console.dir(inputs, { depth: null });

    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const screenshotPath = path.join(logDir, 'ipos-login-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Đã chụp ảnh giao diện đăng nhập thực tế của iPOS tại: ${screenshotPath}`);

  } catch (err) {
    console.error('Lỗi khi kiểm tra iPOS:', err.message);
  } finally {
    await browser.close();
  }
}

inspectIpos();
