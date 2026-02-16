const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Desktop homepage
  const page1 = await browser.newPage();
  await page1.setViewportSize({ width: 1440, height: 900 });
  await page1.goto('file:///data/.openclaw/workspace/WaermeWerke/index.html', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1000);
  await page1.screenshot({ path: '/tmp/ww_home_desktop.png', fullPage: true });
  console.log('✓ Desktop homepage screenshot saved');
  await page1.close();

  // Mobile homepage
  const page2 = await browser.newPage();
  await page2.setViewportSize({ width: 375, height: 812 });
  await page2.goto('file:///data/.openclaw/workspace/WaermeWerke/index.html', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1000);
  await page2.screenshot({ path: '/tmp/ww_home_mobile.png', fullPage: true });
  console.log('✓ Mobile homepage screenshot saved');
  await page2.close();

  // Rechner page
  const page3 = await browser.newPage();
  await page3.setViewportSize({ width: 1440, height: 900 });
  await page3.goto('file:///data/.openclaw/workspace/WaermeWerke/rechner.html', { waitUntil: 'networkidle' });
  await page3.waitForTimeout(1000);
  await page3.screenshot({ path: '/tmp/ww_rechner.png', fullPage: true });
  console.log('✓ Rechner page screenshot saved');
  await page3.close();

  // Produkte page
  const page4 = await browser.newPage();
  await page4.setViewportSize({ width: 1440, height: 900 });
  await page4.goto('file:///data/.openclaw/workspace/WaermeWerke/produkte.html', { waitUntil: 'networkidle' });
  await page4.waitForTimeout(1000);
  await page4.screenshot({ path: '/tmp/ww_produkte.png', fullPage: true });
  console.log('✓ Produkte page screenshot saved');
  await page4.close();

  await browser.close();
  console.log('✓ All screenshots completed!');
})();
