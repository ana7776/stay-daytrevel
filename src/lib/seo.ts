import { SITE_TITLE, SITE_URL, SITE_AUTHOR, DEFAULT_OG_IMAGE } from '../consts';

export interface Crumb {
	name: string;
	/** Site-relative path, e.g. '/stays/'. Omit on the current page. */
	path?: string;
}

const absolute = (path: string) => new URL(path, SITE_URL).href;

export function breadcrumbJsonLd(crumbs: Crumb[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((crumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: crumb.name,
			...(crumb.path ? { item: absolute(crumb.path) } : {}),
		})),
	};
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((item) => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: { '@type': 'Answer', text: item.a },
		})),
	};
}

export function articleJsonLd({
	title,
	description,
	path,
	keyword,
	pubDate,
	updatedDate,
	image = DEFAULT_OG_IMAGE,
}: {
	title: string;
	description: string;
	path: string;
	keyword?: string;
	pubDate?: Date;
	updatedDate?: Date;
	image?: string;
}) {
	const url = absolute(path);
	const modified = updatedDate ?? pubDate;
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		description,
		url,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		image: absolute(image),
		inLanguage: 'ko-KR',
		...(keyword ? { keywords: keyword } : {}),
		...(pubDate ? { datePublished: pubDate.toISOString() } : {}),
		...(modified ? { dateModified: modified.toISOString() } : {}),
		author: { '@type': 'Organization', name: SITE_AUTHOR, url: absolute('/') },
		publisher: { '@type': 'Organization', name: SITE_AUTHOR, url: absolute('/') },
	};
}

export function websiteJsonLd() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_TITLE,
		url: absolute('/'),
		inLanguage: 'ko-KR',
		publisher: { '@type': 'Organization', name: SITE_AUTHOR, url: absolute('/') },
	};
}

export function collectionPageJsonLd({
	name,
	description,
	path,
	items,
}: {
	name: string;
	description: string;
	path: string;
	items: { title: string; path: string }[];
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name,
		description,
		url: absolute(path),
		inLanguage: 'ko-KR',
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: items.map((item, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: item.title,
				url: absolute(item.path),
			})),
		},
	};
}
