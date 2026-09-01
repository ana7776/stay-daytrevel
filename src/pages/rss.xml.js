import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
	const [spots, stays] = await Promise.all([getCollection('spots'), getCollection('stays')]);

	const items = [
		...spots.map((entry) => ({ entry, path: `/spots/${entry.id}/` })),
		...stays.map((entry) => ({ entry, path: `/stays/${entry.id}/` })),
	]
		.sort((a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf())
		.map(({ entry, path }) => ({
			title: entry.data.title,
			description: entry.data.description,
			pubDate: entry.data.pubDate,
			link: path,
		}));

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items,
		customData: '<language>ko-kr</language>',
	});
}
