const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TASK_NAME = 'POSRevenueSyncBot';

function registerWindowsTask() {
  console.log(`\n======================================================`);
  console.log(`=== ĐANG TỰ ĐỘNG THIẾT LẬP WINDOWS TASK SCHEDULER ===`);
  console.log(`======================================================`);

  try {
    const projectDir = path.resolve(__dirname, '..');
    const nodePath = process.execPath; // Đường dẫn node.exe trên máy khách
    const scriptPath = path.join(projectDir, 'index.js');

    console.log(`[TaskInstaller] Thư mục dự án: ${projectDir}`);
    console.log(`[TaskInstaller] Đường dẫn Node.exe: ${nodePath}`);
    console.log(`[TaskInstaller] Script sẽ chạy: ${scriptPath} --once`);

    // Xóa task cũ nếu đã tồn tại
    try {
      execSync(`schtasks /Delete /TN "${TASK_NAME}" /F`, { stdio: 'ignore' });
      console.log(`[TaskInstaller] Đã gỡ bỏ tác vụ cũ "${TASK_NAME}".`);
    } catch (e) {
      // Bỏ qua nếu task chưa từng tồn tại
    }

    // Tạo tác vụ mới chạy định kỳ 30 phút một lần
    // Command: schtasks /Create /TN "POSRevenueSyncBot" /TR "\"C:\Program Files\nodejs\node.exe\" \"c:\path\to\index.js\" --once" /SC MINUTE /MO 30 /F
    const command = `schtasks /Create /TN "${TASK_NAME}" /TR "\\"${nodePath}\\" \\"${scriptPath}\\" --once" /SC MINUTE /MO 30 /F`;

    console.log(`[TaskInstaller] Đang chạy lệnh khởi tạo Windows Task Scheduler...`);
    execSync(command, { encoding: 'utf-8' });

    console.log(`\n✅ THÀNH CÔNG! Đã tự động cài đặt Tác vụ chạy ngầm "${TASK_NAME}" trong Windows Task Scheduler.`);
    console.log(`⏰ Tác vụ sẽ tự động chạy ngầm mỗi 30 phút 1 lần mà không cần mở cửa sổ dòng lệnh.`);
    return true;
  } catch (error) {
    console.error(`\n❌ LỖI KHI TẠO WINDOWS TASK SCHEDULER: ${error.message}`);
    console.log(`💡 Hướng dẫn: Vui lòng mở Terminal với quyền Administrator nếu gặp lỗi phân quyền.`);
    return false;
  }
}

if (require.main === module) {
  registerWindowsTask();
}

module.exports = { registerWindowsTask };
