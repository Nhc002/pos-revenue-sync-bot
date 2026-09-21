/**
 * Xử lý và chuyển đổi chuỗi số tiền từ giao diện POS thành kiểu số nguyên.
 * Ví dụ: "374,000 đ" -> 374000, "1.250.000 VNĐ" -> 1250000, "159,500 đ" -> 159500
 * @param {string|number} rawAmount 
 * @returns {number}
 */
function parseCurrency(rawAmount) {
  if (typeof rawAmount === 'number') return Math.round(rawAmount);
  if (!rawAmount || typeof rawAmount !== 'string') return 0;

  const isNegative = rawAmount.includes('-');
  const cleaned = rawAmount.replace(/[^\d]/g, '');

  if (!cleaned) return 0;
  const num = parseInt(cleaned, 10);
  return isNegative ? -num : num;
}

/**
 * Định dạng ngày theo định dạng DD/MM/YYYY
 * @param {Date|string} dateInput 
 * @returns {string} ví dụ: "20/09/2026"
 */
function formatDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Tự động phân loại Ca làm việc (Ca 1, Ca 2, Ca 3) dựa vào thời gian mở/đóng ca
 * @param {string} openTimeStr 
 * @param {string} explicitShiftName 
 * @returns {string} "Ca 1", "Ca 2", hoặc "Ca 3"
 */
function determineShift(openTimeStr, explicitShiftName = '', sequenceIndex = -1) {
  if (explicitShiftName && explicitShiftName.trim()) {
    const name = explicitShiftName.trim();
    if (/ca\s*1/i.test(name) || /sáng/i.test(name)) return 'Ca 1';
    if (/ca\s*2/i.test(name) || /chiều/i.test(name)) return 'Ca 2';
    if (/ca\s*3/i.test(name) || /Tối|đêm/i.test(name)) return 'Ca 3';
  }

  if (sequenceIndex === 0) return 'Ca 1';
  if (sequenceIndex === 1) return 'Ca 2';
  if (sequenceIndex === 2) return 'Ca 3';

  if (!openTimeStr) return 'Ca 1';

  // Lấy giờ và phút từ chuỗi thời gian mở ca (ví dụ "19/09/2026 11:56" hoặc "11:56")
  const match = openTimeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const timeInMinutes = hour * 60 + minute;

    // Ca 1 (Sáng): Mở từ 05:00 đến 11:29
    if (timeInMinutes >= 300 && timeInMinutes < 690) return 'Ca 1';

    // Ca 2 (Chiều): Mở từ 11:30 đến 16:29
    if (timeInMinutes >= 690 && timeInMinutes < 990) return 'Ca 2';

    // Ca 3 (Tối/Đêm): Mở từ 16:30 đến 04:59
    return 'Ca 3';
  }

  return 'Ca 1';
}

/**
 * Làm sạch và chuẩn hóa mảng dữ liệu báo cáo đóng ca.
 * ĐẦU VÀO: Chỉ ghi các ca ĐÃ ĐÓNG CA (bỏ qua các ca "Ca đang mở").
 * ĐẦU RA: Tự động sắp xếp các ca đã đóng theo thứ tự thời gian mở ca tăng dần trong từng ngày (Ca 1 -> Ca 2 -> Ca 3).
 * @param {Array<Object>} rawRows 
 * @returns {Array<Object>}
 */
function normalizeShiftData(rawRows) {
  if (!Array.isArray(rawRows)) return [];

  const seenOpenTimes = new Set();
  const closedRows = [];

  for (const row of rawRows) {
    if (!row) continue;
    const closeTime = row.closeTime ? row.closeTime.trim() : '';

    // BỎ QUA HOÀN TOÀN CÁC CA ĐANG MỞ HOẶC CHƯA ĐÓNG CA
    if (!closeTime || /đang\s*mở/i.test(closeTime)) {
      continue;
    }

    // Phải có thời gian đóng ca hợp lệ (ví dụ chứa HH:mm)
    if (!/\d{1,2}:\d{2}/.test(closeTime)) {
      continue;
    }

    const open = row.openTime ? row.openTime.trim() : '';

    // Lọc trùng bản ghi dựa trên thời gian mở ca
    if (open && seenOpenTimes.has(open)) continue;
    if (open) seenOpenTimes.add(open);

    closedRows.push(row);
  }

  // Gom nhóm các ca đã đóng theo từng ngày
  const groupedByDate = {};

  for (const row of closedRows) {
    const openTime = row.openTime ? row.openTime.trim() : '';
    let dateStr = formatDate(new Date());
    if (openTime) {
      const dateMatch = openTime.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dateMatch) {
        const day = String(dateMatch[1]).padStart(2, '0');
        const month = String(dateMatch[2]).padStart(2, '0');
        const year = dateMatch[3];
        dateStr = `${day}/${month}/${year}`;
      }
    }

    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = [];
    }
    groupedByDate[dateStr].push(row);
  }

  const result = [];

  // Từng ngày: Sắp xếp ca theo thời gian mở ca tăng dần (từ sáng tới tối)
  for (const dateStr of Object.keys(groupedByDate)) {
    const dayShifts = groupedByDate[dateStr];

    dayShifts.sort((a, b) => {
      const getMin = (tStr) => {
        const m = (tStr || '').match(/(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
      };
      return getMin(a.openTime) - getMin(b.openTime);
    });

    dayShifts.forEach((row, idx) => {
      const openTime = row.openTime ? row.openTime.trim() : '';
      const closeTime = row.closeTime ? row.closeTime.trim() : '';
      const shift = determineShift(openTime, row.shiftName, idx);
      const netRevenue = parseCurrency(row.netRevenue);

      result.push({
        date: dateStr,
        shift: shift,
        openTime: openTime,
        closeTime: closeTime,
        netRevenue: netRevenue,
        updatedAt: new Date().toLocaleString('vi-VN')
      });
    });
  }

  return result;
}

/**
 * Gom nhóm mảng bản ghi ca thành danh sách các ô tổng hợp theo Ngày ({ date, ca1, ca2, ca3 })
 * @param {Array<Object>} shiftRecords 
 * @returns {Array<Object>}
 */
function aggregateShiftsByDate(shiftRecords) {
  if (!Array.isArray(shiftRecords)) return [];

  const mapByDate = {};

  for (const item of shiftRecords) {
    if (!item || !item.date) continue;
    const dateStr = item.date;

    if (!mapByDate[dateStr]) {
      mapByDate[dateStr] = {
        date: dateStr,
        ca1: 0,
        ca2: 0,
        ca3: 0,
        updatedAt: item.updatedAt || new Date().toLocaleString('vi-VN')
      };
    }

    const rev = Number(item.netRevenue) || 0;
    if (item.shift === 'Ca 1') mapByDate[dateStr].ca1 = rev;
    else if (item.shift === 'Ca 2') mapByDate[dateStr].ca2 = rev;
    else if (item.shift === 'Ca 3') mapByDate[dateStr].ca3 = rev;
  }

  const result = Object.values(mapByDate);
  result.sort((a, b) => {
    const parseD = (str) => {
      const parts = str.split('/');
      return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    };
    return parseD(a.date) - parseD(b.date);
  });

  return result;
}

module.exports = {
  parseCurrency,
  formatDate,
  determineShift,
  normalizeShiftData,
  aggregateShiftsByDate
};
