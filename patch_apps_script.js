const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Update doGet
code = code.replace(
  /      expenses: sheetToObjects\("expenses"\),\s*settings: sheetToObjects\("settings"\)/,
  \`      expenses: sheetToObjects("expenses"),
      tasks: sheetToObjects("tasks"),
      notifications: sheetToObjects("notifications"),
      settings: sheetToObjects("settings")\`
);

// Update doPost delta
code = code.replace(
  /      if \(changes\.settings && changes\.settings\.length\) stats\.updatedRecords \+= mergeObjectsByIdLWW\("settings", changes\.settings\);/,
  \`      if (changes.settings && changes.settings.length) stats.updatedRecords += mergeObjectsByIdLWW("settings", changes.settings);
      if (changes.tasks && changes.tasks.length) stats.updatedRecords += mergeObjectsByIdLWW("tasks", changes.tasks);
      if (changes.notifications && changes.notifications.length) stats.updatedRecords += mergeObjectsByIdLWW("notifications", changes.notifications);\`
);

// Update doPost full
code = code.replace(
  /    if \(payloadObj\.settings\) stats\.updatedRecords \+= mergeObjectsByIdLWW\("settings", payloadObj\.settings\);/,
  \`    if (payloadObj.settings) stats.updatedRecords += mergeObjectsByIdLWW("settings", payloadObj.settings);
    if (payloadObj.tasks) stats.updatedRecords += mergeObjectsByIdLWW("tasks", payloadObj.tasks);
    if (payloadObj.notifications) stats.updatedRecords += mergeObjectsByIdLWW("notifications", payloadObj.notifications);\`
);

fs.writeFileSync('app.js', code);
