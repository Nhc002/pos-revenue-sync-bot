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

    console.log(`[TaskInstaller] Thư mục dự án: ${projectDir}`);
    console.log(`[TaskInstaller] Đường dẫn Node.exe: ${nodePath}`);

    // Xóa task cũ nếu đã tồn tại
    try {
      execSync(`schtasks /Delete /TN "${TASK_NAME}" /F`, { stdio: 'ignore' });
      console.log(`[TaskInstaller] Đã gỡ bỏ tác vụ cũ "${TASK_NAME}".`);
    } catch (e) {
      // Bỏ qua nếu task chưa từng tồn tại
    }

    // ==========================================
    // 1. TẠO BATCH SCRIPT CHẠY BOT (UTF-8, TỰ NHẬN THƯ MỤC)
    // ==========================================
    const batPath = path.join(projectDir, 'run-bot.bat');
    const batContent = [
      '@echo off',
      'chcp 65001 >nul',
      'cd /d "%~dp0"',
      `"${nodePath}" index.js --once`
    ].join('\r\n');
    fs.writeFileSync(batPath, batContent, 'utf8');
    console.log(`[TaskInstaller] Đã tạo runner: ${batPath}`);

    // ==========================================
    // 2. TẠO VBS WRAPPER ĐỂ CHẠY ẨN HOÀN TOÀN (SW_HIDE)
    // ==========================================
    // Dùng đường dẫn tương đối qua ScriptFullName để KHÔNG BAO GIỜ bị lỗi font Unicode tiếng Việt
    const vbsPath = path.join(projectDir, 'run-hidden.vbs');
    const vbsContent = [
      `' ===== VBS Wrapper - Chay bot POS an hoan toan (khong mo CMD) =====`,
      `Set fso = CreateObject("Scripting.FileSystemObject")`,
      `Set WshShell = CreateObject("WScript.Shell")`,
      `scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)`,
      `WshShell.CurrentDirectory = scriptDir`,
      `cmd = """" & scriptDir & "\\run-bot.bat"""`,
      `WshShell.Run cmd, 0, True`,
      `Set WshShell = Nothing`
    ].join('\r\n');
    fs.writeFileSync(vbsPath, vbsContent, 'ascii');
    console.log(`[TaskInstaller] Đã tạo VBS wrapper ẩn: ${vbsPath}`);

    // ==========================================
    // 3. TẠO TASK SCHEDULER QUA POWERSHELL
    // ==========================================
    const psScript = [
      `$projectDir = (Get-Item -LiteralPath '${projectDir.replace(/'/g, "''")}').FullName`,
      `$vbsPath = Join-Path $projectDir 'run-hidden.vbs'`,
      `$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('\"\"\"' + $vbsPath + '\"\"\"') -WorkingDirectory $projectDir`,
      `$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 9999)`,
      `$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd`,
      `Register-ScheduledTask -TaskName '${TASK_NAME}' -Action $action -Trigger $trigger -Settings $settings -Force`
    ].join('\r\n');

    const tempPs1Path = path.join(projectDir, 'register-task.ps1');
    fs.writeFileSync(tempPs1Path, '\ufeff' + psScript, 'utf8');

    console.log(`[TaskInstaller] Đang chạy lệnh khởi tạo Windows Task Scheduler...`);
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1Path}"`, { stdio: 'inherit' });
    if (fs.existsSync(tempPs1Path)) fs.unlinkSync(tempPs1Path);

    console.log(`\n✅ THÀNH CÔNG! Đã cài đặt Tác vụ chạy ngầm "${TASK_NAME}" trong Windows Task Scheduler.`);
    console.log(`🔇 Bot sẽ chạy HOÀN TOÀN ẨN mỗi 30 phút — KHÔNG bật cửa sổ CMD.`);
    console.log(`📄 VBS Wrapper: ${vbsPath}`);
    console.log(`\n💡 Để gỡ bỏ task, chạy: schtasks /Delete /TN "${TASK_NAME}" /F`);
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
