const SITE_NAME = 'Daytrevel Stay';
// astro.config.mjs의 site와 같은 값을 유지해야 한다.
const SITE_URL = 'https://stay.daytrevel.com';
const DEFAULT_OG_IMAGE = '/og-default.png';

const absolute = (pathOrUrl) =>
  /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, SITE_URL).href;

const publisher = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: absolute('/')
};

/** crumbs: [{ name, path }] — 마지막 항목(현재 페이지)은 path를 생략한다. */
export function breadcrumbJsonLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absolute(crumb.path) } : {})
    }))
  };
}

export function faqJsonLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  };
}

export function articleJsonLd({ data, path }) {
  const url = absolute(path);
  const modified = data.updatedDate ?? data.pubDate;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: absolute(data.image ?? DEFAULT_OG_IMAGE),
    inLanguage: 'ko-KR',
    ...(data.keyword ? { keywords: data.keyword } : {}),
    ...(data.pubDate ? { datePublished: data.pubDate.toISOString() } : {}),
    ...(modified ? { dateModified: modified.toISOString() } : {}),
    author: publisher,
    publisher
  };
}
