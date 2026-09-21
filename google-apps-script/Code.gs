/**
 * GOOGLE APPS SCRIPT WEB APP - SIÊU TỐC
 * Đồng bộ Doanh Thu Ca & Thu Chi + Tự động điền vào trang tính Master (Tháng M/YYYY)
 */

var SHEET_REVENUE = "Doanh Thu Ca";
var SHEET_CASHBOOK = "Thu Chi";

function removeAccents(str) {
  if (!str) return "";
  return String(str).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function stripUnits(str) {
  if (!str) return "";
  return String(str)
    .replace(/\b(kg|gói|hộp|lon|bịch|chai|lít|quả|trái|cái|cuộn|bao|túi|dĩa|đĩa)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNoteDetails(noteStr, rawAmount) {
  var str = String(noteStr || "").trim();
  // Bỏ các comment chỉnh sửa dạng "[#edit]sửa lúc..."
  str = str.replace(/\[#edit\].*/gi, "").trim();

  var qty = 1;
  var name = str;

  // Pattern nhận diện số lượng: "10 hộp sữa tươi", "20 rich lùn", "2kg cam", "2 lon cốt dừa"
  var match = str.match(/^(\d+(?:[\.,]\d+)?)\s*(?:kg|gói|hộp|lon|bịch|chai|lít|quả|trái|cái|cuộn|bao|túi)?\s*(.*)/i);
  if (match && match[1] && match[2]) {
    qty = parseFloat(match[1].replace(',', '.'));
    name = match[2].trim();
  }

  if (!name) name = str;
  var cleanName = stripUnits(name);
  if (!cleanName) cleanName = name;

  return { qty: qty, name: name, cleanName: cleanName, raw: str };
}

function extractShortDate(datetimeStr) {
  if (!datetimeStr) return "";
  var match = String(datetimeStr).match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    var d = ("0" + match[1]).slice(-2);
    var m = ("0" + match[2]).slice(-2);
    return d + "/" + m;
  }
  return "";
}

function getActiveMonthSheet(ss) {
  var now = new Date();
  var month = now.getMonth() + 1;
  var year = now.getFullYear();
  var sheetName = "Tháng " + month + "/" + year;

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (/^Tháng\s*\d{1,2}\/\d{4}/i.test(sheets[i].getName())) {
        return sheets[i];
      }
    }
  }
  return sheet;
}

function updateMasterMonthSheet(ss, cashbookItems) {
  var monthSheet = getActiveMonthSheet(ss);
  if (!monthSheet) return;

  // 1. Đọc BẢNG TỒN NGUYÊN VẬT LIỆU (Hàng 38 - 79)
  var matRange = monthSheet.getRange(38, 1, 42, 7); // Cols A (1) -> G (7)
  var matValues = matRange.getValues();

  // Reset cột Nhập (col index 3) và cột Note (col index 6) trước khi tổng hợp lại từ đầu
  for (var m = 0; m < matValues.length; m++) {
    matValues[m][3] = "";
    matValues[m][6] = "";
  }

  // 2. Đọc BẢNG SINH HOẠT (Hàng 10 - 25, Cột E(5) -> H(8))
  var sinhHoatRange = monthSheet.getRange(10, 5, 16, 4);
  var sinhHoatValues = sinhHoatRange.getValues();

  // Clear bảng sinh hoạt
  for (var s = 0; s < sinhHoatValues.length; s++) {
    sinhHoatValues[s][0] = "";
    sinhHoatValues[s][1] = "";
    sinhHoatValues[s][2] = "";
    sinhHoatValues[s][3] = "";
  }

  for (var i = 0; i < cashbookItems.length; i++) {
    var item = cashbookItems[i];
    if (!item || !item.note) continue;

    var parsed = parseNoteDetails(item.note, item.amount);
    var shortDate = extractShortDate(item.datetime);
    var normName = removeAccents(parsed.cleanName);

    if (!normName || normName.length < 2) continue;

    // Tìm kiếm trong BẢNG TỒN NGUYÊN VẬT LIỆU (Strict Match)
    var matchedMatIdx = -1;
    for (var m = 0; m < matValues.length; m++) {
      var rawMatName = matValues[m][0];
      if (!rawMatName) continue;

      var matName = removeAccents(rawMatName);
      var matCleanName = removeAccents(stripUnits(rawMatName));

      if (matName.length < 3) continue;

      // Quy tắc khớp chính xác:
      // 1. Trùng khớp hoàn toàn
      // 2. normName chứa matCleanName (ví dụ "2 lon cot dua" chứa "cot dua")
      // 3. matName chứa normName NHƯNG normName phải từ 5 ký tự trở lên (tránh từ ngắn như "lon", "kg")
      if (normName === matName || normName === matCleanName) {
        matchedMatIdx = m;
        break;
      } else if (normName.includes(matCleanName) || normName.includes(matName)) {
        matchedMatIdx = m;
        break;
      } else if (matName.includes(normName) && normName.length >= 5) {
        matchedMatIdx = m;
        break;
      }
    }

    if (matchedMatIdx !== -1) {
      // Tìm thấy nguyên liệu -> Cập nhật Cột D (Nhập) và Cột G (Note)
      var currImport = Number(matValues[matchedMatIdx][3]) || 0;
      var newImport = currImport + parsed.qty;
      matValues[matchedMatIdx][3] = newImport > 0 ? newImport : "";

      var currNote = String(matValues[matchedMatIdx][6] || "").trim();
      if (shortDate) {
        if (!currNote) {
          currNote = shortDate;
        } else if (!currNote.includes(shortDate)) {
          currNote = currNote + ", " + shortDate;
        }
      }
      matValues[matchedMatIdx][6] = currNote;
    } else {
      // Không khớp nguyên liệu -> Đưa vào BẢNG SINH HOẠT
      var amountVal = Math.abs(Number(String(item.amount || "").replace(/[^\d]/g, "")) || 0);
      var added = false;

      // Kiểm tra xem đã có tên này trong bảng Sinh Hoạt chưa
      for (var s = 0; s < sinhHoatValues.length; s++) {
        var shName = removeAccents(sinhHoatValues[s][0]);
        if (shName && (shName === normName || normName.includes(shName))) {
          sinhHoatValues[s][1] = (Number(sinhHoatValues[s][1]) || 0) + parsed.qty;
          if (amountVal > 0) sinhHoatValues[s][2] = (Number(sinhHoatValues[s][2]) || 0) + amountVal;
          if (shortDate && !String(sinhHoatValues[s][3]).includes(shortDate)) {
            sinhHoatValues[s][3] = sinhHoatValues[s][3] ? (sinhHoatValues[s][3] + ", " + shortDate) : shortDate;
          }
          added = true;
          break;
        }
      }

      // Nếu chưa có, điền vào dòng trống đầu tiên trong BẢNG SINH HOẠT
      if (!added) {
        for (var s = 0; s < sinhHoatValues.length; s++) {
          if (!sinhHoatValues[s][0]) { // Dòng trống
            sinhHoatValues[s][0] = parsed.raw || parsed.name;
            sinhHoatValues[s][1] = parsed.qty;
            sinhHoatValues[s][2] = amountVal > 0 ? amountVal : "";
            sinhHoatValues[s][3] = shortDate;
            added = true;
            break;
          }
        }
      }
    }
  }

  // Ghi ngược dữ liệu trở lại Google Sheet
  matRange.setValues(matValues);
  sinhHoatRange.setValues(sinhHoatValues);
}

function normalizeDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  var str = String(val).trim();
  var match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    var d = ("0" + match[1]).slice(-2);
    var m = ("0" + match[2]).slice(-2);
    return d + "/" + m + "/" + match[3];
  }
  return str;
}

