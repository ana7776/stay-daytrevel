// 글별 썸네일(1200×630)과 본문 동선 다이어그램을 생성한다.
// 실행: node scripts/generate-images.mjs
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BRAND = { deep: '#0f2e27', mid: '#1f5f4f', accent: '#7fd1b3', paper: '#f3f7f5', ink: '#16221f', muted: '#5c706a' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 한글은 폭이 넓고 라틴 문자는 좁아, 글자 종류별 가중치로 텍스트 폭을 어림한다.
const textWidth = (s, size) =>
	[...s].reduce((w, c) => w + (/[ᄀ-ᇿ가-힯　-〿]/.test(c) ? 1 : /[·\s]/.test(c) ? 0.4 : 0.55), 0) * size;

function wrap(text, size, maxWidth) {
	const lines = [];
	let line = '';
	for (const word of text.split(' ')) {
		const next = line ? `${line} ${word}` : word;
		if (textWidth(next, size) > maxWidth && line) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	return lines;
}

function thumbnail({ title, category, keyword }) {
	const size = title.length > 22 ? 60 : 68;
	const lines = wrap(title, size, 1000);
	const startY = 315 - ((lines.length - 1) * (size + 18)) / 2 + 10;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
	<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0%" stop-color="${BRAND.deep}"/><stop offset="100%" stop-color="${BRAND.mid}"/>
	</linearGradient></defs>
	<rect width="1200" height="630" fill="url(#bg)"/>
	<rect x="0" y="0" width="12" height="630" fill="${BRAND.accent}"/>
	<circle cx="1080" cy="128" r="180" fill="${BRAND.accent}" opacity="0.07"/>
	<circle cx="1150" cy="560" r="120" fill="${BRAND.accent}" opacity="0.05"/>
	<text x="90" y="126" font-size="30" fill="${BRAND.accent}" font-family="sans-serif" font-weight="700">${esc(category)}</text>
	${lines.map((l, i) => `<text x="90" y="${startY + i * (size + 18)}" font-size="${size}" fill="#ffffff" font-family="sans-serif" font-weight="700">${esc(l)}</text>`).join('\n\t')}
	<rect x="90" y="498" width="72" height="4" fill="${BRAND.accent}"/>
	<text x="90" y="552" font-size="30" fill="#cfe6dd" font-family="sans-serif">${esc(keyword)}</text>
	<text x="90" y="596" font-size="24" fill="#7f9c93" font-family="sans-serif">stay.daytrevel.com</text>
</svg>`;
}

function diagram({ heading, nodes, note, mode = 'flow' }) {
	const W = 1600, boxH = 108, gap = mode === 'flow' ? 56 : 32, size = 27;
	const widths = nodes.map((n) => Math.max(210, textWidth(n, size) + 56));
	const total = widths.reduce((a, b) => a + b, 0) + gap * (nodes.length - 1);
	const scale = total > W - 120 ? (W - 120) / total : 1;
	let x = (W - total * scale) / 2;
	const y = 176;
	const parts = [];
	nodes.forEach((n, i) => {
		const w = widths[i] * scale;
		const fs = Math.max(19, size * Math.min(1, scale + 0.08));
		const inner = wrap(n, fs, w - 32);
		const ty = y + boxH / 2 - ((inner.length - 1) * (fs + 6)) / 2 + fs / 3;
		parts.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${boxH}" rx="14" fill="#ffffff" stroke="${BRAND.mid}" stroke-width="2"/>`);
		inner.forEach((l, j) =>
			parts.push(`<text x="${(x + w / 2).toFixed(1)}" y="${(ty + j * (fs + 6)).toFixed(1)}" font-size="${fs.toFixed(0)}" fill="${BRAND.ink}" font-family="sans-serif" text-anchor="middle">${esc(l)}</text>`)
		);
		if (mode === 'flow' && i < nodes.length - 1) {
			const ax = x + w + 8, ae = x + w + gap * scale - 8, my = y + boxH / 2;
			parts.push(`<line x1="${ax.toFixed(1)}" y1="${my}" x2="${(ae - 10).toFixed(1)}" y2="${my}" stroke="${BRAND.mid}" stroke-width="3"/>`);
			parts.push(`<polygon points="${ae.toFixed(1)},${my} ${(ae - 14).toFixed(1)},${my - 8} ${(ae - 14).toFixed(1)},${my + 8}" fill="${BRAND.mid}"/>`);
		}
		x += w + gap * scale;
	});
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="440">
	<rect width="${W}" height="440" fill="${BRAND.paper}"/>
	<rect x="0" y="0" width="${W}" height="8" fill="${BRAND.accent}"/>
	<text x="60" y="98" font-size="38" fill="${BRAND.ink}" font-family="sans-serif" font-weight="700">${esc(heading)}</text>
	${parts.join('\n\t')}
	<text x="60" y="376" font-size="26" fill="${BRAND.muted}" font-family="sans-serif">${esc(note)}</text>
	<text x="${W - 60}" y="410" font-size="20" fill="#95a8a2" font-family="sans-serif" text-anchor="end">Stay Daytrevel</text>
</svg>`;
}

const ARTICLES = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./image-data.json', import.meta.url), 'utf8'));

await mkdir('public/images/thumb', { recursive: true });
await mkdir('public/images/route', { recursive: true });

for (const [slug, a] of Object.entries(ARTICLES)) {
	await sharp(Buffer.from(thumbnail(a))).png({ compressionLevel: 9 }).toFile(`public/images/thumb/${slug}.png`);
	await sharp(Buffer.from(diagram(a.diagram))).png({ compressionLevel: 9 }).toFile(`public/images/route/${slug}.png`);
	console.log(`생성: ${slug}`);
}
// 홈·목록 페이지가 og:image로 쓰는 기본 썸네일
await sharp(
	Buffer.from(
		thumbnail({
			category: 'Stay Daytrevel',
			title: '숙소 지역을 고르는 기준',
			keyword: '지역별 숙소 가이드와 여행 정보',
		})
	)
)
	.png({ compressionLevel: 9 })
	.toFile('public/images/thumb/site-default.png');
console.log('생성: site-default');

console.log(`총 ${Object.keys(ARTICLES).length * 2 + 1}개 이미지 생성 완료`);
