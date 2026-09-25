const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  console.log('Navigating...');
  await page.goto('http://localhost:8081/convert?tool=merge', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Uploading PDF');
  const fileInput = await page.$('input[type=file]');
  if (fileInput) await fileInput.uploadFile('/home/daven/faas-transfer/test.pdf');
  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
})();
