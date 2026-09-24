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
 * Chọn bộ lọc "Tháng này" trên trang báo cáo iPOS
 */
async function selectThisMonthFilter(page) {
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
}

/**
 * Cào dữ liệu Báo Cáo Thu Chi (Cashbook) từ trang đang mở
 */
async function scrapeCashbookInternal(page, activeConfig) {
  const cashbookUrl = activeConfig.cashbookReportUrl || 'https://fabi.ipos.vn/report/accounting/revenue/cash-in-cash-out';
  logger.info(`[Puppeteer] Điều hướng đến trang Báo Cáo Thu Chi: ${cashbookUrl}`);
  
  await page.goto(cashbookUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(err => {
    logger.warn(`[Puppeteer] Điều hướng Thu Chi gặp cảnh báo: ${err.message}`);
  });

  const reportTableSelector = cleanSelector(activeConfig.selectors.reportTable) || 'table';
  await page.waitForSelector(reportTableSelector, { timeout: 30000 }).catch(() => {});

  await selectThisMonthFilter(page);

  const allCashbookRows = [];
  const maxPages = 15;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    logger.info(`[Puppeteer] [Thu Chi] Đang trích xuất dữ liệu Trang ${pageNum}...`);
    
    const firstRowBefore = await page.evaluate(() => document.querySelector('table tbody tr')?.innerText || '');

    const pageRows = await page.evaluate(() => {
      const firstTable = document.querySelector('table');
      if (!firstTable) return [];

      const rows = Array.from(firstTable.querySelectorAll('tbody tr'));
      
      return rows.map((row) => {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length < 5) return null;

        // Cấu trúc cột Thu Chi: # | Mã ca | Nhân viên | Thời gian | Loại | Nghiệp vụ | PTTT | Ghi chú | Số tiền
        return {
          stt: tds[0] ? tds[0].innerText.trim() : '',
          shiftCode: tds[1] ? tds[1].innerText.trim() : '',
          employee: tds[2] ? tds[2].innerText.trim() : '',
          datetime: tds[3] ? tds[3].innerText.trim() : '',
          type: tds[4] ? tds[4].innerText.trim() : '',
          category: tds[5] ? tds[5].innerText.trim() : '',
          paymentMethod: tds[6] ? tds[6].innerText.trim() : '',
          note: tds[7] ? tds[7].innerText.trim() : '',
          amount: tds[8] ? tds[8].innerText.trim() : (tds[tds.length - 1] ? tds[tds.length - 1].innerText.trim() : '')
        };
      }).filter(row => row && (row.shiftCode || row.datetime || row.amount));
    });

    logger.info(`[Puppeteer] [Thu Chi] Trang ${pageNum}: Thu thập được ${pageRows.length} bản ghi Thu Chi.`);
    allCashbookRows.push(...pageRows);

    // Chuyển trang tiếp theo
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
        logger.info(`[Puppeteer] [Thu Chi] Đã cào hết toàn bộ các trang tại Trang ${pageNum}.`);
        break;
      }
    } else {
      logger.info(`[Puppeteer] [Thu Chi] Hoàn tất cào các trang (Không tìm thấy nút trang ${nextPageNum}).`);
      break;
    }
  }

  return allCashbookRows;
}

/**
 * Cào dữ liệu Báo Cáo Doanh Thu Ca từ trang đang mở
 */
