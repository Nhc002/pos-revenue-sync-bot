/**
 * GOOGLE APPS SCRIPT WEB APP - SIÊU TỐC KHÔNG HẰNG / KHÔNG TIMEOUT
 * Hỗ trợ đồng bộ cả Báo Cáo Doanh Thu Ca và Báo Cáo Sổ Quỹ Thu Chi
 */

var SHEET_REVENUE = "Doanh Thu Ca";
var SHEET_CASHBOOK = "Thu Chi";

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

  // Clear & reset headers trên mỗi lần đồng bộ full
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
    
    // Đổi số tiền dạng chuỗi "- 80,000 đ" thành số để Sheet tự format
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
    // Định dạng VND cho cột Số tiền (Cột 9 - I)
    sheet.getRange(2, 9, rows.length, 1).setNumberFormat("#,##0 \"đ\"");
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

    // Rẽ nhánh xử lý nếu target là "cashbook" (Sổ Quỹ Thu Chi)
    if (body.target === "cashbook") {
      return handleCashbook(ss, body);
    }

    // Mặc định: Xử lý Báo cáo Doanh Thu Ca ("Doanh Thu Ca")
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

      // Tìm dòng theo ngày trong trang tính hiện tại
      var targetRow = -1;
      for (var r = 1; r < data.length; r++) {
        var rowDate = normalizeDateStr(data[r][0]);
        if (rowDate === dateStr) {
          targetRow = r + 1;
          break;
        }
      }

      // Trường hợp 1: Item là bản ghi tổng hợp theo ngày ({ date, ca1, ca2, ca3 })
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
        // Trường hợp 2: Item là từng Ca đơn lẻ ({ date, shift, netRevenue })
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

    // Tự động sắp xếp dữ liệu tăng dần theo Ngày
    var lastRow = sheet.getLastRow();
    if (lastRow > 2) {
      sheet.getRange(2, 1, lastRow - 1, 6).sort({ column: 1, ascending: true });
    }

    // Định dạng VND cho các cột doanh thu B, C, D, E
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
  return HtmlService.createHtmlOutput("<h3>Webhook Đồng Bộ Doanh Thu POS & Thu Chi đang hoạt động bình thường!</h3>");
}
