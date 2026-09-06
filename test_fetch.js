fetch("https://script.google.com/macros/s/AKfycbzNFz2FCseoi9W8G1jf3RC8suDw0OOOMCd7JTlTO3uYfXdhNUfv1-eytcwIYtmyO6gDsw/exec", {
  method: 'POST',
  body: JSON.stringify({ action: 'sync_read' }),
  headers: { 'Content-Type': 'text/plain;charset=utf-8' }
})
.then(r => r.text())
.then(t => {
  console.log("Response text length:", t.length);
  console.log("Response starts with:", t.substring(0, 100));
  try {
     console.log("Parsed JSON:", JSON.parse(t));
  } catch(e) {
     console.log("Not JSON!");
  }
})
.catch(e => console.log("Error:", e));
