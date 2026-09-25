const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  await page.goto('https://faas-transfer.vercel.app/convert?tool=merge', { waitUntil: 'networkidle0' });
  
  await page.evaluate(async () => {
     return new Promise((resolve) => {
         const script = document.createElement('script');
         script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
         script.onload = () => {
             console.log("Script loaded");
             console.log("pdfjsLib exists:", !!window.pdfjsLib);
             console.log("pdfjs-dist/build/pdf exists:", !!window['pdfjs-dist/build/pdf']);
             resolve();
         };
         document.body.appendChild(script);
     });
  });
  
  await browser.close();
})();