async function scrapeShiftInternal(page, activeConfig) {
  const reportUrl = activeConfig.reportUrl || activeConfig.loginUrl;
  logger.info(`[Puppeteer] Điều hướng đến trang báo cáo doanh thu: ${reportUrl}`);
  await page.goto(reportUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(err => {
    logger.warn(`[Puppeteer] Điều hướng báo cáo doanh thu gặp cảnh báo: ${err.message}`);
  });

  const reportTableSelector = cleanSelector(activeConfig.selectors.reportTable) || 'table';
  await page.waitForSelector(reportTableSelector, { timeout: 30000 }).catch(() => {});


  await selectThisMonthFilter(page);

  const allRawRows = [];
  const maxPages = 15;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    logger.info(`[Puppeteer] [Doanh Thu] Đang trích xuất dữ liệu Trang ${pageNum}...`);
    
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

    logger.info(`[Puppeteer] [Doanh Thu] Trang ${pageNum}: Thu thập được ${pageRows.length} dòng báo cáo.`);
    allRawRows.push(...pageRows);

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
        logger.info(`[Puppeteer] [Doanh Thu] Dữ liệu không đổi (Đã cào hết toàn bộ các trang tại Trang ${pageNum}).`);
        break;
      }
    } else {
      logger.info(`[Puppeteer] [Doanh Thu] Hoàn tất cào các trang (Không tìm thấy nút trang ${nextPageNum}).`);
      break;
    }
  }

  const normalizedData = normalizeShiftData(allRawRows);
  logger.info(`[Puppeteer] Tổng cộng đã chuẩn hóa thành công ${normalizedData.length} ca làm việc.`);
  return normalizedData;
}

/**
 * Thực hiện đăng nhập 1 lần duy nhất và cào TOÀN BỘ dữ liệu (Doanh thu ca & Thu chi)
 */
async function scrapeAllPOSData(customConfig = {}) {
  const activeConfig = {
    ...config.pos,
    ...customConfig,
    selectors: {
      ...config.pos.selectors,
      ...(customConfig.selectors || {})
    }
  };

  const isHeadless = customConfig.headless !== undefined ? customConfig.headless : config.bot.headless;

  const launchOptions = {
    headless: isHeadless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);


  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // 1. Đăng nhập POS
    if (activeConfig.loginUrl) {
      logger.info(`[Puppeteer] Điều hướng đến trang đăng nhập: ${activeConfig.loginUrl}`);
      await page.goto(activeConfig.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(err => {
        logger.warn(`[Puppeteer] Điều hướng đăng nhập gặp cảnh báo: ${err.message}`);
      });

      const userInputMatch = await findElementSafely(page, activeConfig.selectors.usernameInput);
      const passInputMatch = await findElementSafely(page, activeConfig.selectors.passwordInput);

      if (userInputMatch && activeConfig.username) {
        logger.info(`[Puppeteer] Tự động nhập tài khoản "${activeConfig.username}"...`);
        await page.type(userInputMatch.selector, activeConfig.username, { delay: 30 });
        
        if (passInputMatch && activeConfig.password) {
          await page.type(passInputMatch.selector, activeConfig.password, { delay: 30 });
        }

        const btnMatch = await findElementSafely(page, activeConfig.selectors.loginBtn);
        if (btnMatch) {
          logger.info(`[Puppeteer] Bấm nút đăng nhập...`);
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
            page.click(btnMatch.selector)
          ]);
          await new Promise(r => setTimeout(r, 2000));
          logger.info('[Puppeteer] Đăng nhập thành công!');
        }
      }
    }

    // 2. Cào báo cáo doanh thu ca
    const shiftData = await scrapeShiftInternal(page, activeConfig);

    // 3. Cào báo cáo sổ quỹ thu chi
    let cashbookData = [];
    try {
      cashbookData = await scrapeCashbookInternal(page, activeConfig);
    } catch (err) {
      logger.error(`[Puppeteer] Lỗi khi cào dữ liệu Thu Chi: ${err.message}`);
    }

    return { shiftData, cashbookData };
  } catch (error) {
    logger.error(`[Puppeteer] Lỗi trong quá trình cào dữ liệu POS: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
    logger.info('[Puppeteer] Đã đóng trình duyệt.');
  }
}

async function scrapeShiftReport(customConfig = {}) {
  const { shiftData } = await scrapeAllPOSData(customConfig);
  return shiftData;
}

module.exports = {
  scrapeShiftReport,
  scrapeAllPOSData
};
