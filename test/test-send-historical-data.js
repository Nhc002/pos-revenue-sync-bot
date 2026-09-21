const { syncToGoogleSheets } = require('../services/sheetsSync');
const logger = require('../utils/logger');

async function sendHistoricalSampleData() {
  logger.info('================================================================');
  logger.info('=== BẮT ĐẦU GỬI DỮ LIỆU MẪU CÁC NGÀY TRƯỚC SANG GOOGLE SHEETS ===');
  logger.info('================================================================');

  // Mẫu dữ liệu doanh thu các ngày trong tuần trước (15/09/2026 - 20/09/2026)
  const historicalData = [
    // Ngày 15/09/2026
    { date: '15/09/2026', shift: 'Ca 1', openTime: '07:00 15/09/2026', closeTime: '14:00 15/09/2026', netRevenue: 450000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '15/09/2026', shift: 'Ca 2', openTime: '14:00 15/09/2026', closeTime: '22:00 15/09/2026', netRevenue: 1350000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '15/09/2026', shift: 'Ca 3', openTime: '22:00 15/09/2026', closeTime: '02:00 16/09/2026', netRevenue: 620000, updatedAt: new Date().toLocaleString('vi-VN') },

    // Ngày 16/09/2026
    { date: '16/09/2026', shift: 'Ca 1', openTime: '07:00 16/09/2026', closeTime: '14:00 16/09/2026', netRevenue: 520000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '16/09/2026', shift: 'Ca 2', openTime: '14:00 16/09/2026', closeTime: '22:00 16/09/2026', netRevenue: 1480000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '16/09/2026', shift: 'Ca 3', openTime: '22:00 16/09/2026', closeTime: '02:00 17/09/2026', netRevenue: 790000, updatedAt: new Date().toLocaleString('vi-VN') },

    // Ngày 17/09/2026
    { date: '17/09/2026', shift: 'Ca 1', openTime: '07:00 17/09/2026', closeTime: '14:00 17/09/2026', netRevenue: 610000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '17/09/2026', shift: 'Ca 2', openTime: '14:00 17/09/2026', closeTime: '22:00 17/09/2026', netRevenue: 1650000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '17/09/2026', shift: 'Ca 3', openTime: '22:00 17/09/2026', closeTime: '02:00 18/09/2026', netRevenue: 850000, updatedAt: new Date().toLocaleString('vi-VN') },

    // Ngày 18/09/2026
    { date: '18/09/2026', shift: 'Ca 1', openTime: '07:00 18/09/2026', closeTime: '14:00 18/09/2026', netRevenue: 750000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '18/09/2026', shift: 'Ca 2', openTime: '14:00 18/09/2026', closeTime: '22:00 18/09/2026', netRevenue: 2100000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '18/09/2026', shift: 'Ca 3', openTime: '22:00 18/09/2026', closeTime: '02:00 19/09/2026', netRevenue: 1150000, updatedAt: new Date().toLocaleString('vi-VN') },

    // Ngày 19/09/2026
    { date: '19/09/2026', shift: 'Ca 1', openTime: '07:00 19/09/2026', closeTime: '14:00 19/09/2026', netRevenue: 890000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '19/09/2026', shift: 'Ca 2', openTime: '14:00 19/09/2026', closeTime: '22:00 19/09/2026', netRevenue: 2850000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '19/09/2026', shift: 'Ca 3', openTime: '22:00 19/09/2026', closeTime: '02:00 20/09/2026', netRevenue: 1420000, updatedAt: new Date().toLocaleString('vi-VN') },

    // Ngày 20/09/2026 (Hôm nay)
    { date: '20/09/2026', shift: 'Ca 1', openTime: '07:00 20/09/2026', closeTime: '14:00 20/09/2026', netRevenue: 930000, updatedAt: new Date().toLocaleString('vi-VN') },
    { date: '20/09/2026', shift: 'Ca 2', openTime: '14:00 20/09/2026', closeTime: '22:00 20/09/2026', netRevenue: 1950000, updatedAt: new Date().toLocaleString('vi-VN') }
  ];

  try {
    logger.info(`Đang gửi dữ liệu ${historicalData.length} bản ghi ca làm việc (từ 15/09 đến 20/09) tới Webhook Google Sheets...`);
    const result = await syncToGoogleSheets(historicalData);
    
    console.log('\n--- KẾT QUẢ PHẢN HỒI TỪ GOOGLE APPS SCRIPT WEBHOOK ---');
    console.dir(result, { depth: null, colors: true });

    logger.info('\n✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG DỮ LIỆU CÁC NGÀY TRƯỚC SANG GOOGLE SHEETS!');
  } catch (err) {
    logger.error(`❌ Lỗi khi gửi dữ liệu mẫu: ${err.message}`);
  }
}

sendHistoricalSampleData();
