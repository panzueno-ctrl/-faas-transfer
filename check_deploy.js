const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://faas-transfer.vercel.app/convert', { waitUntil: 'networkidle0' });
  
  const content = await page.content();
  if (content.includes('existingIdx === -1')) {
      console.log('NEW CODE IS DEPLOYED!');
  } else {
      console.log('OLD CODE IS STILL DEPLOYED!');
  }
  
  await browser.close();
})();
