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

// 같은 도시 글을 우선하고, 부족하면 같은 국가·최신 글로 채운다.
export function relatedEntries(current, pool, limit = 5) {
  const others = pool.filter((e) => e.id !== current.id);
  const sameCity = others.filter((e) => e.data.city === current.data.city);
  const sameCountry = others.filter(
    (e) => e.data.country === current.data.country && e.data.city !== current.data.city
  );
  const rest = others.filter(
    (e) => e.data.country !== current.data.country
  );

  const merged = [...sameCity.sort(byRecent), ...sameCountry.sort(byRecent), ...rest.sort(byRecent)];
  return merged.slice(0, limit);
}
