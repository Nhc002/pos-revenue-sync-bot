const readline = require('readline');
const fs = require('fs');
const path = require('path');
const POS_PRESETS = require('./config/posPresets');
const { registerWindowsTask } = require('./scripts/setup-windows-task');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function sanitizeSelector(str) {
  if (!str) return '';
  return str.trim().replace(/,\s*$/, '');
}

async function startInteractiveSetup() {
  console.log(`
================================================================
=== BỘ HƯỚNG DẪN THIẾT LẬP TỰ ĐỘNG HỆ THỐNG ĐỒNG BỘ POS ===
================================================================
  `);

  console.log('Vui lòng chọn Hệ Thống POS bạn đang sử dụng:\n');
  const presetKeys = Object.keys(POS_PRESETS);
  presetKeys.forEach((key, index) => {
    console.log(`  [${index + 1}] ${POS_PRESETS[key].name}`);
  });

  const choiceStr = await promptQuestion('\nNhập số lựa chọn (1-6) [Mặc định 1 - KiotViet]: ');
  const choiceIdx = parseInt(choiceStr, 10) - 1;
  const selectedKey = presetKeys[choiceIdx >= 0 && choiceIdx < presetKeys.length ? choiceIdx : 0];
  const preset = POS_PRESETS[selectedKey];

  console.log(`\n--> Đã chọn cấu hình POS: ${preset.name}`);

  // 1. Hỏi thông tin URL / Domain
  const defaultLoginUrl = preset.loginUrl || 'https://fabi.ipos.vn/login';
  let loginUrl = await promptQuestion(`- Đường dẫn trang đăng nhập POS [Mặc định: ${defaultLoginUrl}]: `);
  loginUrl = loginUrl.trim() || defaultLoginUrl;

  const defaultReportUrl = preset.reportUrl || `${loginUrl.replace(/\/login.*/, '')}/reports/shift`;
  let reportUrl = await promptQuestion(`- Đường dẫn trang Báo cáo đóng ca POS [Mặc định: ${defaultReportUrl}]: `);
  reportUrl = reportUrl.trim() || defaultReportUrl;

  // 2. Hỏi thông tin Đăng nhập
  let username = await promptQuestion('- Tên tài khoản đăng nhập POS: ');
  username = username.trim();

  let password = await promptQuestion('- Mật khẩu đăng nhập POS: ');
  password = password.trim();

  // 3. Hỏi Google Apps Script Webhook URL
  console.log('\n--- CẤU HÌNH WEBHOOK GOOGLE APPS SCRIPT ---');
  console.log('Hướng dẫn: Dán URL ứng dụng Web thu được từ Tiện ích mở rộng > Apps Script trên Google Sheets.');
  let gasWebhookUrl = await promptQuestion('- Webhook URL (VD: https://script.google.com/macros/s/AKfycb.../exec): ');
  gasWebhookUrl = gasWebhookUrl.trim();

  if (!gasWebhookUrl.startsWith('http')) {
    console.log('⚠️ URL Webhook chưa hợp lệ hoặc bị nhập nhầm. Bạn có thể mở file .env để dán lại URL sau.');
  }

  // 4. Lập lịch Cron
  const cronSchedule = '0,30 * * * *'; // Mỗi 30 phút

  // 5. Ghi thông tin vào file .env
  const envContent = `# CẤU HÌNH ĐƯỢC TẠO TỰ ĐỘNG BỞI SETUP WIZARD (${new Date().toLocaleString('vi-VN')})
# POS System: ${preset.name}

GAS_WEBHOOK_URL=${gasWebhookUrl}

POS_LOGIN_URL=${loginUrl}
POS_USERNAME=${username}
POS_PASSWORD=${password}
POS_REPORT_URL=${reportUrl}

HEADLESS=true
CRON_SCHEDULE=${cronSchedule}

# CSS SELECTORS (PRESET: ${preset.name})
POS_SELECTOR_USERNAME_INPUT=${sanitizeSelector(preset.selectors.usernameInput)}
POS_SELECTOR_PASSWORD_INPUT=${sanitizeSelector(preset.selectors.passwordInput)}
POS_SELECTOR_LOGIN_BTN=${sanitizeSelector(preset.selectors.loginBtn)}
POS_SELECTOR_REPORT_TABLE=${sanitizeSelector(preset.selectors.reportTable)}
POS_SELECTOR_ROW=${sanitizeSelector(preset.selectors.row)}
POS_SELECTOR_OPEN_TIME=${sanitizeSelector(preset.selectors.openTime)}
POS_SELECTOR_CLOSE_TIME=${sanitizeSelector(preset.selectors.closeTime)}
POS_SELECTOR_NET_REVENUE=${sanitizeSelector(preset.selectors.netRevenue)}
POS_SELECTOR_SHIFT_NAME=${sanitizeSelector(preset.selectors.shiftName)}
`;

  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`\n✅ Đã lưu cấu hình mới vào file: ${envPath}`);

  // 6. Hỏi tự động đăng ký Windows Task Scheduler
  const autoTask = await promptQuestion('\nBạn có muốn TỰ ĐỘNG TẠO WINDOWS TASK SCHEDULER để bot tự động chạy ngầm mỗi 30 phút trên máy tính không? (y/n) [y]: ');
  if (!autoTask || autoTask.toLowerCase().startsWith('y')) {
    registerWindowsTask();
  }

  console.log(`
================================================================
🎉 HOÀN TẤT THIẾT LẬP TỰ ĐỘNG!
================================================================
- Để kiểm tra bot chạy 1 lần ngay lập tức: npm run once
- Để khởi động tiến trình bot chạy ngầm: npm start
  `);

  rl.close();
}

if (require.main === module) {
  startInteractiveSetup();
}

module.exports = { startInteractiveSetup };
