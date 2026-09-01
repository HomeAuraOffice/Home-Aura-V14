const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const targetStr = `        const reCopyBulkPngToClipboard = async () => {
          const blobToCopy = bulkDispatchSuccessData.previewBlob || bulkDispatchSuccessData.compositePngBlob;
          if (!blobToCopy) {
            alert('No PNG image available to copy.');
            return;
          }
          const success = await writePngBlobToClipboard(blobToCopy);
          if (success) {
            bulkDispatchSuccessData.hasCopiedPhotos = true;
            alert(\`✅ Image copied to clipboard!\\n\\nPress Ctrl+V (or Cmd+V) to paste in WhatsApp.\`);
          } else {
            alert('Clipboard write was blocked by browser permissions. Please ensure the tab is active.');
          }
        };`;

const replacementStr = targetStr + `

        const testOpenWaGroup = () => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
            window.open(targetLink, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Failed to open test link:', e.message);
          }
        };

        const openOrderWaGroup = (order) => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
            window.open(targetLink, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Failed to open group:', e.message);
          }
        };

        const copyOrderWaGroupLink = async (order) => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
            await navigator.clipboard.writeText(targetLink);
            alert('Group link copied to clipboard!');
          } catch (e) {
            console.warn('Clipboard write warning:', e.message);
          }
        };`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('app.js', code);
  console.log("Restored wa group functions!");
} else {
  console.log("Failed to find target");
}
