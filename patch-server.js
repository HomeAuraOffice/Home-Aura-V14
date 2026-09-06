const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const errorText = await res.text\(\);\s*const fallback = {/g,
  `const errorText = await res.text();
        let displayError = errorText;
        try {
          const parsed = JSON.parse(errorText);
          displayError = parsed.error || parsed.message || errorText;
        } catch (e) {}

        const fallback = {`
);

code = code.replace(
  /error: errorText,/g,
  `error: displayError,`
);

fs.writeFileSync('server.ts', code);
