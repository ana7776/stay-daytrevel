#!/usr/bin/env node
// Fetch a curated photo from 한국관광공사 관광사진갤러리 서비스(PhotoGalleryService1)
// and wire it into a spots/stays 글 frontmatter as heroImage, with the same
// "사진: 한국관광공사" 출처 표기 used for TourAPI(KorService2) photos.
//
// 이 서비스는 KorService2(장소 등록 DB)와 별개로, 한국관광공사가 보유한
// 큐레이션된 사진(보도용/홍보용)을 제공한다. 장소마다 반드시 있는 건 아니라서
// (특히 휴게소·선착장 같은 시설류는 등록이 없을 수 있음) set-tour-hero-images.mjs
// 가 실패했을 때 시도하는 2차 소스로 쓴다 (fill-hero-images.mjs 참고).
//
// Usage:
//   node --env-file=.env scripts/set-photo-gallery-hero-images.mjs
//   node --env-file=.env scripts/set-photo-gallery-hero-images.mjs <slug> "<keyword>"
//
// TOUR_PHOTO_API_KEY must be the "일반 인증키(디코딩)" value from data.go.kr
// for the [한국관광공사_관광사진 정보_GW] 활용신청 (KorService2 키와는 별개 신청건).

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const serviceKey = process.env.TOUR_PHOTO_API_KEY;
if (!serviceKey) {
	console.error('TOUR_PHOTO_API_KEY is not set. Put it in .env as TOUR_PHOTO_API_KEY=xxxxx (decoded key)');
	process.exit(1);
}

// slug -> 검색 설정. set-tour-hero-images.mjs 의 KEYWORDS 와 같은 슬러그를 쓰되,
// 이 서비스는 지역 코드(areaCode) 필터가 없고 galPhotographyLocation(자유 텍스트)만
// 있어서 addr 대신 그 필드로 느슨하게 거른다.
//   keywords : 앞에서부터 차례로 시도
//   match    : 제목 검증에 쓸 이름 (검색어와 다르게 주고 싶을 때)
//   location : galPhotographyLocation 에 이 문자열이 없으면 제외 (동명 장소 구분용)
const KEYWORDS = {
	'sejong-lake-central-park': { keywords: ['세종호수공원'], match: '세종호수공원' },
	'yangjaecheon-walking-course': { keywords: ['양재천'], match: '양재천' },
	'changgyeonggung-grand-greenhouse': { keywords: ['창경궁 대온실', '창경궁'], match: '창경궁' },
	'tongdosa-rest-area': { keywords: ['통도사'], match: '통도사' },
	'national-intangible-heritage-center': { keywords: ['국립무형유산원'], match: '국립무형유산원' },
	gyeonggyojang: { keywords: ['경교장'], match: '경교장' },
	'seongju-hangae-village': { keywords: ['한개마을', '성주 한개마을'], match: '한개마을' },
	'samok-ferry-terminal': { keywords: ['삼목선착장', '삼목항'], match: '삼목' },
	'gadeok-undersea-tunnel': { keywords: ['거가대교', '가덕해저터널'], match: '거가대교' },
	'upo-wetland-eco-center': { keywords: ['우포늪'], match: '우포늪' },
	'towangseong-falls': { keywords: ['토왕성폭포'], match: '토왕성폭포' },
	'honggildong-theme-park': { keywords: ['홍길동테마파크', '홍길동생가'], match: '홍길동' },
	'jeongnyeongchi-rest-area': { keywords: ['정령치'], match: '정령치' },
	'lee-byungchul-birthplace': { keywords: ['이병철 생가', '이병철생가'], match: '이병철' },
	'bokcheon-museum': { keywords: ['복천박물관'], match: '복천박물관' },
	'seoripul-park': { keywords: ['서리풀공원', '몽마르뜨공원'], match: '서리풀' },
	'chuncheon-waterfront-park': { keywords: ['춘천수변공원', '의암호'], match: '수변공원' },
	'gulpocheon-stream': { keywords: ['굴포천'], match: '굴포천' },
};

const BASE = 'https://apis.data.go.kr/B551011/PhotoGalleryService1';
const CONTENT_DIRS = [path.join('src', 'content', 'spots'), path.join('src', 'content', 'stays')];
const CREDIT_LINE = '사진: 한국관광공사';

