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
  
  await page.goto('http://localhost:8081/convert?tool=merge', { waitUntil: 'networkidle0' });
  console.log("Navigated to ?tool=merge");
  
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="file"]');
      inputs.forEach(input => {
          input.style.display = 'block';
          input.style.opacity = '1';
          input.style.visibility = 'visible';
          input.style.width = '100px';
          input.style.height = '100px';
      });
  });
  
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
      console.log("Found file input, uploading test.pdf");
      await fileInput.uploadFile('/home/daven/faas-transfer/test.pdf');
      console.log("File uploaded, waiting 15 seconds for logs...");
      await new Promise(r => setTimeout(r, 15000));
  } else {
      console.log("File input still not found!");
  }
  
  await browser.close();
})();
