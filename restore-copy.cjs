const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const targetStr = `        const reCopySingleOrderPngToClipboard = async () => {
          const blobToCopy = orderSuccessData.previewBlob || orderSuccessData.compositePngBlob;
          if (!blobToCopy) {
            alert('No PNG image was generated for this order.');
            return;
          }
          const success = await writePngBlobToClipboard(blobToCopy);
          if (success) {
            orderSuccessData.hasCopiedPhotos = true;
            alert(\`✅ Image copied to clipboard!\\n\\nPress Ctrl+V (or Cmd+V) to paste in WhatsApp.\`);
          } else {
            alert('Clipboard write was blocked by browser permissions. Please ensure the tab is active.');
          }
        };`;

const replacement = `        const reCopySingleOrderPngToClipboard = async () => {
          const blobToCopy = orderSuccessData.previewBlob || orderSuccessData.compositePngBlob;
          if (!blobToCopy) {
            alert('No PNG image was generated for this order.');
            return;
          }
          const success = await writePngBlobToClipboard(blobToCopy);
          if (success) {
            orderSuccessData.hasCopiedPhotos = true;
            alert(\`✅ Image copied to clipboard!\\n\\nPress Ctrl+V (or Cmd+V) to paste in WhatsApp.\`);
          } else {
            alert('Clipboard write was blocked by browser permissions. Please ensure the tab is active.');
          }
        };

        const copyBulkManifestText = async () => {
          if (!bulkDispatchSuccessData.manifestText) return;
          try {
            await navigator.clipboard.writeText(bulkDispatchSuccessData.manifestText);
            bulkDispatchSuccessData.isCopiedText = true;
            setTimeout(() => { bulkDispatchSuccessData.isCopiedText = false; }, 3000);
          } catch (e) {
            console.warn('Bulk manifest copy warning:', e.message);
          }
        };
        
        const copyBulkDispatchWhatsAppText = copyBulkManifestText; // alias

        const reCopyBulkPngToClipboard = async () => {
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

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('app.js', code);
  console.log("Restored lost functions!");
} else {
  console.log("Failed to find target");
}
