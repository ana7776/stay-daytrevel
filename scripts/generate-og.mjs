/**
 * public/og-default.png (1200x630) 생성 스크립트.
 *
 * image 프론트매터가 없는 글의 og:image 대체 이미지로 쓴다.
 * Playwright가 설치해둔 Chromium을 CDP로 직접 몰아 정확히 1200x630으로 캡처하므로
 * 추가 의존성이 필요 없다. 실행: npm run og
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = Number(process.env.CDP_PORT ?? 9333);
const WIDTH = 1200;
const HEIGHT = 630;
const OUT = 'public/og-default.png';

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${WIDTH}px;height:${HEIGHT}px}
body{background:#fdf8f0;font-family:"WenQuanYi Zen Hei","Noto Sans KR",sans-serif;color:#2f2a24;
 display:flex;flex-direction:column;justify-content:center;padding:0 92px;position:relative;overflow:hidden}
.bar{position:absolute;top:0;left:0;right:0;height:12px;background:#8c5f2f}
h1{font-size:84px;letter-spacing:-1px;font-family:"DejaVu Sans",sans-serif;color:#8c5f2f}
p{font-size:38px;color:#5a4a38;margin-top:28px;line-height:1.5}
.url{position:absolute;bottom:60px;left:92px;font-size:28px;color:#8a7a68;font-family:"DejaVu Sans",sans-serif}
</style></head><body>
<div class="bar"></div>
<h1>Daytrevel Stay</h1>
<p>숙소 위치를 고르는 기준과<br>여행지 방문 정보를 정리합니다</p>
<div class="url">stay.daytrevel.com</div>
</body></html>`;

const work = mkdtempSync(path.join(tmpdir(), 'og-'));
const page = path.join(work, 'og.html');
writeFileSync(page, html);

const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // CDP 엔드포인트가 열릴 때까지 기다린다.
  let tab;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/new?file://${page}`, { method: 'PUT' });
      tab = await res.json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!tab) throw new Error('Chromium CDP에 연결하지 못했습니다.');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await new Promise((resolve) => (ws.onopen = resolve));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };

  // 뷰포트를 정확히 캔버스 크기로 맞춰 잘라낼 필요 없이 캡처한다.
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false
  });
  await send('Page.enable');
  await send('Page.navigate', { url: `file://${page}` });
  await sleep(1200);

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  ws.close();

  console.log(`${OUT} ${WIDTH}x${HEIGHT}`);
} finally {
  chrome.kill();
  rmSync(work, { recursive: true, force: true });
}
