const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
      console.log('BROWSER LOG:', msg.text());
  });
  page.on('pageerror', err => {
      console.log('BROWSER ERROR:', err.message);
  });
  
  await page.goto('http://localhost:8081/convert', { waitUntil: 'networkidle0' });
  console.log("Navigated to localhost:8081/convert");
  
  // Wait for React to mount
  await new Promise(r => setTimeout(r, 2000));
  
  // Find the 'Fusionner' button (or we can just navigate to ?tool=merge)
  await page.goto('http://localhost:8081/convert?tool=merge', { waitUntil: 'networkidle0' });
  console.log("Navigated to ?tool=merge");
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to find the file input
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
      console.log("Found file input, uploading test.pdf");
      await fileInput.uploadFile('/home/daven/faas-transfer/test.pdf');
      console.log("File uploaded, waiting 10 seconds for logs...");
      await new Promise(r => setTimeout(r, 10000));
  } else {
      console.log("File input not found!");
  }
  
  await browser.close();
})();
