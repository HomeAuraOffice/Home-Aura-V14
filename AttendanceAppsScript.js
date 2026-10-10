// ==============================================================================
// HOMEAURA - DEDICATED ATTENDANCE & LUNCH BREAK GOOGLE SHEET BACKEND (APPS SCRIPT)
// ==============================================================================
// Instructions:
// 1. Create a NEW Google Sheet (e.g. named "Homeaura Attendance & Lunch Records")
// 2. Click "Extensions" > "Apps Script" from the top menu
// 3. Delete any default code in Code.gs, and PASTE this entire script
// 4. Click "Deploy" > "New deployment"
// 5. Click the gear icon next to "Select type" and choose "Web app"
//    - Description: "Homeaura Attendance V1"
//    - Execute as: "Me (your email)"
//    - Who has access: "Anyone"
// 6. Click "Deploy", click "Authorize access", and grant permissions
// 7. Copy the "Deployment ID" (or the full Web App URL)
// 8. Paste it into Homeaura Attendance Desk > "Attendance Deployment ID" field!
// ==============================================================================

var ATTENDANCE_SHEET_NAME = "attendance";
var HEADERS = [
  "id",
  "date",
  "userId",
  "username",
  "sellerName",
  "checkInTime",
  "checkInIso",
  "lunchOutTime",
  "lunchOutIso",
  "lunchInTime",
  "lunchInIso",
  "lunchDurationMinutes",
  "lunchStatus",
  "checkOutTime",
  "checkOutIso",
  "totalHours",
  "status",
  "deviceInfo",
  "notes",
  "updatedAt",
  "updatedBy"
];

/**
 * Ensures the 'attendance' sheet exists and has appropriate headers and formatting.
 */
function getOrCreateAttendanceSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ATTENDANCE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ATTENDANCE_SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    
    // Style headers
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4f46e5");
    headerRange.setFontColor("#ffffff");
    sheet.setRowHeight(1, 35);
  } else {
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4f46e5");
      headerRange.setFontColor("#ffffff");
    }
  }
  return sheet;
}

/**
 * Reads all attendance rows into JSON objects.
 */
function sheetToAttendanceObjects() {
  var sheet = getOrCreateAttendanceSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasContent = false;
    
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Dhaka", "yyyy-MM-dd'T'HH:mm:ss'Z'");
      }
      obj[headers[j]] = val !== undefined && val !== null ? val : "";
      if (val !== "" && val !== null && val !== undefined) {
        hasContent = true;
      }
    }
    
    if (hasContent && obj.id) {
      results.push(obj);
    }
  }
  return results;
}

/**
 * Merges updated attendance records by ID using Last-Write-Wins (LWW).
 */
function mergeAttendanceRecords(records) {
  if (!records || !Array.isArray(records) || records.length === 0) return 0;
  var sheet = getOrCreateAttendanceSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  
  var idIndex = headers.indexOf("id");
  if (idIndex === -1) idIndex = 0;
  
  var rowMap = {};
  for (var i = 1; i < data.length; i++) {
    var rid = String(data[i][idIndex] || '');
    if (rid) {
      rowMap[rid] = i + 1; // 1-indexed sheet row
    }
  }
  
  var updatedCount = 0;
  var rowsToAppend = [];
  
  records.forEach(function(rec) {
    if (!rec || !rec.id) return;
    var recId = String(rec.id);
    
    var rowValues = headers.map(function(h) {
      var val = rec[h];
      return val !== undefined && val !== null ? val : "";
    });
    
    if (rowMap[recId]) {
      var rowNum = rowMap[recId];
      sheet.getRange(rowNum, 1, 1, headers.length).setValues([rowValues]);
      updatedCount++;
    } else {
      rowsToAppend.push(rowValues);
      rowMap[recId] = data.length + rowsToAppend.length;
      updatedCount++;
    }
  });
  
  if (rowsToAppend.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  
  return updatedCount;
}

/**
 * Handle GET requests: Return all or delta attendance records.
 */
function doGet(e) {
  try {
    var since = e && e.parameter && e.parameter.since ? String(e.parameter.since) : null;
    var list = sheetToAttendanceObjects();
    
    if (since) {
      list = list.filter(function(item) {
        return (item.updatedAt && item.updatedAt > since) || (item.date && item.date >= since.substring(0, 10));
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      success: true,
      service: "Homeaura Dedicated Attendance Backend",
      count: list.length,
      attendance: list,
      serverTimestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests: Batch sync or update attendance records.
 */
function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);
    
    var recordsToMerge = [];
    if (Array.isArray(payload)) {
      recordsToMerge = payload;
    } else if (payload.attendance && Array.isArray(payload.attendance)) {
      recordsToMerge = payload.attendance;
    } else if (payload.changes && payload.changes.attendance && Array.isArray(payload.changes.attendance)) {
      recordsToMerge = payload.changes.attendance;
    } else if (payload.id) {
      recordsToMerge = [payload];
    } else if (payload.record) {
      recordsToMerge = [payload.record];
    }
    
    var updated = mergeAttendanceRecords(recordsToMerge);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      success: true,
      updated: updated,
      serverTimestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
