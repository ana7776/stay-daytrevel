import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const dir = '/tmp/claude-0/-home-user-stay-daytrevel/54a8a59a-3e9a-5b61-9f17-3ea256786e82/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 760 } });
const bad = [];
await p.goto('http://localhost:4321/spots/gyeryongsan-gapsa-autumn/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => [...document.images].every((i) => i.complete));
await p.screenshot({ path: `${dir}/shot-date.png` });
await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const hrefs = await p.$$eval('a[href^="/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
for (const h of hrefs) {
	const r = await p.request.get('http://localhost:4321' + h);
	if (r.status() >= 400) bad.push(`${r.status()} ${h}`);
}
await b.close();
console.log('깨진 링크:', bad.length ? bad : '없음');
