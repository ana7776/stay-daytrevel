#!/usr/bin/env node
// Fetch one Pexels hero image per travel/stays post and wire it into the post's
// frontmatter as image/imageAlt/imageCredit/imageSource (원격 URL 그대로, 다운로드 없음).
//
// TourAPI(및 관광사진갤러리)에 실제 장소 사진이 없을 때 쓰는 마지막 폴백이라
// "그 장소의 실제 사진"이 아니라 분위기를 보여주는 스톡 사진이다. 슬러그별
// 영어 검색어를 QUERIES에 등록해두면 그걸 쓰고, 없으면 글의 keyword frontmatter를
// 그대로 검색어로 쓴다(한국어 검색도 Pexels가 어느 정도 처리하지만, 결과 품질을
// 위해 가능하면 QUERIES에 영어 쿼리를 추가해주는 편이 낫다).
//
// Usage:
//   node --env-file=.env scripts/set-hero-images.mjs              # QUERIES 전체 + keyword 폴백 대상
//   node --env-file=.env scripts/set-hero-images.mjs <slug> ["<query>"]

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiKey = process.env.PEXELS_API_KEY;
if (!apiKey) {
	console.error('PEXELS_API_KEY is not set. Put it in .env as PEXELS_API_KEY=xxxxx');
	process.exit(1);
}

// slug -> English search query. 여기 없는 슬러그는 keyword frontmatter로 검색한다.
const QUERIES = {};

const CONTENT_DIRS = [path.join('src', 'content', 'travel'), path.join('src', 'content', 'stays')];

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

function yamlString(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

async function patchPost(filePath, fields) {
	let text = await readFile(filePath, 'utf-8');
	const lines = [
		`image: ${yamlString(fields.image)}`,
		`imageAlt: ${yamlString(fields.imageAlt)}`,
		`imageCredit: ${yamlString(fields.imageCredit)}`,
		`imageSource: ${yamlString(fields.imageSource)}`,
	];

	if (/^image:/m.test(text)) {
		for (const key of ['image', 'imageAlt', 'imageCredit', 'imageSource']) {
			const line = lines.find((l) => l.startsWith(`${key}:`));
			text = text.replace(new RegExp(`^${key}:.*$`, 'm'), line);
		}
	} else {
		const anchor = /^season:.*$/m.test(text) ? /^season:.*$/m : /^country:.*$/m;
		text = text.replace(anchor, (m) => `${m}\n${lines.join('\n')}`);
	}

	await writeFile(filePath, text, 'utf-8');
}

async function defaultQueryFor(slug) {
	const filePath = await findContentFile(slug);
	const text = await readFile(filePath, 'utf-8');
	const title = text.match(/^title:\s*'((?:[^'\\]|\\.)*)'/m) ?? text.match(/^title:\s*"([^"]*)"/m);
	const keyword = text.match(/^keyword:\s*'((?:[^'\\]|\\.)*)'/m) ?? text.match(/^keyword:\s*"([^"]*)"/m);
	return keyword?.[1] ?? title?.[1] ?? null;
}

async function main() {
	const [, , argSlug, argQuery] = process.argv;
	const slugs = argSlug ? [argSlug] : Object.keys(QUERIES);

	let ok = 0;
	let failed = 0;

	for (const slug of slugs) {
		try {
			const query = argSlug ? argQuery ?? QUERIES[slug] ?? (await defaultQueryFor(slug)) : QUERIES[slug];
			if (!query) throw new Error(`no query for slug ${slug}`);

			console.log(`[${slug}] searching "${query}"...`);
			const photo = await searchPexels(query);
			if (!photo) {
				console.warn('  no results, skipping');
				failed++;
				continue;
			}

			const contentFile = await findContentFile(slug);
			await patchPost(contentFile, {
				image: photo.src.large2x ?? photo.src.large,
				imageAlt: photo.alt || query,
				imageCredit: `사진: ${photo.photographer} / Pexels`,
				imageSource: photo.url,
			});

			console.log(`  saved (photo by ${photo.photographer})`);
			ok++;
		} catch (err) {
			console.error(`  FAILED [${slug}]: ${err.message}`);
			failed++;
		}
	}

	console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);

	// 한 건도 못 받았으면 실패로 끝낸다. 호출자(fill-hero-images)가 폴백을 판단하는 기준.
	if (ok === 0) process.exitCode = 1;
}

await main();
