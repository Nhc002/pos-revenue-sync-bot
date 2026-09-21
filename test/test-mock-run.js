const { startMockServer } = require('../mock/mockPosServer');
const { scrapeShiftReport } = require('../services/posScraper');
const { syncToGoogleSheets } = require('../services/sheetsSync');
const logger = require('../utils/logger');

async function runMockTest() {
  logger.info('========================================================');
  logger.info('=== KÍCH HOẠT TEST RUN GIẢ LẬP ĐỒNG BỘ DOANH THU POS ===');
  logger.info('========================================================');

  let server;
  try {
    // 1. Khởi động Mock POS Server ở cổng 3000
    server = await startMockServer(3000);

    // 2. Chạy Puppeteer cào dữ liệu từ Mock POS
    const mockConfig = {
      loginUrl: 'http://localhost:3000/login',
      username: 'cashier1',
      password: 'secret123',
      reportUrl: 'http://localhost:3000/reports/shift-closing',
      headless: true,
      selectors: {
        usernameInput: '#username',
        passwordInput: '#password',
        loginBtn: '#login-btn',
        reportTable: '#shift-table',
        row: '#shift-table tbody tr',
        openTime: '.open-time',
        closeTime: '.close-time',
        netRevenue: '.net-revenue',
        shiftName: '.shift-name'
      }
    };

    const shiftData = await scrapeShiftReport(mockConfig);

    console.log('\n--- DỮ LIỆU ĐÃ CÀO VÀ CHUẨN HÓA TỪ POS GIẢ LẬP ---');
    console.dir(shiftData, { depth: null, colors: true });

    // 3. Thử đồng bộ sang Webhook Sheets
    logger.info('\n--- THỬ THỰC HIỆN ĐỒNG BỘ SANG WEBHOOK ---');
    try {
      const syncResult = await syncToGoogleSheets(shiftData);
      logger.info(`Kết quả đồng bộ: ${JSON.stringify(syncResult)}`);
    } catch (syncErr) {
      logger.warn(`[MockTest] Cảnh báo gửi Webhook (chưa cấu hình Webhook thực tế): ${syncErr.message}`);
    }

    logger.info('\n✅ TEST RUN HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
  } catch (error) {
    logger.error(`❌ TEST RUN THẤT BẠI: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      logger.info('[MockPOS] Đã đóng máy chủ POS giả lập.');
    }
  }
}

runMockTest();
