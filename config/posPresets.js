/**
 * BỘ CẤU HÌNH SELECTOR MẶC ĐỊNH CHO CÁC HỆ THỐNG POS PHỔ BIẾN TẠI VIỆT NAM
 */
const POS_PRESETS = {
  kiotviet: {
    name: 'KiotViet',
    loginUrl: 'https://my.kiotviet.vn/login',
    reportUrl: 'https://my.kiotviet.vn/#/ShiftEndHistory',
    selectors: {
      usernameInput: 'input[name="UserName"], #username, input[type="text"]',
      passwordInput: 'input[name="Password"], #password, input[type="password"]',
      loginBtn: 'button[type="submit"], input[type="submit"], .btn-login',
      reportTable: 'table.k-grid-table, table.table-hover, .grid-shift-history table, table',
      row: 'table.k-grid-table tbody tr, table.table-hover tbody tr, table tbody tr',
      openTime: 'td:nth-child(2), .open-time',
      closeTime: 'td:nth-child(3), .close-time',
      netRevenue: 'td:nth-child(5), .net-revenue, td.text-right',
      shiftName: 'td:nth-child(1), .shift-name'
    }
  },
  sapo: {
    name: 'Sapo POS',
    loginUrl: 'https://admin.sapo.vn/account/login',
    reportUrl: 'https://admin.sapo.vn/admin/reports/shift-closing',
    selectors: {
      usernameInput: '#Username, input[name="Username"], input[type="text"]',
      passwordInput: '#Password, input[name="Password"], input[type="password"]',
      loginBtn: 'button[type="submit"], .btn-login, input[type="submit"]',
      reportTable: 'table.table-report, table.ui-table, table',
      row: 'table.table-report tbody tr, table.ui-table tbody tr, table tbody tr',
      openTime: 'td.col-open-time, td:nth-child(2), .open-time',
      closeTime: 'td.col-close-time, td:nth-child(3), .close-time',
      netRevenue: 'td.col-revenue, td:nth-child(6), .net-revenue',
      shiftName: 'td.col-shift-name, td:nth-child(1), .shift-name'
    }
  },
  pos365: {
    name: 'POS365',
    loginUrl: 'https://pos365.vn/login',
    reportUrl: 'https://pos365.vn/dashboard/#/shift-report',
    selectors: {
      usernameInput: 'input[ng-model="Username"], #username, input[type="text"]',
      passwordInput: 'input[ng-model="Password"], #password, input[type="password"]',
      loginBtn: 'button[type="submit"], .btn-primary, input[type="submit"]',
      reportTable: '#shiftReportTable, table.table, table',
      row: '#shiftReportTable tbody tr, table.table tbody tr, table tbody tr',
      openTime: 'td.open-date, td:nth-child(2), .open-time',
      closeTime: 'td.close-date, td:nth-child(3), .close-time',
      netRevenue: 'td.revenue-net, td:nth-child(5), .net-revenue',
      shiftName: 'td.shift-title, td:nth-child(1), .shift-name'
    }
  },
  ipos: {
    name: 'iPOS / FABi',
    loginUrl: 'https://fabi.ipos.vn/login',
    reportUrl: 'https://fabi.ipos.vn/report/revenue/revenue/shift',
    selectors: {
      usernameInput: 'input[name="email_input"], input[name="username"], #username',
      passwordInput: 'input[type="password"], input[name="password"], #password',
      loginBtn: 'button[type="submit"], .btn-primary, .btn-login',
      reportTable: 'table',
      row: 'table tbody tr',
      openTime: 'td:nth-child(12), .td-open-time, .open-time',
      closeTime: 'td:nth-child(13), .td-close-time, .close-time',
      netRevenue: 'td:nth-child(6), .td-net-revenue, .net-revenue',
      shiftName: 'td:nth-child(2), .td-shift-name, .shift-name'
    }
  },
  cukcuk: {
    name: 'CukCuk (MISA)',
    loginUrl: 'https://www.cukcuk.vn/login',
    reportUrl: 'https://www.cukcuk.vn/app/#/shift-report',
    selectors: {
      usernameInput: '#txtUserName, input[name="username"], input[type="text"]',
      passwordInput: '#txtPassword, input[name="password"], input[type="password"]',
      loginBtn: '#btnLogin, button[type="submit"], input[type="submit"]',
      reportTable: 'table.grid-report, table',
      row: 'table.grid-report tbody tr, table tbody tr',
      openTime: 'td.col-time-open, td:nth-child(2), .open-time',
      closeTime: 'td.col-time-close, td:nth-child(3), .close-time',
      netRevenue: 'td.col-amount, td:nth-child(5), .net-revenue',
      shiftName: 'td.col-shift, td:nth-child(1), .shift-name'
    }
  },
  custom: {
    name: 'POS Web Tùy Chỉnh (Custom)',
    loginUrl: '',
    reportUrl: '',
    selectors: {
      usernameInput: '#username, input[type="text"]',
      passwordInput: '#password, input[type="password"]',
      loginBtn: 'button[type="submit"]',
      reportTable: 'table',
      row: 'table tbody tr',
      openTime: '.open-time, td:nth-child(2)',
      closeTime: '.close-time, td:nth-child(3)',
      netRevenue: '.net-revenue, td:nth-child(4)',
      shiftName: '.shift-name, td:nth-child(1)'
    }
  }
};

module.exports = POS_PRESETS;