function buildUrl(op, params, base = BASE) {
	const url = new URL(`${base}/${op}`);
	url.searchParams.set('serviceKey', serviceKey);
	url.searchParams.set('MobileOS', 'ETC');
	url.searchParams.set('MobileApp', 'staydaytrevel');
	url.searchParams.set('_type', 'json');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

// data.go.kr 연결이 러너에서 간헐적으로 실패하는 문제는 set-tour-hero-images.mjs 와
// 동일해서 같은 재시도 방식을 쓴다.
async function fetchWithRetry(op, params) {
	const bases = [BASE, BASE.replace('https://', 'http://')];
	let lastError;
	for (let attempt = 0; attempt < bases.length * 2; attempt++) {
		const base = bases[attempt % bases.length];
		try {
			return await fetch(buildUrl(op, params, base));
		} catch (err) {
			lastError = err;
			const cause = err.cause?.code ?? err.cause?.message ?? 'unknown';
			console.warn(`    연결 실패 (${base.split('://')[0]}, ${cause}), 재시도 ${attempt + 1}/${bases.length * 2}`);
			await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
		}
	}
	throw new Error(`fetch failed: ${lastError.cause?.code ?? lastError.message}`);
}

async function callApi(op, params) {
	const res = await fetchWithRetry(op, params);
	const text = await res.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		throw new Error(`Non-JSON response from ${op} (check TOUR_PHOTO_API_KEY): ${text.slice(0, 200)}`);
	}
	const header = json.response?.header;
	if (header?.resultCode !== '0000') {
		throw new Error(`PhotoGalleryService error on ${op}: ${header?.resultCode} ${header?.resultMsg}`);
	}
	const body = json.response.body;
	const items = body.items === '' ? [] : body.items.item;
	return Array.isArray(items) ? items : items ? [items] : [];
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

async function patchPost(filePath, imageFileName) {
	let text = await readFile(filePath, 'utf-8');

	if (/^heroImage:/m.test(text)) {
		text = text.replace(/^heroImage:.*$/m, `heroImage: './${imageFileName}'`);
	} else {
		text = text.replace(/^(keyword:.*)$/m, `$1\nheroImage: './${imageFileName}'`);
	}

	if (!text.includes(CREDIT_LINE)) {
		text = `${text.trimEnd()}\n\n${CREDIT_LINE}\n`;
	}

	await writeFile(filePath, text, 'utf-8');
}

function normalize(value) {
	return (value ?? '').replace(/[\s·ㆍ()[\]{}'"’“”\-_,.]/g, '').toLowerCase();
}

// 기대한 장소가 맞는지 점수로 판정한다. 0 이면 후보에서 제외.
// 이 서비스는 콘텐츠타입 필터가 의미가 없어(샘플 응답이 전부 galContentTypeId=17)
// 제목·검색키워드·촬영장소 텍스트로만 판정한다.
function scoreCandidate(item, expectedName, { location } = {}) {
	if (location && !(item.galPhotographyLocation ?? '').includes(location)) return 0;

	const title = normalize(item.galTitle);
	const expected = normalize(expectedName);
	if (!title || !expected) return 0;

	if (title === expected) return 3;
	if (title.includes(expected)) return 2;
	if (expected.includes(title) && title.length >= 2) return 1;

	// 제목이 안 맞아도 검색 키워드에 기대 장소명이 정확히 들어있으면 약하게 인정한다
	const keywords = normalize(item.galSearchKeyword);
	if (keywords.includes(expected)) return 0.5;

	return 0;
}

async function findPhoto({ keywords, match, location }) {
	for (const keyword of keywords) {
		const items = await callApi('gallerySearchList1', { keyword, numOfRows: 20, arrange: 'C' });

		const candidates = items
			.map((item) => ({ item, score: scoreCandidate(item, match ?? keyword, { location }) }))
			.filter((c) => c.score > 0)
			.sort((a, b) => b.score - a.score);

		console.log(`  "${keyword}": 결과 ${items.length}건, 검증 통과 ${candidates.length}건`);

		for (const { item } of candidates) {
			if (item.galWebImageUrl) {
				console.log(`    후보: ${item.galTitle} (${item.galPhotographyLocation ?? '위치 정보 없음'}) — ${item.galWebImageUrl}`);
				return { imageUrl: item.galWebImageUrl, item };
			}
		}
	}
	return null;
}

function toSearchSpec(value) {
	if (typeof value === 'string') return { keywords: [value] };
	if (Array.isArray(value)) return { keywords: value };
	return value;
}

const [, , argSlug, argKeyword] = process.argv;
const jobs = argSlug ? { [argSlug]: argKeyword ?? KEYWORDS[argSlug] } : KEYWORDS;

let ok = 0;
let failed = 0;

for (const [slug, value] of Object.entries(jobs)) {
	try {
		if (!value) throw new Error(`no keyword for slug ${slug}`);
		const spec = toSearchSpec(value);
		console.log(`[${slug}] searching ${spec.keywords.map((k) => `"${k}"`).join(' → ')}...`);

		const found = await findPhoto(spec);
		if (!found) {
			console.warn('  검증을 통과한 사진이 없어 건너뜁니다 (다음 소스로 폴백)');
			failed++;
			continue;
		}

		const imgRes = await fetch(found.imageUrl);
		if (!imgRes.ok) throw new Error(`download failed: ${imgRes.status}`);
		const buf = Buffer.from(await imgRes.arrayBuffer());

		const contentFile = await findContentFile(slug);
		const imageFileName = `${slug}-hero.jpg`;
		await writeFile(path.join(path.dirname(contentFile), imageFileName), buf);
		await patchPost(contentFile, imageFileName);

		console.log(`  saved ${imageFileName} (${found.item.galTitle} / 촬영: ${found.item.galPhotographer ?? '정보 없음'})`);
		ok++;
	} catch (err) {
		console.error(`  FAILED: ${err.message}`);
		failed++;
	}
}

console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
console.log(`관광사진갤러리 사진에도 "${CREDIT_LINE}" 출처 표기가 본문에 추가됩니다.`);

if (ok === 0) process.exitCode = 1;
