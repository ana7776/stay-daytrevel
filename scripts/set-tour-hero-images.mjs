#!/usr/bin/env node
// Fetch a real attraction photo from 한국관광공사 TourAPI (KorService2) and wire it
// into a spots/stays 글 frontmatter as heroImage, with a 출처 표기 line appended
// to the post body.
//
// daytrevel 저장소(ana7776/daytrevel)의 scripts/set-tour-hero-images.mjs 를
// spots/stays 두 컬렉션 구조에 맞게 옮긴 버전. 검증 로직은 그대로 가져왔다:
// 검색 1순위 결과를 그대로 쓰지 않는다. 제목이 기대한 장소명과 맞는지,
// 부속시설(상품관·매표소·주차장 등)이 아닌지 확인한 뒤 통과한 후보의 사진만
// 쓴다. 통과 후보가 없으면 실패로 끝내고 호출자(fill-hero-images.mjs)가
// Pexels 로 폴백한다.
//
// Usage:
//   node --env-file=.env scripts/set-tour-hero-images.mjs              # all slugs in KEYWORDS
//   node --env-file=.env scripts/set-tour-hero-images.mjs <slug> "<keyword>"
//
// TOUR_API_KEY must be the "일반 인증키(디코딩)" value from data.go.kr
// (마이페이지 > 오픈API > 활용신청 현황), since URLSearchParams encodes it for us.

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const serviceKey = process.env.TOUR_API_KEY;
if (!serviceKey) {
	console.error('TOUR_API_KEY is not set. Put it in .env as TOUR_API_KEY=xxxxx (decoded key)');
	process.exit(1);
}

// slug -> TourAPI 검색 설정 (실제 장소명)
//   문자열      : 검색어 하나
//   문자열 배열 : 앞에서부터 차례로 시도 (첫 검색어가 TourAPI 에 없을 때 대비)
//   객체        : { keywords, areaCode, match, addr, exclude, photoIndex }
//                 areaCode   : 지역을 좁히고, match 로 제목 검증에 쓸 이름을 따로 준다
//                 addr       : 주소에 이 문자열이 없으면 제외. 같은 이름의 다른 장소를
//                              걸러낼 때 쓴다
//                 exclude    : 제목이 이 정규식에 걸리면 제외. 같은 브랜드의 다른 시설을
//                              걸러낼 때 쓴다
//                 photoIndex : 스팟은 맞는데 대표사진(firstimage)이 안내소·정문처럼
//                              장소를 대표하지 못할 때, detailImage2 목록에서 다른
//                              사진을 고른다(0 = 대표사진, 기본값). 실행 로그에
//                              "사진 후보 N개: 0:..., 1:..." 로 후보가 찍히니
//                              그걸 보고 인덱스를 정한다
const AREA = { 서울: '1', 부산: '6', 대구: '4', 인천: '2', 광주: '5', 대전: '3', 울산: '7', 세종: '8', 경기: '31', 강원: '32', 충북: '33', 충남: '34', 경북: '35', 경남: '36', 전북: '37', 전남: '38', 제주: '39' };