function handleCashbook(ss, body) {
  var sheet = ss.getSheetByName(SHEET_CASHBOOK);
  var headers = ["STT", "Mã ca", "Nhân viên", "Thời gian", "Loại", "Nghiệp vụ", "PTTT", "Ghi chú", "Số tiền", "Cập Nhật Sau Cùng"];
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CASHBOOK);
  }

  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#3c78d8").setFontColor("#ffffff");

  var items = Array.isArray(body.data) ? body.data : [];
  var updatedAt = new Date().toLocaleString("vi-VN");

  if (items.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã làm sạch trang Thu Chi!", count: 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var num = item.stt || (i + 1);
    var shiftCode = item.shiftCode || "";
    var employee = item.employee || "";
    var datetime = item.datetime || "";
    var type = item.type || "";
    var category = item.category || "";
    var paymentMethod = item.paymentMethod || "";
    var note = item.note || "";
    var rawAmount = item.amount || "";
    
    var amountVal = rawAmount;
    if (typeof rawAmount === "string") {
      var isNegative = rawAmount.includes("-");
      var cleaned = rawAmount.replace(/[^\d]/g, "");
      if (cleaned !== "" && !isNaN(Number(cleaned))) {
        amountVal = isNegative ? -Number(cleaned) : Number(cleaned);
      }
    }

    rows.push([num, shiftCode, employee, datetime, type, category, paymentMethod, note, amountVal, updatedAt]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(2, 9, rows.length, 1).setNumberFormat("#,##0 \"đ\"");
  }

  try {
    updateMasterMonthSheet(ss, items);
  } catch (err) {
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    target: "cashbook",
    count: rows.length,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Payload rỗng" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.target === "cashbook") {
      return handleCashbook(ss, body);
    }

    var sheet = ss.getSheetByName(SHEET_REVENUE);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_REVENUE);
      sheet.appendRow(["Ngày", "Ca 1", "Ca 2", "Ca 3", "Tổng Doanh Thu", "Cập Nhật Sau Cùng"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#4a86e8").setFontColor("#ffffff");
    }

    if (body.action === "reset") {
      sheet.clearContents();
      sheet.appendRow(["Ngày", "Ca 1", "Ca 2", "Ca 3", "Tổng Doanh Thu", "Cập Nhật Sau Cùng"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#4a86e8").setFontColor("#ffffff");
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã reset toàn bộ trang tính!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var items = Array.isArray(body.data) ? body.data : (body.date ? [body] : []);
    var data = sheet.getDataRange().getValues();
    var updatedCount = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || !item.date) continue;

      var dateStr = normalizeDateStr(item.date);
      var updatedAt = item.updatedAt || new Date().toLocaleString("vi-VN");

      var targetRow = -1;
      for (var r = 1; r < data.length; r++) {
        var rowDate = normalizeDateStr(data[r][0]);
        if (rowDate === dateStr) {
          targetRow = r + 1;
          break;
        }
      }

      if (item.ca1 !== undefined || item.ca2 !== undefined || item.ca3 !== undefined) {
        var ca1 = (item.ca1 && Number(item.ca1) > 0) ? Number(item.ca1) : "";
        var ca2 = (item.ca2 && Number(item.ca2) > 0) ? Number(item.ca2) : "";
        var ca3 = (item.ca3 && Number(item.ca3) > 0) ? Number(item.ca3) : "";

        if (targetRow === -1) {
          var nextRowIdx = sheet.getLastRow() + 1;
          var newRow = [dateStr, ca1, ca2, ca3, "=SUM(B" + nextRowIdx + ":D" + nextRowIdx + ")", updatedAt];
          sheet.appendRow(newRow);
          data.push([dateStr, ca1, ca2, ca3, 0, updatedAt]);
        } else {
          sheet.getRange(targetRow, 2).setValue(ca1);
          sheet.getRange(targetRow, 3).setValue(ca2);
          sheet.getRange(targetRow, 4).setValue(ca3);
          sheet.getRange(targetRow, 6).setValue(updatedAt);
          data[targetRow - 1][1] = ca1;
          data[targetRow - 1][2] = ca2;
          data[targetRow - 1][3] = ca3;
        }
      } else {
        var shiftName = String(item.shift || "Ca 1").trim();
        var revenue = Number(item.netRevenue) || 0;
        var colIdx = 1;
        if (/ca\s*2/i.test(shiftName)) colIdx = 2;
        else if (/ca\s*3/i.test(shiftName)) colIdx = 3;

        if (targetRow === -1) {
          var nextRowIdx = sheet.getLastRow() + 1;
          var newRow = [dateStr, "", "", "", "=SUM(B" + nextRowIdx + ":D" + nextRowIdx + ")", updatedAt];
          newRow[colIdx] = revenue > 0 ? revenue : "";
          sheet.appendRow(newRow);
          
          var cachedRow = new Array(6).fill("");
          cachedRow[0] = dateStr;
          cachedRow[colIdx] = revenue > 0 ? revenue : "";
          data.push(cachedRow);
        } else {
          sheet.getRange(targetRow, colIdx + 1).setValue(revenue > 0 ? revenue : "");
          sheet.getRange(targetRow, 6).setValue(updatedAt);
          data[targetRow - 1][colIdx] = revenue > 0 ? revenue : "";
        }
      }

      updatedCount++;
    }

    var lastRow = sheet.getLastRow();
    if (lastRow > 2) {
      sheet.getRange(2, 1, lastRow - 1, 6).sort({ column: 1, ascending: true });
    }

    if (lastRow > 1) {
      sheet.getRange(2, 2, lastRow - 1, 4).setNumberFormat("#,##0 \"đ\"");
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: updatedCount,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput("<h3>Webhook Đồng Bộ Doanh Thu POS & Thu Chi Master đang hoạt động bình thường!</h3>");
}
