/**
 * 글별 커버/본문 일러스트 생성기.
 * 실제 사진이 준비되면 같은 경로에 이미지를 덮어쓰거나
 * 프런트매터의 heroImage / bodyImage 경로만 교체하면 된다.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const OUT_SVG = 'public/images';
const OUT_OG = 'public/images/og';

/* 결정적 난수: 같은 슬러그는 항상 같은 그림을 만든다 */
function seeded(slug) {
	let h = 2166136261;
	for (const ch of slug) {
		h ^= ch.charCodeAt(0);
		h = Math.imul(h, 16777619);
	}
	return () => {
		h += 0x6d2b79f5;
		let t = h;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* 가을 팔레트 */
const PALETTES = {
	maple: { sky: ['#fdf2e3', '#f7d9b4'], far: '#c9714a', mid: '#a8452f', near: '#7a2c22', accent: '#e08a3c', water: '#c98a63' },
	ginkgo: { sky: ['#fdf8e4', '#f6e3a8'], far: '#e0b53d', mid: '#c48f22', near: '#8f6516', accent: '#f2cf5e', water: '#d8bd6a' },
	ember: { sky: ['#fcefe0', '#f2c79b'], far: '#d1793c', mid: '#b04b26', near: '#6f2a1c', accent: '#efa15a', water: '#c07a52' },
	moss: { sky: ['#f3f4e6', '#d9dfb8'], far: '#8f9c5c', mid: '#5f7040', near: '#39482c', accent: '#b8c274', water: '#7d8f68' },
	dusk: { sky: ['#f6e7e0', '#d9a98f'], far: '#a4674f', mid: '#6f4136', near: '#3f2725', accent: '#d0876a', water: '#8d5f52' },
	mist: { sky: ['#eef2f2', '#cfd9d6'], far: '#9aa8a2', mid: '#6f817b', near: '#44534f', accent: '#c2a878', water: '#aebab5' },
	slate: { sky: ['#eef1f5', '#c9d2dc'], far: '#8d9aa8', mid: '#5f6b78', near: '#39424c', accent: '#c98a4b', water: '#9aa7b4' },
	reed: { sky: ['#f7f3e6', '#e2d7b6'], far: '#b9a672', mid: '#8d7c4c', near: '#5a4f30', accent: '#d8c88c', water: '#a99f78' },
	amber: { sky: ['#fdf4e0', '#f4d193'], far: '#d9a04a', mid: '#b3762b', near: '#7d4e1a', accent: '#eec06a', water: '#c99a5c' },
	plum: { sky: ['#f8eef0', '#d9b0bb'], far: '#b07686', mid: '#7d4a5c', near: '#472936', accent: '#d1929f', water: '#966775' },
};

const R = (n) => Math.round(n * 100) / 100;

/* ── 지형 생성기 ───────────────────────────── */

function ridgePath(rand, { w, h, base, amp, peaks }) {
	const pts = [];
	const step = w / peaks;
	for (let i = 0; i <= peaks; i++) {
		pts.push([R(i * step), R(base - amp * (0.35 + rand() * 0.65))]);
	}
	let d = `M0,${h} L0,${pts[0][1]}`;
	for (let i = 1; i < pts.length; i++) {
		const [px, py] = pts[i - 1];
		const [cx, cy] = pts[i];
		d += ` C${R(px + step * 0.4)},${py} ${R(cx - step * 0.4)},${cy} ${cx},${cy}`;
	}
	return `${d} L${w},${h} Z`;
}

function wavePath(rand, { w, h, base, amp, waves }) {
	let d = `M0,${h} L0,${R(base)}`;
	const step = w / waves;
	for (let i = 1; i <= waves; i++) {
		const x = R(i * step);
		const dir = i % 2 ? -1 : 1;
		d += ` Q${R(x - step / 2)},${R(base + dir * amp * (0.6 + rand() * 0.8))} ${x},${R(base)}`;
	}
	return `${d} L${w},${h} Z`;
}

function tree(x, groundY, scale, trunk, canopy, rand) {
	const th = 90 * scale;
	const tw = 9 * scale;
	const cr = 46 * scale;
	const cy = groundY - th - cr * 0.5;
	let s = `<rect x="${R(x - tw / 2)}" y="${R(groundY - th)}" width="${R(tw)}" height="${R(th)}" fill="${trunk}" rx="${R(tw / 3)}"/>`;
	for (let i = 0; i < 3; i++) {
		const ox = (rand() - 0.5) * cr * 0.8;
		const oy = (rand() - 0.5) * cr * 0.6;
		s += `<circle cx="${R(x + ox)}" cy="${R(cy + oy)}" r="${R(cr * (0.6 + rand() * 0.45))}" fill="${canopy}" opacity="0.92"/>`;
	}
	return s;
}

function stalks(rand, { w, groundY, count, height, color, opacity }) {
	let s = '';
	for (let i = 0; i < count; i++) {
		const x = R(rand() * w);
		const hgt = height * (0.55 + rand() * 0.75);
		const lean = (rand() - 0.5) * 26;
		s += `<path d="M${x},${R(groundY)} Q${R(x + lean / 2)},${R(groundY - hgt / 2)} ${R(x + lean)},${R(groundY - hgt)}" stroke="${color}" stroke-width="${R(1.4 + rand() * 1.6)}" fill="none" opacity="${opacity}" stroke-linecap="round"/>`;
		s += `<ellipse cx="${R(x + lean)}" cy="${R(groundY - hgt)}" rx="${R(2 + rand() * 2)}" ry="${R(5 + rand() * 4)}" fill="${color}" opacity="${opacity}" transform="rotate(${R(lean)} ${R(x + lean)} ${R(groundY - hgt)})"/>`;
	}
	return s;
}

function fallingLeaves(rand, { w, h, count, color }) {
	let s = '';
	for (let i = 0; i < count; i++) {
		const x = R(rand() * w);
		const y = R(rand() * h * 0.72);
		const r = R(3 + rand() * 5);
		s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${R(r * 0.6)}" fill="${color}" opacity="${R(0.25 + rand() * 0.4)}" transform="rotate(${R(rand() * 180)} ${x} ${y})"/>`;
	}
	return s;
}

/* ── 모티프별 장면 ─────────────────────────── */

const MOTIFS = {
	ridge(rand, p, w, h) {
		const horizon = h * 0.78;
		return [
			`<path d="${ridgePath(rand, { w, h, base: horizon * 0.72, amp: h * 0.3, peaks: 4 })}" fill="${p.far}" opacity="0.55"/>`,
			`<path d="${ridgePath(rand, { w, h, base: horizon * 0.9, amp: h * 0.26, peaks: 5 })}" fill="${p.mid}" opacity="0.8"/>`,
			`<path d="${ridgePath(rand, { w, h, base: horizon * 1.08, amp: h * 0.2, peaks: 6 })}" fill="${p.near}"/>`,
			fallingLeaves(rand, { w, h, count: 16, color: p.accent }),
		].join('');
	},

	lake(rand, p, w, h) {
		const horizon = R(h * 0.58);
		let s = `<path d="${ridgePath(rand, { w, h: horizon, base: horizon * 0.62, amp: h * 0.24, peaks: 4 })}" fill="${p.far}" opacity="0.6"/>`;
		s += `<path d="${ridgePath(rand, { w, h: horizon, base: horizon * 0.86, amp: h * 0.16, peaks: 6 })}" fill="${p.mid}" opacity="0.85"/>`;
		for (let i = 0; i < 5; i++) s += tree(R(w * (0.06 + i * 0.21 + rand() * 0.05)), horizon, 0.85 + rand() * 0.4, p.near, p.accent, rand);
		s += `<rect x="0" y="${horizon}" width="${w}" height="${R(h - horizon)}" fill="${p.water}"/>`;
		s += `<g opacity="0.3" transform="translate(0,${R(horizon * 2)}) scale(1,-1)">`;
		s += `<path d="${ridgePath(rand, { w, h: horizon, base: horizon * 0.88, amp: h * 0.13, peaks: 6 })}" fill="${p.mid}"/></g>`;
		for (let i = 0; i < 12; i++) {
			const y = R(horizon + 14 + rand() * (h - horizon - 20));
			const lw = R(60 + rand() * 220);
			s += `<rect x="${R(rand() * (w - lw))}" y="${y}" width="${lw}" height="2.5" rx="1.2" fill="#ffffff" opacity="${R(0.18 + rand() * 0.24)}"/>`;
		}
		return s;
	},

	stream(rand, p, w, h) {
		const horizon = R(h * 0.42);
		let s = `<rect x="0" y="${horizon}" width="${w}" height="${R(h - horizon)}" fill="${p.mid}" opacity="0.35"/>`;
		s += `<path d="M${R(w * 0.34)},${horizon} C${R(w * 0.3)},${R(h * 0.6)} ${R(w * 0.62)},${R(h * 0.72)} ${R(w * 0.46)},${h} L${R(w * 0.86)},${h} C${R(w * 0.82)},${R(h * 0.7)} ${R(w * 0.58)},${R(h * 0.6)} ${R(w * 0.56)},${horizon} Z" fill="${p.water}"/>`;
		for (let i = 0; i < 9; i++) {
			const t = rand();
			const y = R(horizon + t * (h - horizon));
			const cx = R(w * (0.45 + Math.sin(t * 3) * 0.06));
			const lw = R(30 + rand() * 90);
			s += `<rect x="${R(cx - lw / 2)}" y="${y}" width="${lw}" height="2.5" rx="1.2" fill="#ffffff" opacity="${R(0.2 + rand() * 0.25)}"/>`;
		}
		const bx = R(w * 0.3);
		const bw2 = R(w * 0.3);
		s += `<rect x="${bx}" y="${R(horizon + 26)}" width="${bw2}" height="11" rx="4" fill="${p.near}" opacity="0.95"/>`;
		for (let i = 0; i <= 3; i++) {
			s += `<rect x="${R(bx + (bw2 * i) / 3 - 4)}" y="${R(horizon + 36)}" width="8" height="34" fill="${p.near}" opacity="0.8"/>`;
		}
		for (let i = 0; i < 4; i++) s += tree(R(w * (0.05 + i * 0.07)), R(horizon + 30 + i * 34), 0.7 + rand() * 0.3, p.near, p.far, rand);
		for (let i = 0; i < 4; i++) s += tree(R(w * (0.95 - i * 0.07)), R(horizon + 30 + i * 34), 0.7 + rand() * 0.3, p.near, p.accent, rand);
		return s;
	},

	trail(rand, p, w, h) {
		const vpX = R(w * (0.44 + rand() * 0.12));
		const vpY = R(h * 0.42);
		let s = `<rect x="0" y="${vpY}" width="${w}" height="${R(h - vpY)}" fill="${p.near}" opacity="0.55"/>`;
		s += `<path d="M${vpX},${vpY} C${R(vpX - w * 0.05)},${R(vpY + (h - vpY) * 0.5)} ${R(w * 0.24)},${R(h * 0.86)} ${R(w * 0.16)},${h} L${R(w * 0.88)},${h} C${R(w * 0.8)},${R(h * 0.86)} ${R(vpX + w * 0.05)},${R(vpY + (h - vpY) * 0.5)} ${vpX},${vpY} Z" fill="${p.sky[1]}" opacity="0.95"/>`;
		const rows = 7;
		for (let i = 0; i < rows; i++) {
			const depth = i / rows;
			const y = R(vpY + (h - vpY) * (0.16 + depth * 0.9));
			const scale = 0.32 + depth * 1.25;
			s += tree(R(vpX - (60 + depth * w * 0.42)), y, scale, p.near, p.far, rand);
			s += tree(R(vpX + (60 + depth * w * 0.42)), y, scale, p.near, p.accent, rand);
		}
		s += fallingLeaves(rand, { w, h, count: 22, color: p.accent });
		return s;
	},

	ginkgo(rand, p, w, h) {
		const groundY = R(h * 0.86);
		let s = `<rect x="0" y="${R(h * 0.5)}" width="${w}" height="${R(h * 0.5)}" fill="${p.mid}" opacity="0.28"/>`;
		s += `<rect x="0" y="${groundY}" width="${w}" height="${R(h - groundY)}" fill="${p.accent}" opacity="0.5"/>`;
		const n = 6;
		for (let i = 0; i < n; i++) {
			const x = R(w * (0.08 + (i * 0.84) / (n - 1)));
			const scale = 1.15 + rand() * 0.35;
			s += `<rect x="${R(x - 8 * scale)}" y="${R(groundY - 150 * scale)}" width="${R(16 * scale)}" height="${R(150 * scale)}" fill="${p.near}" rx="5"/>`;
			for (let k = 0; k < 4; k++) {
				s += `<circle cx="${R(x + (rand() - 0.5) * 70)}" cy="${R(groundY - 150 * scale - 10 + (rand() - 0.5) * 70)}" r="${R(40 + rand() * 34)}" fill="${k % 2 ? p.far : p.accent}" opacity="0.9"/>`;
			}
		}
		s += fallingLeaves(rand, { w, h, count: 26, color: p.accent });
		return s;
	},

	silvergrass(rand, p, w, h) {
		const groundY = R(h * 0.88);
		let s = `<path d="${ridgePath(rand, { w, h: groundY, base: h * 0.5, amp: h * 0.16, peaks: 4 })}" fill="${p.far}" opacity="0.5"/>`;
		s += `<rect x="0" y="${R(h * 0.62)}" width="${w}" height="${R(h - h * 0.62)}" fill="${p.mid}" opacity="0.4"/>`;
		s += stalks(rand, { w, groundY: R(h * 0.72), count: 90, height: h * 0.2, color: p.far, opacity: 0.6 });
		s += stalks(rand, { w, groundY, count: 130, height: h * 0.34, color: p.accent, opacity: 0.95 });
		s += stalks(rand, { w, groundY: h, count: 90, height: h * 0.44, color: p.near, opacity: 0.9 });
		return s;
	},

	wetland(rand, p, w, h) {
		const waterY = R(h * 0.56);
		let s = `<path d="${ridgePath(rand, { w, h: waterY, base: waterY * 0.7, amp: h * 0.14, peaks: 5 })}" fill="${p.far}" opacity="0.45"/>`;
		s += `<rect x="0" y="${waterY}" width="${w}" height="${R(h - waterY)}" fill="${p.water}" opacity="0.85"/>`;
		for (let i = 0; i < 10; i++) {
			const y = R(waterY + 12 + rand() * (h - waterY - 18));
			const lw = R(50 + rand() * 200);
			s += `<rect x="${R(rand() * (w - lw))}" y="${y}" width="${lw}" height="2.5" rx="1.2" fill="#ffffff" opacity="${R(0.16 + rand() * 0.22)}"/>`;
		}
		s += stalks(rand, { w, groundY: R(waterY + 8), count: 60, height: h * 0.26, color: p.mid, opacity: 0.7 });
		s += stalks(rand, { w, groundY: h, count: 80, height: h * 0.38, color: p.near, opacity: 0.85 });
		return s;
	},

	fortress(rand, p, w, h) {
		const baseY = R(h * 0.72);
		let s = `<path d="${ridgePath(rand, { w, h, base: h * 0.5, amp: h * 0.2, peaks: 4 })}" fill="${p.far}" opacity="0.45"/>`;
		const seg = w / 14;
		const wallY = (i) => R(baseY + Math.sin(i * 0.55) * 30);
		const band = 54;
		let top = `M0,${wallY(0)}`;
		for (let i = 1; i <= 14; i++) top += ` L${R(i * seg)},${wallY(i)}`;
		let ground = `M0,${R(wallY(0) + band)}`;
		for (let i = 1; i <= 14; i++) ground += ` L${R(i * seg)},${R(wallY(i) + band)}`;
		s += `<path d="${ground} L${w},${h} L0,${h} Z" fill="${p.near}" opacity="0.85"/>`;
		s += `<path d="${top} L${w},${R(wallY(14) + band)} ${ground.replace('M', 'L').split(' ').reverse().join(' ')} Z" fill="${p.mid}"/>`;
		for (let i = 0; i <= 14; i++) {
			const x = R(i * seg);
			s += `<rect x="${R(x - seg * 0.2)}" y="${R(wallY(i) - 20)}" width="${R(seg * 0.4)}" height="22" fill="${p.mid}" rx="2"/>`;
		}
		s += `<path d="${top}" stroke="${p.near}" stroke-width="4" fill="none" opacity="0.55"/>`;
		for (let i = 0; i < 5; i++) s += tree(R(w * (0.08 + i * 0.22 + rand() * 0.04)), R(h * 0.98), 0.9 + rand() * 0.5, p.near, p.accent, rand);
		s += fallingLeaves(rand, { w, h, count: 14, color: p.accent });
		return s;
	},

	cityPark(rand, p, w, h) {
		const groundY = R(h * 0.82);
		let s = '';
		for (let i = 0; i < 9; i++) {
			const bw = R(w * (0.05 + rand() * 0.06));
			const bh = R(h * (0.14 + rand() * 0.3));
			s += `<rect x="${R((i * w) / 9 + rand() * 20)}" y="${R(groundY - bh)}" width="${bw}" height="${bh}" fill="${p.far}" opacity="0.4" rx="3"/>`;
		}
		s += `<rect x="0" y="${groundY}" width="${w}" height="${R(h - groundY)}" fill="${p.mid}" opacity="0.5"/>`;
		for (let i = 0; i < 6; i++) s += tree(R(w * (0.08 + i * 0.17 + rand() * 0.03)), R(groundY + 12 + rand() * 30), 1 + rand() * 0.5, p.near, i % 2 ? p.accent : p.far, rand);
		s += fallingLeaves(rand, { w, h, count: 18, color: p.accent });
		return s;
	},

	railway(rand, p, w, h) {
		const vpX = R(w * 0.5);
		const vpY = R(h * 0.44);
		let s = `<rect x="0" y="${vpY}" width="${w}" height="${R(h - vpY)}" fill="${p.mid}" opacity="0.3"/>`;
		s += `<path d="M${vpX},${vpY} L${R(w * 0.2)},${h} L${R(w * 0.8)},${h} Z" fill="${p.water}" opacity="0.7"/>`;
		for (let i = 1; i <= 9; i++) {
			const t = i / 9;
			const y = R(vpY + (h - vpY) * t * t);
			const halfW = R((w * 0.3) * t * t + 6);
			s += `<rect x="${R(vpX - halfW)}" y="${y}" width="${R(halfW * 2)}" height="${R(2 + t * 6)}" fill="${p.near}" opacity="0.55" rx="2"/>`;
		}
		s += `<path d="M${vpX},${vpY} L${R(w * 0.36)},${h}" stroke="${p.near}" stroke-width="5" fill="none" opacity="0.8"/>`;
		s += `<path d="M${vpX},${vpY} L${R(w * 0.64)},${h}" stroke="${p.near}" stroke-width="5" fill="none" opacity="0.8"/>`;
		for (let i = 0; i < 5; i++) {
			const depth = i / 5;
			s += tree(R(vpX - (70 + depth * w * 0.4)), R(vpY + (h - vpY) * (0.2 + depth * 0.85)), 0.4 + depth * 1.1, p.near, p.far, rand);
			s += tree(R(vpX + (70 + depth * w * 0.4)), R(vpY + (h - vpY) * (0.2 + depth * 0.85)), 0.4 + depth * 1.1, p.near, p.accent, rand);
		}
		return s;
	},

	structure(rand, p, w, h) {
		const groundY = R(h * 0.84);
		let s = `<rect x="0" y="${R(h * 0.55)}" width="${w}" height="${R(h * 0.45)}" fill="${p.mid}" opacity="0.25"/>`;
		for (let i = 0; i < 5; i++) {
			const x = R(w * (0.08 + i * 0.2));
			const ch = R(h * (0.26 + rand() * 0.22));
			s += `<rect x="${x}" y="${R(groundY - ch)}" width="${R(w * 0.1)}" height="${ch}" fill="${p.far}" opacity="0.75" rx="3"/>`;
			for (let k = 0; k < 5; k++) {
				s += `<circle cx="${R(x + rand() * w * 0.1)}" cy="${R(groundY - ch + rand() * ch)}" r="${R(10 + rand() * 16)}" fill="${p.accent}" opacity="0.5"/>`;
			}
		}
		s += `<rect x="0" y="${groundY}" width="${w}" height="${R(h - groundY)}" fill="${p.near}" opacity="0.5"/>`;
		s += fallingLeaves(rand, { w, h, count: 16, color: p.accent });
		return s;
	},

	glasshouse(rand, p, w, h) {
		const groundY = R(h * 0.84);
		const cx = R(w * 0.5);
		const bw = R(w * 0.36);
		const bh = R(h * 0.4);
		let s = `<rect x="0" y="${R(h * 0.6)}" width="${w}" height="${R(h * 0.4)}" fill="${p.mid}" opacity="0.25"/>`;
		s += `<path d="M${R(cx - bw / 2)},${groundY} L${R(cx - bw / 2)},${R(groundY - bh * 0.5)} Q${cx},${R(groundY - bh * 1.35)} ${R(cx + bw / 2)},${R(groundY - bh * 0.5)} L${R(cx + bw / 2)},${groundY} Z" fill="${p.water}" opacity="0.6" stroke="${p.near}" stroke-width="4"/>`;
		for (let i = 1; i < 6; i++) {
			const x = R(cx - bw / 2 + (bw * i) / 6);
			s += `<line x1="${x}" y1="${groundY}" x2="${x}" y2="${R(groundY - bh * (0.5 + 0.55 * Math.sin((i / 6) * Math.PI)))}" stroke="${p.near}" stroke-width="2.5" opacity="0.8"/>`;
		}
		s += `<rect x="0" y="${groundY}" width="${w}" height="${R(h - groundY)}" fill="${p.near}" opacity="0.45"/>`;
		for (let i = 0; i < 4; i++) s += tree(R(w * (0.08 + i * 0.06)), R(groundY + 8), 0.8 + rand() * 0.3, p.near, p.accent, rand);
		for (let i = 0; i < 4; i++) s += tree(R(w * (0.92 - i * 0.06)), R(groundY + 8), 0.8 + rand() * 0.3, p.near, p.far, rand);
		return s;
	},

	village(rand, p, w, h) {
		const groundY = R(h * 0.82);
		let s = `<path d="${ridgePath(rand, { w, h: groundY, base: h * 0.46, amp: h * 0.22, peaks: 4 })}" fill="${p.far}" opacity="0.5"/>`;
		s += `<path d="${ridgePath(rand, { w, h: groundY, base: h * 0.62, amp: h * 0.14, peaks: 6 })}" fill="${p.mid}" opacity="0.6"/>`;
		s += `<rect x="0" y="${groundY}" width="${w}" height="${R(h - groundY)}" fill="${p.near}" opacity="0.45"/>`;
		const houses = 5;
		for (let i = 0; i < houses; i++) {
			const hw = R(w * (0.09 + rand() * 0.05));
			const hh = R(h * (0.13 + rand() * 0.07));
			const x = R(w * (0.07 + (i * 0.83) / (houses - 1)) - hw / 2);
			const y = R(groundY - hh);
			s += `<rect x="${x}" y="${y}" width="${hw}" height="${hh}" fill="${p.mid}" rx="2"/>`;
			s += `<path d="M${R(x - 8)},${y} L${R(x + hw / 2)},${R(y - hh * 0.45)} L${R(x + hw + 8)},${y} Z" fill="${p.near}"/>`;
			for (let k = 0; k < 2; k++) {
				s += `<rect x="${R(x + hw * (0.2 + k * 0.42))}" y="${R(y + hh * 0.32)}" width="${R(hw * 0.2)}" height="${R(hh * 0.26)}" fill="${p.accent}" opacity="0.85" rx="1"/>`;
			}
		}
		for (let i = 0; i < 4; i++) s += tree(R(w * (0.14 + i * 0.24 + rand() * 0.05)), R(groundY + 16 + rand() * 22), 0.75 + rand() * 0.35, p.near, p.accent, rand);
		s += fallingLeaves(rand, { w, h, count: 14, color: p.accent });
		return s;
	},

	cityscape(rand, p, w, h) {
		const groundY = R(h * 0.86);
		let s = '';
		for (let layer = 0; layer < 3; layer++) {
			const fill = [p.far, p.mid, p.near][layer];
			const op = [0.4, 0.65, 0.95][layer];
			for (let i = 0; i < 11; i++) {
				const bw = R(w * (0.045 + rand() * 0.055));
				const bh = R(h * (0.16 + rand() * (0.2 + layer * 0.18)));
				const x = R((i * w) / 11 + rand() * 26 - layer * 12);
				s += `<rect x="${x}" y="${R(groundY - bh)}" width="${bw}" height="${bh}" fill="${fill}" opacity="${op}" rx="2"/>`;
				if (layer === 2) {
					for (let k = 0; k < 6; k++) {
						s += `<rect x="${R(x + 5 + rand() * (bw - 12))}" y="${R(groundY - bh + 10 + rand() * (bh - 22))}" width="4" height="6" fill="${p.accent}" opacity="${R(0.4 + rand() * 0.5)}"/>`;
					}
				}
			}
		}
		s += `<rect x="0" y="${groundY}" width="${w}" height="${R(h - groundY)}" fill="${p.near}"/>`;
		return s;
	},
};

function buildSvg({ slug, motif, palette, w, h, salt }) {
	const rand = seeded(slug + salt);
	const p = PALETTES[palette];
	const scene = MOTIFS[motif](rand, p, w, h);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${p.sky[0]}"/><stop offset="100%" stop-color="${p.sky[1]}"/>
</linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
${scene}
</svg>`;
}

/* ── 글별 배정 ─────────────────────────────── */

const ARTICLES = [
	// spots — 가을 1차
	['spots', 'seoulforest-ginkgo-autumn', 'ginkgo', 'ginkgo'],
	['spots', 'olympic-park-autumn-walk', 'cityPark', 'maple'],
	['spots', 'ansan-jaraetgil-autumn', 'trail', 'amber'],
	['spots', 'gyeongchunline-forest-autumn', 'railway', 'ember'],
	['spots', 'seonyudo-park-autumn', 'structure', 'moss'],
	['spots', 'haneul-park-silvergrass-access', 'silvergrass', 'reed'],
	['spots', 'incheon-grand-park-autumn', 'ginkgo', 'maple'],
	['spots', 'ilsan-lake-park-autumn', 'lake', 'dusk'],
	['spots', 'dumulmeori-autumn-fog', 'lake', 'mist'],
	['spots', 'gwanggyo-lake-park-autumn', 'lake', 'slate'],
	// spots — 가을 2차
	['spots', 'bukseoul-dream-forest-autumn', 'cityPark', 'ember'],
	['spots', 'seokchon-lake-autumn', 'lake', 'maple'],
	['spots', 'cheonggyecheon-autumn-walk', 'stream', 'slate'],
	['spots', 'namhansanseong-autumn-fortress', 'fortress', 'ember'],
	['spots', 'suwon-hwaseong-autumn-walk', 'fortress', 'dusk'],
	['spots', 'achasan-autumn-hike', 'ridge', 'maple'],
	['spots', 'seoul-grand-park-forest-autumn', 'trail', 'ember'],
	['spots', 'gwanaksan-dulle-autumn', 'ridge', 'plum'],
	['spots', 'sanjeong-lake-autumn', 'lake', 'reed'],
	['spots', 'yeouido-saetgang-autumn', 'wetland', 'reed'],
	// spots — 기존
	['spots', 'yangjaecheon-walking-course', 'stream', 'moss'],
	['spots', 'sejong-lake-central-park', 'lake', 'moss'],
	['spots', 'changgyeonggung-grand-greenhouse', 'glasshouse', 'mist'],
	// stays
	// stays — 가을 숙박 연관
	['stays', 'namhansanseong-nearby-stay', 'village', 'ember'],
	['stays', 'suwon-hwaseong-nearby-stay', 'cityscape', 'amber'],
	['stays', 'sanjeong-lake-nearby-stay', 'village', 'reed'],
	['stays', 'dumulmeori-nearby-stay', 'village', 'mist'],
	['stays', 'ilsan-lake-nearby-stay', 'cityscape', 'maple'],
	['stays', 'gwanggyo-lake-nearby-stay', 'cityscape', 'slate'],
	['stays', 'seoulforest-nearby-stay', 'cityscape', 'ginkgo'],
	['stays', 'seokchon-lake-nearby-stay', 'cityscape', 'plum'],
	['stays', 'autumn-stay-booking-timing', 'village', 'amber'],
	['stays', 'autumn-stay-location-guide', 'ridge', 'dusk'],
	// stays — 오사카
	['stays', 'osaka-namba-hotel-area', 'cityscape', 'dusk'],
	['stays', 'osaka-umeda-hotel-area', 'cityscape', 'slate'],
	['stays', 'osaka-tennoji-hotel-area', 'cityscape', 'ember'],
	['stays', 'osaka-shinosaka-hotel-area', 'cityscape', 'mist'],
];

const HERO = { w: 1200, h: 630 };
const BODY = { w: 1200, h: 500 };

await mkdir(`${OUT_SVG}/spots`, { recursive: true });
await mkdir(`${OUT_SVG}/stays`, { recursive: true });
await mkdir(OUT_OG, { recursive: true });

for (const [collection, slug, motif, palette] of ARTICLES) {
	const hero = buildSvg({ slug, motif, palette, ...HERO, salt: 'hero' });
	const body = buildSvg({ slug, motif, palette, ...BODY, salt: 'body-v2' });
	await writeFile(`${OUT_SVG}/${collection}/${slug}.svg`, hero);
	await writeFile(`${OUT_SVG}/${collection}/${slug}-detail.svg`, body);
	await sharp(Buffer.from(hero)).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT_OG}/${slug}.jpg`);
}

console.log(`generated ${ARTICLES.length} articles → svg x2 + og jpg`);
