const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const { scrapeAllPOSData } = require('./services/posScraper');
const { syncToGoogleSheets, syncCashbookToGoogleSheets } = require('./services/sheetsSync');

/**
 * Thực thi quy trình cào dữ liệu và đồng bộ doanh thu ca & thu chi
 */
async function executeSyncTask() {
  logger.info('===========================================================');
  logger.info('=== BẮT ĐẦU TIẾN TRÌNH TỰ ĐỘNG ĐỒNG BỘ POS (DOANH THU & THU CHI) ===');
  logger.info('===========================================================');

  try {
    // 1. Trích xuất dữ liệu đóng ca & thu chi từ POS trong 1 phiên đăng nhập
    const { shiftData, cashbookData } = await scrapeAllPOSData();

    // 2. Đồng bộ báo cáo doanh thu ca
    if (shiftData && shiftData.length > 0) {
      logger.info(`[MainTask] Tìm thấy ${shiftData.length} bản ghi ca làm việc. Đang đồng bộ...`);
      const syncResult = await syncToGoogleSheets(shiftData);
      if (syncResult && syncResult.success) {
        logger.info('✅ [MainTask] Hoàn tất đồng bộ doanh thu ca!');
      } else {
        logger.warn(`[MainTask] Đồng bộ doanh thu ca với cảnh báo: ${JSON.stringify(syncResult)}`);
      }
    } else {
      logger.warn('[MainTask] Không tìm thấy dữ liệu ca làm việc nào trên giao diện POS.');
    }

    // 3. Đồng bộ báo cáo sổ quỹ thu chi
    if (cashbookData && cashbookData.length > 0) {
      logger.info(`[MainTask] Tìm thấy ${cashbookData.length} bản ghi Thu Chi. Đang đồng bộ...`);
      const cashbookResult = await syncCashbookToGoogleSheets(cashbookData);
      if (cashbookResult && cashbookResult.success) {
        logger.info('✅ [MainTask] Hoàn tất đồng bộ sổ quỹ Thu Chi sang Google Sheets thành công!');
      } else {
        logger.warn(`[MainTask] Đồng bộ Thu Chi với cảnh báo: ${JSON.stringify(cashbookResult)}`);
      }
    } else {
      logger.info('[MainTask] Không tìm thấy dữ liệu Thu Chi nào.');
    }

    logger.info('===========================================================');
    logger.info('✅ [MainTask] Hoàn tất toàn bộ tiến trình đồng bộ!');
    logger.info('===========================================================');
    return {
      success: true,
      shiftCount: (shiftData && shiftData.length) || 0,
      cashbookCount: (cashbookData && cashbookData.length) || 0,
      completedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`❌ [MainTask] Tiến trình tự động đồng bộ gặp lỗi: ${error.message}`);
    return {
      success: false,
      error: error.message,
      failedAt: new Date().toISOString()
    };
  }
}

// Bắt argument từ tham số dòng lệnh
const args = process.argv.slice(2);
const isOnce = args.includes('--once') || args.includes('-o');

if (isOnce) {
  logger.info('[App] Khởi chạy ở chế độ CHẠY 1 LẦN (--once)...');
  executeSyncTask().then(() => {
    logger.info('[App] Đã thoát tiến trình chạy 1 lần.');
    process.exit(0);
  });
} else {
  const schedule = config.bot.cronSchedule;
  logger.info(`[App] Khởi chạy ở chế độ LẬP LỊCH TỰ ĐỘNG (Cron: "${schedule}")...`);
  logger.info('[App] Bot đang chạy ẩn ngầm. Nhấn Ctrl+C để dừng.');

  let lastRunTime = null;
  let lastSyncResult = null;
  let isRunning = false;

  async function safeExecute() {
    if (isRunning) {
      logger.warn('[App] Tiến trình đồng bộ trước đó vẫn đang chạy, bỏ qua lượt này.');
      return;
    }
    isRunning = true;
    try {
      lastSyncResult = await executeSyncTask();
      lastRunTime = new Date().toISOString();
    } catch (err) {
      lastSyncResult = { success: false, error: err.message, failedAt: new Date().toISOString() };
    } finally {
      isRunning = false;
    }
  }

  // Khởi động HTTP Health Server phục vụ Cloud PaaS (Render, Railway, Koyeb)
  const http = require('http');
  const PORT = process.env.PORT || 3000;

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    if (url === '/sync') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('OK');
      safeExecute();
      return;
    }

    if (url === '/logs') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      const logs = logger.getMemoryLogs ? logger.getMemoryLogs() : [];
      res.end(logs.join('\n') || 'Chưa có nhật ký hoạt động nào.');
      return;
    }

    // Endpoint Health Check mặc định
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'POS Revenue Sync Bot',
      lastRun: lastRunTime || 'Chưa chạy lần nào',
      isRunning: isRunning,
      lastSyncResult: lastSyncResult || 'Chưa có kết quả',
      configCheck: {
        hasGasWebhook: !!config.gasWebhookUrl,
        hasPosUser: !!config.pos.username,
        hasPosPass: !!config.pos.password,
        posUsername: config.pos.username ? (config.pos.username.substring(0, 3) + '***') : 'CHƯA CẤU HÌNH'
      },
      cronSchedule: schedule,
      currentTime: new Date().toISOString(),
      logsEndpoint: '/logs'
    }, null, 2));
  });

  server.listen(PORT, () => {
    logger.info(`[CloudServer] Đã mở cổng HTTP Health-Check tại port ${PORT}`);
  });

  // Chạy ngay lần đầu tiên khởi động
  safeExecute();

  // Lập lịch định kỳ
  cron.schedule(schedule, () => {
    logger.info(`[CronJob] Đã đến lịch chạy tự động (${new Date().toLocaleString('vi-VN')})...`);
    safeExecute();
  });
}
