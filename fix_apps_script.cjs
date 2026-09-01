const fs = require('fs');
let code = fs.readFileSync('AppsScript.js', 'utf8');

// Update doGet
code = code.replace(
  'var rawCategories = sheetToObjects("categories");',
  `var rawCategories = sheetToObjects("categories");
    var categories = rawCategories.map(function(c) {
      return typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c);
    });
    var rawFabrics = sheetToObjects("fabrics");
    var fabrics = rawFabrics.map(function(c) {
      return typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c);
    });`
);
code = code.replace(
  'categories: categories,',
  'categories: categories,\n      fabrics: fabrics,'
);

// Update doPost delta
code = code.replace(
  'if (changes.categories && Array.isArray(changes.categories)) {',
  `if (changes.categories && Array.isArray(changes.categories)) {
      var catObjs = changes.categories.map(function(c) { return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; });
      objectsToSheetAtomic("categories", catObjs);
      stats.updatedRecords += catObjs.length;
    }
    if (changes.fabrics && Array.isArray(changes.fabrics)) {
      var fabObjs = changes.fabrics.map(function(c) { return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; });
      objectsToSheetAtomic("fabrics", fabObjs);
      stats.updatedRecords += fabObjs.length;
    }
    if (false) {`
);

// Update doPost full
code = code.replace(
  'if (payloadObj.categories && Array.isArray(payloadObj.categories)) {',
  `if (payloadObj.categories && Array.isArray(payloadObj.categories)) {
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
    if (false) {`
);

fs.writeFileSync('AppsScript.js', code);
