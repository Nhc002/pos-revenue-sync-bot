const http = require('http');

const PORT = 3000;

const loginHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Trang Đăng Nhập POS Giả Lập</title>
  <style>
    body { font-family: sans-serif; padding: 40px; background: #f4f6f8; }
    .card { background: white; padding: 24px; border-radius: 8px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    input { width: 100%; padding: 10px; margin: 8px 0 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Đăng nhập POS</h2>
    <form action="/reports/shift-closing" method="GET">
      <label>Tài khoản</label>
      <input type="text" id="username" name="username" value="cashier1" required />
      <label>Mật khẩu</label>
      <input type="password" id="password" name="password" value="secret123" required />
      <button type="submit" id="login-btn">Đăng Nhập</button>
    </form>
  </div>
</body>
</html>
`;

const reportHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Đóng Ca POS Giả Lập</title>
  <style>
    body { font-family: sans-serif; padding: 30px; background: #f8fafc; }
    h1 { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #334155; color: white; }
    tr:hover { background: #f1f5f9; }
    .net-revenue { font-weight: bold; color: #16a34a; }
  </style>
</head>
<body>
  <h1>Báo Cáo Đóng Ca - Nhà Hàng Demo POS</h1>
  <p>Ngày báo cáo: <strong id="report-date">20/09/2026</strong></p>
  
  <table id="shift-table">
    <thead>
      <tr>
        <th>Tên Ca</th>
        <th>Thời Gian Mở Ca</th>
        <th>Thời Gian Đóng Ca</th>
        <th>Thu Ngân</th>
        <th>Doanh Thu (Net)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="shift-name">Ca 1 (Sáng)</td>
        <td class="open-time">07:00 20/09/2026</td>
        <td class="close-time">14:00 20/09/2026</td>
        <td>Nguyễn Văn A</td>
        <td class="net-revenue">374,000 đ</td>
      </tr>
      <tr>
        <td class="shift-name">Ca 2 (Chiều)</td>
        <td class="open-time">14:00 20/09/2026</td>
        <td class="close-time">22:00 20/09/2026</td>
        <td>Trần Thị B</td>
        <td class="net-revenue">1,250,000 VNĐ</td>
      </tr>
      <tr>
        <td class="shift-name">Ca 3 (Đêm)</td>
        <td class="open-time">22:00 20/09/2026</td>
        <td class="close-time">02:00 21/09/2026</td>
        <td>Lê Văn C</td>
        <td class="net-revenue">890,500 đ</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

function startMockServer(port = PORT) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/login')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loginHtml);
    } else if (req.url.startsWith('/reports/shift-closing')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(reportHtml);
    } else {
      res.writeHead(302, { Location: '/login' });
      res.end();
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[MockPOS] Máy chủ POS Giả Lập đang chạy tại: http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startMockServer();
}

module.exports = { startMockServer };
