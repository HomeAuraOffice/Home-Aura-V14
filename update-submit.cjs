const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const replacement = `
          orderSuccessData.order = newOrder;
          orderSuccessData.hasCopiedPhotos = false;
          orderSuccessData.compositePngUrl = "";
          orderSuccessData.previewPngUrl = "";
          orderSuccessData.compositePngBlob = null;
          orderSuccessData.waGroupLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          orderSuccessData.formattedSummary = waText;
          orderSuccessData.isCopiedText = false;
          activeModal.value = 'orderSuccessModal';
          
          // Generate composite PNG and copy to clipboard immediately
          setTimeout(async () => {
            try {
              const compositeData = await generateOrdersCompositePng([newOrder], 'HOMEAURA NEW ORDER REGISTRATION');
              if (compositeData && compositeData.blob) {
                orderSuccessData.compositePngBlob = compositeData.blob;
                orderSuccessData.previewPngUrl = compositeData.dataUrl;
                
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': compositeData.blob })
                ]);
                orderSuccessData.hasCopiedPhotos = true;
              }
            } catch (e) {
              console.warn('Failed to auto-generate and copy order PNG:', e);
            }
          }, 50);

          // Attempt pop-up opening if configured
`;

code = code.replace(`
          orderSuccessData.order = newOrder;
          orderSuccessData.hasCopiedPhotos = false;
          orderSuccessData.compositePngUrl = "";
          orderSuccessData.previewPngUrl = "";
          orderSuccessData.compositePngBlob = null;
          orderSuccessData.waGroupLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          orderSuccessData.formattedSummary = waText;
          orderSuccessData.isCopiedText = false;
          activeModal.value = 'orderSuccessModal';

          // Attempt pop-up opening if configured`, replacement);

fs.writeFileSync('app.js', code);
