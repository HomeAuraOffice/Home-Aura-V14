const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(
  /parcelsText: 'SFC API unreachable',/g,
  `parcelsText: data.error.includes('Rate limit') ? 'API Limit Exceeded' : (data.error.includes('Unauthorized') ? 'Invalid API Key' : 'SFC API unreachable'),`
);

fs.writeFileSync('app.js', code);
