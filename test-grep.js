const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const p = content.indexOf('processCollageFile');
console.log(content.slice(Math.max(0, p - 500), p + 500));
