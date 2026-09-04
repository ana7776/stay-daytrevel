#!/usr/bin/env node
// Fetch one Pexels hero image per spots/stays post and wire it into the post's
// frontmatter. Used as a fallback when 한국관광공사 TourAPI has no usable photo
// (e.g. 해외 숙소 지역처럼 국내 관광 DB에 없는 장소).
//
// daytrevel 저장소(ana7776/daytrevel)의 scripts/set-hero-images.mjs 를
// spots/stays 두 컬렉션 구조에 맞게 옮긴 버전.
//
// Usage: node --env-file=.env scripts/set-hero-images.mjs

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.PEXELS_API_KEY;
if (!apiKey) {
	console.error('PEXELS_API_KEY is not set. Put it in .env as PEXELS_API_KEY=xxxxx');
	process.exit(1);
}

// slug -> English search query (thematic/representative, not a claim of the exact real place)
const QUERIES = {
	// spots (TourAPI 실패 시 대비용 예비 검색어)
	'sejong-lake-central-park': 'lake park walking path city korea',
	'yangjaecheon-walking-course': 'stream walking path city greenery korea',
	'changgyeonggung-grand-greenhouse': 'glass greenhouse botanical garden palace',
	'tongdosa-rest-area': 'buddhist temple mountain korea',
	'national-intangible-heritage-center': 'korean traditional craft exhibition hall',
	'gyeonggyojang': 'historic korean building city',
	'seongju-hangae-village': 'traditional korean hanok village',
	'samok-ferry-terminal': 'ferry terminal island coast korea',
	'gadeok-undersea-tunnel': 'undersea tunnel bridge coastal highway korea',
	'upo-wetland-eco-center': 'wetland marsh reeds nature korea',
	'towangseong-falls': 'tall waterfall mountain cliff korea',
	'honggildong-theme-park': 'traditional korean folk village theme park',
	'jeongnyeongchi-rest-area': 'mountain pass road scenic drive korea',

	// stays (해외 숙소 지역: TourAPI 대상 아님, Pexels 로 분위기 사진)
	'osaka-namba-hotel-area': 'osaka namba dotonbori street night',
	'osaka-umeda-hotel-area': 'osaka umeda skyline city',
	'osaka-tennoji-hotel-area': 'osaka tennoji park tower',
	'osaka-shinosaka-hotel-area': 'osaka shin-osaka station',
};

const CONTENT_DIRS = [path.join('src', 'content', 'spots'), path.join('src', 'content', 'stays')];

async function searchPexels(query) {
	const url = new URL('https://api.pexels.com/v1/search');
	url.searchParams.set('query', query);
	url.searchParams.set('per_page', '1');
	url.searchParams.set('orientation', 'landscape');
	const res = await fetch(url, { headers: { Authorization: apiKey } });
	if (!res.ok) throw new Error(`Pexels API error ${res.status}: ${await res.text()}`);
	const data = await res.json();
	return data.photos?.[0];
}

async function findContentFile(slug) {
	for (const dir of CONTENT_DIRS) {
		for (const ext of ['.mdx', '.md']) {
			const p = path.join(dir, `${slug}${ext}`);
			try {
				await readFile(p, 'utf-8');
				return p;
			} catch {
				// try next dir/extension
			}
		}
	}
	throw new Error(`No content file found for slug ${slug}`);
}

// TourAPI 사진을 Pexels 사진으로 덮어쓰면 본문에 남은 '사진: 한국관광공사' 는
// 사실과 달라진다. 스톡 사진으로 바뀌는 순간 출처 표기를 걷어낸다.
function stripTourCredit(text) {
	return text.replace(/\n+사진: 한국관광공사\s*$/, '\n');
}

async function patchFrontmatter(filePath, imageFileName) {
	const text = stripTourCredit(await readFile(filePath, 'utf-8'));
	if (/^heroImage:/m.test(text)) {
		const patched = text.replace(/^heroImage:.*$/m, `heroImage: './${imageFileName}'`);
		await writeFile(filePath, patched, 'utf-8');
		return;
	}
	const patched = text.replace(/^(keyword:.*)$/m, `$1\nheroImage: './${imageFileName}'`);
	await writeFile(filePath, patched, 'utf-8');
}

// Single-post mode: node set-hero-images.mjs <slug> ["<query>"]
// Query is optional — it falls back to the QUERIES map above.
const [, , argSlug, argQuery] = process.argv;
const jobs = argSlug ? { [argSlug]: argQuery ?? QUERIES[argSlug] } : QUERIES;

let ok = 0;
let failed = 0;

for (const [slug, query] of Object.entries(jobs)) {
	try {
		if (!query) throw new Error(`no query for slug ${slug}`);
		console.log(`[${slug}] searching "${query}"...`);
		const photo = await searchPexels(query);
		if (!photo) {
			console.warn(`  no results, skipping`);
			failed++;
			continue;
		}
		const imgRes = await fetch(photo.src.large2x ?? photo.src.large);
		if (!imgRes.ok) throw new Error(`download failed: ${imgRes.status}`);
		const buf = Buffer.from(await imgRes.arrayBuffer());

		const contentFile = await findContentFile(slug);
		const imageFileName = `${slug}-hero.jpg`;
		await writeFile(path.join(path.dirname(contentFile), imageFileName), buf);
		await patchFrontmatter(contentFile, imageFileName);

		console.log(`  saved ${imageFileName} (photo by ${photo.photographer})`);
		ok++;
	} catch (err) {
		console.error(`  FAILED: ${err.message}`);
		failed++;
	}
}

console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);

// 한 건도 못 받았으면 실패로 끝낸다. 호출자(fill-hero-images)가 폴백을 판단하는 기준.
if (ok === 0) process.exitCode = 1;
