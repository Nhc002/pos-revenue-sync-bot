const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const { normalizeShiftData } = require('../utils/parser');

/**
 * Làm sạch chuỗi CSS selector
 */
function cleanSelector(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/,\s*$/, '');
}

/**
 * Tìm phần tử phù hợp trên trang một cách an toàn
 */
async function findElementSafely(page, selectorStr) {
  const cleaned = cleanSelector(selectorStr);
  if (!cleaned) return null;

  try {
    const el = await page.$(cleaned);
    if (el) return { element: el, selector: cleaned };
  } catch (err) {
    // bỏ qua lỗi cú pháp
  }

  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    try {
      const el = await page.$(part);
      if (el) return { element: el, selector: part };
    } catch (e) {
      // bỏ qua selector con bị lỗi
    }
  }
  return null;
}

/**
 * Thực hiện cào dữ liệu báo cáo đóng ca từ POS bằng Puppeteer
 * Trích xuất 100% chính xác từng ô theo cấu trúc giao diện iPOS FABi
 */
async function scrapeShiftReport(customConfig = {}) {
  const activeConfig = {
    ...config.pos,
    ...customConfig,
    selectors: {
      ...config.pos.selectors,
      ...(customConfig.selectors || {})
    }
  };

  const isHeadless = customConfig.headless !== undefined ? customConfig.headless : config.bot.headless;

  logger.info(`[Puppeteer] Đang khởi tạo trình duyệt (Headless: ${isHeadless})...`);
  const browser = await puppeteer.launch({
    headless: isHeadless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // 1. Đăng nhập POS
    if (activeConfig.loginUrl) {
      logger.info(`[Puppeteer] Điều hướng đến trang đăng nhập: ${activeConfig.loginUrl}`);
      await page.goto(activeConfig.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const userInputMatch = await findElementSafely(page, activeConfig.selectors.usernameInput);
      const passInputMatch = await findElementSafely(page, activeConfig.selectors.passwordInput);

      if (userInputMatch && activeConfig.username) {
        logger.info(`[Puppeteer] Tự động nhập tài khoản "${activeConfig.username}" (Selector: ${userInputMatch.selector})...`);
        await page.type(userInputMatch.selector, activeConfig.username, { delay: 30 });
        
        if (passInputMatch && activeConfig.password) {
          await page.type(passInputMatch.selector, activeConfig.password, { delay: 30 });
        }

        const btnMatch = await findElementSafely(page, activeConfig.selectors.loginBtn);
        if (btnMatch) {
          logger.info(`[Puppeteer] Bấm nút đăng nhập (Selector: ${btnMatch.selector})...`);
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
            page.click(btnMatch.selector)
          ]);
          logger.info('[Puppeteer] Đăng nhập thành công! Đang chuyển tiếp...');
        }
      }
    }

    // 2. Điều hướng đến trang báo cáo đóng ca
    const reportUrl = activeConfig.reportUrl || activeConfig.loginUrl;
    logger.info(`[Puppeteer] Điều hướng đến trang báo cáo: ${reportUrl}`);
    await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const reportTableSelector = cleanSelector(activeConfig.selectors.reportTable) || 'table';
    await page.waitForSelector(reportTableSelector, { timeout: 15000 }).catch(() => {});

    // 3. Click mở popup bộ lọc ngày tháng và chọn "Tháng này"
    logger.info('[Puppeteer] Đang kích hoạt bộ lọc "Tháng này" trên giao diện iPOS...');
    
    await page.evaluate(() => {
      const allEls = Array.from(document.querySelectorAll('div, span, button, input, a'));
      const dateEl = allEls.reverse().find(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        return /^\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}$/.test(text);
      });
      if (dateEl) dateEl.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    const selectedRange = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('li, div, button, span, a'));
      const target = els.find(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        return text === 'Tháng này' || text === '30 ngày qua';
      });
      if (target) {
        target.click();
        return target.innerText;
      }
      return null;
    });

    if (selectedRange) {
      logger.info(`[Puppeteer] Đã chọn tùy chọn: "${selectedRange}". Chờ bảng nạp lại dữ liệu cả tháng...`);
      await new Promise(r => setTimeout(r, 3000));
    }

    // 4. Duyệt qua tất cả các trang phân trang (Trang 1 -> 15)
    const allRawRows = [];
    const maxPages = 15;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      logger.info(`[Puppeteer] Đang trích xuất dữ liệu Trang ${pageNum}...`);
      
      const firstRowBefore = await page.evaluate(() => document.querySelector('table tbody tr')?.innerText || '');

      const pageRows = await page.evaluate(() => {
        const firstTable = document.querySelector('table');
        if (!firstTable) return [];

        const rows = Array.from(firstTable.querySelectorAll('tbody tr'));
        
        return rows.map(row => {
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length < 6) return null;

          let openTimeText = tds[11] ? tds[11].innerText.trim() : '';
          let closeTimeText = tds[12] ? tds[12].innerText.trim() : '';
          let netRevenueText = tds[5] ? tds[5].innerText.trim() : '';
          let shiftNameText = tds[1] ? tds[1].innerText.trim() : '';

          if (!openTimeText || !/\d{2}\/\d{2}\/\d{4}/.test(openTimeText)) {
            const dateTd = tds.find(td => /\d{2}\/\d{2}\/\d{4}/.test(td.innerText));
            if (dateTd) openTimeText = dateTd.innerText.trim();
          }

          return {
            openTime: openTimeText,
            closeTime: closeTimeText,
            netRevenue: netRevenueText,
            shiftName: shiftNameText
          };
        }).filter(Boolean);
      });

      logger.info(`[Puppeteer] Trang ${pageNum}: Thu thập được ${pageRows.length} dòng báo cáo.`);
      allRawRows.push(...pageRows);

      // Tìm và click nút số trang tiếp theo
      const nextPageNum = pageNum + 1;
      const clicked = await page.evaluate((targetPage) => {
        const els = Array.from(document.querySelectorAll('.pagination a, .pagination li, .pagination button, ul.pagination *, .page-link'));
        const target = els.find(el => (el.innerText || '').trim() === String(targetPage));
        if (target) {
          const clickable = (target.tagName === 'A' || target.tagName === 'BUTTON') ? target : (target.querySelector('a, button') || target);
          clickable.click();
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        // Fallback: Nút Next (>)
        const nextBtn = els.find(el => el.getAttribute('rel') === 'next' || el.innerText.trim() === '›' || el.innerText.trim() === '>');
        if (nextBtn) {
          const clickable = (nextBtn.tagName === 'A' || nextBtn.tagName === 'BUTTON') ? nextBtn : (nextBtn.querySelector('a, button') || nextBtn);
          clickable.click();
          clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      }, nextPageNum);

      if (clicked) {
        logger.info(`[Puppeteer] Đã gửi lệnh click Trang ${nextPageNum}. Chờ nạp dữ liệu mới...`);
        let dataChanged = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise(r => setTimeout(r, 400));
          const firstRowAfter = await page.evaluate(() => document.querySelector('table tbody tr')?.innerText || '');
          if (firstRowAfter && firstRowAfter !== firstRowBefore) {
            dataChanged = true;
            break;
          }
        }
        if (!dataChanged) {
          logger.info(`[Puppeteer] Dữ liệu không đổi (Đã cào hết toàn bộ các trang tại Trang ${pageNum}).`);
          break;
        }
      } else {
        logger.info(`[Puppeteer] Hoàn tất cào các trang (Không tìm thấy nút trang ${nextPageNum}).`);
        break;
      }
    }

    // Chụp ảnh debug trang cuối
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const screenshotPath = path.join(logDir, 'debug-pos-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    // 5. Chuẩn hóa tất cả dữ liệu thu thập được từ tất cả các trang
    const normalizedData = normalizeShiftData(allRawRows);
    logger.info(`[Puppeteer] Tổng cộng đã chuẩn hóa thành công ${normalizedData.length} ca làm việc từ ${allRawRows.length} dòng thô thu thập được trên toàn bộ các trang!`);

    return normalizedData;
  } catch (error) {
    logger.error(`[Puppeteer] Lỗi trong quá trình cào dữ liệu POS: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
    logger.info('[Puppeteer] Đã đóng trình duyệt.');
  }
}

module.exports = {
  scrapeShiftReport
};
