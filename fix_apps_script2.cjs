const fs = require('fs');
let code = fs.readFileSync('AppsScript.js', 'utf8');

code = code.replace(
  `    if (false) {
        var catObjs = changes.categories.map(function(c) {
          return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) };
        });
        objectsToSheetAtomic("categories", catObjs);
        stats.updatedRecords += catObjs.length;
      }`,
  ''
);

code = code.replace(
  `    if (false) {
      var catObjs2 = payloadObj.categories.map(function(c) {
        return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) };
      });
      objectsToSheetAtomic("categories", catObjs2);
    }`,
  ''
);

fs.writeFileSync('AppsScript.js', code);
