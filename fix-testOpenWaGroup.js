const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// check if testOpenWaGroup is defined
if (!code.includes('const testOpenWaGroup')) {
  console.log("testOpenWaGroup not found. Let's add it.");
  const target = `const openOrderWaGroup = (order) => {`;
  const replacement = `const testOpenWaGroup = () => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
             window.open(targetLink, '_blank', 'noopener,noreferrer');
          } catch (e) {
             console.warn('Failed to open test link:', e.message);
          }
        };

        const openOrderWaGroup = (order) => {`;
  
  if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('app.js', code);
    console.log("testOpenWaGroup added!");
  } else {
    console.log("Target openOrderWaGroup not found either.");
  }
} else {
  console.log("testOpenWaGroup already exists in app.js.");
}
