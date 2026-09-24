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

    // Tạo script PowerShell chuẩn xác để đăng ký Windows Task vĩnh viễn (lặp lại mỗi 30 phút, thời hạn 9999 ngày)
    const psScript = [
      `$nodePath = '${nodePath.replace(/'/g, "''")}'`,
      `$scriptPath = '${scriptPath.replace(/'/g, "''")}'`,
      `$projectDir = '${projectDir.replace(/'/g, "''")}'`,
      `$arg = '"{0}" --once' -f $scriptPath`,
      `$action = New-ScheduledTaskAction -Execute $nodePath -Argument $arg -WorkingDirectory $projectDir`,
      `$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 9999)`,
      `$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable`,
      `Register-ScheduledTask -TaskName '${TASK_NAME}' -Action $action -Trigger $trigger -Settings $settings -Force`
    ].join('\r\n');

    const tempPs1Path = path.join(projectDir, 'register-task.ps1');
    fs.writeFileSync(tempPs1Path, '\ufeff' + psScript, 'utf8');

    console.log(`[TaskInstaller] Đang chạy lệnh khởi tạo Windows Task Scheduler...`);
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1Path}"`, { stdio: 'inherit' });
    if (fs.existsSync(tempPs1Path)) fs.unlinkSync(tempPs1Path);

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
