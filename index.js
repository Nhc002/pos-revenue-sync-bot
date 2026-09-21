const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const { scrapeShiftReport } = require('./services/posScraper');
const { syncToGoogleSheets } = require('./services/sheetsSync');

/**
 * Thực thi quy trình cào dữ liệu và đồng bộ doanh thu
 */
async function executeSyncTask() {
  logger.info('===========================================================');
  logger.info('=== BẮT ĐẦU TIẾN TRÌNH TỰ ĐỘNG ĐỒNG BỘ DOANH THU POS ===');
  logger.info('===========================================================');

  try {
    // 1. Trích xuất dữ liệu đóng ca từ POS
    const shiftData = await scrapeShiftReport();

    if (!shiftData || shiftData.length === 0) {
      logger.warn('[MainTask] Không tìm thấy dữ liệu ca làm việc nào trên giao diện POS.');
      return;
    }

    logger.info(`[MainTask] Tìm thấy ${shiftData.length} bản ghi ca làm việc. Đang chuẩn bị đồng bộ...`);

    // 2. Gửi dữ liệu tới Google Apps Script Webhook
    const syncResult = await syncToGoogleSheets(shiftData);
    
    if (syncResult && syncResult.success) {
      logger.info('✅ [MainTask] Hoàn tất tiến trình đồng bộ doanh thu POS sang Google Sheets thành công!');
    } else {
      logger.warn(`[MainTask] Tiến trình hoàn tất với cảnh báo: ${JSON.stringify(syncResult)}`);
    }
  } catch (error) {
    logger.error(`❌ [MainTask] Tiến trình tự động đồng bộ gặp lỗi: ${error.message}`);
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

  // Chạy ngay lần đầu tiên khởi động
  executeSyncTask();

  // Lập lịch định kỳ
  cron.schedule(schedule, () => {
    logger.info(`[CronJob] Đã đến lịch chạy tự động (${new Date().toLocaleString('vi-VN')})...`);
    executeSyncTask();
  });
}