const KEYWORDS = {
	// spots
	'sejong-lake-central-park': { keywords: ['세종호수공원'], areaCode: AREA.세종, match: '세종호수공원' },
	'yangjaecheon-walking-course': { keywords: ['양재천'], areaCode: AREA.서울, match: '양재천' },
	'changgyeonggung-grand-greenhouse': { keywords: ['창경궁 대온실', '창경궁'], areaCode: AREA.서울, match: '창경궁' },
	'tongdosa-rest-area': { keywords: ['통도사'], areaCode: AREA.경남, match: '통도사' },
	'national-intangible-heritage-center': { keywords: ['국립무형유산원'], areaCode: AREA.전북, match: '국립무형유산원' },
	'gyeonggyojang': { keywords: ['경교장'], areaCode: AREA.서울, match: '경교장' },
	'seongju-hangae-village': { keywords: ['한개마을', '성주 한개마을'], areaCode: AREA.경북, match: '한개마을' },
	'samok-ferry-terminal': { keywords: ['삼목선착장', '삼목항'], areaCode: AREA.인천, match: '삼목' },
	'gadeok-undersea-tunnel': { keywords: ['거가대교', '가덕해저터널'], areaCode: AREA.부산, match: '거가대교' },
	'upo-wetland-eco-center': { keywords: ['우포늪'], areaCode: AREA.경남, match: '우포늪' },
	'towangseong-falls': { keywords: ['토왕성폭포'], areaCode: AREA.강원, match: '토왕성폭포' },
	'honggildong-theme-park': { keywords: ['홍길동테마파크', '홍길동생가'], areaCode: AREA.전남, match: '홍길동' },
	'jeongnyeongchi-rest-area': { keywords: ['정령치'], match: '정령치' },
	'lee-byungchul-birthplace': { keywords: ['이병철 생가', '이병철생가'], areaCode: AREA.경남, match: '이병철' },
	'bokcheon-museum': { keywords: ['복천박물관'], areaCode: AREA.부산, match: '복천박물관' },
	'seoripul-park': { keywords: ['서리풀공원', '몽마르뜨공원'], areaCode: AREA.서울, match: '서리풀' },
	'chuncheon-waterfront-park': { keywords: ['춘천수변공원', '의암호'], areaCode: AREA.강원, match: '수변공원' },
	'gulpocheon-stream': { keywords: ['굴포천'], match: '굴포천' },

	// stays (국내 지역만 대상. 오사카 등 해외 숙소 지역은 Pexels 로 폴백)
};

const BASE = 'https://apis.data.go.kr/B551011/KorService2';
// spots/stays 두 컬렉션을 순서대로 뒤진다. daytrevel 은 컬렉션이 blog 하나뿐이라
// 디렉터리 하나만 봤지만, 여기는 두 곳에 흩어져 있어 슬러그로 찾을 때 둘 다 시도한다.
const CONTENT_DIRS = [path.join('src', 'content', 'spots'), path.join('src', 'content', 'stays')];
const CREDIT_LINE = '사진: 한국관광공사';

// 같은 이름을 달고 있어도 본 관광지가 아닌 부속시설·상업시설
const EXCLUDED_TITLE = /(상품관|기념품|매표소|안내소|주차장|사무소|정류장|승강장|주유소|화장실|매점|판매장|편의점)/;
// 관광지 사진으로 부적절한 콘텐츠 타입: 38 쇼핑, 39 음식점
const EXCLUDED_TYPES = new Set(['38', '39']);
// 사진이 장소를 대표할 가능성이 높은 타입: 12 관광지, 14 문화시설, 15 축제, 25 여행코스, 28 레포츠
const PREFERRED_TYPES = new Set(['12', '14', '15', '25', '28']);

function buildUrl(op, params, base = BASE) {
	const url = new URL(`${base}/${op}`);
	url.searchParams.set('serviceKey', serviceKey);
	url.searchParams.set('MobileOS', 'ETC');
	url.searchParams.set('MobileApp', 'staydaytrevel');
	url.searchParams.set('_type', 'json');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	return url;
}

