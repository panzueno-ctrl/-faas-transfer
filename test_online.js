const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  console.log("Navigating to https://faas-transfer.vercel.app/convert?tool=merge");
  await page.goto('https://faas-transfer.vercel.app/convert?tool=merge', { waitUntil: 'networkidle0' });
  const fileInput = await page.$('input[type=file]');
  if (fileInput) {
    console.log("Uploading test.pdf");
    await fileInput.uploadFile('/home/daven/faas-transfer/test.pdf');
  } else {
    console.log("No file input found");
  }
  await new Promise(r => setTimeout(r, 20000));
  await browser.close();
})();
