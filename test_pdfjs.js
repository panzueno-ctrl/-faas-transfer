const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  await page.goto('https://faas-transfer.vercel.app/convert?tool=merge', { waitUntil: 'networkidle0' });
  
  await page.evaluate(async () => {
     console.log("Checking pdfjsLib:", typeof window.pdfjsLib);
     try {
         const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
         if (!res.ok) {
             console.log("Fetch failed", res.status);
         } else {
             const text = await res.text();
             const blob = new Blob([text], { type: 'text/javascript' });
             console.log("Blob created successfully, length:", text.length);
             const url = URL.createObjectURL(blob);
             console.log("Blob URL:", url);
         }
     } catch (e) {
         console.log("Fetch Error:", e.message);
     }
  });
  
  await browser.close();
})();
