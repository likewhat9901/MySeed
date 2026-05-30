const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });

  // 로그인
  await p.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 20000 });
  await p.fill('input[type="email"]', 'parkkochen@gmail.com');
  await p.fill('input[type="password"]', process.env.TEST_PW || '');
  await p.click('button:has-text("Sign In")');
  await p.waitForTimeout(3000);

  // 현황 페이지
  await p.goto('http://localhost:3000/ledger/overview', { waitUntil: 'networkidle', timeout: 20000 });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'C:/tmp/overview.png' });

  // 내역 페이지
  await p.goto('http://localhost:3000/ledger/records', { waitUntil: 'networkidle', timeout: 20000 });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: 'C:/tmp/records.png' });

  await b.close();
  console.log('done');
})();
