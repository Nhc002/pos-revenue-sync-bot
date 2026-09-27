const puppeteer = require('puppeteer');
const config = require('../config');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== DEBUG LOGIN PAGE ===');
  console.log('Login URL:', config.pos.loginUrl);
  console.log('Username:', config.pos.username ? config.pos.username.substring(0, 5) + '***' : 'MISSING');
  console.log('Password:', config.pos.password ? '***SET***' : 'MISSING');
  console.log();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto(config.pos.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // Screenshot
    const screenshotPath = path.join(__dirname, '..', 'logs', 'debug-login-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('   Screenshot saved:', screenshotPath);

    // Check current URL
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // Test all configured selectors
    console.log('\n2. Testing configured selectors:');
    const selectors = config.pos.selectors;
    
    for (const [name, selectorStr] of Object.entries(selectors)) {
      const parts = selectorStr.split(',').map(s => s.trim()).filter(Boolean);
      let found = false;
      for (const part of parts) {
        try {
          const info = await page.$eval(part, el => ({
            tag: el.tagName,
            type: el.type || '',
            id: el.id || '',
            name: el.name || '',
            placeholder: el.placeholder || '',
            visible: el.offsetParent !== null,
            value: el.value || ''
          }));
          console.log(`   ✅ ${name} [${part}]: <${info.tag}> type=${info.type} id=${info.id} name=${info.name} visible=${info.visible}`);
          found = true;
        } catch (e) {
          console.log(`   ❌ ${name} [${part}]: NOT FOUND`);
        }
      }
    }

    // List all input elements on the page
    console.log('\n3. All <input> elements on page:');
    const inputs = await page.$$eval('input', els => els.map(el => ({
      tag: el.tagName,
      type: el.type || '',
      id: el.id || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
      className: el.className || '',
      visible: el.offsetParent !== null
    })));
    
    if (inputs.length === 0) {
      console.log('   ⚠️ NO INPUT ELEMENTS FOUND ON PAGE!');
    } else {
      inputs.forEach((inp, i) => {
        console.log(`   [${i}] <input type="${inp.type}" id="${inp.id}" name="${inp.name}" placeholder="${inp.placeholder}" class="${inp.className}" visible=${inp.visible}>`);
      });
    }

    // List all buttons
    console.log('\n4. All <button> elements on page:');
    const buttons = await page.$$eval('button', els => els.map(el => ({
      type: el.type || '',
      text: el.innerText.trim().substring(0, 50),
      className: el.className || '',
      visible: el.offsetParent !== null
    })));
    
    if (buttons.length === 0) {
      console.log('   ⚠️ NO BUTTON ELEMENTS FOUND ON PAGE!');
    } else {
      buttons.forEach((btn, i) => {
        console.log(`   [${i}] <button type="${btn.type}" text="${btn.text}" class="${btn.className}" visible=${btn.visible}>`);
      });
    }

    // Check if it's a SPA that needs more time
    console.log('\n5. Page title:', await page.title());
    
    // Check if already logged in (redirected)
    if (currentUrl !== config.pos.loginUrl && !currentUrl.includes('login')) {
      console.log('   ⚠️ Page redirected away from login - might already be logged in!');
    }

    console.log('\n=== DEBUG COMPLETE ===');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
