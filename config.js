require('dotenv').config();

module.exports = {
  gasWebhookUrl: process.env.GAS_WEBHOOK_URL || '',
  pos: {
    loginUrl: process.env.POS_LOGIN_URL || '',
    username: process.env.POS_USERNAME || '',
    password: process.env.POS_PASSWORD || '',
    reportUrl: process.env.POS_REPORT_URL || '',
    cashbookReportUrl: process.env.POS_CASHBOOK_REPORT_URL || 'https://fabi.ipos.vn/report/cashbook',
    selectors: {
      usernameInput: process.env.POS_SELECTOR_USERNAME_INPUT || '#username',
      passwordInput: process.env.POS_SELECTOR_PASSWORD_INPUT || '#password',
      loginBtn: process.env.POS_SELECTOR_LOGIN_BTN || 'button[type="submit"]',
      reportTable: process.env.POS_SELECTOR_REPORT_TABLE || 'table',
      row: process.env.POS_SELECTOR_ROW || 'table tbody tr',
      openTime: process.env.POS_SELECTOR_OPEN_TIME || '.open-time',
      closeTime: process.env.POS_SELECTOR_CLOSE_TIME || '.close-time',
      netRevenue: process.env.POS_SELECTOR_NET_REVENUE || '.net-revenue',
      shiftName: process.env.POS_SELECTOR_SHIFT_NAME || '.shift-name'
    }
  },
  bot: {
    headless: process.env.HEADLESS !== 'false',
    cronSchedule: process.env.CRON_SCHEDULE || '0,30 * * * *'
  }
};
