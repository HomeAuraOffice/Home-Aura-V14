// ==============================================================================
// HOMEAURA V5 - MULTI-USER INSTANT DELTA SYNCHRONIZATION BACKEND (APPS SCRIPT)
// ==============================================================================

var DELTA_CACHE_KEY = 'HOMEAURA_RECENT_DELTAS_V1';
var LAST_UPDATE_KEY = 'HOMEAURA_LAST_UPDATE_V1';
var FULL_SNAPSHOT_CACHE_KEY = 'HOMEAURA_FULL_SNAPSHOT_V1';

/**
 * Record modified items into in-memory rolling delta buffer
 */
function recordRecentChanges(changesMap, deletesMap, sender) {
  var now = new Date().toISOString();
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(LAST_UPDATE_KEY, now);

    var cache = CacheService.getScriptCache();
    cache.remove(FULL_SNAPSHOT_CACHE_KEY); // Invalidate snapshot cache on new write

    var raw = cache.get(DELTA_CACHE_KEY);
    var buffer = [];
    if (raw) {
      try { buffer = JSON.parse(raw); } catch(e) { buffer = []; }
    }

    // Push new delta entry
    buffer.push({
      timestamp: now,
      sender: sender || '',
      changes: changesMap || {},
      deletes: deletesMap || {}
    });

    // Keep up to 100 recent change events
    if (buffer.length > 100) {
      buffer = buffer.slice(buffer.length - 100);
    }

    cache.put(DELTA_CACHE_KEY, JSON.stringify(buffer), 21600); // 6 hours
  } catch(e) {}
  return now;
}

