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
         script.onload = async () => {
             console.log("Script loaded");
             const pdfjsLib = window.pdfjsLib;
             
             try {
                 const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
                 const text = await res.text();
                 const blob = new Blob([text], { type: 'text/javascript' });
                 pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
                 console.log("Blob workerSrc set");
             } catch(e) {
                 console.log("Blob failed", e);
             }

             // Test getDocument
             try {
                 // 1-page blank PDF bytes
                 const pdfBytes = new Uint8Array([37,80,68,70,45,49,46,55,10,37,226,227,207,211,10,49,32,48,32,111,98,106,10,60,60,47,84,121,112,101,47,67,97,116,97,108,111,103,47,80,97,103,101,115,32,50,32,48,32,82,62,62,10,101,110,100,111,98,106,10,50,32,48,32,111,98,106,10,60,60,47,84,121,112,101,47,80,97,103,101,115,47,67,111,117,110,116,32,49,47,75,105,100,115,91,51,32,48,32,82,93,62,62,10,101,110,100,111,98,106,10,51,32,48,32,111,98,106,10,60,60,47,84,121,112,101,47,80,97,103,101,47,77,101,100,105,97,66,111,120,91,48,32,48,32,54,49,50,32,55,57,50,93,47,80,97,114,101,110,116,32,50,32,48,32,82,62,62,10,101,110,100,111,98,106,10,120,114,101,102,10,48,32,52,10,48,48,48,48,48,48,48,48,48,48,32,65,116,10,48,48,48,48,48,48,48,48,49,53,32,48,48,48,48,48,32,110,10,48,48,48,48,48,48,48,48,54,56,32,48,48,48,48,48,32,110,10,48,48,48,48,48,48,48,49,50,53,32,48,48,48,48,48,32,110,10,116,114,97,105,108,101,114,10,60,60,47,83,105,122,101,32,52,47,82,111,111,116,32,49,32,48,32,82,62,62,10,115,116,97,114,116,120,114,101,102,10,50,48,49,10,37,37,69,79,70,10]);
                 console.log("Calling getDocument...");
                 const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
                 const pdf = await loadingTask.promise;
                 console.log("getDocument SUCCEEDED:", pdf.numPages);
             } catch(err) {
                 console.log("getDocument FAILED:", err.message);
             }
             resolve();
         };
         document.body.appendChild(script);
     });
  });
  
  await browser.close();
})();
