#!/usr/bin/env node
// Fill missing hero images for spots/stays posts.
//
// 세 단계로 소스를 시도한다:
//   1. 한국관광공사 TourAPI(KorService2)   — 등록된 관광지 실제 사진
//   2. 한국관광공사 관광사진갤러리(PhotoGalleryService1) — 큐레이션된 전문 사진
//      (1번이 실패했을 때만 시도. 장소마다 있는 건 아니라서 2차 소스로 둔다)
//   3. Pexels — 위 둘 다 없을 때 분위기 스톡 사진
//
// daytrevel 저장소(ana7776/daytrevel)의 scripts/fill-hero-images.mjs 를
// spots/stays 두 컬렉션 구조 + 관광사진갤러리 소스 추가로 확장한 버전.
//
// Usage:
//   node --env-file=.env scripts/fill-hero-images.mjs            # posts with no heroImage
//   node --env-file=.env scripts/fill-hero-images.mjs a,b,c      # only these slugs
//   node scripts/fill-hero-images.mjs --list                     # just print what is missing
//
// Env: TOUR_API_KEY (KorService2), TOUR_PHOTO_API_KEY (PhotoGalleryService1), PEXELS_API_KEY
//      FORCE=true      이미 heroImage 가 있어도 다시 받기
//      TOUR_ONLY=true  한국관광공사 소스(TourAPI + 관광사진갤러리)만 쓰고 Pexels 폴백은 하지 않기

import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CONTENT_DIRS = [path.join('src', 'content', 'spots'), path.join('src', 'content', 'stays')];

async function findPost(slug) {
	for (const dir of CONTENT_DIRS) {
		for (const ext of ['.mdx', '.md']) {
			const p = path.join(dir, `${slug}${ext}`);
			try {
				return { path: p, text: await readFile(p, 'utf-8') };
			} catch {
				// try next dir/extension
			}
		}
	}
	throw new Error(`No content file found for slug ${slug}`);
}

async function allSlugs() {
	const slugs = [];
	for (const dir of CONTENT_DIRS) {
		const files = await readdir(dir);
		for (const f of files) {
			if (f.endsWith('.md') || f.endsWith('.mdx')) slugs.push(f.replace(/\.mdx?$/, ''));
		}
	}
	return slugs;
}

async function hasHero(slug) {
	return /^heroImage:/m.test((await findPost(slug)).text);
}

function run(script, slug) {
	const res = spawnSync(process.execPath, [path.join('scripts', script), slug], {
		stdio: 'inherit',
		env: process.env,
	});
	return res.status === 0;
}

const args = process.argv.slice(2).filter((a) => a !== '--list');
const listOnly = process.argv.includes('--list');

const targets = args.length
	? args.join(',').split(',').map((s) => s.trim()).filter(Boolean)
	: (await Promise.all((await allSlugs()).map(async (s) => ((await hasHero(s)) ? null : s)))).filter(Boolean);

if (!targets.length) {
	console.log('모든 글에 히어로 이미지가 이미 있습니다.');
	process.exit(0);
}

console.log(`대상 ${targets.length}편: ${targets.join(', ')}\n`);
if (listOnly) process.exit(0);

const results = { tour: [], gallery: [], pexels: [], failed: [] };

for (const slug of targets) {
	console.log(`=== ${slug} ===`);

	const before = process.env.FORCE === 'true' ? null : await hasHero(slug);
	if (before === true) {
		console.log('  이미 heroImage 가 있어 건너뜁니다 (force 로 덮어쓰기 가능)');
		continue;
	}

	// 성공 판정은 자식 스크립트의 종료 코드로만 한다.
	// heroImage 존재 여부를 성공 신호로 쓰면, force 로 다시 받을 때
	// 이전 실행이 남긴 heroImage 때문에 실패가 성공으로 잡힌다.
	if (process.env.TOUR_API_KEY && run('set-tour-hero-images.mjs', slug)) {
		results.tour.push(slug);
		continue;
	}

	if (process.env.TOUR_PHOTO_API_KEY && run('set-photo-gallery-hero-images.mjs', slug)) {
		results.gallery.push(slug);
		continue;
	}

	// force 로 다시 받을 때는 한국관광공사 소스가 실패했다고 멀쩡한 기존 사진을 다른
	// Pexels 스톡으로 갈아치울 이유가 없다. TOUR_ONLY 면 폴백 없이 그대로 둔다.
	if (process.env.TOUR_ONLY === 'true') {
		console.log('  한국관광공사 소스 실패, TOUR_ONLY 라서 기존 이미지를 유지합니다');
		results.failed.push(slug);
		continue;
	}

	if (process.env.PEXELS_API_KEY && run('set-hero-images.mjs', slug)) {
		results.pexels.push(slug);
		continue;
	}

	results.failed.push(slug);
}

console.log('\n--- 결과 ---');
console.log(`TourAPI 실제 사진: ${results.tour.length}편 ${results.tour.join(', ')}`);
console.log(`관광사진갤러리 사진: ${results.gallery.length}편 ${results.gallery.join(', ')}`);
console.log(`Pexels 스톡 사진: ${results.pexels.length}편 ${results.pexels.join(', ')}`);
if (results.failed.length) {
	console.log(`실패: ${results.failed.length}편 ${results.failed.join(', ')}`);
	// 일부만 실패한 경우는 성공분을 살리기 위해 정상 종료한다.
	if (!results.tour.length && !results.gallery.length && !results.pexels.length) process.exitCode = 1;
}