function doGet(e) {
  var clientSince = e && e.parameter && e.parameter.since ? String(e.parameter.since) : null;
  var props = PropertiesService.getScriptProperties();
  var lastUpdate = props.getProperty(LAST_UPDATE_KEY) || '0';

  // 1. FAST-PATH: If client's cached timestamp is >= last mutation time, nothing has changed
  if (clientSince && clientSince >= lastUpdate && lastUpdate !== '0') {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'not_modified', 
      lastUpdate: lastUpdate,
      serverTimestamp: new Date().toISOString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. DELTA-PATH: If client provided a valid timestamp, return ONLY modified records
  if (clientSince) {
    var cache = CacheService.getScriptCache();
    var raw = cache.get(DELTA_CACHE_KEY);
    if (raw) {
      try {
        var buffer = JSON.parse(raw);
        var oldestInBuffer = buffer.length > 0 ? buffer[0].timestamp : null;
        if (oldestInBuffer && oldestInBuffer <= clientSince) {
          var relevant = buffer.filter(function(b) {
            return b && b.timestamp && b.timestamp > clientSince;
          });

          if (relevant.length > 0) {
            var mergedChanges = {};
            var mergedDeletes = {};

            relevant.forEach(function(entry) {
              if (entry.changes) {
                Object.keys(entry.changes).forEach(function(collection) {
                  if (!mergedChanges[collection]) mergedChanges[collection] = {};
                  var items = entry.changes[collection];
                  if (Array.isArray(items)) {
                    items.forEach(function(item) {
                      if (item && item.id) {
                        mergedChanges[collection][String(item.id)] = item;
                      }
                    });
                  }
                });
              }
              if (entry.deletes) {
                Object.keys(entry.deletes).forEach(function(collection) {
                  if (!mergedDeletes[collection]) mergedDeletes[collection] = [];
                  var delIds = entry.deletes[collection];
                  if (Array.isArray(delIds)) {
                    delIds.forEach(function(id) {
                      if (!mergedDeletes[collection].includes(id)) {
                        mergedDeletes[collection].push(id);
                      }
                    });
                  }
                });
              }
            });

            var finalChanges = {};
            Object.keys(mergedChanges).forEach(function(col) {
              finalChanges[col] = Object.values(mergedChanges[col]);
            });

            return ContentService.createTextOutput(JSON.stringify({
              status: 'delta',
              lastUpdate: lastUpdate,
              serverTimestamp: new Date().toISOString(),
              changes: finalChanges,
              deletes: mergedDeletes
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      } catch(err) {
        // Fallback to full fetch if error parsing buffer
      }
    }
  }

  // 3. FULL SNAPSHOT PATH (First load, stale client, or forced refresh)
  try {
    var cacheSnap = CacheService.getScriptCache();
    var cachedSnapshot = cacheSnap.get(FULL_SNAPSHOT_CACHE_KEY);
    if (cachedSnapshot) {
      return ContentService.createTextOutput(cachedSnapshot)
        .setMimeType(ContentService.MimeType.JSON);
    }

    var rawCategories = sheetToObjects("categories");
    var categories = rawCategories.map(function(c) {
      if (typeof c === 'object' && c !== null) return c.name || Object.values(c).join('');
      return String(c);
    });
    
    var rawFabrics = sheetToObjects("fabrics");
    var fabrics = rawFabrics.map(function(c) {
      if (typeof c === 'object' && c !== null) return c.name || Object.values(c).join('');
      return String(c);
    });

    var rawVersion = sheetToObjects("version");
    if (!rawVersion || rawVersion.length === 0) {
      rawVersion = sheetToObjects("Version");
    }
    if (!rawVersion || rawVersion.length === 0) {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var vSheet = ss.getSheetByName("version") || ss.getSheetByName("Version");
        if (!vSheet) {
          vSheet = ss.insertSheet("version");
          vSheet.appendRow(["id", "version", "releaseNotes", "minVersion", "updatedAt", "updatedBy"]);
          vSheet.appendRow(["app_version", "1.0.2", "Combined photo regeneration fix & auto-update alerts", "1.0.0", new Date().toISOString(), "system"]);
        }
        rawVersion = sheetToObjects("version");
      } catch(e) {}
    }

    var data = {
      status: 'success',
      mode: 'full',
      lastUpdate: lastUpdate,
      serverTimestamp: new Date().toISOString(),
      users: sheetToObjects("users"),
      orders: sheetToObjects("orders"),
      deletedOrders: sheetToObjects("deletedOrders"),
      categories: categories,
      fabrics: fabrics,
      factories: sheetToObjects("factories"),
      factoryBills: sheetToObjects("factoryBills"),
      expenses: sheetToObjects("expenses"),
      settings: sheetToObjects("settings"),
      version: rawVersion,
      tasks: sheetToObjects("tasks"),
      notifications: sheetToObjects("notifications")
    };

    var jsonStr = JSON.stringify(data);
    try { cacheSnap.put(FULL_SNAPSHOT_CACHE_KEY, jsonStr, 15); } catch(e) {}

    return ContentService.createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      error: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { 
    lock.waitLock(30000); 
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'busy', 
      error: 'Server is currently processing another request. Please try again.' 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var payloadObj = JSON.parse(e.postData.contents);

    // --- CONNECTION TEST ---
    if (payloadObj._connectionTest || payloadObj.action === 'test_connection') {
      objectsToSheetAtomic("connectionTest", payloadObj._connectionTest || [{ ping: 'ok', timestamp: new Date().toISOString() }]);
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        serverTimestamp: new Date().toISOString() 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- IMAGE UPLOAD (GOOGLE DRIVE ATTACHMENTS & PROOFS) ---
    if (payloadObj.action === 'upload_image' && payloadObj.base64) {
      return ContentService.createTextOutput(JSON.stringify(
        handleDriveImageUpload(payloadObj.filename || 'attachment.jpg', payloadObj.base64, payloadObj.folder)
      )).setMimeType(ContentService.MimeType.JSON);
    }

    // --- BACKUP TRIGGERS ---
    if (payloadObj.action === 'setup_backup') {
      try {
        setupBackupTrigger(payloadObj.hours);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'success', 
          message: 'Backup frequency set to ' + payloadObj.hours + ' hour(s).' 
        })).setMimeType(ContentService.MimeType.JSON);
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'error', 
          error: err.toString() 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    if (payloadObj.action === 'manual_backup') {
      try {
        backupSpreadsheet();
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'success', 
          message: 'Manual backup completed successfully!' 
        })).setMimeType(ContentService.MimeType.JSON);
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: 'error', 
          error: err.toString() 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    var stats = { updatedRecords: 0, deletedRecords: 0 };

    // --- DELTA SYNC (OPTIMIZED QUEUE PROCESSING) ---
    if (payloadObj.action === 'sync_delta' || payloadObj.delta === true) {
      var changes = payloadObj.changes || {};
      var deletes = payloadObj.deletes || {};

      // Process incremental modifications with Last-Write-Wins (LWW)
      if (changes.users && changes.users.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("users", changes.users);
      }
      if (changes.orders && changes.orders.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("orders", changes.orders);
      }
      if (changes.deletedOrders && changes.deletedOrders.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("deletedOrders", changes.deletedOrders);
      }
      if (changes.factories && changes.factories.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("factories", changes.factories);
      }
      if (changes.factoryBills && changes.factoryBills.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("factoryBills", changes.factoryBills);
      }
      if (changes.expenses && changes.expenses.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("expenses", changes.expenses);
      }
      if (changes.settings && changes.settings.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("settings", changes.settings);
      }
      if (changes.version && changes.version.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("version", changes.version);
      }
      if (changes.tasks && changes.tasks.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("tasks", changes.tasks);
      }
      if (changes.notifications && changes.notifications.length) {
        stats.updatedRecords += mergeObjectsByIdLWW("notifications", changes.notifications);
      }

      // Process categories & fabrics
      if (changes.categories && Array.isArray(changes.categories)) {
        var catObjs = changes.categories.map(function(c) { 
          return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; 
        });
        objectsToSheetAtomic("categories", catObjs);
        stats.updatedRecords += catObjs.length;
      }
      if (changes.fabrics && Array.isArray(changes.fabrics)) {
        var fabObjs = changes.fabrics.map(function(c) { 
          return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; 
        });
        objectsToSheetAtomic("fabrics", fabObjs);
        stats.updatedRecords += fabObjs.length;
      }

      // Process hard deletes
      Object.keys(deletes).forEach(function(sheetName) {
        var idsToDelete = deletes[sheetName];
        if (idsToDelete && idsToDelete.length > 0) {
          stats.deletedRecords += deleteObjectsById(sheetName, idsToDelete);
        }
      });

      logHistory(payloadObj, stats);

      try {
        distributeOrdersBySeller();
      } catch(e) {}

      var lastUpdateDelta = recordRecentChanges(changes, deletes, payloadObj.sender);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        mode: 'delta',
        stats: stats,
        lastUpdate: lastUpdateDelta,
        serverTimestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- FULL SYNC (FALLBACK / MANUAL FORCE) ---
    if (payloadObj.users) stats.updatedRecords += mergeObjectsByIdLWW("users", payloadObj.users);
    if (payloadObj.orders) stats.updatedRecords += mergeObjectsByIdLWW("orders", payloadObj.orders);
    if (payloadObj.deletedOrders) stats.updatedRecords += mergeObjectsByIdLWW("deletedOrders", payloadObj.deletedOrders);
    if (payloadObj.factories) stats.updatedRecords += mergeObjectsByIdLWW("factories", payloadObj.factories);
    if (payloadObj.factoryBills) stats.updatedRecords += mergeObjectsByIdLWW("factoryBills", payloadObj.factoryBills);
    if (payloadObj.expenses) stats.updatedRecords += mergeObjectsByIdLWW("expenses", payloadObj.expenses);
    if (payloadObj.settings) stats.updatedRecords += mergeObjectsByIdLWW("settings", payloadObj.settings);
    if (payloadObj.version) stats.updatedRecords += mergeObjectsByIdLWW("version", payloadObj.version);
    if (payloadObj.tasks) stats.updatedRecords += mergeObjectsByIdLWW("tasks", payloadObj.tasks);
    if (payloadObj.notifications) stats.updatedRecords += mergeObjectsByIdLWW("notifications", payloadObj.notifications);

    if (payloadObj.pendingDeletes) {
      Object.keys(payloadObj.pendingDeletes).forEach(function(sheetName) {
        var idsToDelete = payloadObj.pendingDeletes[sheetName];
        if (idsToDelete && idsToDelete.length > 0) {
          stats.deletedRecords += deleteObjectsById(sheetName, idsToDelete);
        }
      });
    }

    if (payloadObj.categories && Array.isArray(payloadObj.categories)) {
      var catObjs2 = payloadObj.categories.map(function(c) {
        return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) };
      });
      objectsToSheetAtomic("categories", catObjs2);
    }
    
    if (payloadObj.fabrics && Array.isArray(payloadObj.fabrics)) {
      var fabObjs2 = payloadObj.fabrics.map(function(c) {
        return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) };
      });
      objectsToSheetAtomic("fabrics", fabObjs2);
    }

    logHistory(payloadObj, stats);

    try {
      distributeOrdersBySeller();
    } catch(e) {}

    var lastUpdateFull = recordRecentChanges({
      orders: payloadObj.orders,
      users: payloadObj.users,
      factories: payloadObj.factories,
      tasks: payloadObj.tasks,
      expenses: payloadObj.expenses,
      settings: payloadObj.settings
    }, payloadObj.pendingDeletes, payloadObj.sender);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      mode: 'full',
      stats: stats,
      lastUpdate: lastUpdateFull,
      serverTimestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ------------------------------------------------------------------------------
// CORE DATA ENGINE & MULTI-USER MERGE UTILITIES
// ------------------------------------------------------------------------------

/**
 * Smart Last-Write-Wins (LWW) merge keyed by item ID and updatedAt timestamp
 */
function mergeObjectsByIdLWW(sheetName, incomingObjects) {
  if (!incomingObjects || incomingObjects.length === 0) return 0;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  var existingObjects = sheetToObjects(sheetName);
  var map = {};
  var order = [];

  // 1. Index existing objects
  existingObjects.forEach(function(obj) {
    if (obj && obj.id !== undefined && obj.id !== '') {
      var key = String(obj.id);
      map[key] = obj;
      order.push(key);
    }
  });

  var updatedCount = 0;

  // 2. Merge incoming objects using Last-Write-Wins timestamp comparison
  incomingObjects.forEach(function(incObj) {
    if (!incObj || incObj.id === undefined || incObj.id === '') return;
    var key = String(incObj.id);
    var existing = map[key];

    if (!existing) {
      // New record
      map[key] = incObj;
      order.push(key);
      updatedCount++;
    } else {
      // Compare timestamps
      var incTime = incObj.updatedAt ? new Date(incObj.updatedAt).getTime() : 0;
      var extTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      
      if (incTime >= extTime || !extTime) {
        // Incoming is newer or equal -> update fields cleanly
        if ((incObj.factoryTag === undefined || incObj.factoryTag === '' || incObj.factoryTag === null) && existing.factoryTag) {
          incObj.factoryTag = existing.factoryTag;
        }
        if ((incObj.sfcDeliveryStatus === undefined || incObj.sfcDeliveryStatus === '' || incObj.sfcDeliveryStatus === null) && existing.sfcDeliveryStatus) {
          incObj.sfcDeliveryStatus = existing.sfcDeliveryStatus;
        }
        map[key] = Object.assign({}, existing, incObj);
        updatedCount++;
      } else {
        var modified = false;
        if (incObj.factoryTag && !existing.factoryTag) {
          existing.factoryTag = incObj.factoryTag;
          modified = true;
        }
        if (incObj.sfcDeliveryStatus && !existing.sfcDeliveryStatus) {
          existing.sfcDeliveryStatus = incObj.sfcDeliveryStatus;
          modified = true;
        }
        if (modified) {
          map[key] = existing;
          updatedCount++;
        }
      }
    }
  });

  // 3. Reconstruct ordered list
  var merged = order.map(function(key) {
    return map[key];
  });

  objectsToSheetAtomic(sheetName, merged);
  return updatedCount;
}

/**
 * Deletes objects matching specified IDs from a sheet
 */
function deleteObjectsById(sheetName, idsToDelete) {
  if (!idsToDelete || idsToDelete.length === 0) return 0;
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;

  var existingObjects = sheetToObjects(sheetName);
  var idMap = {};
  idsToDelete.forEach(function(id) { idMap[String(id)] = true; });

  var keptObjects = [];
  var deleteCount = 0;

  existingObjects.forEach(function(obj) {
    if (obj && obj.id !== undefined && idMap[String(obj.id)]) {
      deleteCount++;
    } else {
      keptObjects.push(obj);
    }
  });

  if (deleteCount > 0) {
    objectsToSheetAtomic(sheetName, keptObjects);
  }
  return deleteCount;
}

/**
 * Reads a sheet and parses it into an array of JavaScript objects
 */
function sheetToObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var isEmpty = row.every(function(cell) { return cell === '' || cell === null; });
    if (isEmpty) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).trim();
      if (header) {
        var cellVal = row[j];
        
        // Parse JSON strings for arrays/objects (e.g. linkedOrderIds)
        if (typeof cellVal === 'string' && (cellVal.startsWith('[') || cellVal.startsWith('{'))) {
          try {
            cellVal = JSON.parse(cellVal);
          } catch (e) {}
        }
        
        obj[header] = cellVal;
      }
    }
    result.push(obj);
  }

  return result;
}

