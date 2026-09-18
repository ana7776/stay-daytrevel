// 별도 콘텐츠 스키마 필드 없이 기존 country/keyword 값으로 카테고리를 구분한다.
const FESTIVAL_PATTERN = /축제|페스티벌|페스타/;

export function isFestival(entry) {
  return FESTIVAL_PATTERN.test(entry.data.keyword ?? '') || FESTIVAL_PATTERN.test(entry.data.title ?? '');
}

export function isDomestic(entry) {
  return entry.data.country === '대한민국';
}

export function categoryOf(entry) {
  if (entry.collection === 'stays') return { label: '숙소', href: '/stays/' };
  if (isFestival(entry)) return { label: '축제', href: '/festival/' };
  if (isDomestic(entry)) return { label: '국내여행', href: '/domestic/' };
  return { label: '해외여행', href: '/overseas/' };
}

export function byRecent(a, b) {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}
