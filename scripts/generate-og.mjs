/**
 * Regenerates public/og-default.png (1200x630) from an inline HTML template.
 *
 * Rendered with the Chromium that ships with Playwright and cropped with sharp
 * (both already present via Astro's toolchain). Run with `npm run og`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const CHROME =
	process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const WIDTH = 1200;
const HEIGHT = 630;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff}
.card{width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(135deg,#0f2f3d 0%,#1d5c6b 100%);
 font-family:"WenQuanYi Zen Hei","Noto Sans KR",sans-serif;color:#fff;
 display:flex;flex-direction:column;justify-content:center;padding:0 90px;position:relative;overflow:hidden}
.bar{position:absolute;top:0;left:0;right:0;height:10px;background:#5ec6c0}
h1{font-size:88px;letter-spacing:-1px;font-family:"DejaVu Sans",sans-serif}
p{font-size:40px;color:#bfe6e3;margin-top:26px;line-height:1.45}
.url{position:absolute;bottom:64px;left:90px;font-size:30px;color:#8fc7c9;font-family:"DejaVu Sans",sans-serif}
</style></head><body>
<div class="card">
<div class="bar"></div>
<h1>Stay Daytrevel</h1>
<p>숙소 지역을 고르는 기준과 이동 동선을<br>정리한 여행 정보 가이드</p>
<div class="url">stay.daytrevel.com</div>
</div>
</body></html>`;

const work = mkdtempSync(path.join(tmpdir(), 'og-'));
try {
	const page = path.join(work, 'og.html');
	const shot = path.join(work, 'og.png');
	writeFileSync(page, html);

	// The headless window is taller than the card so the card is never clipped;
	// the extra whitespace is cropped off below.
	execFileSync(CHROME, [
		'--headless',
		'--no-sandbox',
		'--disable-gpu',
		'--hide-scrollbars',
		`--window-size=${WIDTH},${HEIGHT + 270}`,
		`--screenshot=${shot}`,
		`file://${page}`,
	], { cwd: work, stdio: 'ignore' });

	const out = await sharp(shot)
		.extract({ left: 0, top: 0, width: WIDTH, height: HEIGHT })
		.png({ compressionLevel: 9 })
		.toFile('public/og-default.png');

	console.log(`public/og-default.png ${out.width}x${out.height} (${out.size} bytes)`);
} finally {
	rmSync(work, { recursive: true, force: true });
}
