const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(
  '      expenses: sheetToObjects("expenses"),\n      settings: sheetToObjects("settings")',
  '      expenses: sheetToObjects("expenses"),\n      tasks: sheetToObjects("tasks"),\n      notifications: sheetToObjects("notifications"),\n      settings: sheetToObjects("settings")'
);

code = code.replace(
  '      if (changes.settings && changes.settings.length) stats.updatedRecords += mergeObjectsByIdLWW("settings", changes.settings);',
  '      if (changes.settings && changes.settings.length) stats.updatedRecords += mergeObjectsByIdLWW("settings", changes.settings);\n      if (changes.tasks && changes.tasks.length) stats.updatedRecords += mergeObjectsByIdLWW("tasks", changes.tasks);\n      if (changes.notifications && changes.notifications.length) stats.updatedRecords += mergeObjectsByIdLWW("notifications", changes.notifications);'
);

code = code.replace(
  '    if (payloadObj.settings) stats.updatedRecords += mergeObjectsByIdLWW("settings", payloadObj.settings);',
  '    if (payloadObj.settings) stats.updatedRecords += mergeObjectsByIdLWW("settings", payloadObj.settings);\n    if (payloadObj.tasks) stats.updatedRecords += mergeObjectsByIdLWW("tasks", payloadObj.tasks);\n    if (payloadObj.notifications) stats.updatedRecords += mergeObjectsByIdLWW("notifications", payloadObj.notifications);'
);

fs.writeFileSync('app.js', code);
