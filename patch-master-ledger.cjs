const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// 1. Remove Pipeline Status column header from Master Order Ledger
content = content.replace(
  /<th class="p-4">Pipeline Status<\/th>\s*<th class="p-4 text-center">Actions<\/th>/g,
  '<th class="p-4 text-center">Actions</th>'
);

// 2. Remove Pipeline Status column TD block from Master Order Ledger
// This requires a precise regex or manual string manipulation. Let's do it carefully.