// data.go.kr 은 러너에서 연결 자체가 실패하는 일이 있다(undici 기본 연결 타임아웃 10초).
// 어떤 이유로 끊겼는지는 err.cause 에만 남기 때문에, 원인을 찍고 https→http 로
// 재시도한다. 그래도 안 되면 호출자가 Pexels 로 폴백한다.
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
		throw new Error(`Non-JSON response from ${op} (check TOUR_API_KEY): ${text.slice(0, 200)}`);
	}
	const header = json.response?.header;
	if (header?.resultCode !== '0000') {
		throw new Error(`TourAPI error on ${op}: ${header?.resultCode} ${header?.resultMsg}`);
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
function scoreSpot(spot, expectedName, { addr, exclude } = {}) {
	if (EXCLUDED_TITLE.test(spot.title ?? '')) return 0;
	if (EXCLUDED_TYPES.has(String(spot.contenttypeid))) return 0;
	if (exclude?.test(spot.title ?? '')) return 0;
	if (addr && !(spot.addr1 ?? '').includes(addr)) return 0;

	const title = normalize(spot.title);
	const expected = normalize(expectedName);
	if (!title || !expected) return 0;

	let score = 0;
	if (title === expected) score = 3;
	else if (title.includes(expected)) score = 2;
	// 검색어가 더 긴 경우(예: '마장호수 출렁다리' → '마장호수')도 같은 장소로 본다
	else if (expected.includes(title) && title.length >= 2) score = 1;
	else return 0;

	if (PREFERRED_TYPES.has(String(spot.contenttypeid))) score += 0.5;
	return score;
}

// 스팟 하나가 가진 사진 후보 전체를 모은다: firstimage(대표사진) + detailImage2 목록.
// photoIndex 로 대표사진이 밋밋할 때(예: 안내소 건물) 다른 사진을 고를 수 있게 한다.
async function photoCandidates(spot) {
	const detailImages = await callApi('detailImage2', { contentId: spot.contentid, imageYN: 'Y' });
	const fromDetail = detailImages.map((img) => ({ url: img.originimgurl, name: img.imgname ?? '' })).filter((c) => c.url);
	const seen = new Set();
	const all = [];
	if (spot.firstimage) all.push({ url: spot.firstimage, name: '(대표사진)' });
	for (const c of fromDetail) all.push(c);
	return all.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
}

async function photoOf(spot, photoIndex = 0) {
	const candidates = await photoCandidates(spot);
	if (candidates.length) {
		console.log(`    사진 후보 ${candidates.length}개:`);
		candidates.forEach((c, i) => console.log(`      ${i}: ${c.name || '(이름 없음)'} — ${c.url}`));
	}
	return candidates[photoIndex]?.url ?? null;
}

// 검색어를 차례로 시도하면서, 검증을 통과하고 사진이 있는 첫 후보를 고른다.
async function findPhoto({ keywords, areaCode, match, addr, exclude, photoIndex }) {
	for (const keyword of keywords) {
		// areaCode 로 좁힌 검색이 0건이면 등록 지역이 기대와 다를 수 있으므로 전국으로 한 번 더 본다.
		// 결과가 있었는데 검증에서 다 떨어진 경우는 재검색하지 않는다(다른 지역의 동명 장소를 물어올 수 있다).
		for (const scope of areaCode ? [areaCode, null] : [null]) {
			const params = { keyword, numOfRows: 20 };
			if (scope) params.areaCode = scope;
			const spots = await callApi('searchKeyword2', params);

			if (!spots.length && scope) {
				console.log(`  "${keyword}" (areaCode ${scope}): 결과 0건 → 전국으로 재검색`);
				continue;
			}

			const candidates = spots
				.map((spot) => ({ spot, score: scoreSpot(spot, match ?? keyword, { addr, exclude }) }))
				.filter((c) => c.score > 0)
				.sort((a, b) => b.score - a.score);

			const rejected = spots.length - candidates.length;
			const where = scope ? `areaCode ${scope}` : '전국';
			console.log(`  "${keyword}" (${where}): 결과 ${spots.length}건, 검증 통과 ${candidates.length}건 (제외 ${rejected}건)`);

			for (const { spot } of candidates) {
				const imageUrl = await photoOf(spot, photoIndex ?? 0);
				if (imageUrl) return { imageUrl, spot };
				console.log(`    사진 없음: ${spot.title}`);
			}
			break;
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
			console.warn('  검증을 통과한 사진이 없어 건너뜁니다 (Pexels 로 폴백)');
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

		console.log(`  saved ${imageFileName} (${found.spot.title} / ${found.spot.addr1 ?? ''})`);
		ok++;
	} catch (err) {
		console.error(`  FAILED: ${err.message}`);
		failed++;
	}
}

console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
console.log(`TourAPI 사진에는 "${CREDIT_LINE}" 출처 표기가 본문에 추가됩니다.`);

// 한 건도 못 받았으면 실패로 끝낸다. 호출자(fill-hero-images)가 폴백을 판단하는 기준.
if (ok === 0) process.exitCode = 1;
