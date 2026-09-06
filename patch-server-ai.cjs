const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "model: 'gemini-3.1-flash-lite',",
  "model: 'gemini-2.5-flash',"
);

code = code.replace(
  "res.status(500).json({ error: 'Failed to parse text/image' });",
  "res.status(500).json({ error: 'AI Error: ' + (err.message || 'Failed to parse text/image') });"
);

fs.writeFileSync('server.ts', code);
