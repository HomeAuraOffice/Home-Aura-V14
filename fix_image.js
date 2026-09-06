const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

app = app.replace(
`        const fetchImageAsBlob = async (url) => {
          if (!url) return null;
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Fetch failed");
            return await res.blob();
          } catch (e) {`,
`        const fetchImageAsBlob = async (url) => {
          if (!url) return null;
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Fetch failed");
            let blob = await res.blob();
            if (blob.type !== 'image/png') {
              blob = await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob(resolve, "image/png");
                };
                img.onerror = () => resolve(blob);
                img.src = URL.createObjectURL(blob);
              });
            }
            return blob;
          } catch (e) {`
);

fs.writeFileSync('app.js', app);
console.log('Fixed fetchImageAsBlob');
