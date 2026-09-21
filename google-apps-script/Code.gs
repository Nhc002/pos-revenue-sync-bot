/**
 * GOOGLE APPS SCRIPT WEB APP - SIÊU TỐC KHÔNG HẰNG / KHÔNG TIMEOUT
 */

var SHEET_NAME = "Doanh Thu Ca";

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

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Payload rỗng" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
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
  return HtmlService.createHtmlOutput("<h3>Webhook Đồng Bộ Doanh Thu POS đang hoạt động bình thường!</h3>");
}
