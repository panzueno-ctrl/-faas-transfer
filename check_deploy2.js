const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const jsContents = [];
  page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js')) {
          try {
              const text = await response.text();
              jsContents.push({ url, text });
          } catch(e) {}
      }
  });

  await page.goto('https://faas-transfer.vercel.app/convert', { waitUntil: 'networkidle0' });
  
  let foundOld = false;
  let foundNew = false;
  
  for (const js of jsContents) {
      if (js.text.includes('.findIndex') && js.text.includes('imageUri!==')) {
          foundNew = true;
          console.log("FOUND NEW LOGIC IN:", js.url);
      }
      if (js.text.includes('.find(') && js.text.includes('!')) {
          // This is too generic, let's look for specific keys like 'fileIndex'
          if (js.text.includes('fileIndex') && js.text.includes('imageUri')) {
              // We can print a snippet
              const idx = js.text.indexOf('imageUri');
              console.log("Found imageUri in:", js.url, "snippet:", js.text.substring(idx - 100, idx + 100));
          }
      }
  }
  
  await browser.close();
})();