/**
 * Atomically replaces the contents of a sheet with an array of objects
 */
function objectsToSheetAtomic(sheetName, objects) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  if (!objects || objects.length === 0) {
    sheet.clearContents();
    return;
  }

  // Collect all unique headers across all objects
  var headersMap = {};
  if (sheetName === 'orders' || sheetName === 'deletedOrders') {
    headersMap['sfcDeliveryStatus'] = true;
    headersMap['factoryTag'] = true;
  }
  objects.forEach(function(obj) {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(function(key) {
        headersMap[key] = true;
      });
    }
  });

  var headers = Object.keys(headersMap);
  if (headers.length === 0) return;

  var rows = [headers];
  objects.forEach(function(obj) {
    var row = [];
    headers.forEach(function(header) {
      var val = obj ? obj[header] : '';
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      row.push(val);
    });
    rows.push(row);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Saves uploaded images (base64) to Google Drive and returns direct URL
 */
function handleDriveImageUpload(filename, base64Data, customFolder) {
  try {
    var cleanBase64 = base64Data;
    var contentType = "image/jpeg";
    
    if (cleanBase64.indexOf(",") > -1) {
      var parts = cleanBase64.split(",");
      var mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) contentType = mimeMatch[1];
      cleanBase64 = parts[1];
    }
    
    var decodedBlob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), contentType, filename);
    
    // Create or locate HomeAura folder
    var folderName = customFolder || "HomeAura_Order_Attachments";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var file = targetFolder.createFile(decodedBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var directUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    
    return {
      status: 'success',
      url: directUrl,
      fileId: file.getId(),
      filename: filename
    };
  } catch (err) {
    return {
      status: 'error',
      error: 'Drive upload error: ' + err.toString()
    };
  }
}

