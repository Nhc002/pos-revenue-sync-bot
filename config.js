const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  gasWebhookUrl: process.env.GAS_WEBHOOK_URL || '',
  pos: {
    loginUrl: process.env.POS_LOGIN_URL || 'https://fabi.ipos.vn/login',
    username: process.env.POS_USERNAME || '',
    password: process.env.POS_PASSWORD || '',
    reportUrl: process.env.POS_REPORT_URL || 'https://fabi.ipos.vn/report/revenue/revenue/shift',
    cashbookReportUrl: process.env.POS_CASHBOOK_REPORT_URL || 'https://fabi.ipos.vn/report/accounting/revenue/cash-in-cash-out',
    selectors: {
      usernameInput: process.env.POS_SELECTOR_USERNAME_INPUT || 'input[name="email_input"], input[name="username"], #username',
      passwordInput: process.env.POS_SELECTOR_PASSWORD_INPUT || 'input[type="password"], input[name="password"], #password',
      loginBtn: process.env.POS_SELECTOR_LOGIN_BTN || 'button[type="submit"], .btn-primary, .btn-login',
      reportTable: process.env.POS_SELECTOR_REPORT_TABLE || 'table',
      row: process.env.POS_SELECTOR_ROW || 'table tbody tr',
      openTime: process.env.POS_SELECTOR_OPEN_TIME || 'td:nth-child(12), .td-open-time, .open-time',
      closeTime: process.env.POS_SELECTOR_CLOSE_TIME || 'td:nth-child(13), .td-close-time, .close-time',
      netRevenue: process.env.POS_SELECTOR_NET_REVENUE || 'td:nth-child(6), .td-net-revenue, .net-revenue',
      shiftName: process.env.POS_SELECTOR_SHIFT_NAME || 'td:nth-child(2), .td-shift-name, .shift-name'
    }
  },
  bot: {
    headless: process.env.HEADLESS !== 'false',
    cronSchedule: process.env.CRON_SCHEDULE || '0,30 * * * *'
  }
};
