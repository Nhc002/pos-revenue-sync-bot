const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { aggregateShiftsByDate } = require('../utils/parser');

/**
 * Chia nhỏ mảng phần tử thành nhiều mảng con (Chunks)
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Gửi 1 payload tới Google Apps Script Webhook
 */
async function postToWebhook(webhookUrl, payload, maxRetries = 3) {
  const payloadJsonStr = JSON.stringify(payload);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(webhookUrl, payloadJsonStr, {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        maxRedirects: 5,
        timeout: 15000
      });
      if (response.status === 200 || response.status === 201) {
        return { success: true, data: response.data };
      }
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, attempt * 1000));
      }
    }
  }
  return { success: false };
}

/**
 * Đồng bộ dữ liệu ca & doanh thu net sang Google Sheets qua Google Apps Script Webhook.
 * 
 * Quy trình:
 * 1. Gửi lệnh "reset" để xoá toàn bộ dữ liệu cũ trên Google Sheet.
 * 2. Gom nhóm các ca đã đóng thành 1 dòng/ngày ({ date, ca1, ca2, ca3 }).
 * 3. Gửi từng đợt 3 ngày/lần.
 * 
 * @param {Array<Object>|Object} shiftData - Dữ liệu ca làm việc đã chuẩn hóa
 * @param {string} customWebhookUrl - Override URL Webhook nếu cần
 * @param {number} maxRetries - Số lần thử lại nếu thất bại (mặc định 3)
 */
async function syncToGoogleSheets(shiftData, customWebhookUrl = '', maxRetries = 3) {
  const webhookUrl = customWebhookUrl || config.gasWebhookUrl;

  if (!webhookUrl || webhookUrl.includes('YOUR_SCRIPT_ID') || webhookUrl.includes('AKfycbx_EXAMPLE_ID')) {
    logger.warn('[SheetsSync] CẢNH BÁO: GAS_WEBHOOK_URL chưa được cấu hình chính xác trong .env! Bỏ qua gửi thực tế.');
    return { success: false, reason: 'unconfigured_webhook' };
  }

  // Bước 1: Xoá sạch dữ liệu cũ trên Google Sheet trước khi ghi mới
  logger.info('[SheetsSync] Đang xoá dữ liệu cũ trên Google Sheet (reset)...');
  const resetResult = await postToWebhook(webhookUrl, { action: 'reset' }, maxRetries);
  if (resetResult.success) {
    logger.info('[SheetsSync] Đã xoá sạch dữ liệu cũ thành công!');
  } else {
    logger.warn('[SheetsSync] Không thể xoá dữ liệu cũ. Tiếp tục ghi đè...');
  }

  // Bước 2: Gom nhóm các ca thành từng dòng Ngày ({ date, ca1, ca2, ca3 })
  const rawItems = Array.isArray(shiftData) ? shiftData : [shiftData];
  const items = aggregateShiftsByDate(rawItems);

  // Bước 3: Chia nhỏ thành các đợt 3 bản ghi/lần
  const chunks = chunkArray(items, 3);
  logger.info(`[SheetsSync] Chuẩn bị gửi ${items.length} ngày chia làm ${chunks.length} đợt tới Google Sheets...`);

  let successCount = 0;

  for (let c = 0; c < chunks.length; c++) {
    const currentChunk = chunks[c];
    const payload = {
      source: 'POS_PUPPETEER_BOT',
      timestamp: new Date().toISOString(),
      data: currentChunk
    };

    logger.info(`[SheetsSync] Gửi đợt ${c + 1}/${chunks.length} (${currentChunk.length} ngày) - Thử lần 1/${maxRetries}...`);

    const result = await postToWebhook(webhookUrl, payload, maxRetries);
    if (result.success) {
      logger.info(`[SheetsSync] Gửi đợt ${c + 1} thành công! Phản hồi: ${JSON.stringify(result.data)}`);
      successCount += currentChunk.length;
    } else {
      logger.error(`[SheetsSync] Thất bại khi gửi đợt ${c + 1} sau ${maxRetries} lần thử.`);
    }

    if (c < chunks.length - 1) {
      await new Promise(res => setTimeout(res, 500));
    }
  }

  return {
    success: successCount > 0,
    totalSent: successCount,
    totalRequested: items.length
  };
}

/**
 * Đồng bộ dữ liệu Báo Cáo Thu Chi sang Google Sheets tab "Thu Chi"
 */
async function syncCashbookToGoogleSheets(cashbookData, customWebhookUrl = '', maxRetries = 3) {
  const webhookUrl = customWebhookUrl || config.gasWebhookUrl;

  if (!webhookUrl || webhookUrl.includes('YOUR_SCRIPT_ID') || webhookUrl.includes('AKfycbx_EXAMPLE_ID')) {
    logger.warn('[CashbookSync] CẢNH BÁO: GAS_WEBHOOK_URL chưa được cấu hình chính xác trong .env! Bỏ qua gửi Thu Chi.');
    return { success: false, reason: 'unconfigured_webhook' };
  }

  const items = Array.isArray(cashbookData) ? cashbookData : [];
  logger.info(`[CashbookSync] Chuẩn bị gửi ${items.length} bản ghi Thu Chi tới Google Sheets (Tab "Thu Chi")...`);

  const payload = {
    target: 'cashbook',
    action: 'sync',
    source: 'POS_PUPPETEER_BOT',
    timestamp: new Date().toISOString(),
    data: items
  };

  const result = await postToWebhook(webhookUrl, payload, maxRetries);
  if (result.success) {
    logger.info(`✅ [CashbookSync] Đồng bộ thành công ${items.length} bản ghi Thu Chi! Phản hồi: ${JSON.stringify(result.data)}`);
    return { success: true, count: items.length };
  } else {
    logger.error(`❌ [CashbookSync] Thất bại khi gửi dữ liệu Thu Chi sang Google Sheets sau ${maxRetries} lần thử.`);
    return { success: false, count: 0 };
  }
}

module.exports = {
  syncToGoogleSheets,
  syncCashbookToGoogleSheets
};