/**
 * Records an audit log of sync transactions
 */
function logHistory(payload, stats) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var historySheet = ss.getSheetByName("History_Log");
    
    if (!historySheet) {
      historySheet = ss.insertSheet("History_Log");
      historySheet.appendRow(["Timestamp", "Action/Mode", "Updated", "Deleted", "Sender"]);
    }
    
    var sender = payload.sender || "app_client";
    var mode = payload.delta ? "delta" : (payload.action || "full");
    var updated = (stats && stats.updatedRecords) || 0;
    var deleted = (stats && stats.deletedRecords) || 0;
    
    historySheet.appendRow([
      new Date().toISOString(),
      mode,
      updated,
      deleted,
      sender
    ]);
    
    // Keep log to at most 1000 rows
    if (historySheet.getLastRow() > 1000) {
      historySheet.deleteRows(2, 200);
    }
  } catch (e) {}
}

/**
 * Automatically splits and maintains dedicated sheets for each active Seller/Moderator
 */
function distributeOrdersBySeller() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orders = sheetToObjects("orders");
  var users = sheetToObjects("users");
  
  var idToUsername = {};
  var validSellerUsernames = {};
  
  users.forEach(function(u) {
    if (u && u.id && u.username) {
      idToUsername[u.id] = u.username;
      // Only allocate individual sheets for sellers and moderators
      if (u.role === 'seller' || u.role === 'moderator') {
        validSellerUsernames[u.username] = true;
      }
    }
  });
  
  if (Object.keys(validSellerUsernames).length === 0) return;
  
  var sellerOrders = {};
  Object.keys(validSellerUsernames).forEach(function(username) {
    sellerOrders[username] = [];
  });
  
  orders.forEach(function(o) {
    if (o && o.merchantId) {
      var username = idToUsername[o.merchantId];
      if (username && validSellerUsernames[username]) {
        sellerOrders[username].push(o);
      }
    }
  });
  
  Object.keys(sellerOrders).forEach(function(username) {
    var sheetName = "Orders_" + username;
    var userOrders = sellerOrders[username];
    objectsToSheetAtomic(sheetName, userOrders);
  });
  
  // Cleanup orphaned/stale sheets (e.g., if a username changes or role changes)
  var allSheets = ss.getSheets();
  allSheets.forEach(function(sheet) {
    var sName = sheet.getName();
    if (sName.indexOf("Orders_") === 0) {
      var sUser = sName.substring(7);
      if (!validSellerUsernames[sUser]) {
        ss.deleteSheet(sheet);
      }
    }
  });
}

/**
 * Configures automatic Google Drive backup schedule
 */
function setupBackupTrigger(hours) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'backupSpreadsheet') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  if (hours > 0) {
    ScriptApp.newTrigger('backupSpreadsheet')
             .timeBased()
             .everyHours(hours)
             .create();
  }
}

/**
 * Creates an exact copy of the active spreadsheet into a dedicated Google Drive folder
 */
function backupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var name = ss.getName() + " Backup " + formattedDate;
  var destFolder = DriveApp.getFoldersByName("HomeAura_Backups");
  var folder;
  if (destFolder.hasNext()) {
    folder = destFolder.next();
  } else {
    folder = DriveApp.createFolder("HomeAura_Backups");
  }
  DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
}
